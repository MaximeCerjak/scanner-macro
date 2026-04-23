"""Configuration centralisée via pydantic-settings.

Toutes les variables d'environnement passent par ici.
Aucune lecture directe de os.getenv dans le code métier.

Usage :
    from scanner_orchestrator.config import settings
    db_url = settings.database_url

Dans les tests :
    Settings(database_url="sqlite:///:memory:")
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    database_url: str = "sqlite:///./scanner.db"
    db_echo: bool = False

    # Celery
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"

    # MinIO
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket_sessions: str = "sessions"
    minio_secure: bool = False

    # Orchestrator
    orchestrator_host: str = "0.0.0.0"
    orchestrator_port: int = 8001


settings = Settings()