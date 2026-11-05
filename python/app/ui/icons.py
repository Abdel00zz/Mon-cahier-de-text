"""Icônes vectorielles minimalistes, dessinées au trait.

Aucune dépendance externe : les tracés sont écrits ici, au format SVG, puis
rendus par Qt à la couleur et à la taille demandées. Le jeu reste cohérent
(même épaisseur, même grille de 24 px) et s'adapte au thème clair ou sombre.
"""

from __future__ import annotations

from functools import lru_cache

from PyQt6.QtCore import QByteArray, QRectF, Qt
from PyQt6.QtGui import QIcon, QPainter, QPixmap
from PyQt6.QtSvg import QSvgRenderer

#: Tracés d'origine (grille 24×24, trait de 1.8 px, extrémités arrondies).
PATHS: dict[str, str] = {
    "classes": "M4 7h7v12H4zM13 7h7v7h-7zM13 16h7v3h-7z",
    "book": "M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5zM19 18v3H6.5A2.5 2.5 0 0 1 4 18.5",
    "calendar": "M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19zM4 9.5h16M8.5 3v3.5M15.5 3v3.5",
    "settings": "M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a1.9 1.9 0 1 1-2.7 2.7l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a1.9 1.9 0 1 1-3.8 0v-.2a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a1.9 1.9 0 1 1-2.7-2.7l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a1.9 1.9 0 1 1 0-3.8h.2a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a1.9 1.9 0 1 1 2.7-2.7l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5V3a1.9 1.9 0 1 1 3.8 0v.2a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a1.9 1.9 0 1 1 2.7 2.7l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1H21a1.9 1.9 0 1 1 0 3.8h-.2a1.6 1.6 0 0 0-1.4 1z",
    "help": "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.6 9.3a2.5 2.5 0 1 1 3.6 2.3c-.7.4-1.2 1-1.2 1.8v.4M12 17.2h.01",
    "plus": "M12 5v14M5 12h14",
    "search": "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
    "trash": "M4 7h16M10 4h4M6 7l1 13h10l1-13M10 11v6M14 11v6",
    "edit": "M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17z",
    "chevron-right": "M9 6l6 6-6 6",
    "chevron-down": "M6 9l6 6 6-6",
    "chevron-up": "M18 15l-6-6-6 6",
    "save": "M5 4h11l3 3v13H5zM8 4v6h7V4M8 15h8",
    "download": "M12 4v11M7.5 11.5 12 16l4.5-4.5M5 19h14",
    "upload": "M12 16V5M7.5 8.5 12 4l4.5 4.5M5 19h14",
    "archive": "M4 8h16v12H4zM3 4h18v4H3zM9.5 12h5",
    "sun": "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
    "moon": "M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z",
    "check": "M5 12.5l4.5 4.5L19 7.5",
    "close": "M6 6l12 12M18 6 6 18",
    "clock": "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
    "grid": "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
    "layers": "M12 3 3 8l9 5 9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5",
    "file-text": "M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6",
    "alert": "M12 4 21 20H3zM12 10v4M12 17h.01",
    "menu": "M5 8h14M5 12h14M5 16h14",
    "arrow-left": "M19 12H5M11 6l-6 6 6 6",
    "arrow-right": "M5 12h14M13 6l6 6-6 6",
}


def _svg(name: str, colour: str, stroke: float = 1.8) -> str:
    path = PATHS.get(name, PATHS["file-text"])
    return (
        f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' "
        f"stroke='{colour}' stroke-width='{stroke}' stroke-linecap='round' stroke-linejoin='round'>"
        f"<path d='{path}'/></svg>"
    )


@lru_cache(maxsize=256)
def pixmap(name: str, colour: str, size: int = 18) -> QPixmap:
    """Rend une icône à la taille et à la couleur demandées (mise en cache)."""
    renderer = QSvgRenderer(QByteArray(_svg(name, colour).encode("utf-8")))
    scale = 2  # rendu net sur écran HiDPI
    image = QPixmap(size * scale, size * scale)
    image.fill(Qt.GlobalColor.transparent)
    painter = QPainter(image)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing)
    renderer.render(painter, QRectF(0, 0, size * scale, size * scale))
    painter.end()
    image.setDevicePixelRatio(scale)
    return image


def icon(name: str, colour: str, size: int = 18) -> QIcon:
    return QIcon(pixmap(name, colour, size))
