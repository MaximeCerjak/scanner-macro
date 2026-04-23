from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from scanner_shared.enums import PresetTier, StackMode


class PresetCreate(BaseModel):
    name:             str
    tier:             PresetTier  = PresetTier.standard
    rings:            int         = Field(ge=1, le=10)
    angular_step_deg: int         = Field(ge=1, le=90)
    focus_planes:     int         = Field(ge=1)
    stack_mode:       StackMode   = StackMode.light
    parent_id:        Optional[UUID] = None


class PresetUpdate(BaseModel):
    name:             Optional[str]       = None
    tier:             Optional[PresetTier] = None
    rings:            Optional[int]       = Field(default=None, ge=1, le=10)
    angular_step_deg: Optional[int]       = Field(default=None, ge=1, le=90)
    focus_planes:     Optional[int]       = Field(default=None, ge=1)
    stack_mode:       Optional[StackMode] = None


class PresetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:               UUID
    name:             str
    tier:             PresetTier
    rings:            int
    angular_step_deg: int
    focus_planes:     int
    stack_mode:       StackMode
    is_system:        bool
    parent_id:        Optional[UUID]
    created_at:       datetime