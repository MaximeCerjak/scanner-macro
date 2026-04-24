"""CRUD /specimens."""

from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import RedirectResponse
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DbSession

from scanner_orchestrator.api.exceptions import ConflictError, NotFoundError
from scanner_orchestrator.api.schemas.specimen import (
    SpecimenCreate, SpecimenRead, SpecimenUpdate,
)
from scanner_orchestrator.db.database import get_db
from scanner_orchestrator.db.models import Specimen
from scanner_orchestrator.storage.minio import presigned_url, put_object, remove_object
from scanner_shared.enums import SpecimenCategory

router = APIRouter(prefix="/specimens", tags=["specimens"])

ALLOWED_THUMBNAIL_TYPES = {"image/jpeg", "image/png"}


# ── Listing + recherche ───────────────────────────────────────────────────────

@router.get("", response_model=list[SpecimenRead])
def list_specimens(
    limit:    int                     = 50,
    offset:   int                     = 0,
    category: SpecimenCategory | None = None,
    search:   str | None              = Query(default=None, description="Recherche par name"),
    db: DbSession = Depends(get_db),
):
    q = db.query(Specimen)
    if category:
        q = q.filter(Specimen.category == category)
    if search:
        q = q.filter(func.lower(Specimen.name).contains(search.lower()))
    return q.order_by(Specimen.name).offset(offset).limit(min(limit, 200)).all()


# NOTE : /search doit être déclaré AVANT /{specimen_id}
# sinon FastAPI interprète "search" comme un UUID et retourne 422.
@router.get("/search", response_model=list[SpecimenRead])
def search_specimens(
    q:        str                     = Query(..., min_length=1),
    category: SpecimenCategory | None = None,
    limit:    int                     = 10,
    db: DbSession = Depends(get_db),
):
    """Autocomplétion pour la modale NewSession."""
    query = db.query(Specimen).filter(
        func.lower(Specimen.name).contains(q.lower())
    )
    if category:
        query = query.filter(Specimen.category == category)
    return query.limit(min(limit, 20)).all()


# ── CRUD standard ─────────────────────────────────────────────────────────────

@router.post("", response_model=SpecimenRead, status_code=status.HTTP_201_CREATED)
def create_specimen(payload: SpecimenCreate, db: DbSession = Depends(get_db)):
    specimen = Specimen(**payload.model_dump())
    db.add(specimen)
    try:
        db.flush()
    except IntegrityError:
        raise ConflictError("external_id déjà utilisé")
    return specimen


@router.get("/{specimen_id}", response_model=SpecimenRead)
def get_specimen(specimen_id: UUID, db: DbSession = Depends(get_db)):
    s = db.get(Specimen, specimen_id)
    if not s:
        raise NotFoundError("Specimen", specimen_id)
    return s


@router.patch("/{specimen_id}", response_model=SpecimenRead)
def update_specimen(
    specimen_id: UUID,
    payload: SpecimenUpdate,
    db: DbSession = Depends(get_db),
):
    s = db.get(Specimen, specimen_id)
    if not s:
        raise NotFoundError("Specimen", specimen_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(s, field, value)
    db.flush()
    return s


@router.delete("/{specimen_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_specimen(specimen_id: UUID, db: DbSession = Depends(get_db)):
    s = db.get(Specimen, specimen_id)
    if not s:
        raise NotFoundError("Specimen", specimen_id)
    try:
        db.delete(s)
        db.flush()
    except IntegrityError:
        raise ConflictError("Ce specimen a des sessions associées et ne peut pas être supprimé")


# ── Thumbnail ─────────────────────────────────────────────────────────────────

@router.post("/{specimen_id}/thumbnail", response_model=SpecimenRead)
async def upload_thumbnail(
    specimen_id: UUID,
    file: UploadFile = File(...),
    db: DbSession = Depends(get_db),
):
    """Upload JPEG ou PNG comme thumbnail. Stocké dans MinIO, clé sauvegardée en BDD."""
    s = db.get(Specimen, specimen_id)
    if not s:
        raise NotFoundError("Specimen", specimen_id)

    if file.content_type not in ALLOWED_THUMBNAIL_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Format non supporté : {file.content_type}. Acceptés : JPEG, PNG",
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=422, detail="Fichier vide")

    ext = "jpg" if file.content_type == "image/jpeg" else "png"
    key = f"specimens/{specimen_id}/thumbnail.{ext}"

    # Supprimer l'ancienne si extension différente (jpg → png ou inverse)
    if s.thumbnail_key and s.thumbnail_key != key:
        remove_object(s.thumbnail_key)

    put_object(key=key, data=content, content_type=file.content_type)

    s.thumbnail_key = key
    db.flush()
    return s


@router.get("/{specimen_id}/thumbnail")
def get_thumbnail(specimen_id: UUID, db: DbSession = Depends(get_db)):
    """Redirige (307) vers une URL présignée MinIO valable 15 minutes."""
    s = db.get(Specimen, specimen_id)
    if not s:
        raise NotFoundError("Specimen", specimen_id)
    if not s.thumbnail_key:
        raise HTTPException(status_code=404, detail="Pas de thumbnail pour ce specimen")

    url = presigned_url(s.thumbnail_key, expires_minutes=15)
    return RedirectResponse(url=url, status_code=307)