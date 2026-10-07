import assert from 'node:assert/strict';
import test from 'node:test';
import { editorSyncTone } from '../src/domain/sync/editorSyncTone';

test('le vert exige un enregistrement local et une confirmation cloud de la version courante', () => {
  assert.equal(editorSyncTone('saved', 'synced'), 'green');
  for (const status of ['unsaved', 'saving'] as const) assert.equal(editorSyncTone(status, 'synced'), 'orange');
  for (const cloud of ['idle', 'offline', 'pending', 'syncing'] as const) assert.equal(editorSyncTone('saved', cloud), 'orange');
  for (const status of ['saved', 'saving', 'unsaved'] as const) assert.equal(editorSyncTone(status, 'error'), 'red');
});
