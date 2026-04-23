"""Tests de l'API FastAPI — chapitre 04."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, StaticPool
from sqlalchemy.orm import sessionmaker

from scanner_orchestrator.api.app import app
from scanner_orchestrator.db.database import get_db
from scanner_orchestrator.db.models import Base
from scanner_orchestrator.db.seed import seed


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="function")
def db_engine():
    """Engine SQLite en mémoire avec StaticPool — une seule connexion partagée."""
    # StaticPool garantit que tous les accès (fixture + app FastAPI dans son thread)
    # utilisent la même connexion SQLite en mémoire.
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def set_pragma(conn, _):
        conn.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture(scope="function")
def db(db_engine):
    factory = sessionmaker(
        bind=db_engine,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
    )
    session = factory()
    yield session
    session.rollback()
    session.close()


@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def seeded_client(db):
    seed(db)
    db.commit()

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


# ── Health ────────────────────────────────────────────────────────────────────

def test_health_returns_200_or_503(client):
    r = client.get("/health")
    assert r.status_code in (200, 503)
    assert "status" in r.json()
    assert "version" in r.json()


def test_health_db_ok(client):
    assert client.get("/health").json()["db"] == "ok"


# ── Specimens ─────────────────────────────────────────────────────────────────

def test_create_specimen(client):
    r = client.post("/specimens", json={"category": "insect", "pin_status": "pinned"})
    assert r.status_code == 201
    assert r.json()["category"] == "insect"
    assert "id" in r.json()


def test_get_specimen_roundtrip(client):
    r = client.post("/specimens", json={"external_id": "COLL-001", "size_mm": 5.0})
    assert r.status_code == 201
    sid = r.json()["id"]
    r2 = client.get(f"/specimens/{sid}")
    assert r2.status_code == 200
    assert r2.json()["external_id"] == "COLL-001"
    assert r2.json()["size_mm"] == 5.0


def test_get_specimen_not_found(client):
    r = client.get("/specimens/00000000-0000-0000-0000-000000000000")
    assert r.status_code == 404


def test_create_specimen_invalid_size(client):
    r = client.post("/specimens", json={"size_mm": -5.0})
    assert r.status_code == 422


def test_delete_specimen_no_sessions(client):
    sid = client.post("/specimens", json={}).json()["id"]
    assert client.delete(f"/specimens/{sid}").status_code == 204


# ── Presets ───────────────────────────────────────────────────────────────────

def test_list_presets_seeded(seeded_client):
    r = seeded_client.get("/capture-presets")
    assert r.status_code == 200
    assert len(r.json()) == 4


def test_patch_system_preset_forbidden(seeded_client):
    pid = seeded_client.get("/capture-presets").json()[0]["id"]
    r = seeded_client.patch(f"/capture-presets/{pid}", json={"name": "hacked"})
    assert r.status_code == 403


def test_delete_system_preset_forbidden(seeded_client):
    pid = seeded_client.get("/capture-presets").json()[0]["id"]
    r = seeded_client.delete(f"/capture-presets/{pid}")
    assert r.status_code == 403


def test_create_and_patch_user_preset(client):
    r = client.post("/capture-presets", json={
        "name": "Mon preset", "rings": 2,
        "angular_step_deg": 15, "focus_planes": 10,
    })
    assert r.status_code == 201
    pid = r.json()["id"]
    r2 = client.patch(f"/capture-presets/{pid}", json={"name": "Renommé"})
    assert r2.status_code == 200
    assert r2.json()["name"] == "Renommé"


# ── Sessions ──────────────────────────────────────────────────────────────────

def _create_session(client) -> dict:
    specimen_id = client.post("/specimens", json={}).json()["id"]
    preset_id = client.post("/capture-presets", json={
        "name": "p", "rings": 2, "angular_step_deg": 15, "focus_planes": 1,
    }).json()["id"]
    r = client.post("/sessions", json={
        "specimen_id": specimen_id,
        "preset_id": preset_id,
    })
    assert r.status_code == 201
    return r.json()


def test_create_session(client):
    s = _create_session(client)
    assert s["status"] == "draft"
    assert s["is_closed"] is False


def test_create_session_unknown_specimen(client):
    preset_id = client.post("/capture-presets", json={
        "name": "p", "rings": 2, "angular_step_deg": 15, "focus_planes": 1,
    }).json()["id"]
    r = client.post("/sessions", json={
        "specimen_id": "00000000-0000-0000-0000-000000000000",
        "preset_id": preset_id,
    })
    assert r.status_code == 404


def test_start_acquisition(client):
    s = _create_session(client)
    r = client.post(f"/sessions/{s['id']}/start-acquisition")
    assert r.status_code == 202
    assert r.json()["status"] == "acquiring"


def test_start_acquisition_wrong_status(client):
    s = _create_session(client)
    client.post(f"/sessions/{s['id']}/start-acquisition")
    r = client.post(f"/sessions/{s['id']}/start-acquisition")
    assert r.status_code == 409


def test_filter_sessions_by_status(client):
    s = _create_session(client)
    client.post(f"/sessions/{s['id']}/start-acquisition")
    r = client.get("/sessions?status_=acquiring")
    assert r.status_code == 200
    assert all(sess["status"] == "acquiring" for sess in r.json())
    assert any(sess["id"] == s["id"] for sess in r.json())


def test_delete_specimen_with_session_returns_409(client):
    s = _create_session(client)
    r = client.delete(f"/specimens/{s['specimen_id']}")
    assert r.status_code == 409