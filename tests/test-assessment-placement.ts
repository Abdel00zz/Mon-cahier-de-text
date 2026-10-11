import assert from 'node:assert/strict';
import test from 'node:test';
import { produce } from 'immer';
import { insertAssessmentBlock } from '../src/domain/notebook/dataUtils';
import { findNotebookAssessments } from '../src/domain/evaluations/assessmentSync';
import type { Indices, LessonsData, TopLevelItem } from '../src/types';

/*
 * LE PLACEMENT DES ÉPREUVES — juste après l'élément cliqué, jamais en fin.
 *
 * Un bloc d'épreuve (diagnostic, devoir surveillé, écrit court/global, oral,
 * correction) se pose LÀ où le professeur a cliqué, quelle que soit la
 * profondeur de l'ancre — et il reste reçu par la feuille d'évaluations, même
 * imbriqué. Le JSON reste souple : on insère dans la liste exacte de l'ancre.
 */

const block = (type: TopLevelItem['type'], title: string, date?: string): TopLevelItem =>
  ({ type, title, date, _tempId: `t-${type}` } as TopLevelItem);

test('sans ancre, le bloc d’épreuve se pose en fin de cahier', () => {
  const lessons = [{ type: 'chapter', title: 'Chapitre 1' }] as LessonsData;
  const next = produce(lessons, draft => insertAssessmentBlock(draft, undefined, block('controle_continu', 'Devoir surveillé 1')));
  assert.equal(next.length, 2);
  assert.equal(next[1].type, 'controle_continu');
  assert.ok(Array.isArray(next[1].sections), 'un bloc de premier niveau reçoit ses sections');
});

test('ancre = chapitre → le bloc se pose juste après ce chapitre, pas en fin', () => {
  const lessons = [
    { type: 'chapter', title: 'Chapitre 1' },
    { type: 'chapter', title: 'Chapitre 2' },
  ] as LessonsData;
  const anchor: Indices = { chapterIndex: 0 };
  const next = produce(lessons, draft => insertAssessmentBlock(draft, anchor, block('correction_devoir_maison', 'Correction du devoir maison 1')));
  assert.equal(next.length, 3);
  assert.equal(next[0].type, 'chapter');
  assert.equal(next[1].type, 'correction_devoir_maison', 'le bloc suit le chapitre cliqué');
  assert.equal(next[2].type, 'chapter', 'le chapitre suivant reste après');
});

test('ancre = ligne de contenu → le bloc suit exactement la ligne cliquée', () => {
  const lessons = [{
    type: 'chapter', title: 'Chapitre 1',
    sections: [{
      name: 'Activités',
      items: [
        { type: 'exercice', title: 'Ex 1', _tempId: 'ex1' },
        { type: 'exercice', title: 'Ex 2', _tempId: 'ex2' },
      ],
    }],
  }] as LessonsData;
  const anchor: Indices = { chapterIndex: 0, sectionIndex: 0, itemIndex: 0 };
  const next = produce(lessons, draft => insertAssessmentBlock(draft, anchor, block('controle_court', 'Devoir écrit court 1')));
  const items = (next[0] as { sections?: { items?: { type: string }[] }[] }).sections![0].items!;
  assert.equal(items[1].type, 'controle_court', 'le bloc est juste après l’élément cliqué');
  assert.equal(items[0].type, 'exercice');
  assert.equal(items[2].type, 'exercice');
  // La feuille d'évaluations reçoit le devoir, même imbriqué.
  assert.ok(findNotebookAssessments(next).some(entry => entry.type === 'controle_court'),
    'la feuille reçoit le devoir imbriqué');
});

test('ancre = titre de section → le bloc devient le premier enfant, sous le titre', () => {
  const lessons = [{
    type: 'chapter', title: 'Chapitre 1',
    sections: [{
      name: 'Activités',
      items: [{ type: 'exercice', title: 'Ex 1', _tempId: 'ex1' }],
    }],
  }] as LessonsData;
  const anchor: Indices = { chapterIndex: 0, sectionIndex: 0 };
  const next = produce(lessons, draft => insertAssessmentBlock(draft, anchor, block('oral', 'Évaluation orale 1')));
  const items = (next[0] as { sections?: { items?: { type: string }[] }[] }).sections![0].items!;
  assert.equal(items[0].type, 'oral', 'premier enfant : juste sous le titre cliqué');
});
