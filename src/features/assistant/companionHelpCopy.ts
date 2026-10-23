import type { AppLocale } from '../../types';

const copy = {
  fr: { open: 'Comment faire ?', opening: 'Ouverture du guide…', retry: 'Réessayer', error: 'Le guide ne s’est pas ouvert. Réessayez ou revenez au cahier.' },
  ar: { open: 'كيف أفعل ذلك؟', opening: 'جارٍ فتح الدليل…', retry: 'إعادة المحاولة', error: 'تعذر فتح الدليل. أعد المحاولة أو عُد إلى الدفتر.' },
  en: { open: 'How does it work?', opening: 'Opening the guide…', retry: 'Try again', error: 'The guide could not open. Try again or return to the notebook.' },
} as const;

export const companionHelpCopy = (locale: AppLocale) => copy[locale];
