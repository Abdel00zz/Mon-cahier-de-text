import assert from 'node:assert/strict';
import test from 'node:test';
import { analyseNotebook } from '../src/domain/intelligence/notebookAdvisor';
import { fingerprintNode } from '../src/domain/intelligence/fingerprint';
import { inspectNotebookImport } from '../src/domain/notebook/importPreview';

/*
 * CONSEILLER DE CAHIER — le moteur qui parle au professeur avant l'import.
 *
 * Rien n'est bloquant : ces conseils aident à corriger un cahier importé
 * (formule ouverte, bloc en double, dates à l'envers) avant de le confirmer.
 * Les tests verrouillent la détection, le tri et le silence quand il n'y a
 * rien à dire.
 */

const codes = (nodes: unknown, limit?: number) => analyseNotebook(nodes, limit).map(item => item.code);

test('une formule non fermée est signalée, une formule saine non', () => {
  const broken = [{ type: 'chapter', title: 'C', items: [{ type: 'definition', title: 'D', description: 'Soit $x$ réel et $y' }] }];
  assert.deepEqual(codes(broken), ['unclosedFormula']);
  const healthy = [{ type: 'chapter', title: 'C', items: [{ type: 'definition', title: 'D', description: 'Soit $x$ réel' }] }];
  assert.deepEqual(codes(healthy), []);
});

test('la formule display $$…$$ ne compte pas comme un délimiteur isolé', () => {
  const display = [{ type: 'chapter', title: 'C', items: [{ type: 'definition', title: 'D', description: '$$x^2$$' }] }];
  assert.deepEqual(codes(display), []);
});

test('deux blocs identiques sont un doublon, deux blocs différents non', () => {
  const block = { type: 'chapter', title: 'Nombres', items: [{ type: 'definition', title: 'D', description: 'x' }] };
  assert.deepEqual(codes([block, structuredClone(block)]), ['duplicateBlocks']);
  assert.deepEqual(codes([block, { ...structuredClone(block), title: 'Fractions' }]), []);
});

test('une séance datée avant la précédente est hors ordre', () => {
  const lessons = [{
    type: 'chapter', title: 'C',
    items: [
      { type: 'exercice', title: 'E1', date: '2026-09-20' },
      { type: 'exercice', title: 'E2', date: '2026-09-15' },
    ],
  }];
  assert.deepEqual(codes(lessons), ['outOfOrderSessions']);
  const ordered = [{ type: 'chapter', title: 'C', items: [
    { type: 'exercice', title: 'E1', date: '2026-09-15' },
    { type: 'exercice', title: 'E2', date: '2026-09-20' },
  ] }];
  assert.deepEqual(codes(ordered), []);
});

test('les contenus non datés restent normaux, avant ou après des séances déjà datées', () => {
  const undatedOnly = [{ type: 'chapter', title: 'C', items: [{ type: 'definition', title: 'D' }] }];
  assert.deepEqual(codes(undatedOnly), [], 'un cahier neuf sans aucune date n’est pas sermoné');
  const mixed = [{ type: 'chapter', title: 'C', items: [
    { type: 'definition', title: 'D', date: '2026-09-14' },
    { type: 'definition', title: 'E' },
  ] }];
  assert.deepEqual(codes(mixed), []);
  assert.deepEqual(codes([{ ...mixed[0], items: [...mixed[0].items].reverse() }]), []);
  assert.deepEqual(inspectNotebookImport(JSON.stringify(mixed)).advice, []);
});

test('un chapitre ou une section vide est signalé comme structure vide', () => {
  assert.deepEqual(codes([{ type: 'chapter', title: 'C', sections: [] }]), ['emptyStructure']);
  assert.deepEqual(codes([{ type: 'chapter', title: 'C', sections: [{ name: 'S' }] }]), ['emptyStructure']);
});

test('les conseils se lisent les plus graves d’abord, puis par quantité', () => {
  const lessons = [
    {
      type: 'chapter', title: 'C',
      items: [
        { type: 'definition', title: 'D1', description: '$a' },
        { type: 'definition', title: 'D2', description: '$b' },
      ],
    },
    { type: 'chapter', title: 'Vide', sections: [] },
  ];
  const advice = analyseNotebook(lessons);
  assert.deepEqual(advice.map(item => item.code), ['unclosedFormula', 'emptyStructure']);
  assert.equal(advice[0].severity, 'warning');
  assert.equal(advice[0].count, 2);
  assert.ok(advice[0].samplePath?.startsWith('lessons[0]'), 'un endroit est fourni pour situer le conseil');
});

test('la limite borne le nombre de conseils rendus', () => {
  const lessons = [{
    type: 'chapter', title: 'C', sections: [],
    items: [
      { type: 'definition', title: 'D1', date: '2026-09-20' },
      { type: 'definition', title: 'D2', date: '2026-09-10' },
      { type: 'definition', title: 'D3', description: '$x' },
    ],
  }];
  assert.equal(analyseNotebook(lessons, 2).length, 2);
  assert.equal(analyseNotebook(lessons).length, analyseNotebook(lessons, 4).length);
});

test('l’empreinte est stable, insensible à l’ordre des clés, et ignore _tempId', () => {
  const a = { type: 'chapter', title: 'C', date: '2026-09-14', items: [{ type: 'definition', title: 'D' }] };
  const b = { items: [{ title: 'D', type: 'definition' }], date: '2026-09-14', title: 'C', type: 'chapter' };
  const c = { ...a, _tempId: 'event-42' };
  assert.equal(fingerprintNode(a), fingerprintNode(b), 'l’ordre des clés JSON ne change pas l’identité');
  assert.equal(fingerprintNode(a), fingerprintNode(c), 'l’identifiant de session n’entre pas dans l’empreinte');
  assert.notEqual(fingerprintNode(a), fingerprintNode({ ...a, date: '2026-09-15' }), 'une date différente change l’identité');
  assert.notEqual(fingerprintNode(a), fingerprintNode({ ...a, title: 'Dérivées' }));
});

test('l’aperçu d’import transporte les conseils, prêts à afficher', () => {
  const payload = [{ type: 'chapter', title: 'C', items: [{ type: 'definition', title: 'D', description: 'Soit $x' }] }];
  const preview = inspectNotebookImport(JSON.stringify(payload));
  assert.equal(preview.blocks, 1);
  assert.deepEqual(preview.advice.map(item => item.code), ['unclosedFormula']);
  const clean = inspectNotebookImport(JSON.stringify([{ type: 'chapter', title: 'C', items: [{ type: 'definition', title: 'D', date: '2026-09-14' }] }]));
  assert.deepEqual(clean.advice, [], 'aucun bruit quand tout va bien');
});


test('assessment dates and their nested content do not constrain course chronology', () => {
  const course = [{ type: 'chapter', title: 'Chapitre', items: [
    { type: 'definition', title: 'Cours', date: '2026-09-14' },
    { type: 'devoir_maison', title: 'Devoir', date: '2026-10-10', items: [
      { type: 'exercice', title: 'Sujet', date: '2026-10-10' },
    ] },
    { type: 'free', title: 'Note', date: '2026-11-15' },
    { type: 'definition', title: 'Suite', date: '2026-09-15' },
  ] }];
  assert.deepEqual(codes(course), []);
  assert.deepEqual(codes([{ type: 'devoir_maison', title: 'Sujet', description: '$x' }]), ['unclosedFormula'], 'excluding assessment dates must not hide text defects');
  const broken = structuredClone(course);
  broken[0].items[3].date = '2026-09-12';
  assert.deepEqual(codes(broken), ['outOfOrderSessions']);
});

test('malformed dates are not compared lexically as session dates', () => {
  assert.deepEqual(codes([{ type: 'chapter', title: 'Cours', items: [
    { type: 'definition', date: '31/12/2026' },
    { type: 'definition', date: '2026-09-15' },
    { type: 'definition', date: '2026-02-30' },
    { type: 'definition', date: '2026-09-16' },
  ] }]), []);
});
