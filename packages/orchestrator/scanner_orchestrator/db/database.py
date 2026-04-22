"""Configuration SQLAlchemy — engine, session factory, dependency FastAPI."""

import os
from typing import Generator

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, Session

from scanner_orchestrator.db.models import Base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./scanner.db")

connect_args: dict = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=os.getenv("DB_ECHO", "false").lower() == "true",
    pool_pre_ping=True,
)

# Activer les contraintes FK et WAL pour SQLite.
# Sans PRAGMA foreign_keys=ON, SQLite ignore silencieusement les FK.
if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, _):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()

# expire_on_commit=False : évite les lazy loads après commit (cause #1 de
# DetachedInstanceError en FastAPI).
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


def get_db() -> Generator[Session, None, None]:
    """Dependency FastAPI — une session par requête, commit/rollback auto."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_db() -> None:
    """Crée toutes les tables sans Alembic. Réservé au dev et aux tests."""
    Base.metadata.create_all(bind=engine)