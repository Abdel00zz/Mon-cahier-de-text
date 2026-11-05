"""Lanceur de l'application de bureau.

Usage :
    python run.py            # lance l'interface
    python run.py --version  # affiche la version installée

Le point d'entrée réel vit dans `app/main.py` ; ce fichier existe pour que
l'application se lance sans installation préalable (`pip install -e .` n'est
nécessaire que pour la commande `cahier`).
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app import __version__  # noqa: E402 - après ajustement du chemin


def main() -> int:
    if "--version" in sys.argv:
        print(__version__)
        return 0
    from app.main import main as run

    return run()


if __name__ == "__main__":
    raise SystemExit(main())
