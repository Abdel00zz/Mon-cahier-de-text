import assert from 'node:assert/strict';
import test from 'node:test';
import { captureWorkspaceLease, isWorkspaceKey, readWorkspaceScope, registerWorkspaceWriter, switchAccountWorkspace, workspaceIsCurrent, WorkspaceSwitchError, WORKSPACE_SNAPSHOT_PREFIX } from '../utils/accountWorkspace';
import { assertWorkspaceOwner } from '../api/_lib/workspaceOwner';
import { getPendingWork, markClassDirty, markClassDeleted, markClassesListDirty, reloadSyncState } from '../utils/syncBus';

class MemoryStorage {
  entries = new Map<string, string>();
  failWrite: ((key: string, value: string) => boolean) | null = null;
  get length() { return this.entries.size; }
  key(index: number) { return [...this.entries.keys()][index] ?? null; }
  getItem(key: string) { return this.entries.get(key) ?? null; }
  setItem(key: string, value: string) {
    if (this.failWrite?.(key, value)) throw new Error('QuotaExceededError');
    this.entries.set(key, value);
  }
  removeItem(key: string) { this.entries.delete(key); }
}
const A = '0600000001';
const B = '0600000002';
const seed = () => {
  const storage = new MemoryStorage();
  storage.setItem('appConfig_v1', JSON.stringify({ applicationLocale: 'fr', defaultTeacherName: 'Prof A', timetable: [{ classId: 'a' }] }));
  storage.setItem('classManager_v1', JSON.stringify([{ id: 'a', name: 'Classe A' }]));
  storage.setItem('classData_v1_a', 'travail A non synchronisé');
  storage.setItem('authUser_v1', JSON.stringify({ phone: A }));
  return storage;
};
const snapshot = (owner: string, entries: Record<string, string>) => JSON.stringify({ version: 1, owner, savedAt: '2026-08-31', entries });

test('migration du même compte : aucun nettoyage, propriétaire fixé avant expiration', () => {
  const storage = seed();
  const scope = switchAccountWorkspace(A, { storage, legacyOwner: A, revision: 'initial' });
  assert.equal(storage.getItem('classData_v1_a'), 'travail A non synchronisé');
  assert.equal(scope.owner, A);
  storage.removeItem('authUser_v1'); // réponse 401
  switchAccountWorkspace(B, { storage });
  assert.equal(storage.getItem('classData_v1_a'), null);
  assert.equal(JSON.parse(storage.getItem(WORKSPACE_SNAPSHOT_PREFIX + A)!).owner, A);
});

test('un nouveau compte récupère uniquement la langue, jamais le profil ou les classes', () => {
  const storage = seed();
  switchAccountWorkspace(B, { storage, legacyOwner: A });
  assert.deepEqual(JSON.parse(storage.getItem('appConfig_v1')!), { applicationLocale: 'fr' });
  assert.equal(storage.getItem('classManager_v1'), null);
  assert.equal(storage.getItem('classData_v1_a'), null);
});

test('aller-retour A/B restaure cahiers, réglages, conflits, archives et suppressions', () => {
  const storage = seed();
  for (const key of ['syncPending_v1', 'syncMeta_v1', 'settingsSyncMeta_v1', 'archives_v1_index', 'archive_2025', 'classDataConflict_v1_a', 'editJournal_v1_a', 'printMeta_v1_a', 'assessmentSnooze_a', 'latenessSnooze_a', 'editor_actions_ignored_v1_a']) storage.setItem(key, 'A:' + key);
  const original = Object.fromEntries([...storage.entries].filter(([key]) => isWorkspaceKey(key)));
  switchAccountWorkspace(B, { storage, legacyOwner: A });
  storage.setItem('classData_v1_b', 'travail B');
  switchAccountWorkspace(A, { storage });
  assert.deepEqual(Object.fromEntries([...storage.entries].filter(([key]) => isWorkspaceKey(key))), original);
  assert.equal(storage.getItem('classData_v1_b'), null);
  assert.equal(storage.getItem(WORKSPACE_SNAPSHOT_PREFIX + A), null);
  switchAccountWorkspace(B, { storage });
  assert.equal(storage.getItem('classData_v1_b'), 'travail B');
});

test('déconnexion hors ligne conserve les données pour leur propriétaire', () => {
  const storage = seed();
  switchAccountWorkspace(null, { storage, legacyOwner: A });
  assert.equal(readWorkspaceScope(storage)?.owner, null);
  assert.equal(storage.getItem('classData_v1_a'), null);
  switchAccountWorkspace(A, { storage, legacyOwner: B });
  assert.equal(storage.getItem('classData_v1_a'), 'travail A non synchronisé');
});

test('données anciennes sans propriétaire : quarantaine, pas attribution au nouvel entrant', () => {
  const storage = seed();
  storage.removeItem('authUser_v1');
  switchAccountWorkspace(B, { storage, revision: 'quarantine' });
  const saved = JSON.parse(storage.getItem(WORKSPACE_SNAPSHOT_PREFIX + 'unassigned_quarantine')!);
  assert.equal(saved.owner, null);
  assert.equal(saved.entries.classData_v1_a, 'travail A non synchronisé');
  assert.equal(storage.getItem('classData_v1_a'), null);
});

test('snapshot corrompu, mal attribué ou contenant une clé sensible : aucun changement', () => {
  for (const raw of ['{broken', snapshot(A, {}), snapshot(B, { authUser_v1: 'bad' }), snapshot(B, { [WORKSPACE_SNAPSHOT_PREFIX + A]: 'bad' })]) {
    const storage = seed();
    storage.setItem(WORKSPACE_SNAPSHOT_PREFIX + B, raw);
    const before = [...storage.entries];
    assert.throws(() => switchAccountWorkspace(B, { storage, legacyOwner: A }), WorkspaceSwitchError);
    assert.deepEqual([...storage.entries], before);
  }
});

test('quota plein pendant la sauvegarde : rien ne doit être effacé', () => {
  const storage = seed();
  const before = [...storage.entries];
  storage.failWrite = key => key === WORKSPACE_SNAPSHOT_PREFIX + A;
  assert.throws(() => switchAccountWorkspace(B, { storage, legacyOwner: A }), WorkspaceSwitchError);
  assert.deepEqual([...storage.entries], before);
});

test('échec pendant restauration : rollback de toutes les clés actives', () => {
  const storage = seed();
  const old = switchAccountWorkspace(A, { storage, legacyOwner: A });
  storage.setItem(WORKSPACE_SNAPSHOT_PREFIX + B, snapshot(B, { classData_v1_b: 'B' }));
  let failed = false;
  storage.failWrite = key => key === 'classData_v1_b' && !failed && (failed = true);
  assert.throws(() => switchAccountWorkspace(B, { storage }), WorkspaceSwitchError);
  assert.deepEqual(readWorkspaceScope(storage), old);
  assert.equal(storage.getItem('classData_v1_a'), 'travail A non synchronisé');
  assert.equal(storage.getItem('classData_v1_b'), null);
  assert.ok(storage.getItem(WORKSPACE_SNAPSHOT_PREFIX + A));
});

test('jeton de requête obsolète rejeté même après A → B → A', () => {
  const storage = seed();
  const old = switchAccountWorkspace(A, { storage, legacyOwner: A });
  const lease = captureWorkspaceLease(storage);
  assert.ok(workspaceIsCurrent(old, storage));
  assert.ok(lease());
  switchAccountWorkspace(B, { storage });
  assert.equal(lease(), false);
  switchAccountWorkspace(A, { storage });
  assert.equal(workspaceIsCurrent(old, storage), false);
  assert.equal(lease(), false);
  assert.ok(workspaceIsCurrent(readWorkspaceScope(storage), storage));
});

test('reconnexion même compte ne périme pas les composants actifs', () => {
  const storage = seed();
  const scope = switchAccountWorkspace(A, { storage, legacyOwner: A });
  const lease = captureWorkspaceLease(storage);
  assert.deepEqual(switchAccountWorkspace(A, { storage }), scope);
  assert.ok(lease());
});

test('les préférences globales et autres snapshots ne sont pas touchés', () => {
  const storage = seed();
  storage.setItem('theme', 'dark');
  storage.setItem(WORKSPACE_SNAPSHOT_PREFIX + '0600000003', 'indépendant');
  switchAccountWorkspace(B, { storage, legacyOwner: A });
  assert.equal(storage.getItem('theme'), 'dark');
  assert.equal(storage.getItem(WORKSPACE_SNAPSHOT_PREFIX + '0600000003'), 'indépendant');
  assert.equal(storage.getItem('authUser_v1'), JSON.stringify({ phone: A }));
});

test('dernière saisie vidée avant le snapshot, ancien composant incapable d’écrire après', () => {
  const storage = seed();
  switchAccountWorkspace(A, { storage, legacyOwner: A });
  const lease = captureWorkspaceLease(storage);
  const unregister = registerWorkspaceWriter(() => {
    if (!lease()) return true;
    storage.setItem('classData_v1_a', 'dernière frappe');
    return true;
  });
  try {
    switchAccountWorkspace(B, { storage });
    assert.equal(storage.getItem('classData_v1_a'), null);
    assert.equal(JSON.parse(storage.getItem(WORKSPACE_SNAPSHOT_PREFIX + A)!).entries.classData_v1_a, 'dernière frappe');
    assert.equal(lease(), false);
  } finally { unregister(); }
});

test('échec de vidage éditeur bloque le changement, sans toucher au stockage', () => {
  const storage = seed();
  const before = [...storage.entries];
  const unregister = registerWorkspaceWriter(() => false);
  try {
    assert.throws(() => switchAccountWorkspace(B, { storage, legacyOwner: A }), WorkspaceSwitchError);
    assert.deepEqual([...storage.entries], before);
  } finally { unregister(); }
});

test('file de synchronisation en mémoire rechargée avec le compte restauré', () => {
  const storage = seed();
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  try {
    switchAccountWorkspace(A, { storage, legacyOwner: A });
    reloadSyncState();
    markClassDirty('a'); markClassDeleted('old-a'); markClassesListDirty();
    const pendingA = getPendingWork();
    switchAccountWorkspace(B, { storage }); reloadSyncState();
    assert.deepEqual(getPendingWork().dirtyClassIds, []);
    assert.deepEqual(getPendingWork().deletedClassIds, []);
    markClassDirty('b');
    switchAccountWorkspace(A, { storage }); reloadSyncState();
    assert.deepEqual(getPendingWork(), pendingA);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else Reflect.deleteProperty(globalThis, 'localStorage');
    reloadSyncState();
  }
});

test('API : identité attendue liée à la session ; absent/autre compte interdit', () => {
  assert.doesNotThrow(() => assertWorkspaceOwner(A, A));
  for (const owner of [B, undefined, null, [A], '']) {
    assert.throws(() => assertWorkspaceOwner(owner, A), (error: unknown) => (error as { statusCode?: number }).statusCode === 409);
  }
});
