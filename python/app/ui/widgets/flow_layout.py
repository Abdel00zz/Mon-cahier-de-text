"""Disposition en flux : les cartes se répartissent selon la largeur disponible.

C'est ce qui distingue vraiment le bureau du téléphone : une seule
implémentation, aucune colonne codée en dur. Quand la fenêtre s'élargit, les
cartes passent d'elles-mêmes de une à deux, trois ou quatre colonnes.
"""

from __future__ import annotations

from PyQt6.QtCore import QMargins, QPoint, QRect, QSize, Qt
from PyQt6.QtWidgets import QLayout, QLayoutItem, QSizePolicy, QWidget


class FlowLayout(QLayout):
    def __init__(
        self,
        parent: QWidget | None = None,
        *,
        margin: int = 0,
        h_spacing: int = 12,
        v_spacing: int = 12,
        stretch: bool = True,
    ) -> None:
        super().__init__(parent)
        self._items: list[QLayoutItem] = []
        self._h_spacing = h_spacing
        self._v_spacing = v_spacing
        self._stretch = stretch
        self.setContentsMargins(QMargins(margin, margin, margin, margin))

    # ── Contrat QLayout ─────────────────────────────────────────────────────
    def addItem(self, item: QLayoutItem) -> None:  # noqa: N802 - API Qt
        self._items.append(item)

    def count(self) -> int:
        return len(self._items)

    def itemAt(self, index: int) -> QLayoutItem | None:  # noqa: N802
        return self._items[index] if 0 <= index < len(self._items) else None

    def takeAt(self, index: int) -> QLayoutItem | None:  # noqa: N802
        return self._items.pop(index) if 0 <= index < len(self._items) else None

    def expandingDirections(self) -> Qt.Orientation:  # noqa: N802
        return Qt.Orientation(0)

    def hasHeightForWidth(self) -> bool:  # noqa: N802
        return True

    def heightForWidth(self, width: int) -> int:  # noqa: N802
        return self._layout(QRect(0, 0, width, 0), apply=False)

    def setGeometry(self, rect: QRect) -> None:  # noqa: N802
        super().setGeometry(rect)
        self._layout(rect, apply=True)

    def sizeHint(self) -> QSize:  # noqa: N802
        return self.minimumSize()

    def minimumSize(self) -> QSize:  # noqa: N802
        size = QSize()
        for item in self._items:
            size = size.expandedTo(item.minimumSize())
        margins = self.contentsMargins()
        return size + QSize(margins.left() + margins.right(), margins.top() + margins.bottom())

    def addWidget(self, widget: QWidget) -> None:  # noqa: N802
        widget.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Preferred)
        super().addWidget(widget)

    # ── Placement ───────────────────────────────────────────────────────────
    def _rows(self, effective: QRect) -> list[list[QLayoutItem]]:
        rows: list[list[QLayoutItem]] = []
        current: list[QLayoutItem] = []
        width = 0
        for item in self._items:
            widget = item.widget()
            if widget is not None and widget.isHidden():
                continue
            hint = item.sizeHint().width()
            extra = self._h_spacing if current else 0
            if current and width + extra + hint > effective.width():
                rows.append(current)
                current, width = [], 0
                extra = 0
            current.append(item)
            width += extra + hint
        if current:
            rows.append(current)
        return rows

    def _layout(self, rect: QRect, *, apply: bool) -> int:
        margins = self.contentsMargins()
        effective = rect.adjusted(margins.left(), margins.top(), -margins.right(), -margins.bottom())
        y = effective.y()
        parent = self.parentWidget()
        rtl = parent is not None and parent.layoutDirection() == Qt.LayoutDirection.RightToLeft

        for row in self._rows(effective):
            hints = [item.sizeHint() for item in row]
            natural = sum(hint.width() for hint in hints) + self._h_spacing * (len(row) - 1)
            extra = max(0, effective.width() - natural) if self._stretch else 0
            share = extra / len(row) if row else 0
            height = max(hint.height() for hint in hints)
            widths = [hint.width() + int(share) for hint in hints]
            if rtl:
                x = effective.right() + 1
                for item, width in zip(row, widths, strict=True):
                    x -= width
                    if apply:
                        item.setGeometry(QRect(QPoint(x, y), QSize(width, height)))
                    x -= self._h_spacing
            else:
                x = effective.x()
                for item, width in zip(row, widths, strict=True):
                    if apply:
                        item.setGeometry(QRect(QPoint(x, y), QSize(width, height)))
                    x += width + self._h_spacing
            y += height + self._v_spacing

        return y - rect.y() - (self._v_spacing if self._items else 0) + margins.bottom()
