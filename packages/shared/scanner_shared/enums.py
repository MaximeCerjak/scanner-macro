"""Enums du domaine scanner.

Tous héritent de (str, Enum) : sérialisables JSON sans conversion,
comparables à des strings, compatibles SQLAlchemy et Pydantic.
"""

import enum


class SessionStatus(str, enum.Enum):
    draft       = "draft"
    acquiring   = "acquiring"
    acquired    = "acquired"
    processing  = "processing"
    processed   = "processed"
    exporting   = "exporting"
    done        = "done"
    failed      = "failed"


# Transitions autorisées : toute autre doit lever ValueError dans l'orchestrateur.
SESSION_TRANSITIONS: dict[SessionStatus, set[SessionStatus]] = {
    SessionStatus.draft:      {SessionStatus.acquiring},
    SessionStatus.acquiring:  {SessionStatus.acquired,  SessionStatus.failed},
    SessionStatus.acquired:   {SessionStatus.processing, SessionStatus.failed},
    SessionStatus.processing: {SessionStatus.processed,  SessionStatus.failed},
    SessionStatus.processed:  {SessionStatus.exporting,  SessionStatus.failed},
    SessionStatus.exporting:  {SessionStatus.done,       SessionStatus.failed},
    SessionStatus.done:       set(),
    SessionStatus.failed:     {SessionStatus.draft},
}


def validate_session_transition(
    current: SessionStatus,
    target: SessionStatus,
) -> None:
    """Lève ValueError si la transition current → target est interdite."""
    allowed = SESSION_TRANSITIONS.get(current, set())
    if target not in allowed:
        raise ValueError(
            f"Transition de session interdite : {current!r} → {target!r}. "
            f"Transitions autorisées depuis {current!r} : "
            f"{sorted(s.value for s in allowed) or '[]'}"
        )


class JobType(str, enum.Enum):
    transfer        = "transfer"
    stacking        = "stacking"
    photogrammetry  = "photogrammetry"
    post_processing = "post_processing"
    export          = "export"
    qa              = "qa"


class JobStatus(str, enum.Enum):
    pending   = "pending"
    running   = "running"
    success   = "success"
    failed    = "failed"
    retrying  = "retrying"
    cancelled = "cancelled"


class AssetType(str, enum.Enum):
    raw              = "raw"
    edof_stack       = "edof_stack"
    sparse_cloud     = "sparse_cloud"
    dense_cloud      = "dense_cloud"
    mesh_raw         = "mesh_raw"
    mesh_clean       = "mesh_clean"
    texture          = "texture"
    export_glb       = "export_glb"
    export_obj       = "export_obj"
    export_stl       = "export_stl"
    manifest         = "manifest"
    calibration_data = "calibration_data"


class SpecimenCategory(str, enum.Enum):
    insect           = "insect"
    arachnid         = "arachnid"
    other_arthropod  = "other_arthropod"
    mineral          = "mineral"
    jewel            = "jewel"
    watchmaking      = "watchmaking"
    miniature        = "miniature"
    artifact         = "artifact"
    other            = "other"


class PinStatus(str, enum.Enum):
    pinned         = "pinned"
    point_mounted  = "point_mounted"
    special_mount  = "special_mount"
    free           = "free"


class StackMode(str, enum.Enum):
    none  = "none"
    light = "light"
    full  = "full"


class PresetTier(str, enum.Enum):
    fast          = "fast"
    standard      = "standard"
    high_fidelity = "high_fidelity"


class LicenseType(str, enum.Enum):
    private   = "private"
    cc_by_4   = "cc_by_4"
    cc_by_nc  = "cc_by_nc"
    cc0       = "cc0"


class QaCheckType(str, enum.Enum):
    sharpness_laplacian = "sharpness_laplacian"
    alignment_rate      = "alignment_rate"
    reprojection_error  = "reprojection_error"
    mesh_holes          = "mesh_holes"
    texture_coverage    = "texture_coverage"
    checksum            = "checksum"
    scale_consistency   = "scale_consistency"