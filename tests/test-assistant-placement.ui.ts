import assert from 'node:assert/strict';
import test from 'node:test';
import { assistantPlacement, attachAssistantPlacement } from '../src/features/assistant/assistantPlacement';

test('la bulle reste dans le téléphone/tablette, en FR et AR, avec zoom ou clavier ouvert', () => {
  for (const viewport of [
    { left: 0, top: 0, width: 320, height: 640 },
    { left: 0, top: 0, width: 360, height: 280 },
    { left: 0, top: 0, width: 768, height: 1024 },
    { left: 0, top: 0, width: 1024, height: 600 },
    { left: 60, top: 40, width: 220, height: 300 },
  ]) for (const rtl of [false, true]) for (const bottom of [false, true]) {
    const anchor = { left: rtl ? viewport.left + 16 : viewport.left + viewport.width - 60,
      top: bottom ? viewport.top + viewport.height - 64 : viewport.top + 16, width: 44, height: 44 };
    const panel = { width: 320, height: 260 };
    const placed = assistantPlacement(anchor, panel, viewport, rtl);
    const x = anchor.left + placed.left;
    const y = anchor.top + placed.top;
    assert.ok(x >= viewport.left + 12);
    assert.ok(x + Math.min(panel.width, placed.maxWidth) <= viewport.left + viewport.width - 12);
    assert.ok(y >= viewport.top + 12);
    assert.ok(y + Math.min(panel.height, placed.maxHeight) <= viewport.top + viewport.height - 12);
    assert.equal(placed.side, bottom ? 'above' : 'below');
  }
});

test('placement : un seul calcul par image et aucun observateur actif après fermeture', () => {
  const frames = new Map<number, FrameRequestCallback>();
  let serial = 0;
  const viewport = Object.assign(new EventTarget(), { offsetLeft: 0, offsetTop: 0, width: 360, height: 640 });
  const view = Object.assign(new EventTarget(), {
    visualViewport: viewport, innerWidth: 360, innerHeight: 640,
    requestAnimationFrame: (callback: FrameRequestCallback) => { frames.set(++serial, callback); return serial; },
    cancelAnimationFrame: (id: number) => frames.delete(id),
  });
  let reads = 0;
  let cleared = 0;
  const anchor = { ownerDocument: { defaultView: view }, dir: 'rtl', getBoundingClientRect: () => {
    reads++; return { left: 16, top: 200, width: 44, height: 44 };
  } } as unknown as HTMLElement;
  const style = { left: '', top: '', maxWidth: '', maxHeight: '', removeProperty: () => { cleared++; } };
  const panel = { offsetWidth: 300, offsetHeight: 200, style, dataset: {} } as unknown as HTMLElement;
  const dispose = attachAssistantPlacement(anchor, panel);
  assert.equal(reads, 1);
  viewport.height = 300;
  viewport.dispatchEvent(new Event('resize'));
  view.dispatchEvent(new Event('resize'));
  view.dispatchEvent(new Event('scroll'));
  assert.equal(frames.size, 1);
  const callback = [...frames.values()][0]; frames.clear(); callback(16);
  assert.equal(reads, 2);
  assert.equal(panel.dataset.placement, 'above');
  view.dispatchEvent(new Event('scroll'));
  dispose();
  assert.equal(frames.size, 0);
  assert.equal(cleared, 4);
  view.dispatchEvent(new Event('resize'));
  viewport.dispatchEvent(new Event('scroll'));
  assert.equal(frames.size, 0);
});
