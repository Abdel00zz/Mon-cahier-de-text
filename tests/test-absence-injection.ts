import assert from 'node:assert/strict';
import test from 'node:test';
import { absenceDates, classesWithSessionDuring, injectAbsenceLine } from '../src/domain/notebook/absenceInjection';
import { FREE_TYPE } from '../src/domain/notebook/freeLineType';

type Node = { type?: string; title?: string; date?: string; items?: Node[]; sections?: Node[] };

/* 2026-09-14 est un lundi. Trois contenus datés : 09-07, 09-21 (dans le
   chapitre) et 09-28 (à la racine). */
const lessons: Node[] = [
  {
    type: 'chapter', title: 'Chapitre 1', date: '2026-09-07',
    items: [{ type: 'définition', title: 'D1', date: '2026-09-07' }, { type: 'exercice', title: 'E1', date: '2026-09-21' }],
  },
  { type: 'devoir', title: 'Devoir 1', date: '2026-09-28' },
];
const line = { date: '2026-09-14', title: 'Certificat de maladie', description: 'Congé maladie', id: 'free-1' };

test('absence : les dates couvertes suivent début/fin, jamais au-delà de la borne', () => {
  assert.deepEqual(absenceDates({ debut: '2026-10-01' }), ['2026-10-01']);
  assert.deepEqual(absenceDates({ debut: '2026-10-01', fin: '2026-10-03' }), ['2026-10-01', '2026-10-02', '2026-10-03']);
  assert.deepEqual(absenceDates({ debut: '2026-10-05', fin: '2026-10-01' }), ['2026-10-05']);
  assert.deepEqual(absenceDates({ debut: 'demain' }), []);
});

test('seules les classes qui ont une séance pendant l’absence sont visées', () => {
  const timetable = [{ day: 1, slot: 0, classId: 'A' }, { day: 1, slot: 2, classId: 'B' }];
  assert.deepEqual(classesWithSessionDuring(timetable, undefined, { debut: '2026-09-14' }, ['A', 'B']), ['A', 'B']);
  assert.deepEqual(classesWithSessionDuring(timetable, undefined, { debut: '2026-09-15' }, ['A', 'B']), []);
  assert.deepEqual(classesWithSessionDuring(timetable, undefined, { debut: '2026-09-14', fin: '2026-09-15' }, ['B', 'A']), ['A', 'B']);
  assert.deepEqual(classesWithSessionDuring(timetable, undefined, { debut: '2026-09-14' }, ['A']), ['A']);
  assert.deepEqual(classesWithSessionDuring([], undefined, { debut: '2026-09-14' }, ['A']), []);
});

test('la ligne libre se pose à sa place chronologique, dans son parent', () => {
  const next = injectAbsenceLine(lessons, line)!;
  assert.ok(next, 'première injection');
  const chapter = next[0];
  assert.deepEqual(chapter.items?.map(item => item.title), ['D1', 'Certificat de maladie', 'E1']);
  assert.equal(chapter.items?.[1].type, FREE_TYPE);
  assert.equal(chapter.items?.[1].date, '2026-09-14');
  assert.equal(chapter.items?.[1].description, 'Congé maladie');
  // Le cahier d'origine n'est jamais modifié.
  assert.deepEqual(lessons[0].items?.map(item => item.title), ['D1', 'E1']);
});

test('sans contenu antérieur : en tête si des dates existent, en fin si le cahier est vierge de dates', () => {
  const late = injectAbsenceLine([{ type: 'chapter', title: 'C', date: '2026-10-05', items: [] }], line)!;
  assert.equal(late[0].date, '2026-09-14');
  assert.equal(late[1].title, 'C');

  const undated = injectAbsenceLine([{ type: 'chapter', title: 'C', items: [] }], line)!;
  assert.equal(undated.length, 2);
  assert.equal(undated[1].date, '2026-09-14');
});

test('après un contenu racine : la ligne reste au niveau racine', () => {
  const next = injectAbsenceLine(lessons, { ...line, date: '2026-09-30' })!;
  assert.deepEqual(next.map(node => node.title), ['Chapitre 1', 'Devoir 1', 'Certificat de maladie']);
});

test('réinjection idempotente : jamais deux fois la même ligne, une autre date passe', () => {
  const once = injectAbsenceLine(lessons, line)!;
  assert.equal(injectAbsenceLine(once, { ...line, id: 'free-2' }), null, 'même date et même intitulé');
  assert.equal(injectAbsenceLine(once, { ...line, title: 'Autre motif' })?.length ? true : false, true, 'intitulé différent');
  assert.ok(injectAbsenceLine(once, { ...line, date: '2026-09-16', id: 'free-3' }), 'autre date');
});

test('cahier illisible ou date invalide : aucune écriture', () => {
  assert.equal(injectAbsenceLine(null, line), null);
  assert.equal(injectAbsenceLine({}, line), null);
  assert.equal(injectAbsenceLine(lessons, { ...line, date: '14/09/2026' }), null);
});
