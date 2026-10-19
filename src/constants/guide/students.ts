import { chapter } from './model';

export const students = chapter('students', ['classes', 'assessments', 'devices'], {
    "title": "Gérer les élèves de la classe",
    "summary": "Une liste commune aux évaluations, aux activités et à l’administration.",
    "image": {
        "key": "students",
        "caption": "Suivi des élèves et saisie des observations."
    },
    "keywords": "élèves liste noms import administration notes roster",
    "sections": [
        {
            "title": "Ajouter plusieurs noms",
            "steps": [
                "Ouvrez ⋮ sur la carte, puis « Paramètres » et « Élèves de la classe ».",
                "Collez les noms complets : un nom par ligne ou séparés par le point-virgule arabe « ؛ ». Vérifiez la liste reconnue et le compteur avant de continuer.",
                "Enregistrez. Les doublons sont retirés ; la liste accepte jusqu’à 200 élèves.",
                "Dans une évaluation ou une activité, choisissez les élèves concernés. Le lien « Ajouter ou gérer les élèves » rouvre les paramètres de cette classe."
            ]
        },
        {
            "title": "Liste partagée et observations",
            "body": "L’administration peut aussi actualiser la liste. Avec le même compte connecté, attendez la fin de la synchronisation pour retrouver les changements sur les autres appareils. Les observations déjà enregistrées restent conservées ; retirer un nom de la liste ne sert pas à effacer son historique."
        },
        {
            "title": "Retrouver les anciens noms",
            "body": "Si la liste est vide et que des suivis contiennent déjà des élèves, « Reprendre ces noms » permet de récupérer les noms proposés. Vérifiez-les puis enregistrez."
        }
    ]
}, {
    "title": "تدبير لائحة تلاميذ القسم",
    "summary": "لائحة مشتركة للتقويمات والأنشطة والإدارة.",
    "image": {
        "key": "students",
        "caption": "تتبع التلاميذ وتدوين الملاحظات والنقط."
    },
    "keywords": "تلاميذ لائحة أسماء استيراد إدارة نقط مزامنة",
    "sections": [
        {
            "title": "إضافة عدة أسماء",
            "steps": [
                "افتح ⋮ في بطاقة القسم ثم إعدادات القسم وقسم التلاميذ.",
                "الصق الأسماء الكاملة: اسماً في كل سطر أو افصل بينها بالفاصلة المنقوطة العربية « ؛ ». راجع الأسماء المعروفة والعدد الظاهر.",
                "احفظ التعديلات. تُحذف الأسماء المكررة وتقبل اللائحة حتى 200 تلميذ.",
                "في التقويم أو النشاط، حدّد التلاميذ المعنيين. يفتح رابط إضافة أو تدبير التلاميذ إعدادات القسم نفسه."
            ]
        },
        {
            "title": "اللائحة المشتركة والملاحظات",
            "body": "يمكن للإدارة أيضاً تحديث اللائحة. عند استعمال الحساب نفسه، انتظر اكتمال المزامنة لظهور التغييرات على الأجهزة الأخرى. تبقى الملاحظات المسجلة محفوظة؛ إزالة اسم من اللائحة ليست وسيلة لحذف سجله."
        },
        {
            "title": "استرجاع الأسماء السابقة",
            "body": "إذا كانت اللائحة فارغة وتوجد أسماء في تتبعات سابقة، يمكن استرجاع الأسماء المقترحة بالزر المخصص. راجع اللائحة ثم احفظها."
        }
    ]
});
