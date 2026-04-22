"""Constantes partagées entre daemon et orchestrateur.

Aucune logique ici — uniquement des valeurs nommées.
"""

# ── Stockage objet MinIO ──────────────────────────────────────────────────────
BUCKET_SESSIONS = "sessions"

FOLDER_RAW            = "raw"
FOLDER_STACKS         = "stacks"
FOLDER_RECONSTRUCTION = "reconstruction"
FOLDER_MESHES         = "meshes"
FOLDER_EXPORTS        = "exports"

# ── Seuils QA ────────────────────────────────────────────────────────────────
QA_MIN_ALIGNMENT_RATE     = 0.85   # taux d'alignement minimum acceptable
QA_MAX_REPROJECTION_ERROR = 1.5    # erreur RMS max en pixels
QA_MIN_SHARPNESS_SCORE    = 100.0  # variance Laplacien minimum

# ── Versionnement ─────────────────────────────────────────────────────────────
MANIFEST_SCHEMA_VERSION = "1.0"

# ── Daemon ────────────────────────────────────────────────────────────────────
DAEMON_DEFAULT_STABILIZATION_MS = 500  # délai moteur → déclenchement (ms)