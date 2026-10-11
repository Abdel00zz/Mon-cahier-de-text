import assert from 'node:assert/strict';
import test from 'node:test';
import { sessionRemarkSettingsPatch } from '../src/domain/evaluations/sessionRemarkChanges';
import type { AppConfig, Indices, LessonsData } from '../src/types';

/*
 * PASSAGE DE LA SÉANCE AU CONTRÔLE CONTINU.
 *
 * « Devoir maison N donné » dans la remarque d'une séance n'est pas une simple
 * annotation : le devoir doit exister dans la feuille d'évaluations, daté à
 * cette séance, avec la MÊME identité que celle que la réconciliation du cahier
 * fabrique (« 2026-2027:s1-maison1 »). Sinon la remarque reste un texte
 * orphelin, invisible pour le contrôle continu, le suivi et la direction.
 */

const classId = 'c1';
const lessons: LessonsData = [{
  type: 'chapter',
  title: 'Chapitre',
  items: [{ type: 'theoreme', title: 'THM1', date: '2026-10-12', remark: '' }],
}];
const targets: Indices[] = [{ chapterIndex: 0, itemIndex: 0 }];
const config = {} as AppConfig;

test('un devoir marqué « donné » crée le devoir daté dans la feuille d’évaluations', () => {
  const patch = sessionRemarkSettingsPatch(config, classId, lessons, targets,
    { date: '2026-10-12', homeworkGiven: 1 }, new Map());
  const manual = patch.manualAssessments?.[classId] ?? [];
  assert.equal(manual.length, 1, 'un seul devoir créé');
  assert.equal(manual[0].id, '2026-2027:s1-maison1', 'même identité que la réconciliation du cahier');
  assert.equal(manual[0].type, 'maison');
  assert.equal(manual[0].num, 1);
  assert.equal(manual[0].dateISO, '2026-10-12');
  assert.equal(manual[0].semestre, 1);
  assert.equal(patch.assessmentDates?.[classId]?.['2026-2027:s1-maison1'], '2026-10-12',
    'la date est posée sur le devoir : c’est elle qui l’affiche dans le contrôle continu');
});

test('le même devoir n’est jamais créé deux fois', () => {
  const first = sessionRemarkSettingsPatch(config, classId, lessons, targets,
    { date: '2026-10-12', homeworkGiven: 2 }, new Map());
  const second = sessionRemarkSettingsPatch(first as AppConfig, classId, lessons, targets,
    { date: '2026-10-12', homeworkGiven: 2 }, new Map());
  const manual = second.manualAssessments?.[classId] ?? [];
  assert.equal(manual.length, 1, 'identité stable : mise à jour, jamais doublon');
  assert.equal(manual[0].num, 2);
});

test('déplacer la séance déplace la date du devoir', () => {
  const patch = sessionRemarkSettingsPatch(config, classId, lessons, targets,
    { date: '2026-10-19', homeworkGiven: 3 }, new Map());
  assert.equal(patch.assessmentDates?.[classId]?.['2026-2027:s1-maison3'], '2026-10-19');
});

test('sans devoir donné, la feuille d’évaluations reste intacte', () => {
  const patch = sessionRemarkSettingsPatch(config, classId, lessons, targets,
    { date: '2026-10-12', remark: 'Absents : 2' }, new Map());
  assert.equal(patch.manualAssessments, undefined);
  assert.equal(patch.assessmentDates, undefined);
});
