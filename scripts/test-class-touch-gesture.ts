import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classifyClassTouch } from '../utils/classTouchGesture';
import { createLongPress, type PressClock } from '../utils/longPress';

function gesture() {
  let now = 0;
  let pending: { callback: () => void; due: number } | undefined;
  let opens = 0;
  const clock: PressClock = {
    start(callback, delay) { pending = { callback, due: now + delay }; return 1; },
    stop() { pending = undefined; },
  };
  const press = createLongPress(() => opens++, clock);
  const point = { pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0, clientX: 0, clientY: 0 };
  press.start(point);
  return {
    press,
    opens: () => opens,
    advance(time: number) {
      now = time;
      if (pending && now >= pending.due) { const action = pending.callback; pending = undefined; action(); }
    },
    move(time: number, distance: number) {
      this.advance(time);
      press.move({ ...point, clientX: distance });
      return classifyClassTouch(time, distance);
    },
  };
}

test('maintien immobile : aucun déplacement à 260 ms, paramètres à 550 ms une seule fois', () => {
  const g = gesture();
  g.advance(260);
  assert.equal(classifyClassTouch(260, 0), 'wait');
  assert.equal(g.opens(), 0);
  g.advance(550);
  assert.equal(g.opens(), 1);
  assert.equal(g.move(600, 30), 'cancel');
  g.press.context();
  assert.equal(g.opens(), 1);
  g.press.end();
  assert.equal(g.press.consumeClick(), true);
});

test('maintien puis mouvement : réorganisation sans ouverture des paramètres ni du cahier', () => {
  const g = gesture();
  assert.equal(g.move(300, 20), 'drag');
  g.advance(600);
  assert.equal(g.opens(), 0);
  g.press.end();
  assert.equal(g.press.consumeClick(), true);
});

test('balayage rapide : défilement sans réorganisation ni ouverture', () => {
  const g = gesture();
  assert.equal(g.move(80, 20), 'cancel');
  g.advance(600);
  assert.equal(g.opens(), 0);
  assert.equal(g.press.consumeClick(), true);
});

test('petit tremblement toléré ; annulation système et toucher simple préservés', () => {
  const g = gesture();
  assert.equal(g.move(300, 8), 'wait');
  g.advance(550);
  assert.equal(g.opens(), 1);
  const cancelled = gesture();
  cancelled.press.cancel();
  cancelled.advance(600);
  assert.equal(cancelled.opens(), 0);
  const tap = gesture();
  tap.advance(100);
  tap.press.end();
  tap.advance(600);
  assert.equal(tap.opens(), 0);
  assert.equal(tap.press.consumeClick(), false);
});
