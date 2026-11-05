"""Journal des erreurs inattendues.

PyQt termine brutalement le processus (arrêt immédiat, sans message) dès qu'une
exception Python remonte d'un signal. Un enseignant verrait la fenêtre
disparaître, sans rien pouvoir faire. Ce module remplace ce comportement par un
journal disque et un message lisible : l'application reste ouverte, la saisie
en cours n'est pas perdue, et l'incident peut être transmis.
"""

from __future__ import annotations

import sys
import traceback
from collections.abc import Callable
from datetime import datetime
from pathlib import Path
from types import TracebackType

from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import QApplication, QMessageBox

from .paths import log_dir

LOG_NAME = "incidents.log"

#: Au-delà, le journal repart de zéro : un fichier de diagnostic ne doit jamais
#: devenir plus encombrant que les données qu'il aide à protéger.
MAX_BYTES = 512 * 1024

#: Référence vive le temps que la boîte soit affichée (Qt la libère ensuite).
_open_box: list[QMessageBox] = []


def log_path() -> Path:
    return log_dir() / LOG_NAME


def record(
    kind: type[BaseException],
    value: BaseException,
    tb: TracebackType | None,
    *,
    moment: datetime | None = None,
) -> Path | None:
    """Ajoute une entrée horodatée, en tournant le fichier s'il devient gros."""
    target = log_path()
    try:
        if target.exists() and target.stat().st_size > MAX_BYTES:
            previous = target.with_name("incidents.1.log")
            previous.unlink(missing_ok=True)
            target.replace(previous)
        stamp = (moment or datetime.now()).strftime("%Y-%m-%d %H:%M:%S")
        details = "".join(traceback.format_exception(kind, value, tb))
        with target.open("a", encoding="utf-8") as handle:
            handle.write(f"\n=== {stamp} — {kind.__name__}: {value}\n{details}")
        return target
    except OSError:
        return None


def install(t: Callable[..., str]) -> None:
    """Branche le gestionnaire global. À appeler une fois, après QApplication."""
    sys.excepthook = lambda kind, value, tb: _report(t, kind, value, tb)


def _report(
    t: Callable[..., str],
    kind: type[BaseException],
    value: BaseException,
    tb: TracebackType | None,
) -> None:
    target = record(kind, value, tb)
    if QApplication.instance() is None:
        return

    details = t("error.unexpected_hint")
    if target is not None:
        details = f"{details}\n\n{target}"

    box = QMessageBox(QApplication.activeWindow())
    box.setIcon(QMessageBox.Icon.Warning)
    box.setWindowTitle(t("error.unexpected_title"))
    box.setText(t("error.unexpected_title"))
    box.setInformativeText(f"{value}\n\n{details}")
    box.setStandardButtons(QMessageBox.StandardButton.Ok)
    box.setAttribute(Qt.WidgetAttribute.WA_DeleteOnClose, True)
    box.finished.connect(lambda *_args: _open_box.clear())
    _open_box.append(box)
    box.show()
