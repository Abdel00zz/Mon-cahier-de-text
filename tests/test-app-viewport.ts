import assert from 'node:assert/strict';
import test from 'node:test';
import { initAppViewport } from '../src/platform/appViewport';

function viewportFixture(run: (fixture: ReturnType<typeof createFixture>) => void, visual = true) {
  const previous = ['window', 'document', 'navigator'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  const fixture = createFixture(visual);
  Object.defineProperty(globalThis, 'window', { configurable: true, value: fixture.window });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: fixture.document });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userAgent: 'Android', platform: 'Linux', maxTouchPoints: 5 } });
  const stop = initAppViewport();
  try { run(fixture); } finally {
    stop();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
}

function createFixture(visual: boolean) {
  const values = new Map<string, string>();
  const root = { dataset: {} as Record<string, string>, style: {
    getPropertyValue: (key: string) => values.get(key) ?? '',
    setProperty: (key: string, value: string) => values.set(key, value),
  } };
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrame = 0;
  const viewport = Object.assign(new EventTarget(), { height: 850, offsetTop: 0, scale: 1 });
  const document = Object.assign(new EventTarget(), { documentElement: root, activeElement: { tagName: 'BODY', type: '', isContentEditable: false } });
  const window = Object.assign(new EventTarget(), {
    innerHeight: 850, innerWidth: 393, visualViewport: visual ? viewport : undefined,
    requestAnimationFrame: (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame: (id: number) => { frames.delete(id); },
  });
  const flush = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(0)); };
  const focus = (tagName = 'INPUT', type = 'number') => {
    document.activeElement = { tagName, type, isContentEditable: tagName === 'DIV' };
    document.dispatchEvent(new Event('focusin')); flush();
  };
  return { window, viewport, document, root, values, frames, flush, focus };
}

test('Android: layout and visual viewport shrinking together still detects the numeric keyboard', () => {
  for (const width of [360, 393, 412]) viewportFixture(f => {
    f.window.innerWidth = width;
    f.window.dispatchEvent(new Event('resize')); f.flush();
    f.focus();
    f.window.innerHeight = 510; f.viewport.height = 510;
    f.window.dispatchEvent(new Event('resize')); f.viewport.dispatchEvent(new Event('resize'));
    assert.equal(f.frames.size, 1, 'Resize events coalesce into one frame');
    f.flush();
    assert.equal(f.root.dataset.keyboard, 'open');
    assert.equal(f.values.get('--app-viewport-height'), '510px');
    f.window.innerHeight = 850; f.viewport.height = 850;
    f.window.dispatchEvent(new Event('resize')); f.flush();
    assert.equal(f.root.dataset.keyboard, 'closed');
  });
});

test('overlay keyboard detected; toolbar movement, pinch zoom and non-editable controls are excluded', () => viewportFixture(f => {
  f.focus('TEXTAREA');
  f.viewport.height = 500; f.viewport.dispatchEvent(new Event('resize')); f.flush();
  assert.equal(f.root.dataset.keyboard, 'open');
  f.viewport.scale = 2; f.viewport.dispatchEvent(new Event('resize')); f.flush();
  assert.equal(f.root.dataset.keyboard, 'closed');
  f.viewport.scale = 1; f.focus('INPUT', 'checkbox');
  assert.equal(f.root.dataset.keyboard, 'closed');
  f.viewport.height = 780; f.focus('INPUT', 'text');
  assert.equal(f.root.dataset.keyboard, 'closed');
}));

test('landscape height gets its own baseline; contenteditable keyboard and blur update correctly', () => viewportFixture(f => {
  f.window.innerWidth = 850; f.window.innerHeight = 393; f.viewport.height = 393;
  f.window.dispatchEvent(new Event('orientationchange')); f.flush();
  assert.equal(f.root.dataset.keyboard, 'closed');
  f.focus('DIV');
  f.window.innerHeight = 210; f.viewport.height = 210;
  f.window.dispatchEvent(new Event('resize')); f.flush();
  assert.equal(f.root.dataset.keyboard, 'open');
  f.document.activeElement = { tagName: 'BODY', type: '', isContentEditable: false };
  f.document.dispatchEvent(new Event('focusout')); f.flush();
  assert.equal(f.root.dataset.keyboard, 'closed');
}));

test('WebView fallback works without VisualViewport', () => viewportFixture(f => {
  f.focus(); f.window.innerHeight = 500;
  f.window.dispatchEvent(new Event('resize')); f.flush();
  assert.equal(f.root.dataset.keyboard, 'open');
}, false));
