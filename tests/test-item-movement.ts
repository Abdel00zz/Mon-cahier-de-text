import assert from 'node:assert/strict';
import test from 'node:test';
import { produce } from 'immer';
import { moveItemAfter, moveItemInto } from '../src/domain/notebook/dataUtils';
import type { LessonsData } from '../src/types';

/*
 * LE CAPTEUR DE DÉPLACEMENT — un exercice (ou tout élément) traverse sections
 * et chapitres, sans dupliquer ni perdre de données, et sans jamais entrer
 * dans sa propre descendance.
 */

const book = (): LessonsData => ([
  { type: 'chapter', title: 'Chapitre 1', sections: [
    { name: 'S1', items: [{ type: 'exercice', title: 'Ex 1', _tempId: 'e1' }, { type: 'exercice', title: 'Ex 2', _tempId: 'e2' }] },
    { name: 'S2', items: [{ type: 'exercice', title: 'Ex 3', _tempId: 'e3' }] },
  ] },
  { type: 'chapter', title: 'Chapitre 2', sections: [
    { name: 'S3', items: [{ type: 'exercice', title: 'Ex 4', _tempId: 'e4' }] },
  ] },
] as LessonsData);

const ids = (items: { _tempId?: string }[]) => items.map(item => item._tempId);

test('le capteur réordonne au sein de la même liste', () => {
  const next = produce(book(), (draft) => {
    moveItemAfter(draft,
      { chapterIndex: 0, sectionIndex: 0, itemIndex: 0 },
      { chapterIndex: 0, sectionIndex: 0, itemIndex: 1 });
  });
  const items = (next[0] as { sections: { items: { _tempId?: string }[] }[] }).sections[0].items;
  assert.deepEqual(ids(items), ['e2', 'e1']);
});

test('le capteur traverse les sections : la cible décide du parent', () => {
  const next = produce(book(), (draft) => {
    moveItemAfter(draft,
      { chapterIndex: 0, sectionIndex: 0, itemIndex: 0 },
      { chapterIndex: 0, sectionIndex: 1, itemIndex: 0 });
  });
  const s1 = (next[0] as { sections: { items: { _tempId?: string }[] }[] }).sections[0].items;
  const s2 = (next[0] as { sections: { items: { _tempId?: string }[] }[] }).sections[1].items;
  assert.deepEqual(ids(s1), ['e2'], 'la source est retirée de son ancienne liste');
  assert.deepEqual(ids(s2), ['e3', 'e1'], 'l’élément rejoint la liste de la cible, après elle');
});

test('le capteur traverse les chapitres', () => {
  const next = produce(book(), (draft) => {
    moveItemAfter(draft,
      { chapterIndex: 0, sectionIndex: 0, itemIndex: 0 },
      { chapterIndex: 1, sectionIndex: 0, itemIndex: 0 });
  });
  const s3 = (next[1] as { sections: { items: { _tempId?: string }[] }[] }).sections[0].items;
  assert.deepEqual(ids(s3), ['e4', 'e1']);
});

test('même liste, la cible reste la bonne malgré le décalage des indices', () => {
  // Déplacer e1 APRÈS e2 : e1 (index 0) part, e2 devient index 0, la cible e2
  // est retrouvée par identité et l'insertion se fait à sa suite.
  const next = produce(book(), (draft) => {
    moveItemAfter(draft,
      { chapterIndex: 0, sectionIndex: 0, itemIndex: 0 },
      { chapterIndex: 0, sectionIndex: 0, itemIndex: 1 });
  });
  const items = (next[0] as { sections: { items: { _tempId?: string }[] }[] }).sections[0].items;
  assert.deepEqual(ids(items), ['e2', 'e1']);
});

test('déposer dans sa propre descendance est refusé', () => {
  const base = book();
  const next = produce(base, (draft) => {
    moveItemAfter(draft,
      { chapterIndex: 0, sectionIndex: 0 },
      { chapterIndex: 0, sectionIndex: 0, itemIndex: 0 });
  });
  assert.deepEqual(next, base, 'une section ne se dépose pas dans son propre contenu');
  const next2 = produce(base, (draft) => {
    moveItemInto(draft,
      { chapterIndex: 0, sectionIndex: 0 },
      { chapterIndex: 0, sectionIndex: 0 });
  });
  assert.deepEqual(next2, base, 'une section ne se dépose pas en elle-même');
});

test('déposer dans un chapitre range l’élément en dernier, à la racine du chapitre', () => {
  const next = produce(book(), (draft) => {
    moveItemInto(draft,
      { chapterIndex: 0, sectionIndex: 0, itemIndex: 0 },
      { chapterIndex: 1 });
  });
  const ch2 = next[1] as { items?: { _tempId?: string }[] };
  assert.ok(ch2.items && ch2.items.length === 1, 'la liste directe du chapitre est créée');
  assert.equal(ch2.items[0]._tempId, 'e1');
  const s1 = (next[0] as { sections: { items: unknown[] }[] }).sections[0].items;
  assert.equal(s1.length, 1, 'la source est retirée');
});

test('le capteur renvoie les indices de la nouvelle place', () => {
  const next = produce(book(), (draft) => {
    const moved = moveItemAfter(draft,
      { chapterIndex: 0, sectionIndex: 0, itemIndex: 0 },
      { chapterIndex: 1, sectionIndex: 0, itemIndex: 0 });
    assert.ok(moved, 'déplacement réussi');
    assert.deepEqual(moved, { chapterIndex: 1, sectionIndex: 0, itemIndex: 1 });
  });
  assert.equal(next.length, 2);
});
