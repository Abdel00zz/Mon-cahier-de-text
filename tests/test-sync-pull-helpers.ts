import assert from 'node:assert/strict';
import test from 'node:test';
import type { AppConfig, ClassInfo } from '../src/types';
import { computePullDecisions, mergeRemoteClassList, reconcilePulledSettings, removeDeletedClassReferences } from '../src/infrastructure/sync/pullHelpers';

test('la suppression distante retire uniquement les références de la classe concernée', () => {
  const config: Partial<AppConfig> = {
    timetable: [{ day: 1, slot: 0, classId: 'a' }, { day: 1, slot: 1, classId: 'b' }],
    schedules: [{ classId: 'a', slots: [{ weekday: 1, sessions: 1 }] }, { classId: 'b', slots: [{ weekday: 1, sessions: 1 }] }],
    dashboardClassOrder: ['b', 'a'],
    assessmentDates: { a: {}, b: {} },
  };
  const original = structuredClone(config);
  const result = removeDeletedClassReferences(config, new Set(['a']));
  assert.equal(result.changed, true);
  assert.deepEqual(result.config.timetable?.map(entry => entry.classId), ['b']);
  assert.deepEqual(result.config.schedules?.map(entry => entry.classId), ['b']);
  assert.deepEqual(result.config.dashboardClassOrder, ['b']);
  assert.deepEqual(Object.keys(result.config.assessmentDates ?? {}), ['b']);
  assert.deepEqual(config, original);
  assert.equal(removeDeletedClassReferences(config, new Set()).config, config);
  assert.equal(removeDeletedClassReferences(config, new Set(['missing'])).changed, false);
});

test('computePullDecisions distingue nouvelle classe, mise à jour serveur, modification locale en attente et conflit multi-appareils', () => {
  const mkClass = (id: string, name: string): ClassInfo => ({
    id,
    name,
    teacherName: 'Prof',
    subject: 'Mathématiques',
    createdAt: '2026-09-01T00:00:00.000Z',
    color: 'blue',
  });
  const localClasses: ClassInfo[] = [
    mkClass('c-remote-newer', 'A'),
    mkClass('c-local-newer', 'B'),
    mkClass('c-conflict', 'C'),
    mkClass('c-unchanged', 'D'),
  ];
  const server = {
    classes: [
      ...localClasses,
      mkClass('c-new', 'E'),
      mkClass('c-deleted', 'F'),
    ],
    classMeta: {
      'c-remote-newer': { updatedAt: '2026-10-20T12:00:00.000Z' },
      'c-local-newer': { updatedAt: '2026-10-20T08:00:00.000Z' },
      'c-conflict': { updatedAt: '2026-10-20T14:00:00.000Z' },
      'c-unchanged': { updatedAt: '2026-10-20T10:00:00.000Z' },
      'c-new': { updatedAt: '2026-10-20T11:00:00.000Z' },
    },
  };
  const syncMeta = {
    'c-remote-newer': { localUpdatedAt: '2026-10-20T10:00:00.000Z', lastSyncedAt: '2026-10-20T10:00:00.000Z' },
    'c-local-newer': { localUpdatedAt: '2026-10-20T11:00:00.000Z', lastSyncedAt: '2026-10-20T08:00:00.000Z' },
    'c-conflict': { localUpdatedAt: '2026-10-20T13:00:00.000Z', lastSyncedAt: '2026-10-20T10:00:00.000Z' },
    'c-unchanged': { localUpdatedAt: '2026-10-20T10:00:00.000Z', lastSyncedAt: '2026-10-20T10:00:00.000Z' },
  };
  const decisions = computePullDecisions(server, localClasses, new Set(['c-deleted']), syncMeta, new Set());
  assert.deepEqual(
    decisions.map(d => ({ id: d.serverClass.id, action: d.action, conflict: d.conflict })),
    [
      { id: 'c-remote-newer', action: 'apply', conflict: false },
      { id: 'c-local-newer', action: 'requeue', conflict: false },
      { id: 'c-conflict', action: 'apply', conflict: true },
      { id: 'c-unchanged', action: 'none', conflict: false },
      { id: 'c-new', action: 'apply', conflict: false },
    ],
  );
});

test('reconcilePulledSettings restaure les réglages sur un appareil vierge et préserve les réglages locaux plus récents', () => {
  const emptyResult = reconcilePulledSettings(
    {},
    {
      schedules: [],
      timetable: [],
      settings: { establishmentName: 'Lycée Al Khawarizmi' } as unknown as Parameters<typeof reconcilePulledSettings>[1]['settings'],
      settingsUpdatedAt: '2026-10-20T10:00:00.000Z',
      updatedAt: '2026-10-20T10:00:00.000Z',
    },
    new Set(),
    {},
    [],
    () => [],
  );
  assert.equal(emptyResult.configChanged, true);
  assert.equal(emptyResult.nextConfig.establishmentName, 'Lycée Al Khawarizmi');
  assert.equal(emptyResult.appliedSettingsAt, '2026-10-20T10:00:00.000Z');
});

test('mergeRemoteClassList applique les métadonnées distantes plus récentes et signale quand la copie locale prime', () => {
  const base: ClassInfo = {
    id: 'c1',
    name: '2Bac PC 1',
    teacherName: 'Prof',
    subject: 'Mathématiques',
    createdAt: '2026-09-01T00:00:00.000Z',
    color: 'blue',
    metadataUpdatedAt: '2026-10-10T10:00:00.000Z',
  };
  const remoteNewer: ClassInfo = {
    ...base,
    name: '2Bac PC 2',
    metadataUpdatedAt: '2026-10-12T10:00:00.000Z',
  };
  const res = mergeRemoteClassList([base], 1, { classes: [remoteNewer] });
  assert.equal(res.localChanged, true);
  assert.equal(res.mergedClasses[0]?.name, '2Bac PC 2');
});
