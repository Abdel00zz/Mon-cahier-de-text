"""Éditeur du cahier : séances, plan du cours, remarque et travail à faire.

L'arbre de droite montre la structure réelle du cours (chapitre → section →
sous-section → éléments) et la numérotation calculée. La saisie écrit dans le
modèle puis enregistre ; l'arbre est reconstruit depuis le modèle, ce qui
garantit que l'affichage et les données ne divergent jamais.
"""

from __future__ import annotations

from datetime import date

from PyQt6.QtCore import QDate, QMarginsF, QSize, Qt, QTimer, pyqtSignal
from PyQt6.QtGui import QPageLayout, QPageSize, QTextDocument
from PyQt6.QtPrintSupport import QPrinter
from PyQt6.QtWidgets import (
    QAbstractItemView,
    QDateEdit,
    QFileDialog,
    QHBoxLayout,
    QHeaderView,
    QLabel,
    QListWidget,
    QListWidgetItem,
    QMessageBox,
    QPlainTextEdit,
    QPushButton,
    QSplitter,
    QStackedWidget,
    QTreeWidget,
    QTreeWidgetItem,
    QTreeWidgetItemIterator,
    QVBoxLayout,
    QWidget,
)

from ...core.models import DEPTH, ClassInfo, ContentItem, ContentKind, Session
from ...core.numbering import build_plan_numbers, kind_label
from ...core.report import notebook_html
from ...state import AppState
from ..icons import icon
from ..widgets.dialogs import ConfirmDialog
from ..widgets.empty_state import EmptyState
from ..widgets.flow_layout import FlowLayout

ROLE = Qt.ItemDataRole.UserRole

#: Outils d'ajout : clé interne → nature créée.
_ADD_TOOLS: dict[str, ContentKind] = {
    "chapter": ContentKind.CHAPTER,
    "section": ContentKind.SECTION,
    "subsection": ContentKind.SUBSECTION,
    "item": ContentKind.DEFINITION,
    "evaluation": ContentKind.EVALUATION,
}


class EditorPage(QWidget):
    back = pyqtSignal()
    notify = pyqtSignal(str)

    def __init__(self, state: AppState, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._state = state
        self._class: ClassInfo | None = None
        self._session: Session | None = None
        self._expanded: set[str] = set()

        self._autosave = QTimer(self)
        self._autosave.setSingleShot(True)
        self._autosave.setInterval(500)
        self._autosave.timeout.connect(self._persist)

        outer = QVBoxLayout(self)
        outer.setContentsMargins(20, 16, 20, 12)
        outer.setSpacing(10)
        outer.addLayout(self._build_header())

        self._stack = QStackedWidget()
        self._empty = EmptyState(
            icon_name="book",
            title="",
            body="",
            action_label="",
            on_action=self.back.emit,
            accent="#6b4c35",
        )
        self._stack.addWidget(self._build_body())
        self._stack.addWidget(self._empty)
        outer.addWidget(self._stack, 1)

        self._set_workspace(False)
        self._state.classesChanged.connect(self._reload_current_class)
        self.retranslate()

    def _set_workspace(self, ready: bool) -> None:
        """Bascule entre le cahier et l'invitation à ouvrir une classe."""
        self._stack.setCurrentIndex(0 if ready else 1)
        self._new_session.setVisible(ready)
        self._export.setVisible(ready)
        self._date_label.setVisible(ready)
        self._date_edit.setVisible(ready)

    # ── Construction ────────────────────────────────────────────────────────
    def _build_header(self) -> QHBoxLayout:
        header = QHBoxLayout()
        header.setSpacing(10)

        self._back = QPushButton()
        self._back.setProperty("role", "ghost")
        self._back.setFixedSize(34, 34)
        self._back.setIconSize(QSize(18, 18))
        self._back.setCursor(Qt.CursorShape.PointingHandCursor)
        self._back.clicked.connect(self.back.emit)
        header.addWidget(self._back)

        self._title = QLabel()
        self._title.setObjectName("pageTitle")
        header.addWidget(self._title)

        self._meta = QLabel()
        self._meta.setObjectName("hint")
        header.addWidget(self._meta)
        header.addStretch(1)

        self._new_session = QPushButton()
        self._new_session.clicked.connect(self._create_session)
        self._export = QPushButton()
        self._export.clicked.connect(self._export_pdf)
        header.addWidget(self._new_session)
        header.addWidget(self._export)
        return header

    def _build_body(self) -> QSplitter:
        splitter = QSplitter(Qt.Orientation.Horizontal)
        splitter.setChildrenCollapsible(False)

        # Colonne des séances
        left = QWidget()
        left_layout = QVBoxLayout(left)
        left_layout.setContentsMargins(0, 0, 10, 0)
        left_layout.setSpacing(8)

        sessions_header = QHBoxLayout()
        sessions_header.setSpacing(8)
        self._sessions_label = QLabel()
        self._sessions_label.setObjectName("overline")
        sessions_header.addWidget(self._sessions_label)
        sessions_header.addStretch(1)
        self._date_label = QLabel()
        self._date_label.setObjectName("hint")
        sessions_header.addWidget(self._date_label)
        self._date_edit = QDateEdit()
        self._date_edit.setCalendarPopup(True)
        self._date_edit.setDisplayFormat("dd/MM/yyyy")
        self._date_edit.setEnabled(False)
        self._date_edit.setFixedWidth(132)
        self._date_edit.dateChanged.connect(self._date_changed)
        sessions_header.addWidget(self._date_edit)
        left_layout.addLayout(sessions_header)

        self._sessions = QListWidget()
        self._sessions.setMinimumWidth(196)
        self._sessions.setMaximumWidth(300)
        self._sessions.currentItemChanged.connect(self._select_session)
        left_layout.addWidget(self._sessions, 1)
        self._delete_session = QPushButton()
        self._delete_session.setProperty("role", "danger")
        self._delete_session.clicked.connect(self._remove_session)
        left_layout.addWidget(self._delete_session)
        splitter.addWidget(left)

        # Plan du cours
        right = QWidget()
        right_layout = QVBoxLayout(right)
        right_layout.setContentsMargins(10, 0, 0, 0)
        right_layout.setSpacing(8)

        tools = FlowLayout(h_spacing=6, v_spacing=6, stretch=False)
        self._tool_buttons: dict[str, QPushButton] = {}
        for key in _ADD_TOOLS:
            button = QPushButton()
            button.setCursor(Qt.CursorShape.PointingHandCursor)
            button.clicked.connect(lambda _checked=False, name=key: self._add_item(name))
            tools.addWidget(button)
            self._tool_buttons[key] = button

        self._move_up = QPushButton("\u2191")
        self._move_down = QPushButton("\u2193")
        self._move_up.setFixedWidth(36)
        self._move_down.setFixedWidth(36)
        self._move_up.clicked.connect(lambda: self._move(-1))
        self._move_down.clicked.connect(lambda: self._move(1))
        self._remove_item = QPushButton()
        self._remove_item.setProperty("role", "danger")
        self._remove_item.clicked.connect(self._remove_selected_item)
        tools.addWidget(self._move_up)
        tools.addWidget(self._move_down)
        tools.addWidget(self._remove_item)
        right_layout.addLayout(tools)

        self._tree = QTreeWidget()
        self._tree.setColumnCount(3)
        self._tree.setAlternatingRowColors(True)
        self._tree.setEditTriggers(
            QAbstractItemView.EditTrigger.DoubleClicked | QAbstractItemView.EditTrigger.EditKeyPressed
        )
        self._tree.setSelectionMode(QAbstractItemView.SelectionMode.SingleSelection)
        self._tree.itemChanged.connect(self._tree_item_changed)
        right_layout.addWidget(self._tree, 1)

        notes = FlowLayout(h_spacing=10, v_spacing=10)
        self._remark_label = QLabel()
        self._remark_label.setObjectName("overline")
        self._remark = QPlainTextEdit()
        self._remark.setFixedHeight(62)
        self._remark.textChanged.connect(self._schedule_save)
        self._homework_label = QLabel()
        self._homework_label.setObjectName("overline")
        self._homework = QPlainTextEdit()
        self._homework.setFixedHeight(62)
        self._homework.textChanged.connect(self._schedule_save)

        for label, editor in ((self._remark_label, self._remark), (self._homework_label, self._homework)):
            field = QWidget()
            field.setMinimumWidth(240)
            column = QVBoxLayout(field)
            column.setContentsMargins(0, 0, 0, 0)
            column.setSpacing(4)
            column.addWidget(label)
            column.addWidget(editor)
            notes.addWidget(field)
        right_layout.addLayout(notes)

        splitter.addWidget(right)
        splitter.setStretchFactor(0, 0)
        splitter.setStretchFactor(1, 1)
        splitter.setSizes([220, 740])
        return splitter

    def retranslate(self) -> None:
        t = self._state.t
        self._back.setToolTip(t("action.close"))
        self._back.setIcon(icon("arrow-right" if self._state.is_rtl else "arrow-left", "#6e5a49", 18))
        self._new_session.setText(t("editor.new_session"))
        self._export.setText(t("editor.export_pdf"))
        self._sessions_label.setText(t("editor.sessions").upper())
        self._delete_session.setText(t("editor.delete_session"))
        self._remove_item.setText(t("editor.remove"))
        self._move_up.setToolTip(t("editor.move_up"))
        self._move_down.setToolTip(t("editor.move_down"))
        for key, label in (
            ("chapter", "editor.add_chapter"),
            ("section", "editor.add_section"),
            ("subsection", "editor.add_subsection"),
            ("item", "editor.add_item"),
            ("evaluation", "editor.add_evaluation"),
        ):
            self._tool_buttons[key].setText(t(label))
        self._remark_label.setText(t("editor.remark").upper())
        self._homework_label.setText(t("editor.homework").upper())
        self._remark.setPlaceholderText(t("editor.remark"))
        self._homework.setPlaceholderText(t("editor.homework"))
        self._date_label.setText(t("editor.date"))
        self._empty.set_content(
            title=t("editor.empty.title"),
            body=t("editor.empty.body"),
            action_label=t("nav.dashboard"),
        )
        self._tree.setHeaderLabels([t("editor.kind"), t("editor.number"), t("editor.content")])
        header = self._tree.header()
        for index, mode in enumerate(
            (
                QHeaderView.ResizeMode.ResizeToContents,
                QHeaderView.ResizeMode.ResizeToContents,
                QHeaderView.ResizeMode.Stretch,
            )
        ):
            header.setSectionResizeMode(index, mode)
        if self._class is not None:
            self._reload(self._class.id, None)

    # ── Ouverture ───────────────────────────────────────────────────────────
    def open_class(self, class_id: str, *, session_date: date | None = None) -> None:
        info = self._state.repository.class_by_id(class_id)
        if info is None:
            self._set_workspace(False)
            return
        self._class = info
        self._reload(class_id, session_date)

    def _reload_current_class(self) -> None:
        if self._class is not None:
            refreshed = self._state.repository.class_by_id(self._class.id)
            if refreshed is None:
                self._class = None
                self._set_workspace(False)
                return
            self._class = refreshed
            self._reload(refreshed.id, None)

    def _reload(self, class_id: str, session_date: date | None) -> None:
        assert self._class is not None
        self._set_workspace(True)
        self._title.setText(self._class.name)
        self._meta.setText(" · ".join(part for part in (self._class.subject, self._class.level) if part))

        sessions = self._state.repository.sessions(class_id)
        self._sessions.blockSignals(True)
        self._sessions.clear()
        for session in sessions:
            self._sessions.addItem(self._session_row(session))
        self._sessions.blockSignals(False)

        target = session_date or (sessions[-1].date if sessions else None)
        index = next((position for position, item in enumerate(sessions) if item.date == target), None)
        self._delete_session.setEnabled(bool(sessions))
        if index is None:
            self._sessions.clearSelection()
            self._load_session(None)
        else:
            self._sessions.setCurrentRow(index)

    @staticmethod
    def _session_row(session: Session) -> QListWidgetItem:
        label = session.date.strftime("%d/%m/%Y")
        chapters = [item.text for item, _ in session.walk() if item.kind is ContentKind.CHAPTER and item.text]
        entry = QListWidgetItem(f"{label}  {chapters[0][:26]}" if chapters else label)
        entry.setData(ROLE, session.id)
        return entry

    def _select_session(self, current: QListWidgetItem | None, _previous: QListWidgetItem | None = None) -> None:
        if current is None:
            self._load_session(None)
            return
        self._load_session(self._state.repository.session_by_id(current.data(ROLE)))

    def _load_session(self, session: Session | None) -> None:
        self._flush()
        self._session = session
        self._date_label.setVisible(session is not None)
        self._date_edit.setVisible(session is not None)
        if session is None:
            self._tree.clear()
            self._date_edit.setEnabled(False)
            for editor in (self._remark, self._homework):
                editor.blockSignals(True)
                editor.setPlainText("")
                editor.blockSignals(False)
            return

        self._date_edit.blockSignals(True)
        self._date_edit.setEnabled(True)
        self._date_edit.setDate(QDate(session.date.year, session.date.month, session.date.day))
        self._date_edit.blockSignals(False)
        for editor, value in ((self._remark, session.remark), (self._homework, session.homework)):
            editor.blockSignals(True)
            editor.setPlainText(value)
            editor.blockSignals(False)
        self._render_tree()

    # ── Arbre ───────────────────────────────────────────────────────────────
    def _render_tree(self) -> None:
        if self._session is None:
            return
        numbers = build_plan_numbers(
            self._session,
            style=self._state.config.structure_style,
            enabled=self._state.config.auto_numbering,
        )
        locale = self._state.config.locale.value
        self._tree.blockSignals(True)
        self._tree.clear()

        def add(parent: QTreeWidgetItem | None, item: ContentItem) -> None:
            node = QTreeWidgetItem(parent) if parent is not None else QTreeWidgetItem(self._tree)
            node.setData(0, ROLE, item.id)
            node.setText(0, kind_label(item.kind, locale))
            node.setText(1, numbers.of(item))
            node.setText(2, item.text)
            node.setFlags(node.flags() | Qt.ItemFlag.ItemIsEditable)
            if item.is_structural:
                font = node.font(2)
                font.setBold(True)
                for column in range(3):
                    node.setFont(column, font)
            node.setExpanded(item.id in self._expanded or item.kind is ContentKind.CHAPTER)
            for child in item.children:
                add(node, child)

        for item in self._session.items:
            add(None, item)
        self._tree.blockSignals(False)

    def _find(self, item_id: str) -> tuple[ContentItem, list[ContentItem]] | None:
        if self._session is None:
            return None

        def search(items: list[ContentItem]) -> tuple[ContentItem, list[ContentItem]] | None:
            for candidate in items:
                if candidate.id == item_id:
                    return candidate, items
                found = search(candidate.children)
                if found is not None:
                    return found
            return None

        return search(self._session.items)

    def _selected(self) -> tuple[ContentItem, list[ContentItem]] | None:
        node = self._tree.currentItem()
        return None if node is None else self._find(node.data(0, ROLE))

    # ── Édition ─────────────────────────────────────────────────────────────
    def _tree_item_changed(self, node: QTreeWidgetItem, column: int) -> None:
        if column != 2:
            return
        found = self._find(node.data(0, ROLE))
        if found is None:
            return
        item, _siblings = found
        item.text = " ".join(node.text(2).split())
        self._schedule_save()

    def _add_item(self, tool: str) -> None:
        if self._session is None:
            self._create_session()
        if self._session is None:
            return

        kind = _ADD_TOOLS[tool]
        new = ContentItem(kind=kind, text="")
        if kind in {ContentKind.CHAPTER, ContentKind.EVALUATION}:
            self._session.items.append(new)
        else:
            container, parent = self._container_for(kind)
            container.append(new)
            if parent is not None:
                self._expanded.add(parent.id)
        self._render_tree()
        self._schedule_save()
        self._start_editing(new.id)

    def _container_for(self, kind: ContentKind) -> tuple[list[ContentItem], ContentItem | None]:
        """Liste qui doit accueillir un nouvel élément de ce niveau.

        On descend dans la sélection courante quand c'est cohérent (une section
        se place dans un chapitre, une sous-section dans une section) ; sinon on
        crée le parent manquant plutôt que d'ajouter un niveau orphelin.
        """
        assert self._session is not None
        wanted_depth = DEPTH[kind]
        selection = self._selected()
        if selection is not None:
            item, _siblings = selection
            if item.is_structural and DEPTH[item.kind] == wanted_depth - 1:
                return item.children, item
            if item.is_structural and DEPTH[item.kind] >= wanted_depth:
                for ancestor in reversed(self._ancestors(item.id)):
                    if ancestor.is_structural and DEPTH[ancestor.kind] == wanted_depth - 1:
                        return ancestor.children, ancestor
                if DEPTH[item.kind] == wanted_depth - 1:
                    return item.children, item

        parent_kind = next(
            (
                candidate
                for candidate in (ContentKind.CHAPTER, ContentKind.SECTION, ContentKind.SUBSECTION)
                if DEPTH[candidate] == wanted_depth - 1
            ),
            None,
        )
        if parent_kind is None:
            return self._session.items, None
        parent = ContentItem(kind=parent_kind, text="")
        self._session.items.append(parent)
        return parent.children, parent

    def _ancestors(self, item_id: str) -> list[ContentItem]:
        if self._session is None:
            return []
        trail: list[ContentItem] = []

        def walk(items: list[ContentItem], path: list[ContentItem]) -> bool:
            for candidate in items:
                if candidate.id == item_id:
                    trail.extend(path)
                    return True
                if walk(candidate.children, [*path, candidate]):
                    return True
            return False

        walk(self._session.items, [])
        return trail

    def _start_editing(self, item_id: str) -> None:
        node = self._node_for(item_id)
        if node is not None:
            self._tree.setCurrentItem(node)
            self._tree.editItem(node, 2)

    def _node_for(self, item_id: str) -> QTreeWidgetItem | None:
        iterator = QTreeWidgetItemIterator(self._tree)
        while iterator.value() is not None:
            node = iterator.value()
            if node.data(0, ROLE) == item_id:
                return node
            iterator += 1
        return None

    def _remove_selected_item(self) -> None:
        selection = self._selected()
        if selection is None:
            return
        item, siblings = selection
        siblings.remove(item)
        self._render_tree()
        self._schedule_save()

    def _move(self, direction: int) -> None:
        selection = self._selected()
        if selection is None:
            return
        item, siblings = selection
        index = siblings.index(item)
        target = index + direction
        if 0 <= target < len(siblings):
            siblings[index], siblings[target] = siblings[target], siblings[index]
            self._render_tree()
            self._schedule_save()
            node = self._node_for(item.id)
            if node is not None:
                self._tree.setCurrentItem(node)

    # ── Séances ─────────────────────────────────────────────────────────────
    def _create_session(self) -> None:
        if self._class is None:
            return
        today = date.today()
        session = self._state.repository.find_session(self._class.id, today)
        if session is None:
            session = self._state.repository.add_session(Session(class_id=self._class.id, date=today))
        self._reload(self._class.id, session.date)

    def _remove_session(self) -> None:
        current = self._sessions.currentItem()
        if current is None or self._class is None:
            return
        t = self._state.t
        dialog = ConfirmDialog(
            title=t("confirm.delete_session.title"),
            body=t("confirm.delete_session.body"),
            t=t,
            parent=self,
        )
        if dialog.exec() != ConfirmDialog.DialogCode.Accepted:
            return
        self._state.repository.delete_session(current.data(ROLE))
        self._reload(self._class.id, None)

    def _date_changed(self, value: QDate) -> None:
        if self._session is None:
            return
        new_date = date(value.year(), value.month(), value.day())
        clash = self._state.repository.find_session(self._session.class_id, new_date)
        if clash is not None and clash.id != self._session.id:
            QMessageBox.information(self, self._state.t("editor.date"), self._state.t("editor.date"))
            return
        self._session.date = new_date
        self._persist()
        if self._class is not None:
            self._reload(self._class.id, new_date)

    # ── Enregistrement ──────────────────────────────────────────────────────
    def _schedule_save(self) -> None:
        if self._session is not None:
            self._autosave.start()

    def _persist(self) -> None:
        if self._session is None:
            return
        self._session.remark = " ".join(self._remark.toPlainText().split())
        self._session.homework = " ".join(self._homework.toPlainText().split())
        self._state.repository.save_session(self._session)
        row = self._sessions.currentItem()
        if row is not None:
            self._sessions.blockSignals(True)
            row.setText(self._session_row(self._session).text())
            self._sessions.blockSignals(False)

    def _flush(self) -> None:
        if self._autosave.isActive():
            self._autosave.stop()
            self._persist()

    def flush(self) -> None:
        """Écrit la saisie en attente — appelé à la fermeture de la fenêtre."""
        self._flush()

    # ── Export ──────────────────────────────────────────────────────────────
    def _export_pdf(self) -> None:
        if self._class is None:
            return
        sessions = self._state.repository.sessions(self._class.id)
        if not sessions:
            return
        target, _selected = QFileDialog.getSaveFileName(
            self, self._state.t("editor.export_pdf"), f"{self._class.name}.pdf", "PDF (*.pdf)"
        )
        if not target:
            return
        self._flush()
        html = notebook_html(
            self._class,
            self._state.repository.sessions(self._class.id),
            self._state.config.locale.value,
            style=self._state.config.structure_style,
        )
        self._write_pdf(html, target)

    @staticmethod
    def _write_pdf(html: str, target: str) -> None:
        document = QTextDocument()
        document.setHtml(html)
        printer = QPrinter(QPrinter.PrinterMode.HighResolution)
        printer.setOutputFormat(QPrinter.OutputFormat.PdfFormat)
        printer.setOutputFileName(target)
        printer.setPageSize(QPageSize(QPageSize.PageSizeId.A4))
        printer.setPageMargins(QMarginsF(14, 14, 14, 14), QPageLayout.Unit.Millimeter)
        document.print(printer)
