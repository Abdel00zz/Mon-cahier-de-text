import type { AppLocale } from '../../types';

const copy = {
  fr: {
    open: 'Comment faire ?', back: 'Revenir au message', search: 'Rechercher dans l’aide',
    placeholder: 'Dates, élèves, impression…', source: 'D’après le guide', loading: 'Ouverture de l’aide…',
    error: 'L’aide ne s’est pas chargée. Vous pouvez réessayer.', retry: 'Réessayer',
    empty: 'Aucune rubrique trouvée. Essayez un mot comme « date » ou « élèves ».', clear: 'Effacer la recherche',
    read: 'Voir dans le guide', opening: 'Ouverture du guide…', unavailable: 'Cette rubrique est indisponible.',
    french: 'Le guide est disponible en français pour cette langue.',
  },
  ar: {
    open: 'كيف أفعل ذلك؟', back: 'العودة إلى الرسالة', search: 'البحث في دليل الاستخدام',
    placeholder: 'تاريخ، تلاميذ، طباعة…', source: 'من دليل الاستخدام', loading: 'جارٍ فتح المساعدة…',
    error: 'تعذر تحميل المساعدة. يمكنك إعادة المحاولة.', retry: 'إعادة المحاولة',
    empty: 'لم أجد موضوعاً مطابقاً. جرّب كلمة مثل «تاريخ» أو «تلاميذ».', clear: 'مسح البحث',
    read: 'عرض الشرح في الدليل', opening: 'جارٍ فتح الدليل…', unavailable: 'هذا الموضوع غير متاح.',
    french: 'الدليل متاح بالفرنسية لهذه اللغة.',
  },
  en: {
    open: 'How does it work?', back: 'Back to the message', search: 'Search the help guide',
    placeholder: 'Dates, élèves, impression…', source: 'From the guide', loading: 'Opening help…',
    error: 'Help could not load. You can try again.', retry: 'Try again',
    empty: 'No topic found. Try a French keyword such as “date” or “élèves”.', clear: 'Clear search',
    read: 'Read in the guide', opening: 'Opening the guide…', unavailable: 'This topic is unavailable.',
    french: 'The guide is available in French for this language.',
  },
} as const;

export const companionHelpCopy = (locale: AppLocale) => copy[locale];
