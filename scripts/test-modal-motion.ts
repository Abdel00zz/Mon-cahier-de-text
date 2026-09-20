import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSheetDetents, sheetReleaseAction, sheetReleaseVelocity } from '../utils/sheetGesture';

const gesture = { height: 600, canExpand: true, canCollapse: false, fromHandle: true, velocity: 0 };

test('un mouvement court revient en place, un tap sans déplacement ne ferme pas', () => {
  assert.equal(sheetReleaseAction({ ...gesture, distance: 7, velocity: 4 }), 'settle');
  assert.equal(sheetReleaseAction({ ...gesture, distance: 0, velocity: 0 }), 'settle');
  assert.equal(sheetReleaseAction({ ...gesture, distance: 60 }), 'settle');
});
test('le palier supérieur se replie avant de fermer', () => {
  assert.equal(sheetReleaseAction({ ...gesture, distance: 130, canCollapse: true }), 'collapse');
  assert.equal(sheetReleaseAction({ ...gesture, distance: 130 }), 'dismiss');
});
test('agrandir exige un geste sur la poignée ; le contenu garde son défilement', () => {
  assert.equal(sheetReleaseAction({ ...gesture, distance: -90 }), 'expand');
  assert.equal(sheetReleaseAction({ ...gesture, distance: -90, fromHandle: false }), 'settle');
  assert.equal(sheetReleaseAction({ ...gesture, distance: -90, canExpand: false }), 'settle');
});
test('un flick rapide reste reconnu si pointerup répète la dernière position', () => {
  const samples = [{ y: 100, time: 0 }, { y: 120, time: 20 }, { y: 160, time: 40 }];
  const velocity = sheetReleaseVelocity(samples, { y: 160, time: 45 });
  assert.ok(velocity > .75);
  assert.equal(sheetReleaseAction({ ...gesture, distance: 60, velocity }), 'dismiss');
  assert.equal(sheetReleaseAction({ ...gesture, distance: -35, velocity: -1 }), 'expand');
  assert.equal(sheetReleaseVelocity(samples, { y: 160, time: 200 }), 0, 'une pause annule le flick');
});
test('les petites fenêtres gardent un seuil de fermeture accessible', () => {
  assert.equal(sheetReleaseAction({ ...gesture, height: 260, distance: 65 }), 'dismiss');
  assert.equal(sheetReleaseAction({ ...gesture, height: 260, distance: 25 }), 'settle');
});
test('les paliers invalides, doublons et valeurs hors écran sont normalisés', () => {
  assert.deepEqual(normalizeSheetDetents([.94, NaN, Infinity, .62, .62, -2, 4]), [.32, .62, .94, .96]);
  assert.deepEqual(normalizeSheetDetents([]), [.9, .96]);
});
