"""Smoke test — vérifie que le package s'importe correctement.

Les tests réels du package `shared` seront écrits au chapitre 02, une fois
les enums et contrats rédigés.
"""

import scanner_shared


def test_import() -> None:
    """Le package doit être importable et exposer sa version."""
    assert scanner_shared.__version__ == "0.1.0"
