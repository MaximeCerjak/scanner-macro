"""Scanner Shared — enums, naming conventions et contrats partagés.

Exports publics du package. Les autres modules importent depuis ici
ou directement depuis les sous-modules.

Règle absolue : ce package n'importe JAMAIS scanner_daemon
ni scanner_orchestrator. Toute violation crée un cycle d'import.
"""

from scanner_shared.enums import (
    SessionStatus,
    SESSION_TRANSITIONS,
    validate_session_transition,
    JobType,
    JobStatus,
    AssetType,
    SpecimenCategory,
    PinStatus,
    StackMode,
    PresetTier,
    LicenseType,
    QaCheckType,
)
from scanner_shared.constants import (
    BUCKET_SESSIONS,
    FOLDER_RAW,
    FOLDER_STACKS,
    FOLDER_RECONSTRUCTION,
    FOLDER_MESHES,
    FOLDER_EXPORTS,
    QA_MIN_ALIGNMENT_RATE,
    QA_MAX_REPROJECTION_ERROR,
    QA_MIN_SHARPNESS_SCORE,
    MANIFEST_SCHEMA_VERSION,
    DAEMON_DEFAULT_STABILIZATION_MS,
)
from scanner_shared.naming import raw_key, edof_key, parse_raw_key, group_by_position
from scanner_shared.schemas.manifest import SessionManifest

__version__ = "0.1.0"

__all__ = [
    # Enums
    "SessionStatus", "SESSION_TRANSITIONS", "validate_session_transition",
    "JobType", "JobStatus", "AssetType", "SpecimenCategory", "PinStatus",
    "StackMode", "PresetTier", "LicenseType", "QaCheckType",
    # Constants
    "BUCKET_SESSIONS", "FOLDER_RAW", "FOLDER_STACKS", "FOLDER_RECONSTRUCTION",
    "FOLDER_MESHES", "FOLDER_EXPORTS", "QA_MIN_ALIGNMENT_RATE",
    "QA_MAX_REPROJECTION_ERROR", "QA_MIN_SHARPNESS_SCORE",
    "MANIFEST_SCHEMA_VERSION", "DAEMON_DEFAULT_STABILIZATION_MS",
    # Naming
    "raw_key", "edof_key", "parse_raw_key", "group_by_position",
    # Schemas
    "SessionManifest",
]