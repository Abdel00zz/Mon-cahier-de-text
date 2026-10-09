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
  const index = css('../src/styles/index.css');
  let checkedPortrait = false;
  index.walkAtRules('media', media => {
    if (media.params !== '(max-width: 639px)') return;
    media.walkRules('html, body', rule => {
      checkedPortrait = true;
      rule.walkDecls('overflow-x', declaration => assert.equal(declaration.value, 'clip'));
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
