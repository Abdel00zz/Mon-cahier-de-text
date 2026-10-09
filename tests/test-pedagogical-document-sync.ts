import assert from 'node:assert/strict';
import test from 'node:test';
import type { AppConfig, ContentDocument, PedagogicalEvent } from '../src/types';
import { mergePedagogicalDocuments, pedagogicalDocumentsEqual } from '../src/domain/evaluations/documentSync';
import { SYNCABLE_KEYS, extractSyncableSettings, mergeSyncableSettings, type SyncableSettings } from '../src/infrastructure/sync/syncSettings';
import { assertValidSyncSettings } from '../api/_lib/validate';
import { useEvaluationActions } from '../src/features/evaluations/hooks/useEvaluationActions';
import { encodeSyncPayload } from '../src/infrastructure/sync/syncTransport';
import { decodeSyncPayload } from '../api/_lib/syncPayload';
import { encodeRecord } from '../api/_lib/firestoreStore';

const document = (source: string, updatedAt = '2026-10-09T09:00:00Z'): ContentDocument => ({ source, updatedAt });
const event = (document?: ContentDocument): PedagogicalEvent => ({ id: 'diagnostic', type: 'evaluation_diagnostic', title: 'التقويم التشخيصي', date: '2026-10-09', createdAt: '2026-10-01T08:00:00Z', status: 'planned', document });

test('written subjects are dirty-tracked, validated, transported and restored on a fresh device', () => {
  const settings: Partial<AppConfig> = { assessmentDocuments: { c: { written: document('## فرض\n**Exercice** $x^2$\n1. أجب') } }, pedagogicalEvents: { c: [event(document('Diagnostic oral\nسؤال'))] } };
  assert.ok(SYNCABLE_KEYS.includes('assessmentDocuments'));
  const payload = extractSyncableSettings(settings);
  assert.deepEqual(payload.assessmentDocuments, settings.assessmentDocuments);
  assertValidSyncSettings(payload, new Set(['c']));
  const restored = mergeSyncableSettings({}, JSON.parse(JSON.stringify(payload)));
  assert.deepEqual(restored.assessmentDocuments, settings.assessmentDocuments);
  assert.deepEqual(restored.pedagogicalEvents, settings.pedagogicalEvents);
});

test('two devices editing different documents retain both; stale same-document text cannot win', () => {
  const server = { assessmentDocuments: { c: { a: document('New A', '2026-10-09T12:00:00Z'), b: document('Old B') } } };
  const incoming = { assessmentDocuments: { c: { a: document('Old A'), b: document('New B', '2026-10-09T13:00:00Z') } } };
  const merged = mergePedagogicalDocuments(incoming, server);
  assert.equal(merged.assessmentDocuments.c.a.source, 'New A');
  assert.equal(merged.assessmentDocuments.c.b.source, 'New B');
  assert.deepEqual(mergePedagogicalDocuments(server, incoming), merged);
  assert.equal(mergePedagogicalDocuments({ assessmentDocuments: { c: { a: document('Local offset', '2026-10-09T14:00:00+03:00') } } }, server).assessmentDocuments.c.a.source, 'New A');
});

test('legacy omission preserves subjects; local-only documents are detected for recovery upload', () => {
  const local = { assessmentDocuments: { c: { a: document('Formerly local only') } } };
  const merged = mergeSyncableSettings(local, { establishmentName: 'Cloud' } as unknown as SyncableSettings);
  assert.deepEqual(merged.assessmentDocuments, local.assessmentDocuments);
  assert.equal(pedagogicalDocumentsEqual(merged, {}), false);
  assert.equal(pedagogicalDocumentsEqual(merged, local), true);
  assert.deepEqual(mergePedagogicalDocuments({}, local), local, 'old APK settings omission is not a deletion');
});

test('explicit clearing uses a tombstone and an older device cannot resurrect the text', () => {
  const old = document('Saved text');
  let config: AppConfig = { establishmentName: '', defaultTeacherName: '', printShowDescriptions: true,
    assessmentDocuments: { c: { a: old } }, pedagogicalEvents: { c: [event(old)] } };
  useEvaluationActions('c', config, patch => { config = { ...config, ...patch }; }).saveAssessmentDocument('a', '');
  useEvaluationActions('c', config, patch => { config = { ...config, ...patch }; }).saveEventDocument('diagnostic', '');
  const merged = mergePedagogicalDocuments({ assessmentDocuments: { c: { a: old } }, pedagogicalEvents: { c: [event(old)] } }, config);
  assert.equal(merged.assessmentDocuments.c.a.source, '');
  assert.equal(merged.pedagogicalEvents.c[0].document?.source, '');
  assertValidSyncSettings(extractSyncableSettings(merged), new Set(['c']));
});

test('deleting the owner does not restore its document or activity from an old snapshot', () => {
  const old = { assessmentDocuments: { c: { a: document('Old') } }, pedagogicalEvents: { c: [event(document('Old event'))] } };
  const deleted: Partial<AppConfig> = { removedAssessments: { c: ['a'] }, pedagogicalEvents: { c: [] } };
  const merged = mergePedagogicalDocuments(deleted, old);
  assert.deepEqual(merged.assessmentDocuments?.c, {});
  assert.deepEqual(merged.pedagogicalEvents?.c, []);
});

test('large bilingual documents survive compression and Firestore UTF-8 chunk boundaries exactly', async () => {
  const source = 'تمرين 🧮 épreuve $x^2$\n'.repeat(650);
  const settings = extractSyncableSettings({ assessmentDocuments: { c: Object.fromEntries(Array.from({ length: 55 }, (_, index) => [`d${index}`, document(source)])) } });
  assertValidSyncSettings(settings, new Set(['c']));
  const payload = { settings };
  const restored = await decodeSyncPayload(await encodeSyncPayload(payload), true);
  assert.deepEqual(restored, payload);
  const encoded = encodeRecord(restored);
  assert.ok(encoded.chunks.length > 1);
  assert.deepEqual(JSON.parse(encoded.chunks.join('')), payload);
});
