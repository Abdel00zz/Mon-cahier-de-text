import assert from 'node:assert/strict';
import test from 'node:test';
import { pickDepartmentPalette } from '../src/features/dashboard/departmentPalette';

test('a saved colour stays stable beside another class of the same colour', () => {
  const first = pickDepartmentPalette('coral', 'Physique', 0);
  const second = pickDepartmentPalette('coral', 'Physique', 1, first.key);
  assert.equal(first.key, 'peach');
  assert.equal(second.key, first.key);
  assert.equal(second.palette.bg, '#fdeede');
});

test('the six selectable class colours each resolve to a distinct paper palette', () => {
  const colours = ['coral', 'lavender', 'mint', 'sky', 'sand', 'rose'];
  const palettes = colours.map((colour, index) => pickDepartmentPalette(colour, 'Physique', index));
  assert.equal(new Set(palettes.map(item => item.key)).size, 6);
  assert.deepEqual(palettes.map(item => item.palette.bg), ['#fdeede', '#ece9f7', '#e6f3e9', '#e0eefa', '#f7f0d4', '#fbe6ee']);
});
