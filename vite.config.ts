import path from 'path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { BUNDLE_OPTIMIZATION } from './build/optimization';
import { premiumPerformancePlugin } from './build/vite/performance-plugin';
import { nativeAssets } from './build/vite/native-assets';
import { versionFile } from './build/vite/version-file';
import { modernMathFonts, pruneLegacyMathFonts } from './build/vite/modern-math-fonts';

const PROJECT_ROOT = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_VERSION = (JSON.parse(readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8')) as { version: string }).version;

export default defineConfig(({ mode }) => {
    const nativeBuild = mode === 'android';
    const entries: Record<string, string> = { main: path.resolve(PROJECT_ROOT, 'index.html') };
    if (!nativeBuild) entries.admin = path.resolve(PROJECT_ROOT, 'admin.html');
    const env = loadEnv(mode, '.', '');
    const port = Number(process.env.PORT || env.PORT) || 3000;
    return {
        define: {
            __NATIVE_API_ORIGIN__: JSON.stringify(env.VITE_NATIVE_API_ORIGIN || 'https://mon-cahier-de-text.vercel.app'),
            // Comparée à /version.json : la page n'a plus de service worker pour
            // préparer une mise à jour en arrière-plan.
            __APP_VERSION__: JSON.stringify(PACKAGE_VERSION),
        },
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
            pruneLegacyMathFonts(),
            ...(nativeBuild ? [nativeAssets()] : []),
            versionFile(),
            premiumPerformancePlugin({ report: mode === 'analyze', strict: mode === 'analyze' }),
        ],
        resolve: {
            alias: {
                '@': path.resolve(PROJECT_ROOT, 'src')
            }
        },
        css: { postcss: { plugins: [modernMathFonts()] } },
        build: {
            copyPublicDir: !nativeBuild,
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
