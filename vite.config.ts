import path from 'path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA, type ManifestOptions } from 'vite-plugin-pwa';
import { BUNDLE_OPTIMIZATION } from './config/optimization';

const PROJECT_ROOT = path.dirname(fileURLToPath(import.meta.url));

/*
 * MOCK D'API POUR LE DÉVELOPPEMENT LOCAL (jamais inclus au build : apply 'serve').
 * La version déployée utilise les fonctions Vercel (/api/auth, /api/sync + Redis) ;
 * en local, ce plugin les simule pour travailler EXACTEMENT comme en production :
 *   • connexion : téléphone 06000000 · mot de passe 00000000 ;
 *   • synchro : état en mémoire (réinitialisé au redémarrage du serveur dev).
 */
/*
 * Budget de performance : avertit toujours, et devient bloquant en mode
 * `analyze` (npm run analyze). Sans ce mode, une régression au-delà du budget
 * passait en silence ; l'exécuter à la demande donne un vrai garde-fou sans
 * casser les builds de production ordinaires.
 */
const premiumPerformancePlugin = (options: { strict?: boolean; report?: boolean } = {}): Plugin => ({
    name: 'premium-performance-budget',
    apply: 'build',
    generateBundle(_, bundle) {
        const budgetKb = BUNDLE_OPTIMIZATION.CHUNK_WARN_LIMIT_KB;
        const budgetBytes = budgetKb * 1024;
        const chunks: Array<{ file: string; kb: number }> = [];
        const oversized: string[] = [];

        Object.entries(bundle).forEach(([fileName, asset]) => {
            if (asset.type !== 'chunk') return;
            const size = Buffer.byteLength(asset.code, 'utf8');
            chunks.push({ file: fileName, kb: size / 1024 });
            if (size <= budgetBytes) return;

            oversized.push(`${fileName} (${(size / 1024).toFixed(1)} kB)`);
            this.warn(
                `[performance-budget] ${fileName} = ${(size / 1024).toFixed(1)} kB ` +
                `(budget ${budgetKb} kB). Consider lazy-loading this surface.`
            );
        });

        if (options.report) {
            chunks.sort((a, b) => b.kb - a.kb)
                .forEach(chunk => this.warn(`[bundle-size] ${chunk.file} = ${chunk.kb.toFixed(1)} kB`));
        }
        if (options.strict && oversized.length > 0) {
            this.error(`[performance-budget] Budget de ${budgetKb} kB dépassé : ${oversized.join(', ')}`);
        }
    }
});

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

const PWA_MANIFEST: LocalizedManifest = {
    id: '/',
    name: 'Mon cahier de textes',
    name_localized: {
        fr: { value: 'Mon cahier de textes', lang: 'fr-MA', dir: 'ltr' },
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
    orientation: 'any',
    start_url: '/',
    scope: '/',
    launch_handler: { client_mode: 'navigate-existing' },
    prefer_related_applications: false,
    theme_color: '#1a56db',
    background_color: '#F8FAFC',
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

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const port = Number(process.env.PORT || env.PORT) || 3000;
    return {
        server: {
            port,
            host: true,
            strictPort: false,
            allowedHosts: true,
            hmr: { },
        },
        plugins: [
                        react(),
            tailwindcss(),
            VitePWA({
                strategies: 'injectManifest',
                srcDir: 'pwa',
                filename: 'sw.ts',
                registerType: 'autoUpdate',
                injectRegister: null, // enregistrement manuel dans registerSW.ts
                // Référentiels chargés À L'EXÉCUTION par fetch (voir utils/assessments.ts,
                // utils/assessmentRules.ts et utils/predefinedContent.ts) : sans cette
                // liste, globPatterns ne précache que js/css/html/woff2 et ces fichiers
                // resteraient indisponibles hors ligne. `vacances-jourferie.json` et
                // `official-student-events.json` sont importés (donc déjà bundlés) et
                // n'ont pas besoin d'être listés ici.
                includeAssets: [
                    'icons/*.png',
                    'icons/favicon.ico',
                    'planning-devoirs.json',
                    'assessment-rules.json',
                    'official-sources.json',
                    'contenus/manifest.json',
                ],
                injectManifest: {
                    globPatterns: ['**/*.{js,css,html,woff2}'],
                    globIgnores: ['**/admin*'],
                },
                devOptions: {
                    enabled: true,
                    type: 'module',
                    navigateFallback: '/index.html',
                },
                manifest: PWA_MANIFEST,
            }),
            premiumPerformancePlugin({ report: mode === 'analyze', strict: mode === 'analyze' }),
        ],
        resolve: {
            alias: {
                '@': path.resolve(PROJECT_ROOT, '.')
            }
        },
        build: {
            minify: 'terser',
            outDir: 'dist',
            assetsDir: 'assets',
            emptyOutDir: true,
            // Un seul budget fait foi (config/optimization.ts) : le seuil de
            // Rollup et celui du plugin ne peuvent plus diverger.
            chunkSizeWarningLimit: BUNDLE_OPTIMIZATION.CHUNK_WARN_LIMIT_KB,
            rollupOptions: {
                input: {
                    main: path.resolve(PROJECT_ROOT, 'index.html'),
                    admin: path.resolve(PROJECT_ROOT, 'admin.html')
                },
                output: {
                    manualChunks: BUNDLE_OPTIMIZATION.MANUAL_CHUNKS
                }
            }
        }
    };
});
