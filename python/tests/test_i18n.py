"""Traductions : aucune clé manquante, aucun libellé vide, repli sûr."""

from __future__ import annotations

import pytest

from app.core.i18n import _STRINGS, Translator, keys, missing_translations
from app.core.models import Locale


def test_every_key_exists_in_the_three_languages() -> None:
    assert missing_translations() == {}


def test_no_empty_label() -> None:
    for key, values in _STRINGS.items():
        for locale, text in values.items():
            assert text.strip(), f"{key} vide en {locale}"


def test_placeholders_are_consistent_across_languages() -> None:
    for key, values in _STRINGS.items():
        expected = {fragment for fragment in values["fr"].split() if fragment.startswith("{")}
        for locale, text in values.items():
            found = {fragment for fragment in text.split() if fragment.startswith("{")}
            assert found == expected, f"{key} : marqueurs différents en {locale}"


@pytest.mark.parametrize("locale", list(Locale))
def test_translator_formats_and_never_leaks_a_key(locale: Locale) -> None:
    translator = Translator(locale)

    assert translator("settings.heading")
    assert "{count}" not in translator("dashboard.week_load", count=4)
    assert translator("cle.inconnue") == "cle.inconnue"


def test_translator_knows_the_reading_direction() -> None:
    assert Translator(Locale.AR).is_rtl is True
    assert Translator(Locale.FR).is_rtl is False
    assert Translator(Locale.EN).is_rtl is False


def test_keys_are_unique() -> None:
    listed = keys()
    assert len(listed) == len(set(listed))
    assert all(isinstance(key, str) and key for key in listed)
