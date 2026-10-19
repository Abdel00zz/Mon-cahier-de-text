import { chapter } from './model';

export const dates = chapter('dates', ["editor", "schedule", "notifications"], {
    "title": "Choisir et vérifier une date",
    "summary": "Une zone compacte pour dater un contenu ou le répartir sur plusieurs séances.",
    "keywords": "date début fin répartition plusieurs séances calendrier avertissement",
    "image": {
        "key": "dates",
        "caption": "Sélection d’une date pour le contenu. Capture d’une version antérieure."
    },
    "sections": [
        {
            "title": "Affecter une date",
            "steps": [
                "Sélectionnez le ou les contenus concernés puis ouvrez l’action de date.",
                "Saisissez la date ou choisissez-la dans le calendrier. Vérifiez les éléments sélectionnés avant d’appliquer.",
                "Lisez les éventuels avertissements : emploi du temps, jour de repos, vacances ou absence. Corrigez la date ou confirmez lorsque l’action est autorisée.",
                "Relisez le regroupement dans le tableau. Modifier la date d’un contenu ne doit pas reprogrammer les autres contenus non sélectionnés."
            ]
        },
        {
            "title": "Répartir sur plusieurs séances",
            "body": "Dans le formulaire de contenu, la date de début est à côté du champ. L’action discrète située dessous permet de répartir le contenu sur plusieurs séances et d’indiquer une date de fin. Vérifiez d’abord l’emploi du temps de la classe."
        },
        {
            "title": "Deux séances le même jour",
            "body": "Une date commune ne prouve pas que toutes les séances du jour sont complètes. Vérifiez le travail réalisé dans chaque contenu."
        }
    ]
}, {
    "title": "اختيار التاريخ والتحقق منه",
    "summary": "منطقة مدمجة لتأريخ المحتوى أو توزيعه على عدة حصص.",
    "keywords": "تاريخ بداية نهاية توزيع حصص تقويم تنبيه",
    "image": {
        "key": "dates",
        "caption": "اختيار تاريخ للمحتوى. لقطة من إصدار سابق."
    },
    "sections": [
        {
            "title": "إسناد تاريخ",
            "steps": [
                "حدّد المحتوى أو المحتويات المعنية ثم افتح إجراء التاريخ.",
                "أدخل التاريخ أو اختره من التقويم وراجع العناصر المحددة قبل التطبيق.",
                "اقرأ التنبيهات المحتملة: استعمال الزمن أو يوم الراحة أو العطلة أو الغياب. صحّح التاريخ أو أكّد عندما يكون الإجراء مسموحاً.",
                "راجع التجميع في الجدول. تغيير تاريخ محتوى لا يعيد برمجة المحتويات غير المحددة."
            ]
        },
        {
            "title": "التوزيع على عدة حصص",
            "body": "في نموذج المحتوى، يظهر تاريخ البداية بجانب حقل الإدخال. يتيح الإجراء الصغير أسفله التوزيع على عدة حصص وتحديد تاريخ النهاية. راجع أولاً استعمال زمن القسم."
        },
        {
            "title": "حصتان في اليوم نفسه",
            "body": "لا يعني التاريخ المشترك اكتمال جميع حصص اليوم. راجع العمل المنجز في كل محتوى."
        }
    ]
});
