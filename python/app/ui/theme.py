"""Thème visuel : jetons, feuille de style et polices.

Un seul endroit décrit l'apparence. Les pages ne connaissent que des noms
d'objets (`#pageTitle`, `QPushButton[role="primary"]`) : changer la charte ne
demande donc aucune modification d'écran.
"""

from __future__ import annotations

from dataclasses import dataclass

from PyQt6.QtGui import QColor, QFont, QFontDatabase, QPalette
from PyQt6.QtWidgets import QApplication

from ..core.models import TextSize
from ..paths import project_fonts_dir


@dataclass(frozen=True, slots=True)
class Tokens:
    background: str
    surface: str
    surface_alt: str
    foreground: str
    muted: str
    muted_foreground: str
    border: str
    primary: str
    primary_ink: str
    accent: str
    destructive: str
    success: str
    warning: str
    shadow: str


LIGHT = Tokens(
    background="#ffffff",
    surface="#ffffff",
    surface_alt="#faf9f5",
    foreground="#2e2016",
    muted="#f6f1e8",
    muted_foreground="#6e5a49",
    border="#e5ddd2",
    primary="#6b4c35",
    primary_ink="#f8f5ed",
    accent="#f3e3d9",
    destructive="#b43c32",
    success="#2f6b46",
    warning="#8a5a12",
    shadow="rgba(46, 32, 22, 0.10)",
)

DARK = Tokens(
    background="#1f1d1a",
    surface="#282521",
    surface_alt="#211e1b",
    foreground="#f2ece4",
    muted="#302c27",
    muted_foreground="#b3a696",
    border="#3b352e",
    primary="#d9a37f",
    primary_ink="#241a12",
    accent="#3a3129",
    destructive="#e08a80",
    success="#8fd0a8",
    warning="#e2b567",
    shadow="rgba(0, 0, 0, 0.45)",
)

#: Base typographique selon le réglage « taille du texte ».
FONT_PX: dict[TextSize, int] = {TextSize.SM: 13, TextSize.MD: 14, TextSize.LG: 16, TextSize.XL: 18}

#: Chaînes de polices : Computer Modern (dépôt) puis repli système, arabe inclus.
FONT_FAMILIES = [
    "Latin Modern Sans",
    "CMU Sans Serif",
    "SamsungOneArabic",
    "Segoe UI",
    "Noto Naskh Arabic",
    "Tahoma",
]


def load_project_fonts() -> list[str]:
    """Charge les polices déjà présentes dans le dépôt (Computer Modern, Samsung).

    Retourne les familles réellement installées : l'application reste utilisable
    si le dossier n'existe pas (installation autonome).
    """
    loaded: list[str] = []
    root = project_fonts_dir()
    if root is None:
        return loaded
    for pattern in ("*.otf", "*.ttf"):
        for path in sorted(root.glob(pattern)):
            identifier = QFontDatabase.addApplicationFont(str(path))
            if identifier >= 0:
                loaded.extend(QFontDatabase.applicationFontFamilies(identifier))
    return loaded


def base_font(size: TextSize = TextSize.MD, *, weight: QFont.Weight = QFont.Weight.Normal) -> QFont:
    font = QFont()
    font.setFamilies(FONT_FAMILIES)
    font.setPixelSize(FONT_PX[size])
    font.setWeight(weight)
    font.setStyleStrategy(QFont.StyleStrategy.PreferAntialias)
    return font


def apply_theme(
    app: QApplication, *, dark: bool, size: TextSize, scale: float = 1.0, rtl: bool = False
) -> None:
    """Installe la palette, la police et la feuille de style globales."""
    tokens = DARK if dark else LIGHT
    app.setStyle("Fusion")
    app.setFont(base_font(size))
    app.setPalette(_palette(tokens))
    app.setStyleSheet(stylesheet(tokens, size, scale=scale, rtl=rtl))


def _palette(tokens: Tokens) -> QPalette:
    palette = QPalette()
    palette.setColor(QPalette.ColorRole.Window, QColor(tokens.background))
    palette.setColor(QPalette.ColorRole.Base, QColor(tokens.surface))
    palette.setColor(QPalette.ColorRole.AlternateBase, QColor(tokens.muted))
    palette.setColor(QPalette.ColorRole.Text, QColor(tokens.foreground))
    palette.setColor(QPalette.ColorRole.WindowText, QColor(tokens.foreground))
    palette.setColor(QPalette.ColorRole.Button, QColor(tokens.surface))
    palette.setColor(QPalette.ColorRole.ButtonText, QColor(tokens.foreground))
    palette.setColor(QPalette.ColorRole.Highlight, QColor(tokens.primary))
    palette.setColor(QPalette.ColorRole.HighlightedText, QColor(tokens.primary_ink))
    palette.setColor(QPalette.ColorRole.ToolTipBase, QColor(tokens.surface))
    palette.setColor(QPalette.ColorRole.ToolTipText, QColor(tokens.foreground))
    palette.setColor(QPalette.ColorGroup.Disabled, QPalette.ColorRole.Text, QColor(tokens.muted_foreground))
    palette.setColor(QPalette.ColorGroup.Disabled, QPalette.ColorRole.ButtonText, QColor(tokens.muted_foreground))
    return palette


def stylesheet(tokens: Tokens, size: TextSize, *, scale: float = 1.0, rtl: bool = False) -> str:
    """Feuille de style complète, dérivée des jetons.

    ``scale`` grossit les espacements avec la taille du texte : une interface
    lisible reste aérée, elle ne devient pas un mur de caractères serrés.
    ``rtl`` inverse les côtés logiques (QSS ne connaît que left/right).
    """
    px = FONT_PX[size]
    pad = round(px * 0.85 * scale)
    radius = 14
    align = "right" if rtl else "left"
    border_end = "border-left" if rtl else "border-right"
    return f"""
    QWidget {{
        color: {tokens.foreground};
        background: transparent;
        selection-background-color: {tokens.primary};
        selection-color: {tokens.primary_ink};
    }}
    QMainWindow, QDialog {{ background: {tokens.background}; }}
    #appRoot {{ background: {tokens.background}; }}

    /* ── Navigation latérale ─────────────────────────────────────────────── */
    #sidebar {{
        background: {tokens.surface_alt};
        {border_end}: 1px solid {tokens.border};
    }}
    #brandTitle {{ font-size: {px + 2}px; font-weight: 650; }}
    #brandSubtitle {{ color: {tokens.muted_foreground}; font-size: {px - 2}px; }}
    QPushButton[nav="true"] {{
        text-align: {align};
        padding: {pad - 2}px {pad}px;
        border: 1px solid transparent;
        border-radius: 11px;
        background: transparent;
        color: {tokens.muted_foreground};
        font-size: {px}px;
    }}
    QPushButton[nav="true"]:hover {{ background: {tokens.muted}; color: {tokens.foreground}; }}
    QPushButton[nav="true"][active="true"] {{
        background: {tokens.accent};
        border-color: {tokens.border};
        color: {tokens.foreground};
        font-weight: 600;
    }}

    /* ── Titres ──────────────────────────────────────────────────────────── */
    #pageTitle {{ font-size: {px + 14}px; font-weight: 700; }}
    #sectionTitle {{ font-size: {px + 2}px; font-weight: 650; }}
    #hint {{ color: {tokens.muted_foreground}; font-size: {px - 2}px; }}
    #overline {{
        color: {tokens.muted_foreground};
        font-size: {px - 3}px;
        font-weight: 650;
    }}

    /* ── Boutons ─────────────────────────────────────────────────────────── */
    QPushButton {{
        background: {tokens.surface};
        border: 1px solid {tokens.border};
        border-radius: 10px;
        padding: {round(pad * 0.7)}px {pad}px;
        min-height: {px + 12}px;
        font-size: {px}px;
    }}
    QPushButton:hover {{ background: {tokens.muted}; }}
    QPushButton:pressed {{ background: {tokens.accent}; }}
    QPushButton:disabled {{ color: {tokens.muted_foreground}; border-color: {tokens.border}; }}
    QPushButton[role="primary"] {{
        background: {tokens.primary};
        border-color: {tokens.primary};
        color: {tokens.primary_ink};
        font-weight: 600;
    }}
    QPushButton[role="primary"]:hover {{ background: {tokens.primary}; border-color: {tokens.primary}; }}
    QPushButton[role="ghost"] {{
        background: transparent;
        border-color: transparent;
        color: {tokens.muted_foreground};
    }}
    QPushButton[role="ghost"]:hover {{ background: {tokens.muted}; color: {tokens.foreground}; }}
    QPushButton[role="danger"] {{ color: {tokens.destructive}; }}
    QPushButton[role="danger"]:hover {{ background: {tokens.muted}; }}
    QPushButton[role="round"] {{
        background: {tokens.primary};
        border: 1px solid {tokens.primary};
        border-radius: {px + 6}px;
        min-width: {px + 22}px;
        max-width: {px + 22}px;
        min-height: {px + 22}px;
        max-height: {px + 22}px;
        padding: 0;
    }}
    QPushButton[role="round"]:hover {{ background: {tokens.primary}; border-color: {tokens.foreground}; }}

    /* ── Champs ──────────────────────────────────────────────────────────── */
    QLineEdit, QTextEdit, QPlainTextEdit, QComboBox, QDateEdit, QSpinBox {{
        background: {tokens.surface};
        border: 1px solid {tokens.border};
        border-radius: 10px;
        padding: {round(pad * 0.55)}px {round(pad * 0.8)}px;
        min-height: {px + 10}px;
        font-size: {px}px;
    }}
    QLineEdit:focus, QTextEdit:focus, QPlainTextEdit:focus, QComboBox:focus, QDateEdit:focus {{
        border-color: {tokens.primary};
    }}
    QComboBox::drop-down {{ border: 0; width: 22px; }}
    QComboBox QAbstractItemView {{
        background: {tokens.surface};
        border: 1px solid {tokens.border};
        selection-background-color: {tokens.accent};
        selection-color: {tokens.foreground};
        padding: 4px;
    }}
    QLabel[field="true"] {{ color: {tokens.muted_foreground}; font-size: {px - 2}px; font-weight: 600; }}

    /* ── Cartes et panneaux ──────────────────────────────────────────────── */
    QFrame[card="true"] {{
        background: {tokens.surface};
        border: 1px solid {tokens.border};
        border-radius: {radius + 4}px;
    }}
    QFrame[card="muted"] {{
        background: {tokens.muted};
        border: 1px solid {tokens.border};
        border-radius: {radius}px;
    }}

    /* ── Tableaux et arbres ──────────────────────────────────────────────── */
    QTreeWidget, QTreeView, QTableWidget, QListView {{
        background: {tokens.surface};
        border: 1px solid {tokens.border};
        border-radius: {radius}px;
        alternate-background-color: {tokens.surface_alt};
        gridline-color: {tokens.border};
        font-size: {px}px;
    }}
    QTreeWidget::item, QTableWidget::item {{ padding: {round(pad * 0.35)}px; }}
    QTreeWidget::item:selected, QTableWidget::item:selected {{
        background: {tokens.accent};
        color: {tokens.foreground};
    }}
    QListWidget {{ background: {tokens.surface}; border: 1px solid {tokens.border}; border-radius: {radius}px; }}
    QListWidget::item {{ padding: {round(pad * 0.5)}px {round(pad * 0.7)}px; border-radius: 8px; }}
    QListWidget::item:hover {{ background: {tokens.muted}; }}
    QListWidget::item:selected {{ background: {tokens.accent}; color: {tokens.foreground}; font-weight: 600; }}
    QHeaderView::section {{
        background: {tokens.muted};
        color: {tokens.muted_foreground};
        border: 0;
        border-bottom: 1px solid {tokens.border};
        padding: {round(pad * 0.5)}px;
        font-size: {px - 2}px;
        font-weight: 650;
    }}

    /* ── Barres de défilement ────────────────────────────────────────────── */
    QScrollBar:vertical {{ background: transparent; width: 10px; margin: 2px; }}
    QScrollBar::handle:vertical {{
        background: {tokens.border};
        border-radius: 5px;
        min-height: 32px;
    }}
    QScrollBar::handle:vertical:hover {{ background: {tokens.muted_foreground}; }}
    QScrollBar:horizontal {{ background: transparent; height: 10px; margin: 2px; }}
    QScrollBar::handle:horizontal {{ background: {tokens.border}; border-radius: 5px; min-width: 32px; }}
    QScrollBar::add-line, QScrollBar::sub-line {{ height: 0; width: 0; }}
    QScrollBar::add-page, QScrollBar::sub-page {{ background: transparent; }}

    /* ── Divers ──────────────────────────────────────────────────────────── */
    QToolTip {{
        background: {tokens.surface};
        color: {tokens.foreground};
        border: 1px solid {tokens.border};
        padding: 6px 8px;
        border-radius: 8px;
    }}
    QCheckBox {{ spacing: 8px; font-size: {px}px; }}
    QCheckBox::indicator {{
        width: {px + 4}px; height: {px + 4}px;
        border: 1px solid {tokens.border};
        border-radius: 6px;
        background: {tokens.surface};
    }}
    QCheckBox::indicator:hover {{ border-color: {tokens.primary}; }}
    QCheckBox::indicator:checked {{ background: {tokens.primary}; border-color: {tokens.primary}; }}
    QCheckBox::indicator:disabled {{ background: {tokens.muted}; border-color: {tokens.border}; }}
    QTabWidget::pane {{ border: 1px solid {tokens.border}; border-radius: {radius}px; top: -1px; }}
    QTabBar::tab {{
        background: transparent;
        color: {tokens.muted_foreground};
        padding: {round(pad * 0.55)}px {pad}px;
        border-radius: 9px;
        margin-{align}: 4px;
        font-size: {px}px;
    }}
    QTabBar::tab:selected {{ background: {tokens.accent}; color: {tokens.foreground}; font-weight: 600; }}
    #toast {{
        background: {tokens.foreground};
        color: {tokens.background};
        border-radius: 10px;
        padding: {round(pad * 0.6)}px {pad}px;
        font-size: {px}px;
    }}
    """
