import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { BUNDLE_OPTIMIZATION } from './config/optimization';

const premiumPerformancePlugin = (): Plugin => ({
    name: 'premium-performance-budget',
    apply: 'build',
    generateBundle(_, bundle) {
        const budgetBytes = BUNDLE_OPTIMIZATION.CHUNK_WARN_LIMIT_KB * 1024;

        Object.entries(bundle).forEach(([fileName, asset]) => {
            if (asset.type !== 'chunk') return;
            const size = Buffer.byteLength(asset.code, 'utf8');
            if (size <= budgetBytes) return;

            this.warn(
                `[performance-budget] ${fileName} = ${(size / 1024).toFixed(1)} kB ` +
                `(budget ${BUNDLE_OPTIMIZATION.CHUNK_WARN_LIMIT_KB} kB). Consider lazy-loading this surface.`
            );
        });
    }
});

export default defineConfig(({ mode }) => {
    loadEnv(mode, '.', '');
    return {
        server: {
            // le harnais de preview assigne un port via la variable d'environnement PORT
            port: process.env.PORT ? Number(process.env.PORT) : 5173,
            strictPort: false,
        },
        plugins: [
            react(),
            tailwindcss(),
            VitePWA({
                strategies: 'injectManifest',
                srcDir: 'pwa',
                filename: 'sw.ts',
                registerType: 'prompt',
                injectRegister: null, // enregistrement manuel dans registerSW.ts
                includeAssets: ['icons/icon.svg', 'vacances-jourferie.json'],
                injectManifest: {
                    globPatterns: ['**/*.{js,css,html,woff2}'],
                    globIgnores: ['**/admin*'],
                },
                manifest: {
                    name: 'Cahier de Textes Interactif',
                    short_name: 'Cahier',
                    description: 'Le hub de suivi du programme pour les enseignants.',
                    lang: 'fr',
                    dir: 'ltr',
                    display: 'standalone',
                    orientation: 'any',
                    start_url: '/',
                    scope: '/',
                    theme_color: '#C96442',
                    background_color: '#FDFCFA',
                    icons: [
                        { src: '/icons/icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
                        { src: '/icons/icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
                    ],
                },
            }),
            premiumPerformancePlugin(),
        ],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.')
            }
        },
        build: {
            minify: 'terser',
            outDir: 'dist',
            assetsDir: 'assets',
            emptyOutDir: true,
            rollupOptions: {
                input: {
                    main: path.resolve(__dirname, 'index.html'),
                    admin: path.resolve(__dirname, 'admin.html')
                },
                output: {
                    manualChunks: BUNDLE_OPTIMIZATION.MANUAL_CHUNKS
                }
            }
        }
    };
});
