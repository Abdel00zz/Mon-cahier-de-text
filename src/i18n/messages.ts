import type { AppLocale } from '../types';
import { accountArchivesScheduleMessages } from './domains/accountArchivesSchedule';
import { notificationsMessages } from './domains/notifications';
import { frMessages } from './messages/fr';
import { enMessages } from './messages/en';
import { arMessages } from './messages/ar';

type MessageValue = string;
type TranslationTable = Record<string, MessageValue>;

const messages: Record<AppLocale, TranslationTable> = {
  fr: { ...frMessages, ...notificationsMessages.fr, ...accountArchivesScheduleMessages.fr },
  en: { ...enMessages, ...notificationsMessages.en, ...accountArchivesScheduleMessages.en },
  ar: { ...arMessages, ...notificationsMessages.ar, ...accountArchivesScheduleMessages.ar },
};

export const localeMetadata: Array<{ value: AppLocale; nativeName: string; shortName: string }> = [
  { value: 'fr', nativeName: 'Français', shortName: 'FR' },
  { value: 'en', nativeName: 'English', shortName: 'EN' },
  { value: 'ar', nativeName: 'العربية', shortName: 'ع' },
];

/** Traduction utilisable aussi par les moteurs métier hors composants React. */
export const translateLocaleMessage = (
  locale: AppLocale,
  key: string,
  values: Record<string, string | number> = {},
): string => {
  const template = messages[locale][key] ?? messages.fr[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, token) => String(values[token] ?? `{${token}}`));
};
