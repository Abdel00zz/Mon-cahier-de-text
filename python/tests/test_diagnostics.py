"""Journal d'incidents : écriture, rotation, et remplacement de l'arrêt brutal."""

from __future__ import annotations

import sys

import pytest

from app import diagnostics
from app.core.i18n import Translator
from app.core.models import Locale


@pytest.fixture
def isolated_log(tmp_path, monkeypatch):
    monkeypatch.setattr(diagnostics, "log_dir", lambda: tmp_path)
    return tmp_path


def _boom() -> None:
    raise ValueError("valeur refusée")


def test_record_writes_the_traceback(isolated_log) -> None:
    assert isolated_log.is_dir()
    try:
        _boom()
    except ValueError as error:
        target = diagnostics.record(type(error), error, error.__traceback__)

    assert target is not None
    text = target.read_text(encoding="utf-8")
    assert "ValueError: valeur refusée" in text
    assert "test_diagnostics.py" in text
    assert text.startswith("\n=== ")


def test_log_rotates_when_it_grows(isolated_log) -> None:
    target = diagnostics.log_path()
    target.write_text("x" * (diagnostics.MAX_BYTES + 1), encoding="utf-8")

    try:
        _boom()
    except ValueError as error:
        diagnostics.record(type(error), error, error.__traceback__)

    rotated = isolated_log / "incidents.1.log"
    assert rotated.exists()
    assert "ValueError" in target.read_text(encoding="utf-8")


def test_record_never_raises_when_the_disk_refuses(isolated_log) -> None:
    blocked = isolated_log / "bloque"
    blocked.write_text("je suis un fichier, pas un dossier", encoding="utf-8")
    diagnostics.log_path = lambda: blocked / "incidents.log"  # type: ignore[assignment]
    try:
        try:
            _boom()
        except ValueError as error:
            assert diagnostics.record(type(error), error, error.__traceback__) is None
    finally:
        del diagnostics.log_path


def test_install_replaces_the_aborting_hook() -> None:
    original = sys.excepthook
    try:
        diagnostics.install(Translator(Locale.FR))
        assert sys.excepthook is not original
    finally:
        sys.excepthook = original


def test_the_incident_message_is_translated() -> None:
    for locale in Locale:
        t = Translator(locale)
        assert t("error.unexpected_title") != "error.unexpected_title"
        assert t("error.unexpected_hint") != "error.unexpected_hint"
