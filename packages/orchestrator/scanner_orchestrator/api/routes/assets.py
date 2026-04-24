"""Endpoints /assets."""

from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session as DbSession

from scanner_orchestrator.api.exceptions import NotFoundError
from scanner_orchestrator.api.schemas.asset import AssetRead
from scanner_orchestrator.db.database import get_db
from scanner_orchestrator.db.models import Asset
from scanner_orchestrator.storage.minio import presigned_url
from scanner_shared.enums import AssetType

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("", response_model=list[AssetRead])
def list_assets(
    session_id: UUID | None     = None,
    asset_type: AssetType | None = None,
    db: DbSession = Depends(get_db),
):
    q = db.query(Asset)
    if session_id:
        q = q.filter(Asset.session_id == session_id)
    if asset_type:
        q = q.filter(Asset.asset_type == asset_type)
    return q.all()


@router.get("/{asset_id}", response_model=AssetRead)
def get_asset(asset_id: UUID, db: DbSession = Depends(get_db)):
    a = db.get(Asset, asset_id)
    if not a:
        raise NotFoundError("Asset", asset_id)
    return a


@router.get("/{asset_id}/download")
def download_asset(asset_id: UUID, db: DbSession = Depends(get_db)):
    """Redirige vers une URL présignée MinIO valable 15 minutes."""
    a = db.get(Asset, asset_id)
    if not a:
        raise NotFoundError("Asset", asset_id)
    url = presigned_url(a.key, expires_minutes=15)
    return RedirectResponse(url=url, status_code=307)