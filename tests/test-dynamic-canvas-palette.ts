import assert from 'node:assert/strict';
import test from 'node:test';
import {
  angularDistance,
  computeHarmonicCanvasPalette,
  computeDynamicCanvasStyle,
  resolveClassColorPoint,
  DASHBOARD_CANVAS_STYLE,
} from '../src/features/dashboard/dashboardCanvas.js';

test('angularDistance calculates minimal circular arc between angles', () => {
  assert.equal(angularDistance(0, 360), 0);
  assert.equal(angularDistance(10, 350), 20);
  assert.equal(angularDistance(40, 220), 180);
  assert.equal(angularDistance(350, 20), 30);
});

test('resolveClassColorPoint correctly maps Keep tones and custom hues', () => {
  const sandPoint = resolveClassColorPoint({ id: 'c1', color: 'sand' });
  assert.equal(sandPoint.hue, 43);
  assert.equal(sandPoint.sat, 85);

  const skyPoint = resolveClassColorPoint({ id: 'c2', color: 'sky' });
  assert.equal(skyPoint.hue, 204);

  const customPoint = resolveClassColorPoint({ id: 'c3', color: 'class-hue:10' });
  assert.ok(typeof customPoint.hue === 'number' && !Number.isNaN(customPoint.hue));
  assert.ok(customPoint.hue >= 0 && customPoint.hue < 360);
});

test('computeHarmonicCanvasPalette returns welcoming defaults when no classes exist', () => {
  const palette = computeHarmonicCanvasPalette([]);
  assert.equal(palette.zenith.hue, 43);
  assert.equal(palette.nadir.hue, 155);
  assert.equal(palette.horizon.hue, 204);
  assert.equal(palette.dotHue, 43);
});

test('computeHarmonicCanvasPalette generates harmonious split-complementary palette for single class', () => {
  const palette = computeHarmonicCanvasPalette([{ id: 'cls-1', color: 'sky' }]);
  assert.equal(palette.zenith.hue, 204);
  assert.equal(palette.nadir.hue, (204 + 145) % 360);
  assert.equal(palette.dotHue, 204);
});

test('computeHarmonicCanvasPalette promotes active session class to zenith pole', () => {
  const classes = [
    { id: 'cls-1', color: 'sand' },
    { id: 'cls-2', color: 'sky' },
  ];
  const paletteWithoutActive = computeHarmonicCanvasPalette(classes);
  assert.equal(paletteWithoutActive.zenith.hue, 43);

  const paletteWithActive = computeHarmonicCanvasPalette(classes, ['cls-2']);
  assert.equal(paletteWithActive.zenith.hue, 204);
});

test('computeDynamicCanvasStyle outputs valid CSS custom properties for dashboard canvas', () => {
  const classes = [
    { id: 'cls-1', color: 'sand' },
    { id: 'cls-2', color: 'mint' },
    { id: 'cls-3', color: 'rose' },
  ];
  const style = computeDynamicCanvasStyle(classes) as Record<string, string>;

  assert.ok(style['--canvas-base']);
  assert.ok(style['--canvas-zenith-hue']);
  assert.ok(style['--canvas-nadir-hue']);
  assert.ok(style['--canvas-horizon-hue']);
  assert.ok(style['--canvas-dot-hue']);
  assert.ok(style['--canvas-tint-hue']);

  // Check fallback DASHBOARD_CANVAS_STYLE remains valid
  assert.ok((DASHBOARD_CANVAS_STYLE as Record<string, unknown>)['--canvas-base']);
});
