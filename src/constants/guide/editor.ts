import { chapter } from './model';

export const editor = chapter('editor', ["types", "dates", "assessments"], {
    "title": "Sélectionner et déplacer un contenu",
    "summary": "Travaillez sur un élément précis, même lorsque plusieurs contenus partagent une date.",
    "keywords": "déplacement glisser appui long contenu regroupé même date exercice chapitre paragraphe",
    "image": {
        "key": "editor",
        "caption": "Tableau du cahier : dates, contenus et remarques de séance."
    },
    "sections": [
        {
            "title": "Dater le travail réalisé",
            "steps": [
                "Sélectionnez les éléments réalisés dans le tableau.",
                "Utilisez l’action de date pour attribuer ou modifier leur date. Vérifiez les avertissements avant de confirmer.",
                "Ajoutez les remarques ou le travail à faire dans la zone prévue, puis relisez la séance."
            ]
        },
        {
            "id": "move", "title": "Déplacer directement un élément",
            "body": "Maintenez le contenu jusqu’à son soulèvement, puis faites-le glisser vers un emplacement autorisé. Le repère indique sa destination. Vous pouvez aussi maintenir, relâcher, puis toucher la destination. Sur téléphone, un balayage sans maintien fait défiler le tableau. Échap annule un déplacement en cours."
        },
        {
            "title": "Même date, contenus distincts",
            "body": "Des contenus regroupés parce qu’ils ont la même date restent indépendants. Sélectionnez le contenu concerné pour le déplacer ou changer sa date ; il se dissocie automatiquement si nécessaire. Ce regroupement est différent d’une fusion de contenus identiques."
        },
        {
            "title": "Renommer ou reprogrammer",
            "body": "« Modifier le titre » sert uniquement au titre. Pour changer une date, utilisez l’action de date dédiée. Les exercices peuvent changer de chapitre ou de paragraphe lorsque la destination est autorisée."
        }
    ]
}, {
    "title": "تحديد المحتوى ونقله",
    "summary": "تعامل مع كل عنصر على حدة حتى عندما تتشارك عدة محتويات التاريخ نفسه.",
    "keywords": "نقل سحب ضغط مطول محتويات مجمعة تاريخ تمرين فصل فقرة",
    "image": {
        "key": "editor",
        "caption": "جدول الحصص: التواريخ والمحتويات والملاحظات."
    },
    "sections": [
        {
            "title": "تأريخ العمل المنجز",
            "steps": [
                "حدّد العناصر المنجزة في الجدول.",
                "استخدم إجراء التاريخ لإسناد تاريخ أو تعديله وراجع التنبيهات قبل التأكيد.",
                "أضف الملاحظات أو العمل المطلوب في الخانة المناسبة ثم راجع الحصة."
            ]
        },
        {
            "id": "move", "title": "نقل عنصر مباشرة",
            "body": "اضغط مطولاً على المحتوى حتى يرتفع، ثم اسحبه إلى موضع مسموح. يوضح المؤشر وجهة الإدراج. يمكنك أيضاً الضغط المطول ثم الإفلات ولمس الوجهة. على الهاتف، السحب دون انتظار يمرّر الجدول. يلغي مفتاح Échap النقل الجاري."
        },
        {
            "title": "تاريخ واحد ومحتويات مستقلة",
            "body": "تبقى المحتويات المجمّعة بسبب التاريخ نفسه مستقلة. حدّد المحتوى المعني لنقله أو تغيير تاريخه؛ ينفصل تلقائياً عند الحاجة. يختلف هذا التجميع عن دمج محتويات متطابقة."
        },
        {
            "title": "العنوان والتاريخ",
            "body": "يخص «تعديل العنوان» العنوان فقط. لتغيير التاريخ، استخدم إجراء التاريخ المخصص. يمكن نقل التمارين بين الفصول والفقرات عندما تكون الوجهة مسموحة."
        }
    ]
});
