import { chapter } from './model';

export const classes = chapter('classes', ["students", "content", "schedule"], {
    "title": "Classes, affichage et réglages",
    "summary": "Ouvrez un cahier, changez son affichage ou gérez les informations de la classe.",
    "keywords": "dashboard carte liste grille trois deux groupe paramètres aide",
    "image": {
        "key": "classes",
        "caption": "Les cartes ouvrent le cahier de chaque classe."
    },
    "sections": [
        {
            "title": "Trouver les actions",
            "steps": [
                "Touchez une carte pour ouvrir le cahier. La carte « Ajouter une classe » crée une nouvelle classe.",
                "Le bouton d’affichage du dashboard fait défiler les vues : trois cartes, deux cartes, une carte ou liste. La grille s’adapte à la largeur de l’écran.",
                "Sur chaque carte, ouvrez ⋮ puis « Paramètres » pour modifier le groupe, les informations ou les élèves. Un appui long sur la carte ouvre aussi ces réglages.",
                "Les paramètres généraux se trouvent sous Classes dans la navigation. Aide se trouve en bas de la barre latérale ; sur téléphone, utilisez le bouton Aide de la barre du bas."
            ]
        },
        {
            "title": "Séance en cours",
            "body": "La classe active est mise en avant selon l’emploi du temps enregistré. Le filtre de matière permet de retrouver les classes de la matière choisie. Vérifiez la date, l’heure et les créneaux si l’indication ne correspond pas."
        },
        {
            "title": "Avant de supprimer",
            "body": "Exportez une sauvegarde avant de supprimer une classe. Changer son groupe ou son affichage ne nécessite pas de supprimer le cahier."
        }
    ]
}, {
    "title": "الأقسام والعرض والإعدادات",
    "summary": "افتح دفتر القسم، غيّر طريقة العرض أو عدّل بيانات القسم.",
    "keywords": "لوحة التحكم بطاقات قائمة شبكة مجموعة فوج إعدادات مساعدة",
    "image": {
        "key": "classes",
        "caption": "تفتح البطاقات دفاتر الأقسام."
    },
    "sections": [
        {
            "title": "الوصول إلى الإجراءات",
            "steps": [
                "المس بطاقة القسم لفتح دفتره. استخدم بطاقة «إضافة قسم» لإنشاء قسم جديد.",
                "يبدّل زر العرض بين ثلاث بطاقات وبطاقتين وبطاقة واحدة والقائمة. تتكيف الشبكة مع عرض الشاشة.",
                "افتح ⋮ في بطاقة القسم ثم إعدادات القسم لتعديل الفوج أو البيانات أو لائحة التلاميذ. يمكن أيضاً فتح الإعدادات بالضغط المطول على البطاقة.",
                "توجد الإعدادات العامة تحت الأقسام في شريط التنقل، والمساعدة في أسفل الشريط الجانبي. على الهاتف، استخدم المساعدة في الشريط السفلي."
            ]
        },
        {
            "title": "الحصة الجارية",
            "body": "يبرز القسم الجاري تدريسه حسب استعمال الزمن المسجل. يتيح مرشح المادة الوصول إلى الأقسام المعنية. إذا لم تتطابق الإشارة، راجع توقيت الجهاز وجدول الحصص."
        },
        {
            "title": "قبل الحذف",
            "body": "صدّر نسخة احتياطية قبل حذف قسم. تغيير الفوج أو نمط العرض لا يتطلب حذف الدفتر."
        }
    ]
});
