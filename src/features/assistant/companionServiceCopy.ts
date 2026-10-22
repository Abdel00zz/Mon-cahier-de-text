import type { AppLocale } from '../../types';
import type { CompanionMessage } from './companionCopy';

const copy = {
  fr: {
    'sync-error': { title: 'Synchronisation à reprendre', detail: 'Je n’ai pas pu vérifier les dernières données du cloud. On réessaie ?', action: 'Réessayer la synchronisation' },
    offline: { title: 'Mode hors ligne', detail: 'La connexion manque pour joindre le cloud. Je reprendrai la vérification à son retour.' },
    syncing: { title: 'Synchronisation en cours', detail: 'Je vérifie vos dernières modifications…' },
    checking: { title: 'Vérification en cours', detail: 'Je regarde le cahier et les réponses de l’équipe…' },
    'inbox-error': { title: 'Échanges indisponibles', detail: 'Je n’arrive pas à récupérer les réponses de l’équipe. On réessaie ?', action: 'Recharger les échanges' },
    busy: 'Vérification…',
  },
  ar: {
    'sync-error': { title: 'المزامنة تحتاج إعادة المحاولة', detail: 'لم أتمكن من التحقق من آخر البيانات السحابية. نعيد المحاولة؟', action: 'إعادة المزامنة' },
    offline: { title: 'وضع دون اتصال', detail: 'ينقصنا الاتصال للوصول إلى السحابة. سأستأنف التحقق عند عودته.' },
    syncing: { title: 'المزامنة جارية', detail: 'أتحقق من آخر تعديلاتك…' },
    checking: { title: 'التحقق جارٍ', detail: 'أراجع الدفتر وردود الفريق…' },
    'inbox-error': { title: 'المحادثات غير متاحة', detail: 'لم أتمكن من جلب ردود الفريق. نجرّب مجدداً؟', action: 'إعادة تحميل المحادثات' },
    busy: 'جارٍ التحقق…',
  },
  en: {
    'sync-error': { title: 'Sync needs another try', detail: 'I couldn’t check the latest cloud data. Shall we try again?', action: 'Retry sync' },
    offline: { title: 'Offline mode', detail: 'I need a connection to reach the cloud. I’ll check again when it returns.' },
    syncing: { title: 'Syncing', detail: 'I’m checking your latest changes…' },
    checking: { title: 'Checking', detail: 'I’m checking the notebook and replies from the team…' },
    'inbox-error': { title: 'Conversations unavailable', detail: 'I couldn’t fetch the team’s replies. Shall we try again?', action: 'Reload conversations' },
    busy: 'Checking…',
  },
} as const;

type ServiceState = Exclude<keyof typeof copy.fr, 'busy'>;
export const companionServiceMessage = (state: ServiceState, locale: AppLocale, busy: boolean): CompanionMessage => {
  const message = copy[locale][state];
  return { id: state, ...message, ...('action' in message && busy ? { action: copy[locale].busy } : {}) };
};
