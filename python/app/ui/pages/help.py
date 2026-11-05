"""Aide : les repères essentiels, sans délayer.

Chaque rubrique répond à une question que l'enseignant se pose vraiment, dans
l'ordre où il rencontre l'écran. Le texte est cherché depuis la même source que
le reste de l'interface (français / arabe / anglais).
"""

from __future__ import annotations

from PyQt6.QtWidgets import QFrame, QHBoxLayout, QLabel, QScrollArea, QVBoxLayout, QWidget

from ...state import AppState
from ..icons import pixmap

_TOPICS: list[tuple[str, str, str, str]] = [
    # (icône, titre fr/ar/en par clé, corps fr/ar/en)
    (
        "classes",
        "Créer une classe",
        "أنشئ قسماً",
        "Create a class",
        "Le bouton + de l'écran Classes ouvre le formulaire : nom, matière, niveau et groupe. La couleur est choisie automatiquement selon la matière ; elle sert de repère dans le tableau de bord et l'emploi du temps.",
        "زر + في شاشة الأقسام يفتح الاستمارة: الاسم، المادة، المستوى والفوج. يُختار اللون تلقائياً حسب المادة، ويُستخدم كعلامة في لوحة الأقسام واستعمال الزمن.",
        "The + button on the Classes screen opens the form: name, subject, level and group. The colour is chosen from the subject and becomes the class marker on the dashboard and the timetable.",
    ),
    (
        "calendar",
        "Remplir l'emploi du temps",
        "املأ استعمال الزمن",
        "Fill the timetable",
        "Cliquez sur une case libre pour y placer une classe. Un créneau n'accueille qu'une classe : cliquer sur une case occupée permet de la remplacer ou de la vider.",
        "اضغط على خانة فارغة لتعيين قسم. الخانة الواحدة تقبل قسماً واحداً: الضغط على خانة مملوءة يتيح استبدالها أو إفراغها.",
        "Click a free cell to place a class. A slot holds a single class: clicking an occupied cell lets you replace or clear it.",
    ),
    (
        "book",
        "Rédiger une séance",
        "حرّر حصة",
        "Write a session",
        "Dans le cahier, une séance correspond à une date. Ajoutez un chapitre, puis ses sections et ses éléments : la numérotation (I, A, 1°, a)) est calculée automatiquement. Un numéro saisi à la main reste prioritaire.",
        "في الدفتر، الحصة مرتبطة بتاريخ. أضف درساً ثم فروعه وعناصره: يُحسب الترقيم (I, A, 1°, a)) آلياً. الرقم المكتوب يدوياً يبقى له الأولوية.",
        "In the notebook a session is a date. Add a chapter, then its sections and items: numbering (I, A, 1°, a)) is computed automatically. A number typed by hand always wins.",
    ),
    (
        "file-text",
        "Exporter en PDF",
        "تصدير PDF",
        "Export as PDF",
        "Le bouton « Exporter en PDF » produit un document A4 identique à ce que vous voyez : dates, contenu numéroté et remarques.",
        "زر « تصدير PDF » يُنتج وثيقة A4 مطابقة لما تراه: التواريخ، المحتوى المرقّم والملاحظات.",
        "The “Export as PDF” button produces an A4 document identical to what you see: dates, numbered content and remarks.",
    ),
    (
        "archive",
        "Sauvegarder et archiver",
        "النسخ الاحتياطي والأرشفة",
        "Back up and archive",
        "Tout reste sur cet ordinateur. « Exporter la sauvegarde » écrit un fichier JSON lisible ; « Archiver l'année » en garde une copie figée avant de repartir à zéro.",
        "كل شيء يبقى على هذا الحاسوب. « تصدير نسخة احتياطية » يكتب ملف JSON قابلاً للقراءة، و« أرشفة السنة » يحفظ نسخة ثابتة قبل البدء من جديد.",
        "Everything stays on this computer. “Export backup” writes a readable JSON file; “Archive the year” keeps a frozen copy before starting fresh.",
    ),
]


class HelpPage(QWidget):
    def __init__(self, state: AppState, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._state = state
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 20, 24, 12)
        layout.setSpacing(10)

        self._title = QLabel()
        self._title.setObjectName("pageTitle")
        layout.addWidget(self._title)
        self._intro = QLabel()
        self._intro.setObjectName("hint")
        layout.addWidget(self._intro)

        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QScrollArea.Shape.NoFrame)
        canvas = QWidget()
        self._column = QVBoxLayout(canvas)
        self._column.setContentsMargins(0, 8, 8, 16)
        self._column.setSpacing(14)
        self._column.addStretch(1)
        scroll.setWidget(canvas)
        layout.addWidget(scroll, 1)

        self._state.configChanged.connect(self.retranslate)
        self.retranslate()

    def retranslate(self) -> None:
        t = self._state.t
        side = 8 if self._state.is_rtl else 0
        self._column.setContentsMargins(side, 8, 0 if self._state.is_rtl else 8, 16)
        self._title.setText(t("help.heading"))
        self._intro.setText(t("help.intro"))

        while self._column.count() > 1:
            item = self._column.takeAt(0)
            widget = item.widget() if item is not None else None
            if widget is not None:
                widget.setParent(None)
                widget.deleteLater()

        locale = self._state.config.locale.value
        accent = "#d9a37f" if self._state.is_dark else "#6b4c35"
        for index, (glyph, fr, ar, en, body_fr, body_ar, body_en) in enumerate(_TOPICS):
            title = {"fr": fr, "ar": ar, "en": en}[locale]
            body = {"fr": body_fr, "ar": body_ar, "en": body_en}[locale]
            self._column.insertWidget(index, self._topic(glyph, title, body, accent))

    def _topic(self, glyph: str, title: str, body: str, accent: str) -> QWidget:
        card = QFrame()
        card.setProperty("card", "true")
        column = QVBoxLayout(card)
        column.setContentsMargins(16, 14, 16, 14)
        column.setSpacing(8)

        header = QWidget(card)
        header_row = QHBoxLayout(header)
        header_row.setContentsMargins(0, 0, 0, 0)
        header_row.setSpacing(8)

        icon_label = QLabel(header)
        icon_label.setPixmap(pixmap(glyph, accent, 20))
        icon_label.setFixedSize(20, 20)
        header_row.addWidget(icon_label)

        heading = QLabel(title, header)
        heading.setObjectName("sectionTitle")
        heading.setWordWrap(True)
        header_row.addWidget(heading, 1)
        column.addWidget(header)

        text = QLabel(body, card)
        text.setWordWrap(True)
        text.setObjectName("hint")
        column.addWidget(text)
        return card
