"""Tests unitaires du package scanner_shared.

Priorité : raw_key, parse_raw_key, group_by_position (critiques pour
le worker stacking). Puis les enums et le manifeste.
"""

import pytest
from datetime import datetime, timezone

from scanner_shared.naming import raw_key, edof_key, parse_raw_key, group_by_position
from scanner_shared.enums import SessionStatus, validate_session_transition
from scanner_shared.schemas.manifest import (
    SessionManifest, ManifestPreset, ManifestCalibration,
    ManifestAcquisition, ManifestFile,
)
from scanner_shared.constants import MANIFEST_SCHEMA_VERSION


# ── naming : raw_key ─────────────────────────────────────────────────────────

def test_raw_key_format() -> None:
    key = raw_key("a3f2c1d4", 2, 45, 87, "CR3")
    assert key == "a3f2c1d4/raw/ring02_angle045_z0087.CR3"


def test_raw_key_zero_padding() -> None:
    key = raw_key("sess", 1, 0, 1, "ARW")
    assert key == "sess/raw/ring01_angle000_z0001.ARW"


def test_raw_key_max_values() -> None:
    key = raw_key("sess", 99, 359, 9999, "DNG")
    assert key == "sess/raw/ring99_angle359_z9999.DNG"


def test_raw_key_invalid_ring() -> None:
    with pytest.raises(ValueError, match="ring"):
        raw_key("sess", 0, 0, 1)


def test_raw_key_invalid_angle() -> None:
    with pytest.raises(ValueError, match="angle_deg"):
        raw_key("sess", 1, 360, 1)


def test_raw_key_invalid_z() -> None:
    with pytest.raises(ValueError, match="z_index"):
        raw_key("sess", 1, 0, 0)


# ── naming : parse_raw_key ───────────────────────────────────────────────────

def test_parse_raw_key_roundtrip() -> None:
    """raw_key puis parse_raw_key doit redonner les mêmes valeurs."""
    key = raw_key("a3f2c1d4", 2, 45, 87, "CR3")
    parsed = parse_raw_key(key)
    assert parsed["session_id"] == "a3f2c1d4"
    assert parsed["ring"]       == 2
    assert parsed["angle"]      == 45
    assert parsed["z_index"]    == 87
    assert parsed["ext"]        == "CR3"


def test_parse_raw_key_invalid() -> None:
    with pytest.raises(ValueError, match="Clé RAW invalide"):
        parse_raw_key("invalid/path/without/format")


def test_parse_raw_key_wrong_folder() -> None:
    with pytest.raises(ValueError):
        parse_raw_key("sess/stacks/ring01_angle000_z0001.jpg")


# ── naming : group_by_position ───────────────────────────────────────────────

def test_group_by_position_basic() -> None:
    keys = [
        "s1/raw/ring01_angle000_z0002.CR3",
        "s1/raw/ring01_angle000_z0001.CR3",  # z_index plus petit → doit être en premier
        "s1/raw/ring01_angle045_z0001.CR3",
        "s1/raw/ring02_angle000_z0001.CR3",
    ]
    groups = group_by_position(keys)
    assert len(groups) == 3
    # Vérifie le tri par z_index
    assert groups[(1, 0)][0].endswith("z0001.CR3")
    assert groups[(1, 0)][1].endswith("z0002.CR3")


def test_group_by_position_single_key() -> None:
    keys = ["s1/raw/ring03_angle090_z0010.ARW"]
    groups = group_by_position(keys)
    assert groups == {(3, 90): ["s1/raw/ring03_angle090_z0010.ARW"]}


def test_group_by_position_empty() -> None:
    assert group_by_position([]) == {}


def test_group_by_position_ten_keys() -> None:
    """Test sur 10 clés fictives couvrant 3 rings et 2 angles."""
    keys = [
        raw_key("sid", ring, angle, z)
        for ring in [1, 2, 3]
        for angle in [0, 90]
        for z in [1, 2]
        if not (ring == 3 and angle == 90)  # 10 clés exactement
    ]
    assert len(keys) == 10
    groups = group_by_position(keys)
    assert len(groups) == 5  # (1,0), (1,90), (2,0), (2,90), (3,0)
    for group_keys in groups.values():
        # Chaque groupe est trié par z_index
        z_indices = [int(parse_raw_key(k)["z_index"]) for k in group_keys]
        assert z_indices == sorted(z_indices)


# ── enums : SessionStatus transitions ────────────────────────────────────────

def test_valid_transition_draft_to_acquiring() -> None:
    validate_session_transition(SessionStatus.draft, SessionStatus.acquiring)


def test_valid_transition_failed_to_draft() -> None:
    validate_session_transition(SessionStatus.failed, SessionStatus.draft)


def test_invalid_transition_draft_to_done() -> None:
    with pytest.raises(ValueError, match="interdite"):
        validate_session_transition(SessionStatus.draft, SessionStatus.done)


def test_invalid_transition_done_to_anything() -> None:
    with pytest.raises(ValueError):
        validate_session_transition(SessionStatus.done, SessionStatus.draft)


def test_enum_is_str() -> None:
    """Les enums doivent être directement utilisables comme strings JSON."""
    assert SessionStatus.draft == "draft"
    assert SessionStatus.acquiring == "acquiring"
    assert SessionStatus.acquiring.value == "acquiring"


# ── schemas : SessionManifest ────────────────────────────────────────────────

def _make_manifest(image_count: int = 2) -> SessionManifest:
    now = datetime(2026, 4, 22, 12, 0, 0, tzinfo=timezone.utc)
    return SessionManifest(
        session_id="test-session-id",
        created_at=now,
        daemon_version="0.1.0",
        preset=ManifestPreset(
            id="preset-id", name="Test preset",
            rings=3, angular_step_deg=10, focus_planes=20,
        ),
        calibration=ManifestCalibration(
            profile_id="cal-id", profile_hash="abc123"
        ),
        acquisition=ManifestAcquisition(
            started_at=now, ended_at=now,
            duration_s=120.0, image_count=image_count,
            camera_model="mock", lens_model="mock",
        ),
        files=[
            ManifestFile(
                key=raw_key("test-session-id", 1, i * 10, 1),
                checksum_sha256="abc" * 20,
                size_bytes=1024,
            )
            for i in range(image_count)
        ],
    )


def test_manifest_schema_version() -> None:
    m = _make_manifest()
    assert m.schema_version == MANIFEST_SCHEMA_VERSION


def test_manifest_key() -> None:
    m = _make_manifest()
    assert m.manifest_key() == "test-session-id/manifest.json"


def test_manifest_validate_file_count_ok() -> None:
    m = _make_manifest(image_count=2)
    m.validate_file_count()  # ne doit pas lever


def test_manifest_validate_file_count_mismatch() -> None:
    m = _make_manifest(image_count=2)
    m.acquisition = m.acquisition.model_copy(update={"image_count": 99})
    with pytest.raises(ValueError, match="Incohérence manifeste"):
        m.validate_file_count()


def test_manifest_json_roundtrip() -> None:
    """Sérialisation JSON puis reconstruction Pydantic."""
    m = _make_manifest()
    json_str = m.model_dump_json()
    m2 = SessionManifest.model_validate_json(json_str)
    assert m2.session_id == m.session_id
    assert len(m2.files) == len(m.files)