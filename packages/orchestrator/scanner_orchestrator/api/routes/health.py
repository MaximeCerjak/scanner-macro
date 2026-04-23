"""GET /health — endpoint de santé."""

import redis as redis_lib
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from minio import Minio
from sqlalchemy import text

from scanner_orchestrator.config import settings
from scanner_orchestrator.db.database import engine

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> JSONResponse:
    result: dict[str, str] = {"version": "0.1.0"}
    status_code = 200

    # BDD
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        result["db"] = "ok"
    except Exception as e:
        result["db"] = f"error: {e}"
        status_code = 503

    # Redis
    try:
        r = redis_lib.from_url(settings.celery_broker_url, socket_connect_timeout=2)
        r.ping()
        result["redis"] = "ok"
    except Exception as e:
        result["redis"] = f"error: {e}"
        status_code = 503

    # MinIO
    try:
        client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure,
        )
        client.list_buckets()
        result["minio"] = "ok"
    except Exception as e:
        result["minio"] = f"error: {e}"
        status_code = 503

    result["status"] = "ok" if status_code == 200 else "degraded"
    return JSONResponse(content=result, status_code=status_code)