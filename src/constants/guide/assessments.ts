import { chapter } from './model';

export const assessments = chapter('assessments', ["students", "editor", "dates"], {
    "title": "Contrôle continu et activités",
    "summary": "Ouvrez les évaluations de la classe et utilisez les actions adaptées à chaque type.",
    "image": {
        "key": "assessments",
        "caption": "Devoirs, évaluations et activités de la classe."
    },
    "keywords": "contrôle continu évaluation activités oral colle correction devoir maison absences note remise cahiers",
    "sections": [
        {
            "title": "Accéder à la bonne classe",
            "steps": [
                "Sur la carte de la classe, ouvrez ⋮ puis « Évaluations et activités ».",
                "Les évaluations et activités saisies dans le tableau du cahier apparaissent ici. Ouvrez la rubrique concernée pour consulter ses dates et compléter son suivi.",
                "La liste d’élèves vient des paramètres de cette classe. Utilisez « Ajouter ou gérer les élèves » si un nom manque, puis revenez à votre suivi."
            ]
        },
        {
            "title": "Comprendre les actions",
            "body": "Un devoir surveillé peut comporter un document et un relevé d’absences. Le devoir maison distingue le travail donné, sa date limite de remise et sa correction. La correction propose son contenu, le suivi « Non rendus » lorsque disponible et la corbeille. La colle propose le suivi des élèves et la corbeille ; elle concerne les classes préparatoires."
        },
        {
            "title": "Modifier une date",
            "body": "Les dates sont affichées en gris et en lecture seule. Pour les changer, revenez au tableau du cahier et datez l’élément concerné. La feuille de suivi reçoit les éléments du cahier ; elle ne crée pas de nouvelle évaluation."
        },
        {
            "title": "Observer et noter",
            "body": "Pour l’oral, la colle, la remise d’un devoir ou la vérification des cahiers, sélectionnez les élèves puis renseignez les observations proposées. Les notes apparaissent lorsque le suivi les prévoit. Sur Android, la saisie des notes utilise le clavier numérique décimal. Enregistrez avant de fermer."
        }
    ]
}, {
    "title": "المراقبة المستمرة والأنشطة",
    "summary": "افتح تقويمات القسم واستعمل الإجراءات المناسبة لكل نوع.",
    "image": {
        "key": "assessments",
        "caption": "الفروض والتقويمات والأنشطة التربوية للقسم."
    },
    "keywords": "مراقبة مستمرة تقويم أنشطة شفهي كول تصحيح فرض منزلي غياب نقط تسليم دفاتر",
    "sections": [
        {
            "title": "فتح القسم المعني",
            "steps": [
                "في بطاقة القسم، افتح ⋮ ثم «التقويمات و الأنشطة».",
                "تظهر هنا التقويمات والأنشطة المسجلة في جدول الدفتر. افتح الفئة المعنية للاطلاع على التواريخ وإتمام التتبع.",
                "تأتي الأسماء من إعدادات القسم نفسه. إذا غاب اسم، افتح رابط إضافة أو تدبير التلاميذ ثم عد إلى التتبع."
            ]
        },
        {
            "title": "فهم الإجراءات",
            "body": "يمكن أن يتضمن الفرض المحروس وثيقة ولائحة غياب. يميّز الفرض المنزلي بين العمل المسند وآخر أجل للتسليم والتصحيح. يتيح التصحيح محتواه وتتبع عدم التسليم عند توفره وسلة الحذف. تتيح الكول تتبع التلاميذ وسلة الحذف، وتخص الأقسام التحضيرية."
        },
        {
            "title": "تعديل التاريخ",
            "body": "تظهر التواريخ بالرمادي للقراءة فقط. لتغييرها، ارجع إلى جدول الدفتر وحدّد تاريخ العنصر المعني. تستقبل ورقة التتبع عناصر الدفتر ولا تنشئ تقويماً جديداً."
        },
        {
            "title": "الملاحظات والنقط",
            "body": "في الشفهي أو الكول أو تسليم الفرض أو فحص الدفاتر، حدّد التلاميذ ثم أدخل الملاحظات المتاحة. تظهر النقط عندما يتيحها نوع التتبع. على أندرويد، تستعمل خانة النقط لوحة الأرقام العشرية. احفظ قبل الإغلاق."
        }
    ]
});
