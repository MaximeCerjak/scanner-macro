from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from scanner_shared.enums import SessionStatus
from scanner_orchestrator.api.schemas.job import JobRead
from scanner_orchestrator.api.schemas.asset import AssetRead
from scanner_orchestrator.api.schemas.qa import QaCheckRead


class SessionCreate(BaseModel):
    specimen_id:    UUID
    preset_id:      UUID
    calibration_id: Optional[UUID] = None
    operator:       Optional[str]  = None


class SessionUpdate(BaseModel):
    operator: Optional[str] = None


class SessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:             UUID
    specimen_id:    UUID
    preset_id:      UUID
    calibration_id: Optional[UUID]
    status:         SessionStatus
    operator:       Optional[str]
    manifest_key:   Optional[str]
    is_closed:      bool
    created_at:     datetime
    updated_at:     datetime


class SessionDetail(SessionRead):
    """SessionRead enrichi avec jobs, assets et QA checks."""
    jobs:      list[JobRead]     = []
    assets:    list[AssetRead]   = []
    qa_checks: list[QaCheckRead] = []