import assert from 'node:assert/strict';
import test from 'node:test';
import { buildUnifiedClassPaletteMap, pickDepartmentPalette } from '../src/features/dashboard/departmentPalette';
import { hueOf } from '../src/domain/classes/classColors';

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

test('the shared palette preserves saved colours even when reordered or shared', () => {
  const classes = [{ id: 'a', color: 'coral' }, { id: 'b', color: 'coral' }, { id: 'c', color: 'sky' }];
  const forward = buildUnifiedClassPaletteMap(classes, ['a', 'b', 'c']);
  const reverse = buildUnifiedClassPaletteMap(classes, ['c', 'b', 'a', 'a', 'deleted']);
  for (const { id } of classes) assert.deepEqual(forward.get(id), reverse.get(id));
  assert.equal(forward.get('b')?.bg, '#fdeede');
});

test('custom class hues survive the shared dashboard and timetable palette', () => {
  const color = 'class-hue:34';
  const palette = buildUnifiedClassPaletteMap([{ id: 'custom', color }]).get('custom');
  assert.equal(palette?.bg, `hsl(${hueOf(color).toFixed(3)} 55% 94%)`);
});
