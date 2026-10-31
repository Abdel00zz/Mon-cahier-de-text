import { uniq } from 'es-toolkit';
import type { AppLocale, ClassInfo } from '../../types';
import { formatLocalizedClassDisplayName } from '../../constants/class-levels';
import { classIdentityFor } from '../classes/classIdentity';
import { scheduleClassLabel } from '../classes/classAbbreviation';
import { bidiIsolate } from '../../lib/text/textDirection';
import { translateLocaleMessage } from '../../i18n/messages';
import { conciseNotificationText } from './notificationPresentation';

/** Same wording and class identity in the foreground and in Android's scheduled reminders. */
export function sessionNotificationCopy(kind: 'end' | 'missing', classIds: readonly string[],
  classes: readonly ClassInfo[], locale: AppLocale, minutes = 5): { title: string; body: string } {
  const t = (key: string, values?: Record<string, string | number>) => translateLocaleMessage(locale, key, values);
  const ids = uniq(classIds);
  const labels = ids.slice(0, 2).map(id => {
    const name = classes.find(item => item.id === id)?.name?.trim();
    if (!name) return bidiIsolate(t('sessionAlert.classFallback'));
    const identity = classIdentityFor(name, locale);
    const budget = ids.length > 1 ? 32 : 48;
    const fullName = formatLocalizedClassDisplayName(name, locale);
    const label = Array.from(fullName).length > budget && (identity.tierKey || identity.streamCode)
      ? scheduleClassLabel(identity, locale) : fullName;
    // Keep the group at the end even when a long custom branch must be shortened.
    const group = identity.group ?? label.match(/(?:groupe?|فوج|الفوج)\s+([0-9٠-٩۰-۹]{1,2}|[A-Za-z])$/iu)?.[1];
    const suffix = group && label.endsWith(group) ? ` ${group}` : '';
    const base = suffix ? label.slice(0, -group!.length).trimEnd() : label;
    return bidiIsolate(conciseNotificationText(base, budget - suffix.length) + suffix);
  });
  const names = (labels.join(locale === 'ar' ? ' و' : locale === 'en' ? ' and ' : ' et ')
    || t('sessionAlert.classFallback')) + (ids.length > 2 ? t(ids.length === 3 ? 'sessionAlert.otherClass' : 'sessionAlert.otherClasses', { count: ids.length - 2 }) : '');
  return {
    title: t(kind === 'end' ? 'sessionAlert.endSoonTitle' : 'sessionAlert.missingDateTitle'),
    body: conciseNotificationText(kind === 'end'
      ? t('sessionAlert.endSoonBody', { classes: names, minutes })
      : t(ids.length > 1 ? 'sessionAlert.missingDateMany' : 'sessionAlert.missingDateOne', { classes: names, className: names, count: ids.length }), 180),
  };
}
