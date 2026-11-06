import { Bell, CalendarRange, Cloud, FileSignature, Palette, User } from '@/components/ui/icons';

export const SETTINGS_SECTIONS = [
  { id: 'emploi', titleKey: 'settings.item.schedule', hintKey: 'settings.card.schedule', icon: CalendarRange, tone: 'blue' },
  { id: 'absences', titleKey: 'settings.item.absences', hintKey: 'settings.card.absences', icon: FileSignature, tone: 'rose' },
  { id: 'profil', titleKey: 'settings.item.profile', hintKey: 'settings.card.profile', icon: User, tone: 'violet' },
  { id: 'apparence', titleKey: 'settings.item.appearance', hintKey: 'settings.card.appearance', icon: Palette, tone: 'pink' },
  { id: 'notifications', titleKey: 'settings.item.notifications', hintKey: 'settings.card.notifications', icon: Bell, tone: 'amber' },
  { id: 'compte', titleKey: 'settings.item.account', hintKey: 'settings.card.account', icon: Cloud, tone: 'green' },
] as const;
export type SettingsCategory = typeof SETTINGS_SECTIONS[number]['id'];
const TAB_ALIASES: Record<string, SettingsCategory> = {
  emploi: 'emploi', absences: 'absences', profil: 'profil', apparence: 'apparence',
  notifications: 'notifications', compte: 'compte', donnees: 'compte', archives: 'compte',
};
export function readSettingsTarget(value: string | null): SettingsCategory | undefined {
  return value && Object.hasOwn(TAB_ALIASES, value) ? TAB_ALIASES[value] : undefined;
}
export function consumeSettingsTarget(): SettingsCategory | undefined {
  try {
    const requested = sessionStorage.getItem('config_initial_tab_v1');
    sessionStorage.removeItem('config_initial_tab_v1');
    return readSettingsTarget(requested);
  } catch { return undefined; }
}
