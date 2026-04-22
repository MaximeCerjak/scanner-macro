"""Scanner Orchestrator — API, workers et base de données.

Composant central du système. Tourne sur le poste opérateur (ou un
serveur local). Responsabilités :

- Exposer l'API REST + WebSocket (FastAPI) consommée par l'app desktop.
- Persister les entités métier en base (Specimen, Session, Job, Asset...).
- Enqueuer et exécuter les jobs de traitement (Celery + Redis).
- Servir les assets via URLs présignées MinIO.

Sous-modules à créer dans les chapitres suivants :

- `scanner_orchestrator.api`        — chapitre 04 (FastAPI)
- `scanner_orchestrator.db`         — chapitre 03 (SQLAlchemy + Alembic)
- `scanner_orchestrator.workers`    — chapitre 06 (Celery tasks)
- `scanner_orchestrator.storage`    — chapitre 04 (wrapper MinIO)
- `scanner_orchestrator.config`     — chapitre 04 (pydantic-settings)
"""

__version__ = "0.1.0"
