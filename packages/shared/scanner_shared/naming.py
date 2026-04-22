"""Conventions de nommage des clés MinIO.

Utilisé par le daemon pour écrire et par l'orchestrateur pour lire.
Ces fonctions sont pures : aucun effet de bord, aucun I/O.
"""

import re


# ── Format : {session_id}/raw/ring{RR}_angle{AAA}_z{ZZZZ}.{ext}
_RAW_PATTERN = re.compile(
    r"^(?P<session_id>[^/]+)/raw/"
    r"ring(?P<ring>\d{2})_"
    r"angle(?P<angle>\d{3})_"
    r"z(?P<z_index>\d{4})"
    r"\.(?P<ext>[a-zA-Z0-9]+)$"
)


def raw_key(
    session_id: str,
    ring: int,
    angle_deg: int,
    z_index: int,
    ext: str = "CR3",
) -> str:
    """Clé MinIO d'un fichier RAW.

    >>> raw_key("a3f2c1d4", 2, 45, 87, "CR3")
    'a3f2c1d4/raw/ring02_angle045_z0087.CR3'
    """
    if not 1 <= ring <= 99:
        raise ValueError(f"ring doit être entre 1 et 99, reçu : {ring}")
    if not 0 <= angle_deg <= 359:
        raise ValueError(f"angle_deg doit être entre 0 et 359, reçu : {angle_deg}")
    if not 1 <= z_index <= 9999:
        raise ValueError(f"z_index doit être entre 1 et 9999, reçu : {z_index}")

    return (
        f"{session_id}/raw/"
        f"ring{ring:02d}_"
        f"angle{angle_deg:03d}_"
        f"z{z_index:04d}"
        f".{ext}"
    )


def edof_key(
    session_id: str,
    ring: int,
    angle_deg: int,
    ext: str = "jpg",
) -> str:
    """Clé MinIO d'une image EDOF (résultat du focus stacking).

    >>> edof_key("a3f2c1d4", 2, 45)
    'a3f2c1d4/stacks/ring02_angle045.jpg'
    """
    if not 1 <= ring <= 99:
        raise ValueError(f"ring doit être entre 1 et 99, reçu : {ring}")
    if not 0 <= angle_deg <= 359:
        raise ValueError(f"angle_deg doit être entre 0 et 359, reçu : {angle_deg}")

    return (
        f"{session_id}/stacks/"
        f"ring{ring:02d}_"
        f"angle{angle_deg:03d}"
        f".{ext}"
    )


def parse_raw_key(key: str) -> dict[str, object]:
    """Extrait les composants d'une clé RAW.

    Retourne un dict avec : session_id, ring (int), angle (int),
    z_index (int), ext (str).

    Lève ValueError si la clé ne respecte pas le format attendu.

    >>> parse_raw_key("a3f2c1d4/raw/ring02_angle045_z0087.CR3")
    {'session_id': 'a3f2c1d4', 'ring': 2, 'angle': 45, 'z_index': 87, 'ext': 'CR3'}
    """
    m = _RAW_PATTERN.match(key)
    if not m:
        raise ValueError(
            f"Clé RAW invalide : {key!r}. "
            "Format attendu : {{session_id}}/raw/ring{{RR}}_angle{{AAA}}_z{{ZZZZ}}.{{ext}}"
        )
    return {
        "session_id": m.group("session_id"),
        "ring":       int(m.group("ring")),
        "angle":      int(m.group("angle")),
        "z_index":    int(m.group("z_index")),
        "ext":        m.group("ext"),
    }


def group_by_position(
    keys: list[str],
) -> dict[tuple[int, int], list[str]]:
    """Groupe des clés RAW par (ring, angle).

    Retourne un dict dont les clés sont des tuples (ring, angle)
    et les valeurs sont les listes de clés RAW correspondantes,
    triées par z_index croissant.

    Utilisé par le worker stacking pour construire les piles de focus.

    >>> keys = [
    ...     "s1/raw/ring01_angle000_z0001.CR3",
    ...     "s1/raw/ring01_angle000_z0002.CR3",
    ...     "s1/raw/ring01_angle045_z0001.CR3",
    ... ]
    >>> group_by_position(keys)
    {(1, 0): ['s1/raw/ring01_angle000_z0001.CR3', 's1/raw/ring01_angle000_z0002.CR3'],
     (1, 45): ['s1/raw/ring01_angle045_z0001.CR3']}
    """
    groups: dict[tuple[int, int], list[str]] = {}
    for key in keys:
        parsed = parse_raw_key(key)
        position = (int(parsed["ring"]), int(parsed["angle"]))
        groups.setdefault(position, []).append(key)

    # Trier chaque groupe par z_index croissant
    for position in groups:
        groups[position].sort(
            key=lambda k: int(parse_raw_key(k)["z_index"])
        )

    return groups