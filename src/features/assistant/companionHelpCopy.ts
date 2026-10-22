import type { AppLocale } from '../../types';

const copy = {
  fr: { open: 'Comment faire ?' },
  ar: { open: 'كيف أفعل ذلك؟' },
  en: { open: 'How does it work?' },
} as const;

export const companionHelpCopy = (locale: AppLocale) => copy[locale];
