import type { AppLocale } from '../../types';
import type { CompanionMessage } from './companionCopy';

const copy = {
  fr: {
    'sync-error': { title: 'Synchronisation interrompue', detail: 'La dernière synchronisation a échoué. Relancez-la pour vérifier vos modifications.', action: 'Réessayer la synchronisation' },
    offline: { title: 'Hors connexion', detail: 'Vous êtes hors connexion. La synchronisation reprendra au retour du réseau.' },
    syncing: { title: 'Synchronisation en cours', detail: 'Je vérifie vos dernières modifications…' },
    checking: { title: 'Vérification en cours', detail: 'Je regarde le cahier et les réponses de l’équipe…' },
    'inbox-error': { title: 'Messagerie indisponible', detail: 'Les réponses de l’équipe n’ont pas pu être chargées.', action: 'Recharger les échanges' },
    busy: 'Vérification…',
  },
  ar: {
    'sync-error': { title: 'تعذرت المزامنة', detail: 'لم تكتمل المزامنة الأخيرة. أعد المحاولة للتحقق من تعديلاتك.', action: 'إعادة المزامنة' },
    offline: { title: 'دون اتصال', detail: 'أنت دون اتصال. تُستأنف المزامنة عند عودة الإنترنت.' },
    syncing: { title: 'مزامنة جارية', detail: 'أتحقق من آخر تعديلاتك وأقوم بمزامنتها الآن…' },
    checking: { title: 'جارٍ التحقق', detail: 'أراجع الدفتر وردود الفريق لمتابعة كل جديد…' },
    'inbox-error': { title: 'تعذّر فتح المراسلات', detail: 'تعذّر تحميل ردود الفريق.', action: 'تحديث المراسلات' },
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
