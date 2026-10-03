import assert from 'node:assert/strict';
import test from 'node:test';
import { acquireModalLayer } from '../src/platform/modalStack';

test('nested and sibling confirmations place their scrim above the previous surface', () => {
  const parent = acquireModalLayer();
  const child = acquireModalLayer();
  const confirmation = acquireModalLayer();
  assert.ok(100 + child.layer * 20 > 110 + parent.layer * 20);
  assert.ok(100 + confirmation.layer * 20 > 110 + child.layer * 20);
  child.release(); // Closing out of order must not recycle a still active layer.
  const next = acquireModalLayer();
  assert.ok(next.layer > confirmation.layer);
  parent.release(); confirmation.release(); next.release();
  const reopened = acquireModalLayer();
  assert.equal(reopened.layer, 0);
  reopened.release(); reopened.release();
});
