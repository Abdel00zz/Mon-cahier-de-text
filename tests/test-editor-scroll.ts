import { readIndexCss } from './readIndexCss';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import { createScrollActivity } from '../src/platform/scrollActivity';

test('virtual rows never correct position during a held touch or its momentum', () => {
  let time = 0;
  const activity = createScrollActivity(() => time);
  assert.equal(activity.isActive(), false);
  activity.touch(1);
  time = 2000;
  assert.equal(activity.isActive(), true, 'a stationary finger still owns the gesture');
  activity.touch(0);
  for (let frame = 0; frame < 120; frame++) {
    time += 16;
    activity.move();
    assert.equal(activity.isActive(), true, 'momentum keeps priority after finger release');
  }
  time += 199;
  assert.equal(activity.isActive(), true);
  time++;
  assert.equal(activity.isActive(), false, 'idle measurements can preserve the reading position');
});

test('multi-touch, cancellation, wheel and cleanup cannot leave scroll corrections locked', () => {
  let time = 0;
  const activity = createScrollActivity(() => time);
  activity.touch(2);
  activity.touch(1);
  time += 1000;
  assert.equal(activity.isActive(), true);
  activity.touch(0); // touchcancel, all contacts removed
  time += 201;
  assert.equal(activity.isActive(), false);
  activity.move(); // wheel before the scroll event
  assert.equal(activity.isActive(), true);
  activity.reset();
  assert.equal(activity.isActive(), false);
});

test('portrait page does not create a second vertical scroll container; horizontal rails pass vertical swipes', () => {
  const css = (path: string) => postcss.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
  const index = postcss.parse(readIndexCss());
  let checkedPortrait = false;
  index.walkRules(rule => {
    if (!rule.selectors.some(selector => selector === 'html' || selector === 'body')) return;
    rule.walkDecls('overflow-x', declaration => {
      assert.ok(['visible', 'clip'].includes(declaration.value), 'the body must pass swipes to the viewport');
      if (declaration.value === 'clip' && rule.parent?.type === 'atrule'
        && rule.parent.params === '(max-width: 767px)') checkedPortrait = true;
    });
  });
  assert.ok(checkedPortrait);
  const mobile = css('../src/styles/mobile-performance.css');
  mobile.walkRules(rule => {
    if (!rule.selectors.includes('.overflow-x-auto')) return;
    rule.walkDecls(/^overscroll-behavior(?:-y)?$/, declaration => {
      assert.equal(declaration.value, 'auto', 'a horizontal rail cannot trap vertical scrolling');
    });
  });
});

test('editor history stays within reach below the device safe area at every width', () => {
  const toolbar = postcss.parse(readFileSync(new URL('../src/features/editor/editor-save.css', import.meta.url), 'utf8'));
  const positions: string[] = [];
  const offsets: string[] = [];
  toolbar.walkRules('.editor-toolbar-row', rule => {
    rule.walkDecls('position', declaration => { positions.push(declaration.value); });
    rule.walkDecls('top', declaration => { offsets.push(declaration.value); });
  });
  assert.deepEqual(positions, ['sticky']);
  assert.deepEqual(offsets, ['env(safe-area-inset-top, 0px)']);
});
