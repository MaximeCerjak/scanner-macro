"""CRUD /calibrations."""

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DbSession

from scanner_orchestrator.api.exceptions import ConflictError, NotFoundError
from scanner_orchestrator.api.schemas.calibration import (
    CalibrationCreate, CalibrationRead, CalibrationUpdate,
)
from scanner_orchestrator.db.database import get_db
from scanner_orchestrator.db.models import CalibrationProfile

router = APIRouter(prefix="/calibrations", tags=["calibrations"])


@router.get("", response_model=list[CalibrationRead])
def list_calibrations(
    limit:  int = 50,
    offset: int = 0,
    db: DbSession = Depends(get_db),
):
    return db.query(CalibrationProfile).offset(offset).limit(min(limit, 100)).all()


@router.post("", response_model=CalibrationRead, status_code=status.HTTP_201_CREATED)
def create_calibration(payload: CalibrationCreate, db: DbSession = Depends(get_db)):
    cal = CalibrationProfile(**payload.model_dump())
    db.add(cal)
    try:
        db.flush()
    except IntegrityError:
        raise ConflictError("profile_hash déjà existant")
    return cal


@router.get("/{calibration_id}", response_model=CalibrationRead)
def get_calibration(calibration_id: UUID, db: DbSession = Depends(get_db)):
    cal = db.get(CalibrationProfile, calibration_id)
    if not cal:
        raise NotFoundError("CalibrationProfile", calibration_id)
    return cal


@router.patch("/{calibration_id}", response_model=CalibrationRead)
def update_calibration(
    calibration_id: UUID,
    payload: CalibrationUpdate,
    db: DbSession = Depends(get_db),
):
    cal = db.get(CalibrationProfile, calibration_id)
    if not cal:
        raise NotFoundError("CalibrationProfile", calibration_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(cal, field, value)
    db.flush()
    return cal