"""Schéma du manifeste JSON produit par le daemon.

Le daemon écrit ce document à la fin de l'acquisition et le pousse
dans MinIO. L'orchestrateur le lit pour valider la session et démarrer
le pipeline de traitement.

Règle : ce fichier ne doit jamais importer scanner_daemon
ni scanner_orchestrator.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from scanner_shared.constants import MANIFEST_SCHEMA_VERSION


class ManifestPreset(BaseModel):
    """Preset d'acquisition utilisé pour cette session."""
    id:               str
    name:             str
    rings:            int = Field(ge=1, le=9)
    angular_step_deg: int = Field(ge=1, le=90)
    focus_planes:     int = Field(ge=1, le=500)


class ManifestCalibration(BaseModel):
    """Référence au profil de calibration optique utilisé."""
    profile_id:   str
    profile_hash: str  # SHA-256 du profil, pour traçabilité


class ManifestAcquisition(BaseModel):
    """Métriques de la session d'acquisition."""
    started_at:   datetime
    ended_at:     datetime
    duration_s:   float = Field(ge=0)
    image_count:  int   = Field(ge=0)
    camera_model: str   # à compléter au chapitre 05
    lens_model:   str   # à compléter au chapitre 05


class ManifestFile(BaseModel):
    """Référence à un fichier RAW transféré."""
    key:              str   # clé MinIO, format défini dans naming.py
    checksum_sha256:  str   # hex digest SHA-256
    size_bytes:       int   = Field(ge=0)


class SessionManifest(BaseModel):
    """Document racine du manifeste de session.

    Écrit par le daemon, lu par l'orchestrateur.
    schema_version permet de gérer les migrations de format.
    """
    schema_version: str         = Field(default=MANIFEST_SCHEMA_VERSION)
    session_id:     str
    created_at:     datetime
    daemon_version: str
    preset:         ManifestPreset
    calibration:    ManifestCalibration
    acquisition:    ManifestAcquisition
    files:          list[ManifestFile] = Field(default_factory=list)

    def manifest_key(self) -> str:
        """Clé MinIO du manifeste lui-même dans le bucket sessions."""
        return f"{self.session_id}/manifest.json"

    def validate_file_count(self) -> None:
        """Vérifie que image_count correspond au nombre de fichiers déclarés."""
        if len(self.files) != self.acquisition.image_count:
            raise ValueError(
                f"Incohérence manifeste : image_count={self.acquisition.image_count} "
                f"mais {len(self.files)} fichiers déclarés."
            )