import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Switch } from '../src/components/ui/switch';

test('shared switch keeps checked, disabled and form semantics in both directions', () => {
  for (const dir of ['ltr', 'rtl'] as const) {
    for (const checked of [true, false]) {
      const html = renderToStaticMarkup(createElement('form', {}, createElement(Switch, {
        dir, checked, disabled: true, name: 'reminders', 'aria-label': 'Rappels',
      })));
      assert.match(html, /role="switch"/);
      assert.ok(html.includes(`aria-checked="${checked}"`));
      assert.ok(html.includes(`dir="${dir}"`));
      assert.match(html, /disabled=""/);
      assert.match(html, /name="reminders"/);
      assert.match(html, /aria-label="Rappels"/);
    }
  }
});
