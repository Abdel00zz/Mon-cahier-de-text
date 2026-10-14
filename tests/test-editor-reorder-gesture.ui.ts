import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useEditorRowReorder } from '../src/features/editor/useEditorRowReorder';

// Native event/geometry doubles exercise the actual hook without a browser or
// a new DOM dependency. The domain transfer is tested separately with Immer.
function sensor(context: TestContext) {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const hub = () => {
    const listeners = new Map<string, Set<(event: any) => void>>();
    return {
      addEventListener: (name: string, listener: (event: any) => void) => {
        if (!listeners.has(name)) listeners.set(name, new Set());
        listeners.get(name)!.add(listener);
      },
      removeEventListener: (name: string, listener: (event: any) => void) => { listeners.get(name)?.delete(listener); },
      emit: (name: string, event: unknown) => { [...listeners.get(name) ?? []].forEach(listener => listener(event)); },
      count: () => [...listeners.values()].reduce((sum, set) => sum + set.size, 0),
    };
  };
  const node = (key: string, top: number) => ({
    ...hub(), dataset: { editorSortKey: key, editorSortId: key, editorSortLabel: key } as Record<string, string>,
    style: {} as Record<string, string>, attrs: new Map<string, string>(), offsetWidth: 120, offsetHeight: 40,
    setAttribute(name: string, value: string) { this.attrs.set(name, value); },
    removeAttribute(name: string) { this.attrs.delete(name); },
    getBoundingClientRect: () => ({ left: 0, right: 375, top, bottom: top + 60, width: 375, height: 60 }),
    closest(selector: string): unknown { return selector === '[data-editor-sort-row]' ? this : null; },
  });
  const source = node('source', 100);
  const target = node('target', 220);
  source.dataset.editorSortTransfer = 'true'; target.dataset.editorSortContainer = 'true';
  let clicks = 0;
  let captures = 0;
  const surface = {
    closest: (selector: string) => selector === '[data-editor-sort-row]' ? source : selector === '.editor-row-content--sortable' ? surface : null,
    matches: () => true, focus: () => {}, click: () => { clicks++; },
  };
  const root = {
    ...node('root', 0), contains: () => true, querySelectorAll: () => [source, target],
    setPointerCapture: () => { captures++; }, hasPointerCapture: () => captures > 0, releasePointerCapture: () => {},
  };
  const ghosts: unknown[] = [];
  const frames = new Map<number, (time: number) => void>();
  let frameId = 0;
  const win = { ...hub(), innerWidth: 375, innerHeight: 800, scrollY: 0,
    requestAnimationFrame: (callback: (time: number) => void) => { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: (id: number) => { frames.delete(id); }, scrollBy: () => {},
  };
  const doc = { ...hub(), hidden: false, querySelector: () => null,
    elementFromPoint: (_x: number, y: number) => y >= 200 ? target : source,
    body: { append: (ghost: unknown) => ghosts.push(ghost) },
    createElement: () => {
      const ghost = { ...node('ghost', 0), remove: () => { ghosts.splice(ghosts.indexOf(ghost), 1); } };
      return ghost;
    },
  };
  for (const [key, value] of Object.entries({ window: win, document: doc })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    context.after(() => { if (previous) Object.defineProperty(globalThis, key, previous); else Reflect.deleteProperty(globalThis, key); });
  }
  let actions!: ReturnType<typeof useEditorRowReorder>;
  const moves: unknown[][] = [];
  function Probe() {
    actions = useEditorRowReorder({ current: root as unknown as HTMLDivElement }, ['source', 'target'],
      { started: 'started', moved: 'moved', cancelled: 'cancelled' },
      (...args) => { moves.push(args); return true; }, () => true);
    return null;
  }
  renderToStaticMarkup(React.createElement(Probe));
  const point = (y = 130) => ({ identifier: 1, clientX: 150, clientY: y });
  const start = () => actions.onTouchStart({ target: surface, touches: [point()] } as unknown as React.TouchEvent<HTMLElement>);
  const end = (y = 130) => win.emit('touchend', { changedTouches: [point(y)] });
  const flush = () => { const queued = [...frames.values()]; frames.clear(); queued.forEach(callback => callback(16)); };
  return { actions, start, end, point, flush, win, root, source, target, surface, ghosts, moves, frames, clicks: () => clicks, captures: () => captures };
}

test('contenu tactile : un tap sélectionne normalement et un balayage garde le défilement', context => {
  const s = sensor(context);
  s.start(); context.mock.timers.tick(120); s.end(); context.mock.timers.tick(300);
  assert.equal(s.ghosts.length, 0);
  let prevented = false;
  s.actions.onClickCapture({ target: s.surface, preventDefault: () => { prevented = true; }, stopPropagation: () => {} } as unknown as React.MouseEvent<HTMLElement>);
  assert.equal(prevented, false, 'le tap reste disponible au gestionnaire de sélection');
  s.start();
  s.win.emit('touchmove', { touches: [s.point(160)], preventDefault: () => { prevented = true; } });
  context.mock.timers.tick(300);
  assert.equal(prevented, false, 'le balayage ne bloque pas le défilement natif');
  assert.equal(s.ghosts.length, 0);
  assert.equal(s.moves.length, 0);
  assert.equal(s.win.count(), 0);
});

test('contenu tactile : maintenir soulève, glisser dépose et le clic final ne change pas la sélection', context => {
  const s = sensor(context);
  s.start(); context.mock.timers.tick(260);
  assert.equal(s.ghosts.length, 1);
  let prevented = false;
  s.win.emit('touchmove', { touches: [s.point(230)], cancelable: true, preventDefault: () => { prevented = true; } });
  s.flush();
  assert.equal(prevented, true, 'le glissement activé ne fait plus défiler la page sous le doigt');
  assert.equal(s.frames.size, 0, 'aucune boucle permanente quand le doigt reste au milieu du tableau');
  s.end(230);
  assert.deepEqual(s.moves, [['source', 'target', 'after']], 'le titre accueille le contenu dans son paragraphe');
  assert.equal(s.ghosts.length, 0); assert.equal(s.win.count(), 0);
  s.actions.onClickCapture({ target: s.surface, preventDefault: () => { prevented = false; }, stopPropagation: () => {} } as unknown as React.MouseEvent<HTMLElement>);
  assert.equal(prevented, false, 'le clic synthétique du dépôt est intercepté');
});

test('contenu tactile : un deuxième doigt annule sans mutation ni aperçu résiduel', context => {
  const s = sensor(context);
  s.start(); context.mock.timers.tick(260);
  s.win.emit('touchstart', { touches: [s.point(), { ...s.point(), identifier: 2 }] });
  assert.equal(s.ghosts.length, 0); assert.equal(s.frames.size, 0);
  assert.equal(s.moves.length, 0); assert.equal(s.win.count(), 0);
});

test('contenu souris : perte de capture annule et Entrée reste une sélection accessible', context => {
  const s = sensor(context);
  s.actions.onPointerDown({ target: s.surface, pointerType: 'mouse', pointerId: 2, clientX: 150, clientY: 130,
    button: 0, isPrimary: true, preventDefault: () => {} } as unknown as React.PointerEvent<HTMLElement>);
  assert.equal(s.captures(), 0, 'un simple clic reste destiné au contenu pour sélectionner');
  s.win.emit('pointermove', { pointerId: 2, clientX: 150, clientY: 160, preventDefault: () => {} });
  assert.equal(s.captures(), 1, 'seul le glissement capture le pointeur');
  assert.equal(s.ghosts.length, 1);
  s.root.emit('lostpointercapture', { pointerId: 2 });
  assert.equal(s.ghosts.length, 0); assert.equal(s.moves.length, 0); assert.equal(s.win.count(), 0);
  s.actions.onKeyDown({ target: s.surface, key: 'Enter', preventDefault: () => {} } as unknown as React.KeyboardEvent<HTMLElement>);
  assert.equal(s.clicks(), 1);
});
