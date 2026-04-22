"""Tests de validation du chapitre 03 — modèles SQLAlchemy et seed."""

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError

from scanner_orchestrator.db.models import (
    Base, CalibrationProfile, CapturePreset, Specimen,
    ExportProfile, Session, Job, Asset, LicenseRecord,
)
from scanner_orchestrator.db.seed import seed
from scanner_shared.enums import (
    SessionStatus, JobStatus, JobType, AssetType,
    SpecimenCategory, PinStatus, StackMode, PresetTier, LicenseType,
)
from datetime import datetime, timezone


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture()
def engine_mem():
    """Engine SQLite en mémoire — isolé par test."""
    e = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    # Activer les FK sur SQLite
    from sqlalchemy import event
    @event.listens_for(e, "connect")
    def set_pragma(conn, _):
        conn.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(e)
    yield e
    Base.metadata.drop_all(e)
    e.dispose()


@pytest.fixture()
def db(engine_mem):
    """Session SQLAlchemy propre par test, rollback automatique."""
    factory = sessionmaker(bind=engine_mem, autocommit=False, autoflush=False, expire_on_commit=False)
    session = factory()
    yield session
    session.rollback()
    session.close()


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_calibration(db) -> CalibrationProfile:
    cal = CalibrationProfile(
        camera_model="TestCam", lens_model="TestLens",
        fx=1000.0, fy=1000.0, cx=960.0, cy=540.0,
        dist_coeffs={}, profile_hash="abc123def456",
    )
    db.add(cal)
    db.flush()
    return cal


def make_preset(db) -> CapturePreset:
    preset = CapturePreset(
        name="Test preset", tier=PresetTier.standard,
        rings=3, angular_step_deg=15, focus_planes=20,
        stack_mode=StackMode.light,
    )
    db.add(preset)
    db.flush()
    return preset


def make_specimen(db) -> Specimen:
    specimen = Specimen(
        category=SpecimenCategory.insect,
        pin_status=PinStatus.pinned,
    )
    db.add(specimen)
    db.flush()
    return specimen


def make_session(db) -> Session:
    cal     = make_calibration(db)
    preset  = make_preset(db)
    specimen = make_specimen(db)
    s = Session(
        specimen_id=specimen.id,
        preset_id=preset.id,
        calibration_id=cal.id,
        status=SessionStatus.draft,
    )
    db.add(s)
    db.flush()
    return s


# ── Tests round-trip ──────────────────────────────────────────────────────────

def test_roundtrip_session(db) -> None:
    """Créer Specimen + CalibrationProfile + Preset + Session, commit, reload."""
    s = make_session(db)
    db.commit()

    reloaded = db.get(Session, s.id)
    assert reloaded is not None
    assert reloaded.status == SessionStatus.draft
    assert reloaded.specimen_id == s.specimen_id


def test_roundtrip_job(db) -> None:
    s = make_session(db)
    job = Job(session_id=s.id, type=JobType.stacking, status=JobStatus.pending, attempt=1)
    db.add(job)
    db.commit()

    reloaded = db.get(Job, job.id)
    assert reloaded.type == JobType.stacking


# ── Tests cascade ─────────────────────────────────────────────────────────────

def test_cascade_delete_session_deletes_jobs_and_assets(db) -> None:
    """Supprimer une Session doit supprimer ses Jobs et Assets."""
    s = make_session(db)
    job = Job(session_id=s.id, type=JobType.qa, status=JobStatus.pending, attempt=1)
    db.add(job)
    db.flush()
    asset = Asset(
        session_id=s.id, job_id=job.id,
        bucket="sessions", key="test/key.obj",
        asset_type=AssetType.export_obj,
    )
    db.add(asset)
    db.commit()

    db.delete(s)
    db.commit()

    assert db.get(Job, job.id) is None
    assert db.get(Asset, asset.id) is None


def test_cascade_restrict_specimen_with_sessions(db) -> None:
    """Impossible de supprimer un Specimen qui a des Sessions."""
    s = make_session(db)
    db.commit()

    specimen = db.get(Specimen, s.specimen_id)
    db.delete(specimen)
    with pytest.raises(IntegrityError):
        db.commit()


# ── Tests contraintes ─────────────────────────────────────────────────────────

def test_check_constraint_rings_zero(db) -> None:
    """rings=0 doit lever IntegrityError."""
    preset = CapturePreset(
        name="Invalid", tier=PresetTier.fast,
        rings=0, angular_step_deg=15, focus_planes=1,
        stack_mode=StackMode.none,
    )
    db.add(preset)
    with pytest.raises(IntegrityError):
        db.commit()


def test_unique_calibration_hash(db) -> None:
    """Deux CalibrationProfile avec le même hash doivent lever IntegrityError."""
    make_calibration(db)
    db.commit()

    cal2 = CalibrationProfile(
        camera_model="Cam2", lens_model="Lens2",
        fx=800.0, fy=800.0, cx=640.0, cy=360.0,
        dist_coeffs={}, profile_hash="abc123def456",  # même hash
    )
    db.add(cal2)
    with pytest.raises(IntegrityError):
        db.commit()


def test_unique_license_per_session(db) -> None:
    """Deux LicenseRecord pour la même Session doivent lever IntegrityError."""
    s = make_session(db)
    now = datetime.now(timezone.utc)
    lic1 = LicenseRecord(session_id=s.id, owner_name="Alice", license_type=LicenseType.private, consent_date=now)
    lic2 = LicenseRecord(session_id=s.id, owner_name="Bob",   license_type=LicenseType.cc0,     consent_date=now)
    db.add(lic1)
    db.flush()
    db.add(lic2)
    with pytest.raises(IntegrityError):
        db.commit()


# ── Test PRAGMA foreign_keys ──────────────────────────────────────────────────

def test_foreign_keys_pragma_active(engine_mem) -> None:
    """PRAGMA foreign_keys=ON doit être actif."""
    with engine_mem.connect() as conn:
        result = conn.execute(text("PRAGMA foreign_keys")).fetchone()
        assert result[0] == 1


# ── Test seed idempotent ──────────────────────────────────────────────────────

def test_seed_idempotent(db) -> None:
    """Exécuter seed() deux fois ne crée pas de doublons."""
    seed(db)
    count_after_first = db.query(CapturePreset).count()

    seed(db)
    count_after_second = db.query(CapturePreset).count()

    assert count_after_first == count_after_second == 4


def test_seed_export_profiles(db) -> None:
    """Le seed crée exactement 3 profils d'export."""
    seed(db)
    assert db.query(ExportProfile).count() == 3