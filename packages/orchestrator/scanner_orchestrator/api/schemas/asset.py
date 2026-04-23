from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from scanner_shared.enums import AssetType


class AssetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:              UUID
    session_id:      UUID
    job_id:          Optional[UUID]
    bucket:          str
    key:             str
    checksum_sha256: Optional[str]
    size_bytes:      Optional[int]
    asset_type:      AssetType
    created_at:      datetime