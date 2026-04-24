"""Endpoints /sessions — cœur de l'API."""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, status, Form, UploadFile, File
from sqlalchemy import func
from sqlalchemy.orm import Session as DbSession

from scanner_orchestrator.api.exceptions import (
    ConflictError, NotFoundError,
)
from scanner_orchestrator.api.schemas.qa import QaCheckRead
from scanner_orchestrator.api.schemas.session import (
    SessionCreate, SessionDetail, SessionRead, SessionUpdate,
)
from scanner_orchestrator.db.database import get_db
from scanner_orchestrator.db.models import Session, Specimen, CapturePreset
from scanner_shared.enums import SessionStatus
from scanner_shared.enums import validate_session_transition
from scanner_orchestrator.storage.minio import put_object, remove_object

import io

router = APIRouter(prefix="/sessions", tags=["sessions"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_or_404(db: DbSession, session_id: UUID) -> Session:
    s = db.get(Session, session_id)
    if not s:
        raise NotFoundError("Session", session_id)
    return s


def _transition(db: DbSession, session: Session, target: SessionStatus) -> Session:
    try:
        validate_session_transition(SessionStatus(session.status), target)
    except ValueError as e:
        raise ConflictError(str(e))
    session.status = target
    session.updated_at = datetime.now(timezone.utc)
    db.flush()
    return session


def _resolve_specimen(payload: SessionCreate, db: DbSession) -> Specimen:
    """
    Résout le specimen à associer à la nouvelle session.

    Si specimen_id fourni → vérifier existence et retourner.
    Si specimen_name fourni → chercher par nom (insensible à la casse) +
    catégorie. Créer si introuvable.
    """
    if payload.specimen_id is not None:
        specimen = db.get(Specimen, payload.specimen_id)
        if not specimen:
            raise NotFoundError("Specimen", payload.specimen_id)
        return specimen

    # Recherche par nom + catégorie, insensible à la casse
    specimen = (
        db.query(Specimen)
        .filter(
            func.lower(Specimen.name) == func.lower(payload.specimen_name),
            Specimen.category == payload.specimen_category,
        )
        .first()
    )

    if not specimen:
        specimen = Specimen(
            name=payload.specimen_name,
            category=payload.specimen_category,
            size_mm=payload.specimen_size_mm,
        )
        db.add(specimen)
        db.flush()

    return specimen


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=list[SessionRead])
def list_sessions(
    limit:       int = 50,
    offset:      int = 0,
    status_:     SessionStatus | None = None,
    specimen_id: UUID | None = None,
    db: DbSession = Depends(get_db),
):
    q = db.query(Session)
    if status_:
        q = q.filter(Session.status == status_)
    if specimen_id:
        q = q.filter(Session.specimen_id == specimen_id)
    return q.order_by(Session.created_at.desc()).offset(offset).limit(min(limit, 100)).all()


@router.post("", response_model=SessionRead, status_code=status.HTTP_201_CREATED)
async def create_session(
    # Champs form (même logique que SessionCreate)
    preset_id:          UUID                    = Form(...),
    specimen_name:      str | None              = Form(default=None),
    specimen_category:  str                     = Form(default="insect"),
    specimen_size_mm:   float | None            = Form(default=None),
    specimen_pin_status: str | None             = Form(default=None),
    specimen_notes:      str | None             = Form(default=None),
    specimen_id:        UUID | None             = Form(default=None),
    name:               str | None              = Form(default=None),
    operator:           str | None              = Form(default=None),
    calibration_id:     UUID | None             = Form(default=None),
    # Image optionnelle
    thumbnail:          UploadFile | None       = File(default=None),
    db: DbSession = Depends(get_db),
):
    # Validation manuelle (remplace le model_validator)
    if specimen_id is None and not specimen_name:
        from fastapi import HTTPException
        raise HTTPException(422, "Fournir specimen_id ou specimen_name")
    if specimen_id and specimen_name:
        from fastapi import HTTPException
        raise HTTPException(422, "Fournir specimen_id OU specimen_name, pas les deux")

    # Vérifier preset
    if not db.get(CapturePreset, preset_id):
        raise NotFoundError("CapturePreset", preset_id)

    # Résoudre ou créer le specimen
    from scanner_orchestrator.api.schemas.session import SessionCreate as SC
    payload = SC(
        preset_id=preset_id,
        specimen_id=specimen_id,
        specimen_name=specimen_name,
        specimen_category=specimen_category,
        specimen_size_mm=specimen_size_mm,
        specimen_pin_status=specimen_pin_status,
        specimen_notes=specimen_notes,
        name=name,
        operator=operator,
        calibration_id=calibration_id,
    )
    specimen = _resolve_specimen(payload, db)

    # Upload thumbnail si fournie
    if thumbnail and thumbnail.content_type in {"image/jpeg", "image/png"}:
        content = await thumbnail.read()
        if content:
            ext = "jpg" if thumbnail.content_type == "image/jpeg" else "png"
            key = f"specimens/{specimen.id}/thumbnail.{ext}"
            if specimen.thumbnail_key and specimen.thumbnail_key != key:
                remove_object(specimen.thumbnail_key)
            put_object(key=key, data=content, content_type=thumbnail.content_type)
            specimen.thumbnail_key = key
            db.flush()

    s = Session(
        name=name,
        specimen_id=specimen.id,
        preset_id=preset_id,
        calibration_id=calibration_id,
        operator=operator,
    )
    db.add(s)
    db.flush()
    return s


@router.get("/{session_id}", response_model=SessionDetail)
def get_session(session_id: UUID, db: DbSession = Depends(get_db)):
    return _get_or_404(db, session_id)


@router.patch("/{session_id}", response_model=SessionRead)
def update_session(
    session_id: UUID,
    payload: SessionUpdate,
    db: DbSession = Depends(get_db),
):
    s = _get_or_404(db, session_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(s, field, value)
    db.flush()
    return s


@router.post("/{session_id}/start-acquisition", response_model=SessionRead, status_code=status.HTTP_202_ACCEPTED)
def start_acquisition(session_id: UUID, db: DbSession = Depends(get_db)):
    s = _get_or_404(db, session_id)
    return _transition(db, s, SessionStatus.acquiring)


@router.post("/{session_id}/acquired", response_model=SessionRead)
def mark_acquired(
    session_id: UUID,
    payload: dict,
    db: DbSession = Depends(get_db),
):
    s = _get_or_404(db, session_id)
    manifest_key = payload.get("manifest_key")
    if not manifest_key:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="manifest_key requis")
    s.manifest_key = manifest_key
    return _transition(db, s, SessionStatus.acquired)


@router.post("/{session_id}/start-processing", response_model=SessionRead, status_code=status.HTTP_202_ACCEPTED)
def start_processing(session_id: UUID, db: DbSession = Depends(get_db)):
    s = _get_or_404(db, session_id)
    return _transition(db, s, SessionStatus.processing)


@router.post("/{session_id}/retry", response_model=SessionRead, status_code=status.HTTP_202_ACCEPTED)
def retry_session(session_id: UUID, db: DbSession = Depends(get_db)):
    s = _get_or_404(db, session_id)
    return _transition(db, s, SessionStatus.draft)


@router.post("/{session_id}/close", response_model=SessionRead)
def close_session(session_id: UUID, db: DbSession = Depends(get_db)):
    s = _get_or_404(db, session_id)
    if s.status != SessionStatus.done:
        raise ConflictError("Seule une session en status 'done' peut être clôturée")
    s.is_closed = True
    db.flush()
    return s


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(session_id: UUID, db: DbSession = Depends(get_db)):
    s = _get_or_404(db, session_id)
    if s.is_closed:
        raise ConflictError("Une session clôturée ne peut pas être supprimée")
    if s.status in (SessionStatus.acquiring, SessionStatus.processing, SessionStatus.exporting):
        raise ConflictError(f"Impossible de supprimer une session en status '{s.status}'")
    db.delete(s)
    db.flush()


@router.get("/{session_id}/qa", response_model=list[QaCheckRead])
def get_session_qa(session_id: UUID, db: DbSession = Depends(get_db)):
    s = _get_or_404(db, session_id)
    return s.qa_checks


@router.get("/{session_id}/qa/summary")
def get_session_qa_summary(session_id: UUID, db: DbSession = Depends(get_db)):
    s = _get_or_404(db, session_id)
    passed = sum(1 for c in s.qa_checks if c.passed)
    failed = len(s.qa_checks) - passed
    by_type: dict[str, dict] = {}
    for c in s.qa_checks:
        by_type.setdefault(c.check_type, {"passed": 0, "failed": 0})
        if c.passed:
            by_type[c.check_type]["passed"] += 1
        else:
            by_type[c.check_type]["failed"] += 1
    return {"passed": passed, "failed": failed, "by_type": by_type}