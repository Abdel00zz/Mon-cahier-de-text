import path from 'path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { BUNDLE_OPTIMIZATION } from './build/optimization';
import { premiumPerformancePlugin } from './build/vite/performance-plugin';
import { PWA_MANIFEST } from './build/vite/pwa-manifest';

const PROJECT_ROOT = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    const nativeBuild = mode === 'android';
    const entries: Record<string, string> = { main: path.resolve(PROJECT_ROOT, 'index.html') };
    if (!nativeBuild) entries.admin = path.resolve(PROJECT_ROOT, 'admin.html');
    const env = loadEnv(mode, '.', '');
    const port = Number(process.env.PORT || env.PORT) || 3000;
    return {
        define: { __NATIVE_API_ORIGIN__: JSON.stringify(env.VITE_NATIVE_API_ORIGIN || 'https://mon-cahier-de-text.vercel.app') },
        server: {
            port,
            host: true,
            strictPort: false,
            allowedHosts: true,
            hmr: { },
            watch: { ignored: ['**/tmp/**', '**/android/**', '**/dist-android/**', '**/artifacts/**'] },
        },
        plugins: [
            react(),
            tailwindcss(),
            VitePWA({
                disable: nativeBuild,
                strategies: 'injectManifest',
                srcDir: 'src/pwa',
                filename: 'sw.ts',
                // Activation automatique pilotée par registerSW, après la saisie en cours.
                registerType: 'prompt',
                injectRegister: null, // enregistrement manuel dans registerSW.ts
                // Référentiels chargés À L'EXÉCUTION par fetch dans src/domain/ : sans cette
                // liste, globPatterns ne précache que js/css/html/woff2 et ces fichiers
                // resteraient indisponibles hors ligne. `vacances-jourferie.json` et
                // `official-student-events.json` sont importés (donc déjà bundlés) et
                // n'ont pas besoin d'être listés ici.
                includeAssets: [
                    /*
                     * Icônes ÉNUMÉRÉES, jamais un joker : `icons/*.png` embarquait
                     * un apple-touch-icon de 1254 px (858 Ko, 36 % de
                     * l'installation) qu'aucune page ne référençait. Un actif
                     * déposé dans `public/icons` ne doit pas entrer dans le
                     * précache sans décision explicite.
                     */
                    'icons/icon-192.png',
                    'icons/notification-badge-96.png',
                    'icons/icon-512.png',
                    'icons/icon-maskable-512.png',
                    'icons/apple-touch-icon-180.png',
                    'icons/favicon-16.png',
                    'icons/favicon-32.png',
                    'icons/favicon.ico',
                    'planning-devoirs.json',
                    'assessment-rules.json',
                    'official-sources.json',
                    'contenus/manifest.json',
                    /*
                     * Les polices arabes embarquées (arabswell-3.ttf,
                     * maghribi-font-3.ttf) n'ont PAS à être listées ici : elles
                     * sont déjà couvertes par `globPatterns` (`**\/*.ttf`). Les
                     * répéter ajoutait deux entrées en double au manifeste
                     * d'installation (Workbox dédoublonne à l'usage, mais le
                     * manifeste restait ambigu).
                     */
                ],
                injectManifest: {
                    globPatterns: ['**/*.{js,css,html,woff2,ttf}'],
                    globIgnores: ['**/admin*'],
                    /*
                     * Workbox ÉCARTE SILENCIEUSEMENT tout fichier au-delà de cette
                     * limite (2 Mo par défaut) : un lot trop gros disparaîtrait du
                     * précache sans le moindre avertissement, et l'application
                     * cesserait de fonctionner hors connexion sans raison visible.
                     * Les illustrations lourdes (≈ 1 Mo) ne sont volontairement pas
                     * précachées : elles sont mises en cache à l'usage par `pwa/sw.ts`.
                     */
                    maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
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
                '@': path.resolve(PROJECT_ROOT, 'src')
            }
        },
        build: {
            minify: 'terser',
            outDir: nativeBuild ? 'dist-android' : 'dist',
            assetsDir: 'assets',
            emptyOutDir: true,
            // Un seul budget fait foi (build/optimization.ts) : le seuil de
            // Rollup et celui du plugin ne peuvent plus diverger.
            chunkSizeWarningLimit: BUNDLE_OPTIMIZATION.CHUNK_WARN_LIMIT_KB,
            rollupOptions: {
                input: entries,
                output: {
                    manualChunks: BUNDLE_OPTIMIZATION.MANUAL_CHUNKS
                }
            }
        }
    };
});
