"""États vides et notification éphémère.

Une surface vide n'est jamais laissée passive : une icône, une phrase
d'orientation et l'action juste en dessous. Le bandeau (`Toast`) confirme une
action sans bloquer la saisie.
"""

from __future__ import annotations

from PyQt6.QtCore import Qt, QTimer
from PyQt6.QtWidgets import QFrame, QHBoxLayout, QLabel, QPushButton, QVBoxLayout, QWidget

from ..icons import pixmap


class EmptyState(QWidget):
    """Icône + titre + phrase + action facultative, centrés."""

    def __init__(
        self,
        *,
        icon_name: str,
        title: str,
        body: str,
        action_label: str | None = None,
        on_action=None,
        accent: str = "#6b4c35",
        parent: QWidget | None = None,
    ) -> None:
        super().__init__(parent)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 36, 24, 36)
        layout.setSpacing(10)
        layout.setAlignment(Qt.AlignmentFlag.AlignCenter)

        glyph = QLabel()
        glyph.setPixmap(pixmap(icon_name, accent, 40))
        glyph.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(glyph)

        self._heading = QLabel(title)
        self._heading.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._heading.setStyleSheet("font-size:16px; font-weight:700;")
        self._heading.setWordWrap(True)
        layout.addWidget(self._heading)

        self._description = QLabel(body)
        self._description.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._description.setWordWrap(True)
        self._description.setMaximumWidth(360)
        self._description.setObjectName("hint")
        layout.addWidget(self._description)

        self._action: QPushButton | None = None
        if action_label and on_action is not None:
            self._action = QPushButton(action_label)
            self._action.setProperty("role", "primary")
            self._action.setCursor(Qt.CursorShape.PointingHandCursor)
            self._action.clicked.connect(on_action)
            layout.addWidget(self._action, 0, Qt.AlignmentFlag.AlignCenter)

    def set_content(
        self, *, title: str | None = None, body: str | None = None, action_label: str | None = None
    ) -> None:
        """Met le texte à jour sans reconstruire le bloc (changement de langue)."""
        if title is not None:
            self._heading.setText(title)
        if body is not None:
            self._description.setText(body)
        if action_label is not None and self._action is not None:
            self._action.setText(action_label)


class Toast(QFrame):
    """Bandeau de confirmation, posé en bas de la fenêtre, effacé après 2,6 s."""

    def __init__(self, parent: QWidget) -> None:
        super().__init__(parent)
        self.setObjectName("toast")
        self.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents)
        layout = QHBoxLayout(self)
        layout.setContentsMargins(16, 9, 16, 9)
        self._label = QLabel("")
        self._label.setStyleSheet("color: inherit;")
        layout.addWidget(self._label)
        self._timer = QTimer(self)
        self._timer.setSingleShot(True)
        self._timer.timeout.connect(self.hide)
        self.hide()

    def show_message(self, text: str, *, msec: int = 2600) -> None:
        self._label.setText(text)
        self.adjustSize()
        self._reposition()
        self.show()
        self.raise_()
        self._timer.start(msec)

    def _reposition(self) -> None:
        parent = self.parentWidget()
        if parent is None:
            return
        x = (parent.width() - self.width()) // 2
        y = parent.height() - self.height() - 28
        self.move(max(12, x), max(12, y))

    def resizeEvent(self, event) -> None:  # noqa: N802 - API Qt
        super().resizeEvent(event)
        self._reposition()
