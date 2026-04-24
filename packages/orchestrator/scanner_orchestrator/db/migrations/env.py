import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

from scanner_orchestrator.db.models import Base

config = context.config

# Lire DATABASE_URL depuis l'environnement (priorité sur alembic.ini)
db_url = os.getenv("DATABASE_URL", "sqlite:///./scanner.db")
config.set_main_option("sqlalchemy.url", db_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def include_object(object, name, type_, reflected, compare_to):
    """
    Filtre les objets détectés par autogenerate.

    Exclut uq_license_session : cette contrainte UniqueConstraint est définie
    dans le modèle SQLAlchemy mais SQLite ne la reporte pas dans PRAGMA
    index_list de façon cohérente. Alembic la détecte donc toujours comme
    "à créer", ce qui génère une erreur au runtime (SQLite ne supporte pas
    ALTER TABLE ADD CONSTRAINT). En PostgreSQL (prod) ce filtre est sans effet
    car la contrainte est gérée nativement.
    """
    if type_ == "unique_constraint" and name == "uq_license_session":
        return False
    return True


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()