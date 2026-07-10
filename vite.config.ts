import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { BUNDLE_OPTIMIZATION } from './config/optimization';

/*
 * MOCK D'API POUR LE DÉVELOPPEMENT LOCAL (jamais inclus au build : apply 'serve').
 * La version déployée utilise les fonctions Vercel (/api/auth, /api/sync + Redis) ;
 * en local, ce plugin les simule pour travailler EXACTEMENT comme en production :
 *   • connexion : téléphone 06000000 · mot de passe 00000000 ;
 *   • synchro : état en mémoire (réinitialisé au redémarrage du serveur dev).
 */
const DEV_PHONE = '0600000000';
const DEV_PASSWORD = '00000000';

const devApiMockPlugin = (): Plugin => {
    const DEV_USER = {
        phone: DEV_PHONE,
        nom: 'Dev',
        prenom: 'Prof',
        cycles: ['college', 'lycee'],
        subjects: ['Mathématiques'],
    };
    let sessionUser: Record<string, unknown> | null = null;
    let classesBlob: Record<string, unknown> | null = null;
    const lessonsByClass = new Map<string, unknown>();
    let devSnapshot: Record<string, unknown> | null = null; // vue admin (poussée au sync)

    const readBody = (req: import('http').IncomingMessage): Promise<string> =>
        new Promise(resolve => {
            let data = '';
            req.on('data', chunk => { data += chunk; });
            req.on('end', () => resolve(data));
        });
    const send = (res: import('http').ServerResponse, status: number, payload: unknown) => {
        res.statusCode = status;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(payload));
    };
    const hasSession = (req: import('http').IncomingMessage) =>
        /cdt_dev_session=1/.test(req.headers.cookie ?? '');
    // accepte 06000000, 0600000000, +212 6..., etc. — tolérant sur la saisie dev
    const phoneMatches = (raw: unknown) => {
        const digits = String(raw ?? '').replace(/\D/g, '');
        return digits === '06000000' || digits === '0600000000' || digits === '2126000000' || digits === '212600000000';
    };

    return {
        name: 'dev-api-mock',
        apply: 'serve',
        configureServer(server) {
            server.middlewares.use('/api/auth', async (req, res) => {
                if (req.method === 'GET') {
                    if (hasSession(req)) return send(res, 200, { user: sessionUser ?? DEV_USER });
                    return send(res, 401, { error: 'Non connecté.' });
                }
                if (req.method === 'POST') {
                    let body: Record<string, unknown> = {};
                    try { body = JSON.parse(await readBody(req)); } catch { /* corps vide */ }
                    if (body.action === 'login') {
                        if (phoneMatches(body.phone) && body.password === DEV_PASSWORD) {
                            sessionUser = DEV_USER;
                            res.setHeader('Set-Cookie', 'cdt_dev_session=1; Path=/; SameSite=Lax');
                            return send(res, 200, { user: DEV_USER });
                        }
                        return send(res, 401, { error: 'Téléphone ou mot de passe incorrect. (dev : 06000000 / 00000000)' });
                    }
                    if (body.action === 'register') {
                        sessionUser = {
                            phone: String(body.phone ?? DEV_PHONE),
                            nom: String(body.nom ?? 'Dev'),
                            prenom: String(body.prenom ?? 'Prof'),
                            cycles: Array.isArray(body.cycles) ? body.cycles : [],
                            subjects: Array.isArray(body.subjects) ? body.subjects : [],
                        };
                        res.setHeader('Set-Cookie', 'cdt_dev_session=1; Path=/; SameSite=Lax');
                        return send(res, 200, { user: sessionUser });
                    }
                    if (body.action === 'logout') {
                        sessionUser = null;
                        res.setHeader('Set-Cookie', 'cdt_dev_session=; Path=/; Max-Age=0');
                        return send(res, 200, { ok: true });
                    }
                    return send(res, 400, { error: 'Action inconnue.' });
                }
                send(res, 405, { error: 'Méthode non autorisée.' });
            });

            server.middlewares.use('/api/sync', async (req, res) => {
                if (!hasSession(req)) return send(res, 401, { error: 'Non connecté.' });
                if (req.method === 'GET') {
                    const url = new URL(req.url ?? '/', 'http://localhost');
                    const classId = url.searchParams.get('classId');
                    if (classId) {
                        const blob = lessonsByClass.get(classId);
                        return blob
                            ? send(res, 200, blob)
                            : send(res, 404, { error: 'Aucune donnée cloud pour cette classe.' });
                    }
                    return send(res, 200, classesBlob ?? {
                        classes: [], schedules: [], timetable: [], settings: {},
                        settingsUpdatedAt: '', classMeta: {}, updatedAt: '',
                    });
                }
                if (req.method === 'POST') {
                    let body: Record<string, any> = {};
                    try { body = JSON.parse(await readBody(req)); } catch { /* corps vide */ }
                    const now = new Date().toISOString();
                    const classMeta: Record<string, { updatedAt: string }> = { ...((classesBlob?.classMeta as any) ?? {}) };
                    for (const entry of body.lessons ?? []) {
                        lessonsByClass.set(entry.classId, { lessonsData: entry.lessonsData, updatedAt: entry.updatedAt || now });
                        classMeta[entry.classId] = { updatedAt: entry.updatedAt || now };
                    }
                    for (const id of body.deletedClassIds ?? []) {
                        lessonsByClass.delete(id);
                        delete classMeta[id];
                    }
                    if (body.snapshot && typeof body.snapshot === 'object') {
                        devSnapshot = { ...body.snapshot, phone: DEV_PHONE, lastSyncAt: now };
                    }
                    classesBlob = {
                        classes: body.classes ?? (classesBlob?.classes as any) ?? [],
                        schedules: body.schedules ?? (classesBlob?.schedules as any) ?? [],
                        timetable: body.timetable ?? (classesBlob?.timetable as any) ?? [],
                        settings: body.settings ?? (classesBlob?.settings as any) ?? {},
                        settingsUpdatedAt: body.settings ? (body.settingsUpdatedAt || now) : ((classesBlob?.settingsUpdatedAt as any) ?? ''),
                        classMeta,
                        updatedAt: now,
                    };
                    return send(res, 200, { ok: true, serverTime: now, classMeta });
                }
                send(res, 405, { error: 'Méthode non autorisée.' });
            });

            // Interface d'administration (/admin.html) — code d'accès dev : 00000000
            server.middlewares.use('/api/admin', async (req, res) => {
                const hasAdmin = /cdt_dev_admin=1/.test(req.headers.cookie ?? '');
                if (req.method === 'POST') {
                    let body: Record<string, unknown> = {};
                    try { body = JSON.parse(await readBody(req)); } catch { /* corps vide */ }
                    if (body.action === 'login') {
                        if (body.code === DEV_PASSWORD) {
                            res.setHeader('Set-Cookie', 'cdt_dev_admin=1; Path=/; SameSite=Lax');
                            return send(res, 200, { ok: true });
                        }
                        return send(res, 401, { error: "Code d'accès incorrect. (dev : 00000000)" });
                    }
                    if (body.action === 'logout') {
                        res.setHeader('Set-Cookie', 'cdt_dev_admin=; Path=/; Max-Age=0');
                        return send(res, 200, { ok: true });
                    }
                    if (!hasAdmin) return send(res, 401, { error: 'Session admin requise.' });
                    if (body.action === 'blockTeacher') return send(res, 200, { ok: true, blocked: body.blocked !== false });
                    if (body.action === 'deleteTeacher') return send(res, 200, { ok: true, deletedClasses: lessonsByClass.size });
                    if (body.action === 'notifyTeacher') return send(res, 200, { ok: true, sent: 1 });
                    return send(res, 400, { error: 'Action inconnue.' });
                }
                if (req.method === 'GET') {
                    if (!hasAdmin) return send(res, 401, { error: 'Session admin requise.' });
                    const url = new URL(req.url ?? '/', 'http://localhost');
                    const action = url.searchParams.get('action');
                    if (action === 'overview') {
                        return send(res, 200, { teachers: devSnapshot ? [devSnapshot] : [] });
                    }
                    if (action === 'teacher') {
                        return send(res, 200, {
                            user: { ...DEV_USER, createdAt: new Date().toISOString(), lastSyncAt: (devSnapshot as any)?.lastSyncAt ?? null },
                            classes: (classesBlob?.classes as any) ?? [],
                            schedules: (classesBlob?.schedules as any) ?? [],
                            classMeta: (classesBlob?.classMeta as any) ?? {},
                            snapshot: devSnapshot,
                        });
                    }
                    if (action === 'lessons') {
                        const blob = lessonsByClass.get(url.searchParams.get('classId') ?? '');
                        return blob
                            ? send(res, 200, blob)
                            : send(res, 404, { error: 'Aucun cahier synchronisé pour cette classe.' });
                    }
                    return send(res, 400, { error: 'Action inconnue.' });
                }
                send(res, 405, { error: 'Méthode non autorisée.' });
            });
        },
    };
};

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
            devApiMockPlugin(),
            react(),
            tailwindcss(),
            VitePWA({
                strategies: 'injectManifest',
                srcDir: 'pwa',
                filename: 'sw.ts',
                registerType: 'autoUpdate',
                injectRegister: null, // enregistrement manuel dans registerSW.ts
                includeAssets: ['icons/*.png', 'icons/icon.svg', 'vacances-jourferie.json'],
                injectManifest: {
                    globPatterns: ['**/*.{js,css,html,woff2}'],
                    globIgnores: ['**/admin*'],
                },
                manifest: {
                    id: '/',
                    name: 'Cahier de Textes Interactif',
                    short_name: 'Cahier',
                    description: 'Le hub de suivi du programme pour les enseignants : cahier, progression, alertes — même hors connexion.',
                    lang: 'fr',
                    dir: 'ltr',
                    display: 'standalone',
                    orientation: 'any',
                    start_url: '/',
                    scope: '/',
                    // aligné sur les tokens du design system : --primary / --background
                    theme_color: '#0057D1',
                    background_color: '#F9FAFB',
                    categories: ['education', 'productivity'],
                    icons: [
                        // PNG d'abord (compatibilité launchers Android/iOS), SVG en complément
                        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
                        { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                        { src: '/icons/icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
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
