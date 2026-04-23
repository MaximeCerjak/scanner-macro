from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CalibrationCreate(BaseModel):
    camera_model: str
    lens_model:   str
    fx:           float = Field(gt=0)
    fy:           float = Field(gt=0)
    cx:           float
    cy:           float
    dist_coeffs:  dict  = Field(default_factory=dict)
    profile_hash: str
    notes:        Optional[str] = None


class CalibrationUpdate(BaseModel):
    notes: Optional[str] = None


class CalibrationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:           UUID
    camera_model: str
    lens_model:   str
    fx:           float
    fy:           float
    cx:           float
    cy:           float
    dist_coeffs:  dict
    profile_hash: str
    notes:        Optional[str]
    created_at:   datetime