"""Client MinIO partagé.

Usage dans les routes :
    from scanner_orchestrator.storage.minio import get_minio_client, presigned_url

Toute la configuration MinIO est lue depuis settings — jamais hardcodée.
"""

from datetime import timedelta
from functools import lru_cache

from minio import Minio

from scanner_orchestrator.config import settings


@lru_cache(maxsize=1)
def get_minio_client() -> Minio:
    """
    Retourne un client MinIO partagé (singleton via lru_cache).

    lru_cache garantit qu'une seule instance est créée pour la durée
    de vie du processus — pas de reconnexion à chaque requête.
    """
    return Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_secure,
    )


def presigned_url(key: str, expires_minutes: int = 15) -> str:
    """
    Génère une URL présignée GET pour un objet dans le bucket sessions.

    Args:
        key:             Clé de l'objet dans MinIO.
        expires_minutes: Durée de validité en minutes (défaut 15).

    Returns:
        URL présignée utilisable directement par le client HTTP.
    """
    client = get_minio_client()
    return client.presigned_get_object(
        settings.minio_bucket_sessions,
        key,
        expires=timedelta(minutes=expires_minutes),
    )


def put_object(key: str, data: bytes, content_type: str) -> None:
    """
    Upload un objet dans le bucket sessions.

    Args:
        key:          Clé de destination dans MinIO.
        data:         Contenu binaire à uploader.
        content_type: MIME type (ex: 'image/jpeg').
    """
    import io
    client = get_minio_client()
    client.put_object(
        bucket_name=settings.minio_bucket_sessions,
        object_name=key,
        data=io.BytesIO(data),
        length=len(data),
        content_type=content_type,
    )


def remove_object(key: str) -> None:
    """
    Supprime un objet du bucket sessions.
    Non bloquant — les erreurs sont silencieuses (objet déjà absent, etc.).
    """
    try:
        client = get_minio_client()
        client.remove_object(settings.minio_bucket_sessions, key)
    except Exception:
        pass