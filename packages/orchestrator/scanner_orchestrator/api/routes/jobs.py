"""Endpoints /jobs — lecture seule + cancel."""

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DbSession

from scanner_orchestrator.api.exceptions import ConflictError, NotFoundError
from scanner_orchestrator.api.schemas.job import JobRead
from scanner_orchestrator.db.database import get_db
from scanner_orchestrator.db.models import Job
from scanner_shared.enums import JobStatus, JobType

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", response_model=list[JobRead])
def list_jobs(
    limit:      int = 50,
    session_id: UUID | None = None,
    status_:    JobStatus | None = None,
    type_:      JobType | None = None,
    db: DbSession = Depends(get_db),
):
    q = db.query(Job)
    if session_id:
        q = q.filter(Job.session_id == session_id)
    if status_:
        q = q.filter(Job.status == status_)
    if type_:
        q = q.filter(Job.type == type_)
    return q.limit(min(limit, 100)).all()


@router.get("/{job_id}", response_model=JobRead)
def get_job(job_id: UUID, db: DbSession = Depends(get_db)):
    j = db.get(Job, job_id)
    if not j:
        raise NotFoundError("Job", job_id)
    return j


@router.post("/{job_id}/cancel", response_model=JobRead)
def cancel_job(job_id: UUID, db: DbSession = Depends(get_db)):
    j = db.get(Job, job_id)
    if not j:
        raise NotFoundError("Job", job_id)
    if j.status in (JobStatus.success, JobStatus.failed, JobStatus.cancelled):
        raise ConflictError(f"Job déjà terminé avec status '{j.status}'")
    j.status = JobStatus.cancelled
    db.flush()
    return j


@router.get("/{job_id}/logs")
def get_job_logs(job_id: UUID, db: DbSession = Depends(get_db)):
    j = db.get(Job, job_id)
    if not j:
        raise NotFoundError("Job", job_id)
    return {"logs": j.error_log or ""}