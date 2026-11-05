"""Sauvegardes sur disque et archives annuelles.

Une sauvegarde est un fichier JSON lisible et versionné : l'enseignant peut
l'ouvrir, la copier sur une clé, la relire dans dix ans. Aucun format binaire,
aucun verrou propriétaire.
"""

from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path

from ..core.models import ArchiveMeta, Workspace
from ..paths import archive_dir, backup_dir
from .repository import Repository

_SAFE = re.compile(r"[^A-Za-z0-9_-]+")


def _stamp() -> str:
    return datetime.now().strftime("%Y%m%d-%H%M")


def backup_path(label: str = "cahier") -> Path:
    return backup_dir() / f"{_SAFE.sub('-', label).strip('-')}-{_stamp()}.json"


def export_to_file(repository: Repository, target: Path) -> Path:
    """Écrit l'espace de travail complet dans un fichier JSON."""
    target.write_text(repository.to_json(), encoding="utf-8")
    return target


def import_from_file(repository: Repository, source: Path) -> Workspace:
    """Relit une sauvegarde et remplace l'espace courant.

    Un fichier illisible ou d'une version inconnue lève ``ValueError`` : rien
    n'est écrit dans ce cas, l'appelant peut afficher un message clair.
    """
    try:
        payload = json.loads(source.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"Sauvegarde illisible : {error}") from error
    try:
        workspace = Workspace.model_validate(payload)
    except ValueError as error:
        raise ValueError("Sauvegarde d'un format inconnu.") from error
    if workspace.version > 1:
        raise ValueError("Sauvegarde produite par une version plus récente.")
    repository.import_workspace(workspace)
    return workspace


def archive_to_file(repository: Repository, meta: ArchiveMeta) -> Path | None:
    """Enregistre l'archive annuelle sur disque, en plus de la base."""
    workspace = repository.archive_payload(meta.id)
    if workspace is None:
        return None
    target = archive_dir() / f"annee-{_SAFE.sub('-', meta.year_label)}-{_stamp()}.json"
    target.write_text(workspace.model_dump_json(indent=2), encoding="utf-8")
    return target
