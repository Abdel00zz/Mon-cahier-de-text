"""Traductions de l'interface — français, arabe, anglais.

Une seule table par clé : la parité est garantie à l'import (tout manque lève
une erreur explicite au démarrage des tests), plutôt que découverte en
production par un libellé vide.
"""

from __future__ import annotations

from dataclasses import dataclass

from .models import Locale

Translations = dict[str, dict[str, str]]

_STRINGS: Translations = {
    # Navigation
    "app.title": {"fr": "Cahier de textes", "ar": "دفتر النصوص", "en": "Grade book"},
    "nav.dashboard": {"fr": "Classes", "ar": "الأقسام", "en": "Classes"},
    "nav.editor": {"fr": "Cahier", "ar": "الدفتر", "en": "Notebook"},
    "nav.schedule": {"fr": "Emploi du temps", "ar": "استعمال الزمن", "en": "Timetable"},
    "nav.settings": {"fr": "Réglages", "ar": "الإعدادات", "en": "Settings"},
    "nav.help": {"fr": "Aide", "ar": "المساعدة", "en": "Help"},
    # Tableau de bord
    "dashboard.heading": {"fr": "Mes classes", "ar": "أقسامي الدراسية", "en": "My classes"},
    "dashboard.search": {"fr": "Rechercher une classe", "ar": "بحث عن قسم", "en": "Search a class"},
    "dashboard.add": {"fr": "Ajouter une classe", "ar": "إضافة قسم", "en": "Add a class"},
    "dashboard.empty.title": {"fr": "Créez votre première classe", "ar": "أنشئ قسمك الأول", "en": "Create your first class"},
    "dashboard.empty.body": {
        "fr": "Une classe organise vos séances et remplit votre cahier.",
        "ar": "أضف قسماً لتنظيم حصصك وملء دفتر النصوص.",
        "en": "A class organises your sessions and fills your notebook.",
    },
    "dashboard.no_result": {"fr": "Aucune classe ne correspond", "ar": "لا توجد أقسام مطابقة", "en": "No matching class"},
    "dashboard.session_now": {"fr": "En cours", "ar": "الآن", "en": "Now"},
    "dashboard.session_next": {"fr": "Prochaine séance", "ar": "الحصة القادمة", "en": "Next session"},
    "dashboard.week_load": {"fr": "{count} h / semaine", "ar": "{count} سا / أسبوع", "en": "{count} h / week"},
    "dashboard.no_schedule": {"fr": "Hors emploi du temps", "ar": "خارج استعمال الزمن", "en": "Not scheduled"},
    # Éditeur
    "editor.open": {"fr": "Ouvrir le cahier", "ar": "فتح الدفتر", "en": "Open notebook"},
    "editor.sessions": {"fr": "Séances", "ar": "الحصص", "en": "Sessions"},
    "editor.new_session": {"fr": "Nouvelle séance", "ar": "حصة جديدة", "en": "New session"},
    "editor.delete_session": {"fr": "Supprimer la séance", "ar": "حذف الحصة", "en": "Delete session"},
    "editor.date": {"fr": "Date", "ar": "التاريخ", "en": "Date"},
    "editor.content": {"fr": "Contenu", "ar": "المحتوى", "en": "Content"},
    "editor.remark": {"fr": "Remarque", "ar": "ملاحظة", "en": "Remark"},
    "editor.homework": {"fr": "Travail à faire", "ar": "العمل المنزلي", "en": "Homework"},
    "editor.kind": {"fr": "Nature", "ar": "النوع", "en": "Kind"},
    "editor.number": {"fr": "N°", "ar": "الرقم", "en": "No."},
    "editor.add_chapter": {"fr": "Chapitre", "ar": "درس", "en": "Chapter"},
    "editor.add_section": {"fr": "Section", "ar": "فرع", "en": "Section"},
    "editor.add_subsection": {"fr": "Sous-section", "ar": "فقرة", "en": "Sub-section"},
    "editor.add_item": {"fr": "Élément", "ar": "عنصر", "en": "Item"},
    "editor.add_evaluation": {"fr": "Évaluation", "ar": "تقويم", "en": "Assessment"},
    "editor.remove": {"fr": "Retirer", "ar": "حذف", "en": "Remove"},
    "editor.move_up": {"fr": "Monter", "ar": "أعلى", "en": "Move up"},
    "editor.move_down": {"fr": "Descendre", "ar": "أسفل", "en": "Move down"},
    "editor.empty.title": {"fr": "Cahier vide", "ar": "الدفتر فارغ", "en": "Empty notebook"},
    "editor.empty.body": {
        "fr": "Commencez par un chapitre, puis ajoutez les définitions et les exercices.",
        "ar": "ابدأ بدرس، ثم أضف التعريفات والتمارين.",
        "en": "Start with a chapter, then add definitions and exercises.",
    },
    "editor.saved": {"fr": "Enregistré", "ar": "تم الحفظ", "en": "Saved"},
    "editor.export_pdf": {"fr": "Exporter en PDF", "ar": "تصدير PDF", "en": "Export as PDF"},
    "editor.auto_number": {"fr": "Numérotation automatique", "ar": "ترقيم آلي", "en": "Automatic numbering"},
    # Emploi du temps
    "schedule.heading": {"fr": "Emploi du temps", "ar": "استعمال الزمن", "en": "Timetable"},
    "schedule.morning": {"fr": "Matin", "ar": "صباحاً", "en": "Morning"},
    "schedule.afternoon": {"fr": "Après-midi", "ar": "بعد الظهر", "en": "Afternoon"},
    "schedule.day": {"fr": "Jour", "ar": "اليوم", "en": "Day"},
    "schedule.empty.title": {"fr": "Aucune séance planifiée", "ar": "لا توجد حصص مبرمجة", "en": "No planned session"},
    "schedule.empty.body": {
        "fr": "Cliquez sur une case pour y placer une classe.",
        "ar": "اضغط على خانة لتعيين قسم.",
        "en": "Click a cell to place a class.",
    },
    "schedule.assign": {"fr": "Placer une classe", "ar": "تعيين قسم", "en": "Assign a class"},
    "schedule.clear": {"fr": "Vider la case", "ar": "إفراغ الخانة", "en": "Clear the cell"},
    "schedule.free": {"fr": "Libre", "ar": "فارغ", "en": "Free"},
    # Réglages
    "settings.heading": {"fr": "Réglages", "ar": "الإعدادات", "en": "Settings"},
    "settings.identity": {"fr": "Identité", "ar": "الهوية", "en": "Identity"},
    "settings.teacher": {"fr": "Nom de l'enseignant", "ar": "اسم الأستاذ", "en": "Teacher name"},
    "settings.establishment": {"fr": "Établissement", "ar": "المؤسسة", "en": "Establishment"},
    "settings.academy": {"fr": "Académie", "ar": "الأكاديمية الجهوية", "en": "Academy"},
    "settings.province": {"fr": "Direction provinciale", "ar": "المديرية الإقليمية", "en": "Province"},
    "settings.subjects": {"fr": "Matières", "ar": "المواد الدراسية", "en": "Subjects"},
    "settings.appearance": {"fr": "Apparence", "ar": "المظهر", "en": "Appearance"},
    "settings.theme": {"fr": "Thème", "ar": "الوضع", "en": "Theme"},
    "settings.theme.light": {"fr": "Clair", "ar": "نهاري", "en": "Light"},
    "settings.theme.dark": {"fr": "Sombre", "ar": "ليلي", "en": "Dark"},
    "settings.theme.system": {"fr": "Système", "ar": "تلقائي", "en": "System"},
    "settings.text_size": {"fr": "Taille du texte", "ar": "حجم النص", "en": "Text size"},
    "settings.size.sm": {"fr": "Petit", "ar": "صغير", "en": "Small"},
    "settings.size.md": {"fr": "Normal", "ar": "عادي", "en": "Normal"},
    "settings.size.lg": {"fr": "Grand", "ar": "كبير", "en": "Large"},
    "settings.size.xl": {"fr": "Très grand", "ar": "كبير جدا", "en": "Extra large"},
    "settings.language": {"fr": "Langue", "ar": "اللغة", "en": "Language"},
    "settings.school_year": {"fr": "Début de l'année scolaire", "ar": "بداية السنة الدراسية", "en": "School year start"},
    # Données
    "data.heading": {"fr": "Données", "ar": "البيانات", "en": "Data"},
    "data.export": {"fr": "Exporter la sauvegarde", "ar": "تصدير نسخة احتياطية", "en": "Export backup"},
    "data.import": {"fr": "Restaurer une sauvegarde", "ar": "استعادة نسخة احتياطية", "en": "Restore a backup"},
    "data.archive": {"fr": "Archiver l'année", "ar": "أرشفة السنة", "en": "Archive the year"},
    "data.archived": {"fr": "{count} classe(s) archivée(s)", "ar": "{count} قسم مؤرشف", "en": "{count} class(es) archived"},
    "data.location": {"fr": "Vos données restent sur cet ordinateur.", "ar": "بياناتك محفوظة على هذا الحاسوب.", "en": "Your data stays on this computer."},
    # Aide
    "help.heading": {"fr": "Aide", "ar": "المساعدة", "en": "Help"},
    "help.intro": {
        "fr": "Quelques repères pour tenir votre cahier sans effort.",
        "ar": "بضع إشارات لمسك دفترك بسهولة.",
        "en": "A few landmarks to keep your notebook effortlessly.",
    },
    # Actions communes
    "action.save": {"fr": "Enregistrer", "ar": "حفظ", "en": "Save"},
    "action.cancel": {"fr": "Annuler", "ar": "إلغاء", "en": "Cancel"},
    "action.delete": {"fr": "Supprimer", "ar": "حذف", "en": "Delete"},
    "action.close": {"fr": "Fermer", "ar": "إغلاق", "en": "Close"},
    "action.add": {"fr": "Ajouter", "ar": "إضافة", "en": "Add"},
    "action.edit": {"fr": "Modifier", "ar": "تعديل", "en": "Edit"},
    "action.confirm": {"fr": "Confirmer", "ar": "تأكيد", "en": "Confirm"},
    "confirm.delete_class.title": {"fr": "Supprimer cette classe ?", "ar": "حذف هذا القسم؟", "en": "Delete this class?"},
    "confirm.delete_class.body": {
        "fr": "Le cahier et les séances de cette classe seront retirés. Cette action est définitive.",
        "ar": "سيُحذف دفتر هذا القسم وحصصه نهائياً.",
        "en": "This class's notebook and sessions will be removed. This cannot be undone.",
    },
    "confirm.delete_session.title": {"fr": "Supprimer cette séance ?", "ar": "حذف هذه الحصة؟", "en": "Delete this session?"},
    "confirm.delete_session.body": {
        "fr": "Le contenu saisi pour cette date sera perdu.",
        "ar": "سيُفقد المحتوى المسجل لهذا التاريخ.",
        "en": "The content recorded for this date will be lost.",
    },
    "dialog.new_class": {"fr": "Nouvelle classe", "ar": "قسم جديد", "en": "New class"},
    "dialog.edit_class": {"fr": "Modifier la classe", "ar": "تعديل القسم", "en": "Edit class"},
    "field.name": {"fr": "Nom de la classe", "ar": "اسم القسم", "en": "Class name"},
    "field.subject": {"fr": "Matière", "ar": "المادة", "en": "Subject"},
    "field.level": {"fr": "Niveau", "ar": "المستوى", "en": "Level"},
    "field.group": {"fr": "Groupe", "ar": "الفوج", "en": "Group"},
    "field.cycle": {"fr": "Cycle", "ar": "السلك", "en": "Cycle"},
    "cycle.college": {"fr": "Collège", "ar": "الثانوي الإعدادي", "en": "Middle school"},
    "cycle.lycee": {"fr": "Lycée", "ar": "الثانوي التأهيلي", "en": "High school"},
    "cycle.prepa": {"fr": "Prépa", "ar": "الأقسام التحضيرية", "en": "Preparatory"},
    "cycle.none": {"fr": "Non précisé", "ar": "غير محدد", "en": "Not specified"},
    "weekday.1": {"fr": "Lundi", "ar": "الاثنين", "en": "Monday"},
    "weekday.2": {"fr": "Mardi", "ar": "الثلاثاء", "en": "Tuesday"},
    "weekday.3": {"fr": "Mercredi", "ar": "الأربعاء", "en": "Wednesday"},
    "weekday.4": {"fr": "Jeudi", "ar": "الخميس", "en": "Thursday"},
    "weekday.5": {"fr": "Vendredi", "ar": "الجمعة", "en": "Friday"},
    "weekday.6": {"fr": "Samedi", "ar": "السبت", "en": "Saturday"},
    "message.saved": {"fr": "Modifications enregistrées", "ar": "تم حفظ التعديلات", "en": "Changes saved"},
    "message.imported": {"fr": "Sauvegarde restaurée", "ar": "تمت استعادة النسخة", "en": "Backup restored"},
    "message.exported": {
        "fr": "Sauvegarde écrite",
        "ar": "تمت كتابة النسخة الاحتياطية",
        "en": "Backup written",
    },
    "message.import_failed": {"fr": "Fichier illisible", "ar": "ملف غير صالح", "en": "Unreadable file"},
    "error.unexpected_title": {
        "fr": "Une action n'a pas pu aboutir",
        "ar": "لم تكتمل إحدى العمليات",
        "en": "An action could not complete",
    },
    "error.unexpected_hint": {
        "fr": "Vos données sont intactes. L'incident a été consigné dans le fichier ci-dessous ; vous pouvez continuer à travailler.",
        "ar": "بياناتك سليمة. سُجّل العطل في الملف أدناه، ويمكنك متابعة العمل.",
        "en": "Your data is intact. The incident was written to the file below; you can keep working.",
    },
}


@dataclass(frozen=True, slots=True)
class Translator:
    locale: Locale

    def __call__(self, key: str, **values: object) -> str:
        entry = _STRINGS.get(key)
        if entry is None:
            return key
        text = entry.get(self.locale.value) or entry["fr"]
        return text.format(**values) if values else text

    @property
    def is_rtl(self) -> bool:
        return self.locale is Locale.AR


def keys() -> tuple[str, ...]:
    return tuple(_STRINGS)


def missing_translations() -> dict[str, list[str]]:
    """Clés incomplètes, par langue — utilisé par les tests."""
    gaps: dict[str, list[str]] = {}
    for locale in Locale:
        lacking = [key for key, entry in _STRINGS.items() if not entry.get(locale.value)]
        if lacking:
            gaps[locale.value] = lacking
    return gaps
