"""Smoke test du daemon. Les vrais tests arrivent au chapitre 05."""

import scanner_daemon


def test_import() -> None:
    assert scanner_daemon.__version__ == "0.1.0"
