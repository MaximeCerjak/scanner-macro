"""CRUD /specimens."""

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DbSession

from scanner_orchestrator.api.exceptions import ConflictError, NotFoundError
from scanner_orchestrator.api.schemas.specimen import (
    SpecimenCreate, SpecimenRead, SpecimenUpdate,
)
from scanner_orchestrator.db.database import get_db
from scanner_orchestrator.db.models import Specimen
from scanner_shared.enums import SpecimenCategory

router = APIRouter(prefix="/specimens", tags=["specimens"])


@router.get("", response_model=list[SpecimenRead])
def list_specimens(
    limit:    int = 50,
    offset:   int = 0,
    category: SpecimenCategory | None = None,
    db: DbSession = Depends(get_db),
):
    q = db.query(Specimen)
    if category:
        q = q.filter(Specimen.category == category)
    return q.offset(offset).limit(min(limit, 100)).all()


@router.post("", response_model=SpecimenRead, status_code=status.HTTP_201_CREATED)
def create_specimen(payload: SpecimenCreate, db: DbSession = Depends(get_db)):
    specimen = Specimen(**payload.model_dump())
    db.add(specimen)
    try:
        db.flush()
    except IntegrityError:
        raise ConflictError("external_id déjà utilisé")
    return specimen


@router.get("/{specimen_id}", response_model=SpecimenRead)
def get_specimen(specimen_id: UUID, db: DbSession = Depends(get_db)):
    s = db.get(Specimen, specimen_id)
    if not s:
        raise NotFoundError("Specimen", specimen_id)
    return s


@router.patch("/{specimen_id}", response_model=SpecimenRead)
def update_specimen(
    specimen_id: UUID,
    payload: SpecimenUpdate,
    db: DbSession = Depends(get_db),
):
    s = db.get(Specimen, specimen_id)
    if not s:
        raise NotFoundError("Specimen", specimen_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(s, field, value)
    db.flush()
    return s


@router.delete("/{specimen_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_specimen(specimen_id: UUID, db: DbSession = Depends(get_db)):
    s = db.get(Specimen, specimen_id)
    if not s:
        raise NotFoundError("Specimen", specimen_id)
    try:
        db.delete(s)
        db.flush()
    except IntegrityError:
        raise ConflictError("Ce specimen a des sessions associées et ne peut pas être supprimé")