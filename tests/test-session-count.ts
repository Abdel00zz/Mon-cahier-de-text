import assert from 'node:assert/strict';
import test from 'node:test';
import { countLoggedSessions } from '../src/domain/curriculum/progression';
import type { ScheduleSlot } from '../src/types';

/** 2026-10-06 est un mardi : `weekday` suit la convention JS `getDay()` (0 = dimanche). */
const TUESDAY = '2026-10-06';
const LATER = '2026-11-20';
const today = '2026-10-31';
const entry = (date: string, type: string) => ({ data: { date, type }, elementType: 'item' });
const slots = (...sessions: number[]): ScheduleSlot[] =>
  sessions.map(sessions => ({ weekday: 2, sessions } as unknown as ScheduleSlot));

test('séances tenues : une double séance se compte deux fois, une seule saisie ne vaut qu’une séance', () => {
  assert.equal(countLoggedSessions([entry(TUESDAY, 'cours')], { slots: slots(2), today }), 1);
  assert.equal(countLoggedSessions([entry(TUESDAY, 'cours'), entry(TUESDAY, 'cours')], { slots: slots(2), today }), 2);
  // Deux créneaux distincts le même jour comptent aussi deux séances.
  assert.equal(countLoggedSessions([entry(TUESDAY, 'cours'), entry(TUESDAY, 'cours')], { slots: slots(1, 1), today }), 2);
});

test('séances tenues : les devoirs et les dates futures ne comptent pas', () => {
  assert.equal(countLoggedSessions([entry(TUESDAY, 'devoir')], { slots: slots(2), today }), 0);
  assert.equal(countLoggedSessions([entry(TUESDAY, 'controle')], { slots: slots(2), today }), 0);
  assert.equal(countLoggedSessions([entry(TUESDAY, 'cours'), entry(TUESDAY, 'devoir')], { slots: slots(2), today }), 1);
  // Une date postérieure au jour courant n'est pas encore tenue.
  assert.equal(countLoggedSessions([entry(LATER, 'cours')], { slots: slots(2), today }), 0);
});

test('séances tenues : le plafond du jour borne les saisies multiples', () => {
  // Un seul créneau ce jour-là : trois éléments saisis ne valent qu'une séance.
  assert.equal(countLoggedSessions(
    [entry(TUESDAY, 'cours'), entry(TUESDAY, 'cours'), entry(TUESDAY, 'cours')],
    { slots: slots(1), today },
  ), 1);
  // Sans créneau connu, une date vaut une séance : jamais plus.
  assert.equal(countLoggedSessions([entry(TUESDAY, 'cours'), entry(TUESDAY, 'cours')], { today }), 1);
});
