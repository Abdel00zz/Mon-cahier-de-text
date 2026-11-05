"""Palettes de couleurs des classes.

Une seule table, partagée par le tableau de bord et l'emploi du temps : une
classe garde exactement la même teinte partout. Les six tons pastel reprennent
la charte du projet ; les encres secondaires ont été assombries pour rester
lisibles (≥ 4,5:1) sur le fond de chaque carte.
"""

from __future__ import annotations

from dataclasses import dataclass

PALETTE_KEYS: tuple[str, ...] = ("peach", "lavender", "green", "sky", "sand", "rose")


@dataclass(frozen=True, slots=True)
class Palette:
    key: str
    bg: str
    bg2: str
    border: str
    title: str
    secondary: str
    #: Variante sombre : fond profond, encre claire.
    dark_bg: str
    dark_bg2: str
    dark_title: str


PALETTES: dict[str, Palette] = {
    "peach": Palette("peach", "#fdeede", "#fbd3bf", "#f6d9bd", "#6b3a12", "#9a5b26", "#3a2416", "#4a2d1b", "#ffe0c4"),
    "lavender": Palette(
        "lavender", "#ece9f7", "#d8cbfa", "#d9d4ee", "#2a205a", "#5a3fbf", "#241f3d", "#2f2854", "#ddd6ff"
    ),
    "green": Palette("green", "#e6f3e9", "#c3e9d8", "#cfe6d5", "#14503a", "#3a755b", "#16291f", "#1d3a2c", "#c6f2dd"),
    "sky": Palette("sky", "#e0eefa", "#c9dbff", "#c6dff2", "#0f3f6b", "#346c97", "#132434", "#1b3448", "#c9e6ff"),
    "sand": Palette("sand", "#f7f0d4", "#ebe0ad", "#ebe0ad", "#5c4a05", "#7a6818", "#2c2712", "#3a331a", "#f4e6ac"),
    "rose": Palette("rose", "#fbe6ee", "#f2cddb", "#f2cddb", "#6e1c3e", "#a6476e", "#33161f", "#451e2b", "#ffd3e2"),
}

#: Affinité matière → ton, pour que deux classes de même discipline se suivent.
_SUBJECT_HINTS: tuple[tuple[tuple[str, ...], str], ...] = (
    (("svt", "vie", "terre", "biologie"), "green"),
    (("physique", "chimie", "phys"), "peach"),
    (("math", "رياض"), "lavender"),
    (("fran", "arab", "angl", "lettre", "philo"), "rose"),
    (("info", "techno", "ingénieur"), "sky"),
)


def hue_palette(hue: float) -> Palette:
    """Déclinaison d'une teinte libre choisie par l'enseignant."""
    return Palette(
        key="hue",
        bg=f"hsl({hue:.0f}, 55%, 94%)",
        bg2=f"hsl({hue:.0f}, 50%, 88%)",
        border=f"hsl({hue:.0f}, 45%, 82%)",
        title=f"hsl({hue:.0f}, 65%, 18%)",
        secondary=f"hsl({hue:.0f}, 45%, 29%)",
        dark_bg=f"hsl({hue:.0f}, 30%, 16%)",
        dark_bg2=f"hsl({hue:.0f}, 28%, 21%)",
        dark_title=f"hsl({hue:.0f}, 70%, 86%)",
    )


def hue_from_color(color: str) -> float | None:
    """Extrait la teinte d'une couleur « class-hue:210 »."""
    if not color.startswith("class-hue:"):
        return None
    try:
        value = float(color.split(":", 1)[1])
    except ValueError:
        return None
    return value % 360


def palette_for(color: str, subject: str, index: int, used: set[str]) -> Palette:
    """Ton stable pour une classe : la couleur enregistrée gagne, sinon la
    matière suggère, sinon on prend le premier ton libre."""
    hue = hue_from_color(color)
    if hue is not None:
        return hue_palette(hue)

    saved = color.strip().lower()
    if saved in PALETTES:
        return PALETTES[saved]

    lowered = subject.lower()
    preferred = next((key for hints, key in _SUBJECT_HINTS if any(hint in lowered for hint in hints)), None)
    free = [key for key in PALETTE_KEYS if key not in used]
    if free:
        chosen = preferred if preferred in free else free[index % len(free)]
    else:
        chosen = PALETTE_KEYS[index % len(PALETTE_KEYS)]
    return PALETTES[chosen]


def build_palette_map(classes: list[tuple[str, str, str]]) -> dict[str, Palette]:
    """Associe chaque classe à son ton, dans l'ordre d'affichage.

    ``classes`` contient des triplets ``(id, couleur, matière)``.
    """
    used: set[str] = set()
    result: dict[str, Palette] = {}
    for index, (class_id, color, subject) in enumerate(classes):
        palette = palette_for(color, subject, index, used)
        used.add(palette.key)
        result[class_id] = palette
    return result
