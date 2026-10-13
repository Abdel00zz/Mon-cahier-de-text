import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { hashToView, sameView, viewToHash, type AdminView } from '../src/admin/route';
import {
  DEFAULT_OVERVIEW_FILTERS,
  csvCell,
  freshnessLabel,
  hasActiveFilters,
  readOverviewFilters,
  teachersToCsv,
  writeOverviewFilters,
} from '../src/admin/overviewTools';

const read = (path: string) => readFileSync(path, 'utf8');

/*
 * TABLEAU DE BORD DE L'ADMINISTRATION — adresses, mémoire des filtres, export, fraîcheur,
 * et branchements entre l'interface, l'API et le stockage.
 */

// ── 1. Un écran, une adresse ──────────────────────────────────────────────────
test('chaque écran a une adresse, et l’adresse ramène au même écran', () => {
  const views: AdminView[] = [
    { name: 'overview' },
    { name: 'teacher', phone: '+212600000000' },
    { name: 'teacher', phone: 'acct_a:b/c' },
    { name: 'calendar' },
    { name: 'bulletin' },
    { name: 'timetableClock' },
    { name: 'timetableClock', phone: '0612345678' },
    { name: 'evaluationPolicy' },
    { name: 'evaluationPolicy', phone: '0612345678' },
  ];
  for (const view of views) assert.deepEqual(hashToView(viewToHash(view)), view, viewToHash(view));
  assert.equal(viewToHash({ name: 'overview' }), '#/');
  assert.ok(sameView({ name: 'teacher', phone: 'a' }, { name: 'teacher', phone: 'a' }));
  assert.ok(!sameView({ name: 'teacher', phone: 'a' }, { name: 'teacher', phone: 'b' }));
});

test('une adresse inconnue ou mal formée ramène à la liste, jamais à une erreur', () => {
  for (const hash of ['', '#', '#/', '#/inconnu', '#/enseignant', '#/enseignant/%E0%A4%A', '#/../../etc']) {
    assert.deepEqual(hashToView(hash), { name: 'overview' }, hash || '(vide)');
  }
});

// ── 2. Mémoire des filtres ────────────────────────────────────────────────────
const memory = () => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  };
};

test('les filtres du dernier passage sont repris, validés et effacés quand ils redeviennent neutres', () => {
  const storage = memory();
  assert.deepEqual(readOverviewFilters(storage), DEFAULT_OVERVIEW_FILTERS, 'rien de stocké : valeurs par défaut');
  const filters = { school: 'lycee-ibn-sina', cycle: 'lycee', subject: 'Mathématiques', severity: 'critical' as const, sort: 'name' as const };
  writeOverviewFilters(storage, filters);
  assert.deepEqual(readOverviewFilters(storage), filters);
  assert.ok(hasActiveFilters(filters));
  writeOverviewFilters(storage, DEFAULT_OVERVIEW_FILTERS);
  assert.equal(storage.data.size, 0, 'des filtres neutres ne laissent aucune trace');
  assert.ok(!hasActiveFilters(DEFAULT_OVERVIEW_FILTERS));
});

test('un stockage altéré, ancien ou hostile retombe sur les valeurs par défaut', () => {
  const key = 'admin.overview.filters.v1';
  for (const raw of ['{', 'null', '[]', '"x"', JSON.stringify({ severity: 'pirate', sort: 'chaos', cycle: 5, school: { a: 1 } }), JSON.stringify({ subject: 'x'.repeat(500) })]) {
    const storage = memory();
    storage.data.set(key, raw);
    const result = readOverviewFilters(storage);
    assert.equal(result.severity, 'all');
    assert.equal(result.sort, 'severity');
    assert.equal(result.cycle, 'all');
    assert.equal(result.subject, 'all');
    assert.equal(result.school, null);
  }
  assert.deepEqual(readOverviewFilters(undefined), DEFAULT_OVERVIEW_FILTERS, 'pas de stockage (navigation privée)');
  const broken = { getItem: () => { throw new Error('refusé'); } };
  assert.deepEqual(readOverviewFilters(broken), DEFAULT_OVERVIEW_FILTERS);
  assert.doesNotThrow(() => writeOverviewFilters({ setItem: () => { throw new Error('plein'); }, removeItem: () => undefined }, { ...DEFAULT_OVERVIEW_FILTERS, cycle: 'lycee' }));
});

// ── 3. Export CSV ─────────────────────────────────────────────────────────────
test('l’export CSV neutralise les formules et protège séparateurs et guillemets', () => {
  assert.equal(csvCell('=HYPERLINK("http://x")'), `"'=HYPERLINK(""http://x"")"`, 'formule neutralisée, guillemets doublés');
  for (const dangerous of ['+212600000000', '-1+1', '@SUM(A1)', '\t=1+1']) assert.ok(csvCell(dangerous).startsWith("'"), dangerous);
  assert.equal(csvCell('Nom; Prénom'), '"Nom; Prénom"');
  assert.equal(csvCell('ligne 1\nligne 2'), 'ligne 1 ligne 2', 'jamais de saut de ligne dans une cellule');
  assert.equal(csvCell(87), '87');
  assert.equal(csvCell('Amina El Idrissi'), 'Amina El Idrissi');
});

test('le CSV commence par un BOM, utilise « ; » et garde une ligne par enseignant', () => {
  const csv = teachersToCsv([
    { name: 'Amina', school: 'Lycée Ibn Sina', email: 'a@x.ma', phone: '0612', classes: 3, cycles: 'Lycée', completion: 72, status: 'À jour', lastSyncAt: '2026-10-10T08:00:00.000Z', pendingMessages: 0, blocked: false },
    { name: '=cmd', school: '', email: '', phone: '', classes: 0, cycles: '', completion: 0, status: 'Inactif', lastSyncAt: '', pendingMessages: 2, blocked: true },
  ]);
  assert.equal(csv.charCodeAt(0), 0xFEFF);
  const lines = csv.slice(1).split('\r\n');
  assert.equal(lines.length, 3, 'en-tête + 2 lignes');
  assert.ok(lines[0].startsWith('Enseignant;Établissement;'));
  assert.ok(lines[1].includes(';72;'));
  assert.ok(lines[2].startsWith("'=cmd;"), 'une formule saisie par un enseignant n’est jamais exécutable');
  assert.ok(lines[2].endsWith(';oui'));
});

// ── 4. Fraîcheur ──────────────────────────────────────────────────────────────
test('la fraîcheur se lit d’un coup d’œil', () => {
  const t = 1_000_000_000;
  assert.equal(freshnessLabel(null, t), 'Pas encore actualisé');
  assert.equal(freshnessLabel(t - 2_000, t), 'Actualisé à l’instant');
  assert.equal(freshnessLabel(t - 25_000, t), 'Actualisé il y a 25 s');
  assert.equal(freshnessLabel(t - 3 * 60_000, t), 'Actualisé il y a 3 min');
  assert.equal(freshnessLabel(t - 2 * 3600_000, t), 'Actualisé il y a 2 h');
  assert.equal(freshnessLabel(t + 5_000, t), 'Actualisé à l’instant', 'une horloge en avance ne donne jamais un temps négatif');
});

// ── 5. Branchements serveur ───────────────────────────────────────────────────
test('la vue d’ensemble ne renvoie la liste que si elle a changé', () => {
  const server = read('api/admin.ts');
  assert.match(server, /createHash\('sha1'\)/, 'empreinte du contenu');
  assert.match(server, /since === etag \? \{ unchanged: true, etag \} : \{ teachers, etag \}/);
  assert.match(server, /handleOverview\(req, res\)/, 'le routeur transmet la requête (paramètre since)');
  const client = read('src/admin/api.ts');
  assert.match(client, /since \? `&since=\$\{encodeURIComponent\(since\)\}` : ''/);
  assert.match(client, /data\?\.unchanged === true && typeof data\.etag === 'string'/);
  const app = read('src/admin/AdminApp.tsx');
  assert.match(app, /fetchOverview\(requestController\.signal, etag\.current\)/, 'le rafraîchissement automatique envoie l’empreinte');
  assert.match(app, /if \(!result\.unchanged\) setTeachers\(result\.teachers\)/, 'une liste identique ne redessine rien');
});

test('les écritures d’administration sont gardées au même endroit, et un blocage n’est jamais implicite', () => {
  const server = read('api/admin.ts');
  const router = server.slice(server.indexOf('export default async function handler'));
  assert.ok(router.indexOf('await requireAdmin(req);') < router.indexOf('assertBodySize(body);'), 'session d’abord, taille ensuite');
  assert.ok(router.indexOf('assertBodySize(body);') < router.indexOf("body.action === 'blockTeacher'"), 'avant toute action');
  assert.match(server, /typeof body\.blocked !== 'boolean'\) throw new HttpError\(400/, 'un champ absent ne bloque pas un compte');
  assert.doesNotMatch(server, /body\.blocked !== false/);
  assert.match(server, /body\.classId\.length > 120 \|\| body\.assessmentId\.length > 180/, 'identifiants bornés');
});

test('la fiche d’un enseignant se charge en un seul aller-retour', () => {
  const server = read('api/admin.ts');
  const detail = server.slice(server.indexOf('const handleTeacherDetail'), server.indexOf('/** Rafraîchissement léger'));
  assert.match(detail, /pipeline\.get\(KEYS\.adminEvaluationPolicy\);/);
  assert.match(detail, /pipeline\.get\(KEYS\.adminEvaluationPolicyForUser\(phone\)\);/);
  assert.doesNotMatch(detail, /Promise\.all/, 'plus de second aller-retour');
});

test('sur Firestore, un pipeline de lecture seule lit en parallèle', () => {
  const store = read('api/_lib/firestoreStore.ts');
  assert.match(store, /operations\.every\(\(\[method\]\) => method === 'get' \|\| method === 'hget'\)/);
  assert.match(store, /return Promise\.all\(operations\.map/);
});

// ── 6. Branchements interface ─────────────────────────────────────────────────
test('seules la connexion et la liste partent avec la première page', () => {
  const app = read('src/admin/AdminApp.tsx');
  for (const view of ['TeacherDetail', 'CalendarManager', 'OfficialBulletinManager', 'TimetableClockManager', 'EvaluationPolicyManager']) {
    assert.match(app, new RegExp(`const ${view} = lazy\\(\\(\\) => import\\('./components/${view}'\\)`), `${view} chargé à l’ouverture`);
    assert.doesNotMatch(app, new RegExp(`import \\{ ${view} \\} from`), `${view} n’est plus importé statiquement`);
  }
  assert.match(app, /import \{ AdminLogin \} from/);
  assert.match(app, /import \{ TeacherList \} from/);
  assert.match(app, /<Skeleton className="h-36 w-full rounded-2xl" \/>/, 'gabarit de chargement sans décalage');
});

test('chaque navigation passe par l’adresse, et le bouton Précédent y répond', () => {
  const app = read('src/admin/AdminApp.tsx');
  assert.match(app, /window\.location\.hash = hash/);
  assert.match(app, /addEventListener\('hashchange', onHashChange\)/);
  assert.match(app, /bootView = useRef<AdminView>\(hashToView\(window\.location\.hash\)\)/, 'un lien profond s’ouvre après la connexion');
  assert.doesNotMatch(app, /setView\(\{ name: '(teacher|calendar|bulletin|timetableClock|evaluationPolicy)'/, 'plus de navigation sans adresse');
});

test('la liste est rapide, vivante et ne laisse jamais une surface vide', () => {
  const list = read('src/admin/components/TeacherList.tsx');
  assert.match(list, /const TeacherCard = memo\(/, 'cartes mémorisées');
  assert.match(list, /useDeferredValue\(query\)/, 'la frappe n’attend pas le filtrage');
  assert.match(list, /readOverviewFilters\(browserStorage\(\)\)/, 'filtres repris');
  assert.match(list, /contentVisibility: 'auto'/, 'les cartes hors écran ne coûtent rien');
  assert.match(list, /<Skeleton key=\{index\}/, 'squelettes au premier chargement');
  assert.match(list, /<ClassroomWelcomeIllustration size=\{120\} \/>/, 'état vide illustré');
  assert.match(list, /Réinitialiser les filtres/, 'état vide avec action');
  assert.match(list, /event\.key === '\/'/, 'raccourci de recherche');
  assert.match(list, /freshnessLabel\(lastUpdatedAt, now\)/, 'fraîcheur affichée');
  assert.match(list, /refreshFailed \? 'Actualisation interrompue/, 'les données possiblement anciennes sont signalées');
  assert.match(list, /teachersToCsv\(rows\)/, 'export');
  assert.match(list, /min-h-11/, 'cibles tactiles de 44 px');
});
