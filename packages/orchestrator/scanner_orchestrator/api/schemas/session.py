from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, model_validator

from scanner_shared.enums import SessionStatus, SpecimenCategory
from scanner_orchestrator.api.schemas.job   import JobRead
from scanner_orchestrator.api.schemas.asset import AssetRead
from scanner_orchestrator.api.schemas.qa    import QaCheckRead


class SessionCreate(BaseModel):
    preset_id:      UUID
    calibration_id: Optional[UUID] = None
    operator:       Optional[str]  = None
    name:           Optional[str]  = None   # nom libre de la session

    # Option A — specimen existant (specimen_id fourni)
    specimen_id:       Optional[UUID]          = None

    # Option B — création implicite (specimen_name fourni)
    specimen_name:     Optional[str]            = None
    specimen_category: SpecimenCategory         = SpecimenCategory.insect
    specimen_size_mm:  Optional[float]          = None

    @model_validator(mode='after')
    def check_specimen_source(self) -> 'SessionCreate':
        has_id   = self.specimen_id is not None
        has_name = bool(self.specimen_name)
        if not has_id and not has_name:
            raise ValueError(
                "Fournir soit specimen_id (specimen existant) "
                "soit specimen_name (création implicite)"
            )
        if has_id and has_name:
            raise ValueError(
                "Fournir specimen_id OU specimen_name, pas les deux"
            )
        return self


class SessionUpdate(BaseModel):
    operator: Optional[str] = None
    name:     Optional[str] = None


class SessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:             UUID
    name:           Optional[str]
    specimen_id:    UUID
    preset_id:      UUID
    calibration_id: Optional[UUID]
    status:         SessionStatus
    operator:       Optional[str]
    manifest_key:   Optional[str]
    is_closed:      bool
    thumbnail_key:  Optional[str]
    created_at:     datetime
    updated_at:     datetime


class SessionDetail(SessionRead):
    """SessionRead enrichi avec jobs, assets et QA checks."""
    jobs:      list[JobRead]     = []
    assets:    list[AssetRead]   = []
    qa_checks: list[QaCheckRead] = []