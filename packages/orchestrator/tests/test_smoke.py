"""Smoke test de l'orchestrator. Les vrais tests arrivent aux chapitres 03 et 04."""

import scanner_orchestrator


def test_import() -> None:
    assert scanner_orchestrator.__version__ == "0.1.0"
