"""Emplacements de stockage de l'application.

Tout est local : la base, les sauvegardes et les journaux vivent dans le dossier
de données de l'utilisateur (Windows : ``%LOCALAPPDATA%``). Un mode « portable »
est possible en définissant ``CAHIER_HOME`` : le dossier indiqué contient alors
la base et les sauvegardes, ce qui permet de travailler depuis une clé USB.
"""

from __future__ import annotations

import os
from pathlib import Path

from platformdirs import user_data_path, user_log_path

APP_NAME = "CahierDeTextes"
APP_AUTHOR = "CahierDeTextes"


def _portable_root() -> Path | None:
    raw = os.environ.get("CAHIER_HOME", "").strip()
    return Path(raw).expanduser().resolve() if raw else None


def data_dir() -> Path:
    """Dossier racine des données, créé au besoin."""
    root = _portable_root()
    path = root if root is not None else Path(user_data_path(APP_NAME, APP_AUTHOR))
    path.mkdir(parents=True, exist_ok=True)
    return path


def database_path() -> Path:
    return data_dir() / "cahier.sqlite3"


def backup_dir() -> Path:
    path = data_dir() / "sauvegardes"
    path.mkdir(parents=True, exist_ok=True)
    return path


def archive_dir() -> Path:
    path = data_dir() / "archives"
    path.mkdir(parents=True, exist_ok=True)
    return path


def log_dir() -> Path:
    root = _portable_root()
    path = (root / "journaux") if root is not None else Path(user_log_path(APP_NAME, APP_AUTHOR))
    path.mkdir(parents=True, exist_ok=True)
    return path


def project_fonts_dir() -> Path | None:
    """Polices déjà versionnées à la racine du dépôt, si l'application tourne
    depuis les sources. L'application reste utilisable sans elles : Qt retombe
    alors sur les polices du système."""
    candidate = Path(__file__).resolve().parents[2] / "public" / "fonts"
    return candidate if candidate.is_dir() else None
