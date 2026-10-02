import type { ManifestOptions } from 'vite-plugin-pwa';


type ManifestLocalizedText = string | {
    value: string;
    lang?: string;
    dir?: 'ltr' | 'rtl';
};

type LocalizedShortcut = ManifestOptions['shortcuts'][number] & {
    name_localized: Record<string, ManifestLocalizedText>;
    short_name_localized: Record<string, ManifestLocalizedText>;
    description_localized: Record<string, ManifestLocalizedText>;
};

type LocalizedManifest = Partial<ManifestOptions> & {
    name_localized: Record<string, ManifestLocalizedText>;
    short_name_localized: Record<string, ManifestLocalizedText>;
    description_localized: Record<string, ManifestLocalizedText>;
    shortcuts: LocalizedShortcut[];
};

const shortcutIcon = [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }];

export const PWA_MANIFEST: LocalizedManifest = {
    id: '/',
    name: 'Mon Cahier de Text',
    name_localized: {
        fr: { value: 'Mon Cahier de Text', lang: 'fr-MA', dir: 'ltr' },
        ar: { value: 'دفتر نصوصي', lang: 'ar-MA', dir: 'rtl' },
        en: { value: 'My lesson notebook', lang: 'en', dir: 'ltr' },
    },
    short_name: 'Mon cahier',
    short_name_localized: {
        fr: { value: 'Mon cahier', lang: 'fr-MA', dir: 'ltr' },
        ar: { value: 'دفتر نصوصي', lang: 'ar-MA', dir: 'rtl' },
        en: { value: 'My notebook', lang: 'en', dir: 'ltr' },
    },
    description: 'Cahier de textes enseignant avec progression, emploi du temps, évaluations, alertes utiles et accès hors connexion.',
    description_localized: {
        fr: {
            value: 'Cahier de textes enseignant avec progression, emploi du temps, évaluations, alertes utiles et accès hors connexion.',
            lang: 'fr-MA',
            dir: 'ltr',
        },
        ar: {
            value: 'دفتر نصوص للأستاذ يجمع التدرج واستعمال الزمن والتقويمات والتنبيهات المفيدة، ويعمل دون اتصال.',
            lang: 'ar-MA',
            dir: 'rtl',
        },
        en: {
            value: 'A teacher lesson notebook for progress, timetables, assessments, useful alerts, and offline access.',
            lang: 'en',
            dir: 'ltr',
        },
    },
    lang: 'fr-MA',
    dir: 'ltr',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    /*
     * Aucune orientation imposée : le cahier se consulte au bureau en paysage
     * (colonnes larges) et se saisit au téléphone en portrait (une main).
     * L'application installée pivote donc librement, comme le reste de l'OS.
     */
    orientation: 'any',
    start_url: '/',
    scope: '/',
    launch_handler: { client_mode: 'navigate-existing' },
    prefer_related_applications: false,
    theme_color: '#f7f7fb',
    background_color: '#f7f7fb',
    categories: ['education', 'productivity', 'utilities'],
    shortcuts: [
        {
            name: 'Mes classes',
            short_name: 'Classes',
            description: 'Ouvrir la liste des classes et leurs cahiers de textes.',
            url: '/#/',
            icons: shortcutIcon,
            name_localized: {
                fr: 'Mes classes',
                ar: { value: 'أقسامي', dir: 'rtl' },
                en: 'My classes',
            },
            short_name_localized: {
                fr: 'Classes',
                ar: { value: 'الأقسام', dir: 'rtl' },
                en: 'Classes',
            },
            description_localized: {
                fr: 'Ouvrir la liste des classes et leurs cahiers de textes.',
                ar: { value: 'فتح الأقسام ودفاتر النصوص المرتبطة بها.', dir: 'rtl' },
                en: 'Open classes and their lesson notebooks.',
            },
        },
        {
            name: 'Pilotage',
            short_name: 'Pilotage',
            description: 'Consulter les repères, la progression et les informations globales.',
            url: '/#/notifications',
            icons: shortcutIcon,
            name_localized: {
                fr: 'Pilotage',
                ar: { value: 'القيادة', dir: 'rtl' },
                en: 'Overview',
            },
            short_name_localized: {
                fr: 'Pilotage',
                ar: { value: 'القيادة', dir: 'rtl' },
                en: 'Overview',
            },
            description_localized: {
                fr: 'Consulter les repères, la progression et les informations globales.',
                ar: { value: 'عرض المؤشرات والتقدم والمعلومات العامة.', dir: 'rtl' },
                en: 'View benchmarks, progress, and global information.',
            },
        },
        {
            name: 'Paramètres',
            short_name: 'Paramètres',
            description: 'Configurer le profil, les classes, l’emploi du temps et la synchronisation.',
            url: '/#/parametres',
            icons: shortcutIcon,
            name_localized: {
                fr: 'Paramètres',
                ar: { value: 'الإعدادات', dir: 'rtl' },
                en: 'Settings',
            },
            short_name_localized: {
                fr: 'Paramètres',
                ar: { value: 'الإعدادات', dir: 'rtl' },
                en: 'Settings',
            },
            description_localized: {
                fr: 'Configurer le profil, les classes, l’emploi du temps et la synchronisation.',
                ar: { value: 'ضبط الملف والأقسام واستعمال الزمن والمزامنة.', dir: 'rtl' },
                en: 'Configure the profile, classes, timetable, and synchronization.',
            },
        },
    ],
    icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
};
