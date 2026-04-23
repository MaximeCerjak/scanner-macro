from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from scanner_shared.enums import SpecimenCategory, PinStatus


class SpecimenCreate(BaseModel):
    external_id:     Optional[str]              = None
    size_mm:         Optional[float]            = Field(default=None, gt=0)
    category:        SpecimenCategory           = SpecimenCategory.insect
    pin_status:      PinStatus                  = PinStatus.pinned
    taxonomy:        Optional[dict]             = None
    collection_name: Optional[str]              = None
    notes:           Optional[str]              = None


class SpecimenUpdate(BaseModel):
    external_id:     Optional[str]              = None
    size_mm:         Optional[float]            = Field(default=None, gt=0)
    category:        Optional[SpecimenCategory] = None
    pin_status:      Optional[PinStatus]        = None
    taxonomy:        Optional[dict]             = None
    collection_name: Optional[str]              = None
    notes:           Optional[str]              = None


class SpecimenRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:              UUID
    external_id:     Optional[str]
    size_mm:         Optional[float]
    category:        SpecimenCategory
    pin_status:      PinStatus
    taxonomy:        Optional[dict]
    collection_name: Optional[str]
    notes:           Optional[str]
    created_at:      datetime