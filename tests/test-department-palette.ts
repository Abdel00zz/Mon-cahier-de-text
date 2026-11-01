import assert from 'node:assert/strict';
import test from 'node:test';
import { pickDepartmentPalette } from '../src/features/dashboard/departmentPalette';

test('a saved colour stays stable beside another class of the same colour', () => {
  const first = pickDepartmentPalette('coral', 'Physique', 0);
  const second = pickDepartmentPalette('coral', 'Physique', 1, first.key);
  assert.equal(first.key, 'peach');
  assert.equal(second.key, first.key);
  assert.equal(second.palette.bg, '#fcefdf');
});

test('the six selectable class colours each resolve to a distinct paper palette', () => {
  const colours = ['coral', 'lavender', 'mint', 'sky', 'sand', 'rose'];
  const palettes = colours.map((colour, index) => pickDepartmentPalette(colour, 'Physique', index));
  assert.equal(new Set(palettes.map(item => item.key)).size, 6);
  assert.deepEqual(palettes.map(item => item.palette.bg), ['#fcefdf', '#eeecfa', '#e7f4ec', '#e9f3fa', '#f9f2df', '#fae9ee']);
});
