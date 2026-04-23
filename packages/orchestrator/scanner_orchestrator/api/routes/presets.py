"""CRUD /capture-presets."""

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DbSession

from scanner_orchestrator.api.exceptions import (
    ConflictError, ForbiddenError, NotFoundError,
)
from scanner_orchestrator.api.schemas.preset import (
    PresetCreate, PresetRead, PresetUpdate,
)
from scanner_orchestrator.db.database import get_db
from scanner_orchestrator.db.models import CapturePreset
from scanner_shared.enums import PresetTier

router = APIRouter(prefix="/capture-presets", tags=["capture-presets"])


@router.get("", response_model=list[PresetRead])
def list_presets(
    limit:     int = 50,
    offset:    int = 0,
    is_system: bool | None = None,
    tier:      PresetTier | None = None,
    db: DbSession = Depends(get_db),
):
    q = db.query(CapturePreset)
    if is_system is not None:
        q = q.filter(CapturePreset.is_system == is_system)
    if tier:
        q = q.filter(CapturePreset.tier == tier)
    return q.offset(offset).limit(min(limit, 100)).all()


@router.post("", response_model=PresetRead, status_code=status.HTTP_201_CREATED)
def create_preset(payload: PresetCreate, db: DbSession = Depends(get_db)):
    if payload.parent_id:
        parent = db.get(CapturePreset, payload.parent_id)
        if not parent:
            raise NotFoundError("CapturePreset parent", payload.parent_id)
    preset = CapturePreset(**payload.model_dump())
    db.add(preset)
    db.flush()
    return preset


@router.get("/{preset_id}", response_model=PresetRead)
def get_preset(preset_id: UUID, db: DbSession = Depends(get_db)):
    p = db.get(CapturePreset, preset_id)
    if not p:
        raise NotFoundError("CapturePreset", preset_id)
    return p


@router.patch("/{preset_id}", response_model=PresetRead)
def update_preset(
    preset_id: UUID,
    payload: PresetUpdate,
    db: DbSession = Depends(get_db),
):
    p = db.get(CapturePreset, preset_id)
    if not p:
        raise NotFoundError("CapturePreset", preset_id)
    if p.is_system:
        raise ForbiddenError("Les presets système sont immutables")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(p, field, value)
    db.flush()
    return p


@router.delete("/{preset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_preset(preset_id: UUID, db: DbSession = Depends(get_db)):
    p = db.get(CapturePreset, preset_id)
    if not p:
        raise NotFoundError("CapturePreset", preset_id)
    if p.is_system:
        raise ForbiddenError("Les presets système sont immutables")
    try:
        db.delete(p)
        db.flush()
    except IntegrityError:
        raise ConflictError("Ce preset est utilisé par des sessions existantes")


@router.post("/{preset_id}/duplicate", response_model=PresetRead, status_code=status.HTTP_201_CREATED)
def duplicate_preset(
    preset_id: UUID,
    payload: dict,
    db: DbSession = Depends(get_db),
):
    p = db.get(CapturePreset, preset_id)
    if not p:
        raise NotFoundError("CapturePreset", preset_id)
    name = payload.get("name", f"{p.name} (copie)")
    clone = CapturePreset(
        name=name,
        tier=p.tier,
        rings=p.rings,
        angular_step_deg=p.angular_step_deg,
        focus_planes=p.focus_planes,
        stack_mode=p.stack_mode,
        is_system=False,
        parent_id=p.id,
    )
    db.add(clone)
    db.flush()
    return clone