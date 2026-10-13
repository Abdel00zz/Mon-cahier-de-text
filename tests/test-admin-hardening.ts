import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { AUDIT_LABELS, MAX_AUDIT_ENTRIES, appendAudit, auditDetailFor, isAuditedAction, normalizeAudit, type AdminAuditEntry } from '../src/domain/admin/auditLog';
import { recordAdminAudit, readAdminAudit } from '../api/_lib/adminAudit';
import { ADMIN_ACTION_LIMITS, bucketForAdminAction, enforceAdminActionLimit } from '../api/_lib/adminLoginLimit';
import { HttpError, type ApiRequest, type ApiResponse } from '../api/_lib/http';
import { hashToView, viewToHash } from '../src/admin/route';
import type { RedisClient } from '../api/_lib/redis';

const read = (path: string) => readFileSync(path, 'utf8');

/*
 * ADMINISTRATION — débit borné, journal sans contenu, et correspondance exacte client ⇄ serveur.
 */

// ── 1. Journal ───────────────────────────────────────────────────────────────
const entry = (n: number): AdminAuditEntry => ({ id: `e${n}`, at: new Date(Date.UTC(2026, 9, 12, 8, 0, n)).toISOString(), action: 'blockTeacher' });

test('le journal garde les 300 plus récentes lignes, la plus récente en tête', () => {
  let log: AdminAuditEntry[] = [];
  for (let i = 0; i < MAX_AUDIT_ENTRIES + 25; i++) log = appendAudit(log, entry(i));
  assert.equal(log.length, MAX_AUDIT_ENTRIES);
  assert.equal(log[0].id, `e${MAX_AUDIT_ENTRIES + 24}`);
  assert.equal(log.at(-1)?.id, 'e25');
});

test('un journal altéré est relu sans erreur : les lignes invalides sont écartées', () => {
  assert.deepEqual(normalizeAudit(null), []);
  assert.deepEqual(normalizeAudit('x'), []);
  const good = entry(1);
  const result = normalizeAudit([good, null, 3, { id: 'a' }, { ...good, at: 'hier' }, { ...good, id: 7 }, { ...good, id: 'long', detail: 'x'.repeat(400) }]);
  assert.equal(result.length, 2);
  assert.equal(result[1].detail?.length, 160, 'le détail est borné');
});

test('le journal ne contient jamais de contenu : ni message, ni nom d’élève', () => {
  const secret = 'Mot de passe de la salle des profs : 1234';
  const detail = auditDetailFor('notifyTeacher', { message: secret, title: 'Alerte' });
  assert.equal(detail, `Message de ${secret.length} caractères`);
  assert.doesNotMatch(String(detail), /passe|1234/);
  assert.equal(auditDetailFor('saveClassRoster', { studentNames: ['Amina', 'Omar'] }), '2 élève(s)');
  assert.equal(auditDetailFor('blockTeacher', { blocked: true }), 'Compte bloqué');
  assert.equal(auditDetailFor('blockTeacher', {}), 'Compte débloqué', 'seul un booléen vrai bloque');
  assert.equal(auditDetailFor('saveAssessmentDate', { date: '2026-10-19' }), 'Date fixée au 19/10/2026');
  assert.equal(auditDetailFor('saveAssessmentDate', { date: '' }), 'Date retirée');
});

const memory = () => {
  const data = new Map<string, unknown>();
  return {
    data,
    client: {
      get: async (key: string) => data.get(key) ?? null,
      set: async (key: string, value: unknown) => { data.set(key, value); return 'OK'; },
    } as unknown as RedisClient,
  };
};

test('chaque écriture réussie laisse une ligne ; un journal en panne n’annule jamais l’action', async () => {
  const { client } = memory();
  await recordAdminAudit(client, 'blockTeacher', { phone: '0612345678', blocked: true }, new Date('2026-10-12T08:00:00Z'));
  await recordAdminAudit(client, 'notifyTeacher', { phone: '0612345678', message: 'Bonjour' }, new Date('2026-10-12T08:05:00Z'));
  const lines = await readAdminAudit(client);
  assert.deepEqual(lines.map(line => line.action), ['notifyTeacher', 'blockTeacher'], 'la plus récente d’abord');
  assert.equal(lines[1].phone, '0612345678');
  assert.equal(lines[1].detail, 'Compte bloqué');
  const broken = { get: async () => { throw new Error('indisponible'); }, set: async () => { throw new Error('indisponible'); } } as unknown as RedisClient;
  const quiet = console.error; console.error = () => undefined;
  try { await assert.doesNotReject(recordAdminAudit(broken, 'deleteTeacher', { phone: 'x' })); } finally { console.error = quiet; }
});

test('chaque action d’écriture du serveur a son libellé de journal, et inversement', () => {
  const server = read('api/admin.ts');
  const table = server.slice(server.indexOf('const ADMIN_WRITES'), server.indexOf('const handleAudit'));
  const actions = [...table.matchAll(/^\s{4}(\w+): handle\w+,$/gm)].map(match => match[1]).sort();
  assert.equal(actions.length, 12);
  assert.deepEqual(actions, Object.keys(AUDIT_LABELS).sort());
  for (const action of actions) assert.ok(isAuditedAction(action), action);
  assert.ok(!isAuditedAction('constructor') && !isAuditedAction('login'), 'ni prototype, ni connexion');
});

// ── 2. Débit ─────────────────────────────────────────────────────────────────
const limiter = () => {
  const counts = new Map<string, number>();
  const headers: Record<string, string> = {};
  const redis = {
    eval: async (_script: string, keys: string[], args: number[]) => {
      const count = (counts.get(keys[0]) ?? 0) + 1;
      counts.set(keys[0], count);
      return count > args[0] ? 60 : 0;
    },
  } as unknown as RedisClient;
  const req = { headers: {} } as ApiRequest;
  const res = { setHeader: (name: string, value: string) => { headers[name] = String(value); }, status: () => res, json: () => undefined, end: () => undefined } as unknown as ApiResponse;
  return { redis, req, res, headers };
};

test('chaque famille d’action a son budget, et les familles ne se volent pas leur débit', async () => {
  assert.equal(bucketForAdminAction('notifyTeacher'), 'notify');
  assert.equal(bucketForAdminAction('deleteTeacher'), 'delete');
  assert.equal(bucketForAdminAction('deleteTeacherClass'), 'delete');
  assert.equal(bucketForAdminAction('importClassLessons'), 'import');
  assert.equal(bucketForAdminAction('saveCalendar'), 'write');
  assert.equal(bucketForAdminAction(undefined), 'write');
  assert.equal(bucketForAdminAction('constructor'), 'write', 'un nom de prototype ne choisit pas de famille');
  const { redis, req, res, headers } = limiter();
  const [deleteMax] = ADMIN_ACTION_LIMITS.delete;
  for (let i = 0; i < deleteMax; i++) await enforceAdminActionLimit(redis, req, res, 'deleteTeacher');
  await assert.rejects(enforceAdminActionLimit(redis, req, res, 'deleteTeacher'), (error: unknown) => error instanceof HttpError && error.statusCode === 429);
  assert.equal(headers['Retry-After'], '60', 'le délai d’attente est annoncé');
  await assert.doesNotReject(enforceAdminActionLimit(redis, req, res, 'notifyTeacher'), 'les messages ont leur propre budget');
  await assert.doesNotReject(enforceAdminActionLimit(redis, req, res, 'saveCalendar'));
});

test('un usage normal reste très en dessous des limites, un script de masse est arrêté', () => {
  assert.ok(ADMIN_ACTION_LIMITS.delete[0] <= 10, 'au plus 10 suppressions par fenêtre');
  assert.ok(ADMIN_ACTION_LIMITS.notify[0] <= 30);
  assert.ok(ADMIN_ACTION_LIMITS.write[0] >= 60, 'l’édition courante n’est jamais gênée');
  for (const [, window] of Object.values(ADMIN_ACTION_LIMITS)) assert.equal(window, 600);
});

// ── 3. Le routeur : session → taille → débit → action → journal ──────────────
test('le routeur applique les gardes dans l’ordre, puis journalise', () => {
  const server = read('api/admin.ts');
  const router = server.slice(server.indexOf('export default async function handler'));
  const order = ['await requireAdmin(req);', 'assertBodySize(body);', 'Object.hasOwn(ADMIN_WRITES', 'await enforceAdminActionLimit(', 'await write(body, res);', 'await recordAdminAudit('];
  const positions = order.map(marker => router.indexOf(marker));
  assert.ok(positions.every(position => position > 0), order.filter((_, i) => positions[i] < 0).join(', '));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, 'ordre des gardes');
  assert.doesNotMatch(router, /body\.action === 'blockTeacher'/, 'plus de chaîne de « if » : une seule table');
  assert.match(server, /if \(action === 'audit'\) return await handleAudit\(res\);/);
});

// ── 4. Correspondance exacte client ⇄ serveur ────────────────────────────────
test('toutes les actions du client existent côté serveur, et toutes celles du serveur sont appelées', () => {
  const client = read('src/admin/api.ts');
  const server = read('api/admin.ts');
  const posts = new Set([...client.matchAll(/action: '(\w+)'/g)].map(match => match[1]));
  const gets = new Set([...client.matchAll(/action=(\w+)/g)].map(match => match[1]));
  const table = server.slice(server.indexOf('const ADMIN_WRITES'), server.indexOf('const handleAudit'));
  const serverWrites = new Set([...table.matchAll(/^\s{4}(\w+): handle\w+,$/gm)].map(match => match[1]));
  const router = server.slice(server.indexOf('export default async function handler'));
  const serverGets = new Set([...router.matchAll(/action === '(\w+)'\) return await/g)].map(match => match[1]));
  serverGets.delete('login'); // la connexion est une écriture POST, traitée avant la session
  for (const action of ['login', 'logout']) {
    assert.ok(posts.has(action), `le client appelle ${action}`);
    assert.ok(router.includes(`body.action === '${action}'`), `le serveur traite ${action}`);
    posts.delete(action);
  }
  assert.deepEqual([...posts].sort(), [...serverWrites].sort(), 'écritures : mêmes actions des deux côtés');
  assert.deepEqual([...gets].sort(), [...serverGets].sort(), 'lectures : mêmes actions des deux côtés');
  assert.ok(gets.has('audit') && gets.has('overview'));
});

// ── 5. La console ────────────────────────────────────────────────────────────
test('le journal est un écran de la console, avec son adresse et son bouton', () => {
  assert.deepEqual(hashToView(viewToHash({ name: 'journal' })), { name: 'journal' });
  assert.equal(viewToHash({ name: 'journal' }), '#/journal');
  const app = read('src/admin/AdminApp.tsx');
  assert.match(app, /const AuditLog = lazy\(\(\) => import\('\.\/components\/AuditLog'\)/, 'chargé à l’ouverture');
  assert.match(app, /go\(\{ name: 'journal' \}\)/);
  const log = read('src/admin/components/AuditLog.tsx');
  assert.match(log, /fetchAdminAudit\(signal\)/);
  assert.match(log, /<SereneStudyIllustration size=\{120\} \/>/, 'état vide soigné');
  assert.match(log, /<Skeleton key=\{index\}/, 'squelettes au chargement');
  assert.match(log, /role="alert"[\s\S]*Réessayer/, 'erreur bienveillante avec action');
  assert.match(log, /aria-pressed=\{filter === kind\}/, 'filtres accessibles');
});
