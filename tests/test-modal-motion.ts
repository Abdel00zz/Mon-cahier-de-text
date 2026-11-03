import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import { acquireModalLayer } from '../src/platform/modalStack';

test('a nested form stays above its parent even when an intermediate dialog closes', () => {
  const parent = acquireModalLayer();
  const nested = acquireModalLayer();
  const confirmation = acquireModalLayer();
  assert.ok(parent.layer < nested.layer && nested.layer < confirmation.layer);
  nested.release();
  const last = acquireModalLayer();
  assert.ok(last.layer > confirmation.layer);
  last.release(); confirmation.release(); parent.release();
  parent.release(); // React cleanup and close notification may both run.
  const reopened = acquireModalLayer();
  assert.equal(reopened.layer, 0);
  reopened.release();
});

test('shared modal entry and exit animate only composited properties', () => {
  const css = postcss.parse(readFileSync('src/components/ui/modal-motion.css', 'utf8'));
  let keyframes = 0;
  css.walkAtRules('keyframes', rule => {
    keyframes++;
    rule.walkDecls(decl => assert.ok(['opacity', 'transform'].includes(decl.prop), `${rule.params}: ${decl.prop}`));
  });
  assert.ok(keyframes > 0);
  assert.match(css.toString(), /prefers-reduced-motion: reduce/);
});
