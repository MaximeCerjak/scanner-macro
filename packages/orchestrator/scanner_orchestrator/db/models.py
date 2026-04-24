"""Modèles SQLAlchemy — 10 tables dans l'ordre strict des dépendances FK.

Ordre d'implémentation (imposé par les clés étrangères) :
  1. calibration_profile
  2. capture_preset      (auto-ref parent_id)
  3. specimen
  4. export_profile
  5. session             (FK → specimen, capture_preset, calibration_profile)
  6. job                 (FK → session)
  7. asset               (FK → session, job)
  8. qa_check            (FK → session, asset, job)
  9. license_record      (FK → session, 1:1)
 10. session_export_profile  (association session ↔ export_profile)
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    CHAR, JSON, Table, Column, ForeignKey, Index, UniqueConstraint,
    CheckConstraint, String, Float, Integer, Boolean, DateTime, Text,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.types import TypeDecorator

from scanner_shared.enums import (
    SessionStatus, JobType, JobStatus, AssetType,
    SpecimenCategory, PinStatus, StackMode, PresetTier, LicenseType, QaCheckType,
)


# ── Type portable UUID ────────────────────────────────────────────────────────

class GUID(TypeDecorator):
    """UUID stocké en CHAR(36) sur SQLite, UUID natif sur PostgreSQL."""
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if dialect.name == "postgresql":
            return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))
        return str(value) if isinstance(value, uuid.UUID) else str(uuid.UUID(str(value)))

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))


# ── Base déclarative ──────────────────────────────────────────────────────────

class Base(DeclarativeBase):
    pass


def _uuid() -> uuid.UUID:
    return uuid.uuid4()


# ── Table 1 : calibration_profile ────────────────────────────────────────────

class CalibrationProfile(Base):
    __tablename__ = "calibration_profile"
    __table_args__ = (
        UniqueConstraint("profile_hash", name="uq_calibration_hash"),
    )

    id:           Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=_uuid)
    camera_model: Mapped[str]       = mapped_column(String(128), nullable=False)
    lens_model:   Mapped[str]       = mapped_column(String(128), nullable=False)
    fx:           Mapped[float]     = mapped_column(Float, nullable=False)
    fy:           Mapped[float]     = mapped_column(Float, nullable=False)
    cx:           Mapped[float]     = mapped_column(Float, nullable=False)
    cy:           Mapped[float]     = mapped_column(Float, nullable=False)
    dist_coeffs:  Mapped[dict]      = mapped_column(JSON, nullable=False, default=dict)
    profile_hash: Mapped[str]       = mapped_column(String(64), nullable=False, index=True)
    created_at:   Mapped[datetime]  = mapped_column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    notes:        Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    sessions: Mapped[list["Session"]] = relationship("Session", back_populates="calibration")


# ── Table 2 : capture_preset (auto-ref parent_id) ────────────────────────────

class CapturePreset(Base):
    __tablename__ = "capture_preset"
    __table_args__ = (
        CheckConstraint("angular_step_deg > 0 AND angular_step_deg <= 90", name="ck_angular_step"),
        CheckConstraint("rings >= 1 AND rings <= 10",                       name="ck_rings"),
        CheckConstraint("focus_planes >= 1",                                name="ck_focus_planes"),
    )

    id:               Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=_uuid)
    name:             Mapped[str]       = mapped_column(String(128), nullable=False)
    tier:             Mapped[str]       = mapped_column(String(32),  nullable=False, default=PresetTier.standard)
    rings:            Mapped[int]       = mapped_column(Integer, nullable=False)
    angular_step_deg: Mapped[int]       = mapped_column(Integer, nullable=False)
    focus_planes:     Mapped[int]       = mapped_column(Integer, nullable=False)
    stack_mode:       Mapped[str]       = mapped_column(String(16), nullable=False, default=StackMode.light)
    is_system:        Mapped[bool]      = mapped_column(Boolean, nullable=False, default=False)
    parent_id:        Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID, ForeignKey("capture_preset.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    parent:   Mapped[Optional["CapturePreset"]]  = relationship("CapturePreset", remote_side="CapturePreset.id")
    sessions: Mapped[list["Session"]]            = relationship("Session", back_populates="preset")


# ── Table 3 : specimen ────────────────────────────────────────────────────────

class Specimen(Base):
    __tablename__ = "specimen"

    id:              Mapped[uuid.UUID]       = mapped_column(GUID, primary_key=True, default=_uuid)
    name:            Mapped[Optional[str]]   = mapped_column(String(200), nullable=True)
    external_id:     Mapped[Optional[str]]   = mapped_column(String(128), nullable=True, index=True)
    size_mm:         Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    category:        Mapped[str]             = mapped_column(String(32), nullable=False, default=SpecimenCategory.insect)
    pin_status:      Mapped[str]             = mapped_column(String(32), nullable=False, default=PinStatus.pinned)
    taxonomy:        Mapped[Optional[dict]]  = mapped_column(JSON, nullable=True)
    collection_name: Mapped[Optional[str]]   = mapped_column(String(128), nullable=True)
    notes:           Mapped[Optional[str]]   = mapped_column(Text, nullable=True)
    thumbnail_key:   Mapped[Optional[str]]   = mapped_column(String(500), nullable=True)
    created_at:      Mapped[datetime]        = mapped_column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    sessions:        Mapped[list["Session"]] = relationship(
        "Session", back_populates="specimen",
        passive_deletes=True,
    )


# ── Table 4 : export_profile ──────────────────────────────────────────────────

class ExportProfile(Base):
    __tablename__ = "export_profile"
    __table_args__ = (
        CheckConstraint("lod_levels >= 1 AND lod_levels <= 5",              name="ck_lod_levels"),
        CheckConstraint(
            "texture_resolution IN (1024, 2048, 4096, 8192)",
            name="ck_texture_resolution"
        ),
    )

    id:                 Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=_uuid)
    name:               Mapped[str]       = mapped_column(String(128), nullable=False)
    formats:            Mapped[list]      = mapped_column(JSON, nullable=False, default=list)
    lod_levels:         Mapped[int]       = mapped_column(Integer, nullable=False, default=1)
    texture_resolution: Mapped[int]       = mapped_column(Integer, nullable=False, default=2048)
    is_system:          Mapped[bool]      = mapped_column(Boolean, nullable=False, default=False)
    created_at:         Mapped[datetime]  = mapped_column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    sessions: Mapped[list["Session"]] = relationship(
        "Session", secondary="session_export_profile", back_populates="export_profiles"
    )


# ── Table 10 : session_export_profile (association, définie ici car référencée par ExportProfile) ──

session_export_profile = Table(
    "session_export_profile",
    Base.metadata,
    Column("session_id",        GUID, ForeignKey("session.id",        ondelete="CASCADE"), primary_key=True),
    Column("export_profile_id", GUID, ForeignKey("export_profile.id", ondelete="CASCADE"), primary_key=True),
)


# ── Table 5 : session ─────────────────────────────────────────────────────────

class Session(Base):
    __tablename__ = "session"
    __table_args__ = (
        Index("ix_session_status",      "status"),
        Index("ix_session_specimen_id", "specimen_id"),
        Index("ix_session_created_at",  "created_at"),
    )

    id:                   Mapped[uuid.UUID]           = mapped_column(GUID, primary_key=True, default=_uuid)
    name:                 Mapped[Optional[str]]       = mapped_column(String(200), nullable=True)
    thumbnail_key:        Mapped[Optional[str]]       = mapped_column(String(500), nullable=True)
    specimen_id:          Mapped[uuid.UUID]           = mapped_column(GUID, ForeignKey("specimen.id", ondelete="RESTRICT"), nullable=False)
    preset_id:            Mapped[uuid.UUID]           = mapped_column(GUID, ForeignKey("capture_preset.id", ondelete="RESTRICT"), nullable=False)
    calibration_id:       Mapped[Optional[uuid.UUID]] = mapped_column(GUID, ForeignKey("calibration_profile.id", ondelete="SET NULL"), nullable=True)
    status:               Mapped[str]                 = mapped_column(String(32), nullable=False, default=SessionStatus.draft)
    operator:             Mapped[Optional[str]]       = mapped_column(String(128), nullable=True)
    manifest_key:         Mapped[Optional[str]]       = mapped_column(String(512), nullable=True)
    is_closed:            Mapped[bool]                = mapped_column(Boolean, nullable=False, default=False)
    created_at:           Mapped[datetime]            = mapped_column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at:           Mapped[datetime]            = mapped_column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    specimen:             Mapped["Specimen"]                     = relationship("Specimen",          back_populates="sessions")
    preset:               Mapped["CapturePreset"]                = relationship("CapturePreset",     back_populates="sessions")
    calibration:          Mapped[Optional["CalibrationProfile"]] = relationship("CalibrationProfile", back_populates="sessions")
    jobs:                 Mapped[list["Job"]]                    = relationship("Job",   back_populates="session", cascade="all, delete-orphan")
    assets:               Mapped[list["Asset"]]                  = relationship("Asset", back_populates="session", cascade="all, delete-orphan")
    qa_checks:            Mapped[list["QaCheck"]]                = relationship("QaCheck", back_populates="session", cascade="all, delete-orphan")
    license_record:       Mapped[Optional["LicenseRecord"]]      = relationship("LicenseRecord", back_populates="session", uselist=False, cascade="all, delete-orphan")
    export_profiles:      Mapped[list["ExportProfile"]]          = relationship(
        "ExportProfile", secondary="session_export_profile", back_populates="sessions"
    )


# ── Table 6 : job ─────────────────────────────────────────────────────────────

class Job(Base):
    __tablename__ = "job"
    __table_args__ = (
        Index("ix_job_session_type", "session_id", "type"),
        Index("ix_job_status",       "status"),
        CheckConstraint("attempt >= 1", name="ck_job_attempt"),
    )

    id:          Mapped[uuid.UUID]       = mapped_column(GUID, primary_key=True, default=_uuid)
    session_id:  Mapped[uuid.UUID]       = mapped_column(GUID, ForeignKey("session.id", ondelete="CASCADE"), nullable=False)
    type:        Mapped[str]             = mapped_column(String(32), nullable=False)
    status:      Mapped[str]             = mapped_column(String(32), nullable=False, default=JobStatus.pending)
    attempt:     Mapped[int]             = mapped_column(Integer, nullable=False, default=1)
    started_at:  Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    ended_at:    Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    duration_s:  Mapped[Optional[float]]    = mapped_column(Float, nullable=True)
    error_log:   Mapped[Optional[str]]      = mapped_column(Text, nullable=True)
    created_at:  Mapped[datetime]           = mapped_column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    session: Mapped["Session"]     = relationship("Session", back_populates="jobs")
    assets:  Mapped[list["Asset"]] = relationship("Asset", back_populates="job")


# ── Table 7 : asset ───────────────────────────────────────────────────────────

class Asset(Base):
    __tablename__ = "asset"
    __table_args__ = (
        Index("ix_asset_session_type",  "session_id", "asset_type"),
        Index("ix_asset_checksum",      "checksum_sha256"),
    )

    id:              Mapped[uuid.UUID]       = mapped_column(GUID, primary_key=True, default=_uuid)
    session_id:      Mapped[uuid.UUID]       = mapped_column(GUID, ForeignKey("session.id", ondelete="CASCADE"), nullable=False)
    job_id:          Mapped[Optional[uuid.UUID]] = mapped_column(GUID, ForeignKey("job.id", ondelete="SET NULL"), nullable=True)
    bucket:          Mapped[str]             = mapped_column(String(128), nullable=False)
    key:             Mapped[str]             = mapped_column(String(512), nullable=False)
    checksum_sha256: Mapped[Optional[str]]   = mapped_column(String(64), nullable=True)
    size_bytes:      Mapped[Optional[int]]   = mapped_column(Integer, nullable=True)
    asset_type:      Mapped[str]             = mapped_column(String(32), nullable=False)
    asset_meta:      Mapped[Optional[dict]]  = mapped_column("metadata", JSON, nullable=True)
    created_at:      Mapped[datetime]        = mapped_column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    session:  Mapped["Session"]          = relationship("Session", back_populates="assets")
    job:      Mapped[Optional["Job"]]    = relationship("Job",     back_populates="assets")


# ── Table 8 : qa_check ────────────────────────────────────────────────────────

class QaCheck(Base):
    __tablename__ = "qa_check"
    __table_args__ = (
        Index("ix_qa_session_type", "session_id", "check_type"),
    )

    id:          Mapped[uuid.UUID]       = mapped_column(GUID, primary_key=True, default=_uuid)
    session_id:  Mapped[uuid.UUID]       = mapped_column(GUID, ForeignKey("session.id", ondelete="CASCADE"), nullable=False)
    asset_id:    Mapped[Optional[uuid.UUID]] = mapped_column(GUID, ForeignKey("asset.id", ondelete="SET NULL"), nullable=True)
    job_id:      Mapped[Optional[uuid.UUID]] = mapped_column(GUID, ForeignKey("job.id",   ondelete="SET NULL"), nullable=True)
    check_type:  Mapped[str]             = mapped_column(String(32), nullable=False)
    passed:      Mapped[bool]            = mapped_column(Boolean, nullable=False)
    score:       Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    detail:      Mapped[Optional[str]]   = mapped_column(Text, nullable=True)
    created_at:  Mapped[datetime]        = mapped_column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    session: Mapped["Session"]         = relationship("Session", back_populates="qa_checks")
    asset:   Mapped[Optional["Asset"]] = relationship("Asset")
    job:     Mapped[Optional["Job"]]   = relationship("Job")


# ── Table 9 : license_record (1:1 avec session) ───────────────────────────────

class LicenseRecord(Base):
    __tablename__ = "license_record"
    __table_args__ = (
        UniqueConstraint("session_id", name="uq_license_session"),
    )

    id:           Mapped[uuid.UUID]       = mapped_column(GUID, primary_key=True, default=_uuid)
    session_id:   Mapped[uuid.UUID]       = mapped_column(GUID, ForeignKey("session.id", ondelete="CASCADE"), nullable=False, unique=True)
    owner_name:   Mapped[str]             = mapped_column(String(256), nullable=False)
    license_type: Mapped[str]             = mapped_column(String(32),  nullable=False, default=LicenseType.private)
    consent_date: Mapped[datetime]        = mapped_column(DateTime, nullable=False)
    expiry_date:  Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at:   Mapped[datetime]        = mapped_column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    session: Mapped["Session"] = relationship("Session", back_populates="license_record")