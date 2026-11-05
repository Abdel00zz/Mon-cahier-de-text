"""Boîtes de dialogue de l'application : classe et confirmation.

Toutes les fenêtres partagent la même structure : titre, corps aéré, actions en
bas. Échap ferme sans rien enregistrer ; Entrée valide. Les libellés viennent du
traducteur de l'application, jamais des chaînes par défaut de Qt.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence

from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import (
    QComboBox,
    QDialog,
    QFormLayout,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QPushButton,
    QVBoxLayout,
    QWidget,
)

from ...core.models import ClassInfo, Cycle

Translator = Callable[..., str]


class FormDialog(QDialog):
    """Base commune : titre, formulaire, boutons Valider / Annuler."""

    def __init__(self, *, title: str, t: Translator, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setWindowTitle(title)
        self.setModal(True)
        self.setMinimumWidth(400)
        outer = QVBoxLayout(self)
        outer.setContentsMargins(22, 20, 22, 18)
        outer.setSpacing(14)

        heading = QLabel(title)
        heading.setObjectName("sectionTitle")
        heading.setWordWrap(True)
        outer.addWidget(heading)

        self.form = QFormLayout()
        self.form.setHorizontalSpacing(14)
        self.form.setVerticalSpacing(10)
        self.form.setLabelAlignment(Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter)
        outer.addLayout(self.form)

        actions = QHBoxLayout()
        actions.setSpacing(8)
        actions.addStretch(1)
        self.cancel_button = QPushButton(t("action.cancel"))
        self.cancel_button.clicked.connect(self.reject)
        self.confirm_button = QPushButton(t("action.save"))
        self.confirm_button.setProperty("role", "primary")
        self.confirm_button.setDefault(True)
        self.confirm_button.clicked.connect(self.accept)
        actions.addWidget(self.cancel_button)
        actions.addWidget(self.confirm_button)
        outer.addLayout(actions)

    def add_field(self, label: str, widget: QWidget) -> QLabel:
        caption = QLabel(label)
        caption.setProperty("field", "true")
        self.form.addRow(caption, widget)
        return caption


class ClassDialog(FormDialog):
    """Création et modification d'une classe."""

    def __init__(
        self,
        *,
        t: Translator,
        subjects: Sequence[str],
        cycles: Sequence[Cycle],
        info: ClassInfo | None = None,
        parent: QWidget | None = None,
    ) -> None:
        super().__init__(
            title=t("dialog.edit_class") if info else t("dialog.new_class"),
            t=t,
            parent=parent,
        )
        self._info = info

        self.name = QLineEdit(info.name if info else "")
        self.name.setPlaceholderText("1 PCSI")
        self.add_field(t("field.name"), self.name)

        self.subject = QComboBox()
        self.subject.setEditable(True)
        self.subject.addItems(list(subjects))
        if info and info.subject:
            self.subject.setCurrentText(info.subject)
        self.add_field(t("field.subject"), self.subject)

        self.level = QLineEdit(info.level if info else "")
        self.level.setPlaceholderText("Tronc commun, 1er Bac…")
        self.add_field(t("field.level"), self.level)

        self.cycle = QComboBox()
        self.cycle.addItem(t("cycle.none"), None)
        for value in Cycle:
            self.cycle.addItem(t(f"cycle.{value.value}"), value)
        if info and info.cycle:
            self.cycle.setCurrentIndex(max(0, self.cycle.findData(info.cycle)))
        self.add_field(t("field.cycle"), self.cycle)

        self.group = QLineEdit(info.group if info else "")
        self.group.setPlaceholderText("1, 2, A…")
        self.add_field(t("field.group"), self.group)

        self.name.setFocus()

    def accept(self) -> None:
        if not self.name.text().strip():
            self.name.setFocus()
            return
        super().accept()

    def values(self) -> ClassInfo:
        payload = {
            "name": self.name.text().strip(),
            "subject": self.subject.currentText().strip(),
            "level": self.level.text().strip(),
            "cycle": self.cycle.currentData(),
            "group": self.group.text().strip(),
        }
        if self._info is not None:
            return self._info.model_copy(update=payload)
        return ClassInfo(**payload)


class ConfirmDialog(QDialog):
    """Confirmation d'une action destructive, sans ambiguïté sur le bouton."""

    def __init__(
        self,
        *,
        title: str,
        body: str,
        t: Translator,
        parent: QWidget | None = None,
    ) -> None:
        super().__init__(parent)
        self.setWindowTitle(title)
        self.setModal(True)
        self.setMinimumWidth(380)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(22, 20, 22, 18)
        layout.setSpacing(12)

        heading = QLabel(title)
        heading.setObjectName("sectionTitle")
        heading.setWordWrap(True)
        layout.addWidget(heading)

        detail = QLabel(body)
        detail.setWordWrap(True)
        detail.setObjectName("hint")
        layout.addWidget(detail)

        actions = QHBoxLayout()
        actions.setSpacing(8)
        actions.addStretch(1)
        cancel = QPushButton(t("action.cancel"))
        cancel.clicked.connect(self.reject)
        confirm = QPushButton(t("action.delete"))
        confirm.setProperty("role", "danger")
        confirm.clicked.connect(self.accept)
        actions.addWidget(cancel)
        actions.addWidget(confirm)
        layout.addLayout(actions)
