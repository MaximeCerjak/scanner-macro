from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from scanner_shared.enums import JobType, JobStatus


class JobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:         UUID
    session_id: UUID
    type:       JobType
    status:     JobStatus
    attempt:    int
    started_at: Optional[datetime]
    ended_at:   Optional[datetime]
    duration_s: Optional[float]
    error_log:  Optional[str]
    created_at: datetime