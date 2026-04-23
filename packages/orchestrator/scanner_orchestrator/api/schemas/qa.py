from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from scanner_shared.enums import QaCheckType


class QaCheckRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:         UUID
    session_id: UUID
    asset_id:   Optional[UUID]
    job_id:     Optional[UUID]
    check_type: QaCheckType
    passed:     bool
    score:      Optional[float]
    detail:     Optional[str]
    created_at: datetime