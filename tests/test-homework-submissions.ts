import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  HOMEWORK_OUTCOMES,
  countHomeworkOutcomes,
  homeworkSubmissionRate,
  retainHomeworkOutcomes,
} from '../src/domain/evaluations/homeworkSubmissions';
import { assertValidSyncSettings } from '../api/_lib/validate';

/*
 * REMISE DES DEVOIRS — le suivi par élève.
 *
 * Deux états seulement (rendu / non rendu) : ce sont les deux que l'enseignant
 * constate. L'absence reste ailleurs (bouton Absents) pour que la direction
 * distingue un élève absent d'un élève qui n'a pas fait son travail.
 */

const updatedAt = '2026-10-12T08:00:00.000Z';

test('seuls les élèves présents et les états connus sont conservés', () => {
  const values = { Salma: 'given', Youssef: 'missing', Parti: 'given' } as const;
  assert.deepEqual(retainHomeworkOutcomes(['Salma', 'Youssef'], values), { Salma: 'given', Youssef: 'missing' });
  assert.deepEqual(retainHomeworkOutcomes(['Salma'], undefined), {});
  assert.deepEqual(retainHomeworkOutcomes(['Salma'], { Salma: 'rendu' as never }), {}, 'un état inconnu ne passe pas');
});

test('le résumé distingue rendus, non rendus et à vérifier', () => {
  const summary = countHomeworkOutcomes(['A', 'B', 'C', 'D'], { A: 'given', B: 'given', C: 'missing' });
  assert.deepEqual(summary, { given: 2, missing: 1, pending: 1 });
  assert.deepEqual(countHomeworkOutcomes(['A'], {}), { given: 0, missing: 0, pending: 1 });
});

test('le taux de remise ne devine rien tant que rien n’est constaté', () => {
  assert.equal(homeworkSubmissionRate({ given: 0, missing: 0, pending: 12 }), null);
  assert.equal(homeworkSubmissionRate({ given: 3, missing: 1, pending: 8 }), 75);
  assert.equal(homeworkSubmissionRate({ given: 0, missing: 2, pending: 0 }), 0);
});

test('l’API accepte un suivi de remise seul, et refuse un suivi invalide', () => {
  const valid = new Set(['c1']);
  assert.doesNotThrow(() => assertValidSyncSettings({
    assessmentParticipants: { c1: { 'maison-1': { names: ['A', 'B'], homeworkOutcomes: { A: 'given', B: 'missing' }, updatedAt } } },
  }, valid));
  // Non-régression : le suivi oral continue de passer tel quel.
  assert.doesNotThrow(() => assertValidSyncSettings({
    assessmentParticipants: { c1: { oral1: { names: ['A'], oralOutcomes: { A: 'mastered' }, updatedAt } } },
  }, valid));
  for (const bad of [
    { names: ['A'], updatedAt },
    { names: ['A'], homeworkOutcomes: { A: 'rendu' }, updatedAt },
    { names: ['A'], homeworkOutcomes: { Inconnu: 'given' }, updatedAt },
  ]) {
    assert.throws(() => assertValidSyncSettings({ assessmentParticipants: { c1: { x: bad } } }, valid));
  }
});

test('les deux suivis cohabitent dans le même enregistrement', () => {
  const record = { names: ['A', 'B'], oralOutcomes: { A: 'mastered' }, homeworkOutcomes: { B: 'missing' }, updatedAt };
  assert.doesNotThrow(() => assertValidSyncSettings({ assessmentParticipants: { c1: { x: record } } }, new Set(['c1'])));
  assert.deepEqual(HOMEWORK_OUTCOMES, ['given', 'missing']);
});

test('l’écran branche bien le suivi : bouton, fenêtre et action d’écriture', () => {
  const view = readFileSync('src/features/evaluations/DevoirsView.tsx', 'utf8');
  const modals = readFileSync('src/features/evaluations/components/DevoirsModals.tsx', 'utf8');
  assert.match(view, /a\.type === 'maison'/, 'le bouton n’apparaît que pour un devoir maison');
  assert.match(modals, /trackHomework/, 'la fenêtre passe le mode remise');
  assert.match(modals, /actions\.saveHomework\(/, 'la remise est écrite dans les réglages');
  assert.match(view, /countHomeworkOutcomes/, 'le compteur du bouton vient du domaine');
  const editor = readFileSync('src/features/evaluations/components/StudentNamesEditor.tsx', 'utf8');
  assert.match(editor, /HOMEWORK_REVIEW_CHOICES/);
  assert.match(editor, /evaluations\.homework\.allGiven/, 'un geste groupé « tout rendu »');
});
