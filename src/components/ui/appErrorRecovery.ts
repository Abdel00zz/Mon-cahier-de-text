import type { AppLocale } from '../../types';

export type AppErrorKind = 'module' | 'storage' | 'network' | 'unknown';

/** L'ordre compte : une erreur de module contient souvent « fetch ». */
const MODULE_ERROR = [
  /does not provide an export named/i,
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
  /chunkloaderror/i,
  /syntaxerror[^\n]*module/i,
];

const STORAGE_ERROR = [
  /quotaexceeded/i,
  /quota/i,
  /storage/i,
  /indexeddb/i,
];

const NETWORK_ERROR = [
  /failed to fetch/i,
  /networkerror/i,
  /network request failed/i,
  /offline/i,
];

export function classifyAppError(detail?: string): AppErrorKind {
  const source = detail ?? '';
  if (MODULE_ERROR.some(pattern => pattern.test(source))) return 'module';
  if (STORAGE_ERROR.some(pattern => pattern.test(source))) return 'storage';
  if (NETWORK_ERROR.some(pattern => pattern.test(source))) return 'network';
  return 'unknown';
}

export interface AppErrorCopy {
  title: string;
  body: string;
  primary: string;
  repairing: string;
  home: string;
  details: string;
}

const COPY: Record<AppLocale, Record<AppErrorKind, AppErrorCopy>> = {
  fr: {
    module: {
      title: 'Mise à jour incomplète',
      body: 'La mise à jour n’a pas abouti. Réparez pour reprendre.',
      primary: 'Réparer et recharger',
      repairing: 'Réparation…',
      home: 'Retour à l’accueil',
      details: 'Détails',
    },
    storage: {
      title: 'Stockage saturé',
      body: 'Vos cahiers sont conservés. Libérez un peu d’espace, puis rechargez.',
      primary: 'Recharger',
      repairing: 'Rechargement…',
      home: 'Retour à l’accueil',
      details: 'Détails',
    },
    network: {
      title: 'Connexion interrompue',
      body: 'Vérifiez votre connexion, puis rechargez la page.',
      primary: 'Recharger',
      repairing: 'Rechargement…',
      home: 'Retour à l’accueil',
      details: 'Détails',
    },
    unknown: {
      title: 'Rien n’est perdu',
      body: 'Vos cahiers restent sur cet appareil. Rechargez pour reprendre.',
      primary: 'Recharger',
      repairing: 'Rechargement…',
      home: 'Retour à l’accueil',
      details: 'Détails',
    },
  },
  ar: {
    module: {
      title: 'تحديث غير مكتمل',
      body: 'لم يكتمل التحديث. أصلح للمتابعة.',
      primary: 'إصلاح وإعادة التحميل',
      repairing: 'جارٍ الإصلاح…',
      home: 'العودة إلى البداية',
      details: 'التفاصيل',
    },
    storage: {
      title: 'مساحة التخزين ممتلئة',
      body: 'دفاترك محفوظة. حرّر مساحة صغيرة ثم أعد التحميل.',
      primary: 'إعادة التحميل',
      repairing: 'جارٍ إعادة التحميل…',
      home: 'العودة إلى البداية',
      details: 'التفاصيل',
    },
    network: {
      title: 'انقطع الاتصال',
      body: 'تحقّق من اتصالك ثم أعد تحميل الصفحة.',
      primary: 'إعادة التحميل',
      repairing: 'جارٍ إعادة التحميل…',
      home: 'العودة إلى البداية',
      details: 'التفاصيل',
    },
    unknown: {
      title: 'لا شيء ضاع',
      body: 'دفاترك محفوظة على هذا الجهاز. أعد التحميل للمتابعة.',
      primary: 'إعادة التحميل',
      repairing: 'جارٍ إعادة التحميل…',
      home: 'العودة إلى البداية',
      details: 'التفاصيل',
    },
  },
  en: {
    module: {
      title: 'Update incomplete',
      body: 'The update didn’t finish. Repair to continue.',
      primary: 'Repair and reload',
      repairing: 'Repairing…',
      home: 'Back to home',
      details: 'Details',
    },
    storage: {
      title: 'Storage full',
      body: 'Your notebooks are safe. Free a little space, then reload.',
      primary: 'Reload',
      repairing: 'Reloading…',
      home: 'Back to home',
      details: 'Details',
    },
    network: {
      title: 'Connection interrupted',
      body: 'Check your connection, then reload the page.',
      primary: 'Reload',
      repairing: 'Reloading…',
      home: 'Back to home',
      details: 'Details',
    },
    unknown: {
      title: 'Nothing is lost',
      body: 'Your notebooks stay on this device. Reload to continue.',
      primary: 'Reload',
      repairing: 'Reloading…',
      home: 'Back to home',
      details: 'Details',
    },
  },
};

export const appErrorCopy = (kind: AppErrorKind, locale: AppLocale): AppErrorCopy => COPY[locale][kind];

/**
 * Répare une application servie depuis un cache incohérent : désenregistre le
 * service worker et supprime les caches de l'origine. Chaque étape est
 * indépendante : un échec ne doit jamais empêcher le rechargement final.
 */
export async function repairApplicationCache(): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.allSettled(registrations.map(registration => registration.unregister()));
    }
  } catch {
    // Le rechargement reste la sortie de secours.
  }
  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.allSettled(keys.map(key => caches.delete(key)));
    }
  } catch {
    // Idem : on ne bloque jamais la reprise.
  }
}
