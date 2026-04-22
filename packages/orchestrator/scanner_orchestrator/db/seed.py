"""Seed des données système — idempotent, ré-exécutable sans doublons."""

import logging

from sqlalchemy.orm import Session

from scanner_orchestrator.db.models import CapturePreset, ExportProfile
from scanner_shared.enums import PresetTier, StackMode

logger = logging.getLogger(__name__)


# ── Presets système ───────────────────────────────────────────────────────────

SYSTEM_PRESETS = [
    {
        "name": "Rapide — 5 à 50 mm",
        "tier": PresetTier.fast,
        "rings": 2,
        "angular_step_deg": 15,
        "focus_planes": 1,
        "stack_mode": StackMode.none,
        "is_system": True,
    },
    {
        "name": "Standard — 5 à 20 mm",
        "tier": PresetTier.standard,
        "rings": 3,
        "angular_step_deg": 15,
        "focus_planes": 20,
        "stack_mode": StackMode.light,
        "is_system": True,
    },
    {
        "name": "Standard — 3 à 8 mm",
        "tier": PresetTier.standard,
        "rings": 3,
        "angular_step_deg": 10,
        "focus_planes": 40,
        "stack_mode": StackMode.full,
        "is_system": True,
    },
    {
        "name": "Haute fidélité — insecte 5 à 15 mm",
        "tier": PresetTier.high_fidelity,
        "rings": 4,
        "angular_step_deg": 10,
        "focus_planes": 80,
        "stack_mode": StackMode.full,
        "is_system": True,
    },
]

# ── Profils d'export système ──────────────────────────────────────────────────

SYSTEM_EXPORT_PROFILES = [
    {
        "name": "Web — GLB optimisé",
        "formats": ["glb"],
        "lod_levels": 3,
        "texture_resolution": 2048,
        "is_system": True,
    },
    {
        "name": "Master — qualité maximale",
        "formats": ["obj", "glb"],
        "lod_levels": 1,
        "texture_resolution": 8192,
        "is_system": True,
    },
    {
        "name": "Complet — tous formats + LOD",
        "formats": ["glb", "obj", "stl"],
        "lod_levels": 4,
        "texture_resolution": 4096,
        "is_system": True,
    },
]


def seed(db: Session) -> None:
    """Peuple les données système. Idempotent — pas de doublons."""

    # Presets
    existing_preset_names = {
        row[0] for row in db.query(CapturePreset.name).all()
    }
    inserted_presets = 0
    for data in SYSTEM_PRESETS:
        if data["name"] not in existing_preset_names:
            db.add(CapturePreset(**data))
            logger.info("Preset créé : %s", data["name"])
            inserted_presets += 1

    # Profils d'export
    existing_profile_names = {
        row[0] for row in db.query(ExportProfile.name).all()
    }
    inserted_profiles = 0
    for data in SYSTEM_EXPORT_PROFILES:
        if data["name"] not in existing_profile_names:
            db.add(ExportProfile(**data))
            logger.info("Export profile créé : %s", data["name"])
            inserted_profiles += 1

    db.commit()

    print(
        f"Seed terminé — "
        f"{inserted_presets} preset(s) insérés, "
        f"{inserted_profiles} profil(s) d'export insérés."
    )