import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { attachMotionSurface, motionLerp } from '../src/components/ui/motionSurfaceController';
import { TeacherTeamIllustration } from '../src/components/ui/DynamicIllustration';

class Events extends EventTarget {
  listeners = new Set<EventListenerOrEventListenerObject>();
  override addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) {
    if (listener) this.listeners.add(listener);
    super.addEventListener(type, listener, options);
  }
  override removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions) {
    if (listener) this.listeners.delete(listener);
    super.removeEventListener(type, listener, options);
  }
}

function fixture(options: { reduced?: boolean; fine?: boolean; observers?: boolean } = {}) {
  const reduced = Object.assign(new Events(), { matches: options.reduced ?? false });
  const fine = Object.assign(new Events(), { matches: options.fine ?? true });
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrame = 0;
  let reads = 0;
  let top = 100;
  let intersectionCallback: ((entries: { isIntersecting: boolean }[]) => void) | undefined;
  let disconnected = 0;
  const view = Object.assign(new Events(), {
    innerHeight: 800,
    matchMedia: (query: string) => query.includes('reduced-motion') ? reduced : fine,
    requestAnimationFrame: (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame: (id: number) => { frames.delete(id); },
    IntersectionObserver: options.observers === false ? undefined : class {
      constructor(callback: typeof intersectionCallback) { intersectionCallback = callback; }
      observe() {}
      disconnect() { disconnected++; }
    },
    ResizeObserver: class { observe() {} disconnect() { disconnected++; } },
  });
  const doc = Object.assign(new Events(), { defaultView: view, hidden: false });
  const root = Object.assign(new Events(), {
    ownerDocument: doc,
    dataset: {} as Record<string, string>,
    getBoundingClientRect: () => { reads++; return { left: 100, top, width: 200, height: 200 }; },
  });
  const style = { transform: '', willChange: '', removeProperty: (key: string) => {
    if (key === 'transform') style.transform = '';
    if (key === 'will-change') style.willChange = '';
  } };
  const dispose = attachMotionSurface(root as unknown as HTMLElement, { style } as unknown as HTMLElement);
  const tick = (time: number) => {
    const pending = [...frames.values()]; frames.clear();
    pending.forEach(callback => callback(time));
  };
  const move = (pointerType = 'mouse') => root.dispatchEvent(Object.assign(new Event('pointermove'), { clientX: 300, clientY: 300, pointerType }));
  return { root, doc, view, reduced, fine, style, frames, dispose, tick, move,
    show: (visible: boolean) => intersectionCallback?.([{ isIntersecting: visible }]),
    scrollTo: (value: number) => { top = value; view.dispatchEvent(new Event('scroll')); },
    get reads() { return reads; }, get disconnected() { return disconnected; } };
}

test('le suivi garde le même amortissement à 60 et 120 Hz sans dépasser sa cible', () => {
  const simulate = (fps: number) => {
    let position = 0;
    for (let index = 0; index < fps; index++) position = motionLerp(position, 5, 1000 / fps);
    return position;
  };
  assert.ok(Math.abs(simulate(60) - simulate(120)) < 1e-10);
  assert.equal(motionLerp(0, 5, 1000 / 60), 0.4999999999999999);
  assert.equal(motionLerp(2, 5, -1), 2);
  assert.ok(motionLerp(0, 5, 10000) < 5, 'une reprise tardive ne fait pas sauter la figure');
});

test('les événements sont regroupés en une frame et la boucle cesse au repos', () => {
  const f = fixture();
  assert.equal(f.frames.size, 0, 'pas de travail avant la visibilité');
  f.show(true);
  for (let index = 0; index < 20; index++) f.move();
  assert.equal(f.frames.size, 1);
  assert.equal(f.reads, 0, 'aucune lecture géométrique dans les listeners');
  f.tick(0);
  assert.equal(f.reads, 1);
  assert.match(f.style.transform, /^translate3d\(0\.500px, 0\.500px, 0\) rotate/);
  for (let frame = 1; frame < 100; frame++) f.tick(frame * 1000 / 60);
  assert.equal(f.reads, 1, 'la couche mobile ne modifie pas la boîte mesurée');
  assert.equal(f.frames.size, 0);
  assert.equal(f.style.willChange, '');
  f.dispose();
});

test('le tactile garde son défilement et reçoit un mouvement doux lié au scroll', () => {
  const f = fixture({ fine: false });
  f.show(true);
  for (let frame = 0; frame < 100; frame++) f.tick(frame * 1000 / 60);
  f.move('touch');
  assert.equal(f.frames.size, 0);
  f.scrollTo(500);
  assert.equal(f.frames.size, 1);
  f.tick(2000);
  assert.equal(f.reads, 2);
  for (let frame = 1; frame < 100; frame++) f.tick(2000 + frame * 1000 / 60);
  assert.match(f.style.transform, /^translate3d\(0\.000px, -/);
  f.dispose();
});

test('sortie écran, arrière-plan, réduction des mouvements et démontage annulent le travail', () => {
  const f = fixture();
  f.show(true); f.move(); f.tick(0);
  f.show(false);
  assert.equal(f.frames.size, 0);
  assert.equal(f.root.dataset.motion, 'off');
  assert.equal(f.style.transform, '');
  f.show(true);
  f.doc.hidden = true; f.doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(f.frames.size, 0);
  f.doc.hidden = false; f.doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(f.frames.size, 1);
  f.reduced.matches = true; f.reduced.dispatchEvent(new Event('change'));
  assert.equal(f.frames.size, 0);
  f.reduced.matches = false; f.reduced.dispatchEvent(new Event('change'));
  assert.equal(f.frames.size, 1);
  f.dispose();
  assert.equal(f.frames.size, 0);
  assert.equal(f.disconnected, 2);
  for (const target of [f.root, f.doc, f.view, f.reduced, f.fine]) assert.equal(target.listeners.size, 0);
  f.show(true); f.move(); f.scrollTo(0);
  assert.equal(f.frames.size, 0, 'aucune reprise après démontage');
});

test('sans IntersectionObserver, la figure reste utilisable et peut être remontée sans fuite', () => {
  const first = fixture({ observers: false, reduced: true });
  assert.equal(first.root.dataset.motion, 'off');
  assert.equal(first.frames.size, 0);
  first.dispose();
  const second = fixture({ observers: false });
  assert.equal(second.root.dataset.motion, 'on');
  assert.equal(second.frames.size, 1);
  second.dispose();
  assert.equal(second.frames.size, 0);
});

test('la couche réutilisable conserve le SVG décoratif et toutes les animations évitent le layout', () => {
  const html = renderToStaticMarkup(createElement(TeacherTeamIllustration, { size: 180 }));
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /--illustration-size:180px/);
  assert.match(html, /class="motion-surface__layer"/);
  assert.equal((html.match(/<svg /g) ?? []).length, 1);
  for (const path of ['src/components/ui/dynamic-illustrations.css', 'src/components/ui/bloub-avatar.css', 'src/features/assistant/companion.css', 'src/features/auth/landing.css']) {
    postcss.parse(readFileSync(path, 'utf8')).walkAtRules('keyframes', animation => {
      animation.walkDecls(declaration => assert.ok(['transform', 'opacity'].includes(declaration.prop), `${animation.params} : ${declaration.prop}`));
    });
  }
});
