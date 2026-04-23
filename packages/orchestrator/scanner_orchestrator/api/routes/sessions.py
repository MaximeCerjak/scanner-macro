"""Endpoints /sessions — cœur de l'API."""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, status
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

router = APIRouter(prefix="/sessions", tags=["sessions"])


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
def create_session(payload: SessionCreate, db: DbSession = Depends(get_db)):
    if not db.get(Specimen, payload.specimen_id):
        raise NotFoundError("Specimen", payload.specimen_id)
    if not db.get(CapturePreset, payload.preset_id):
        raise NotFoundError("CapturePreset", payload.preset_id)
    s = Session(**payload.model_dump())
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