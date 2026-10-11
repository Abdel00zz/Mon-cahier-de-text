import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  PEDAGOGICAL_ACTIVITIES,
  activityShortLabel,
  addActivityLine,
  detectRemarkActivities,
  remarkHasActivity,
  removeActivityLines,
} from '../src/domain/evaluations/pedagogicalActivities';

/*
 * CATALOGUE DES ACTIVITÉS DE SÉANCE — une seule source.
 *
 * Les libellés et synonymes vivaient dans la modale de séance ; ils vivent
 * maintenant dans le domaine, partagés et testables. Ces tests verrouillent la
 * reconnaissance (accents, arabe diacrité, ancrage de ligne) et la
 * non-régression : une phrase ne devient jamais une activité.
 */

const byType = (type: string) => PEDAGOGICAL_ACTIVITIES.find(activity => activity.type === type)!;

test('une activité en tête de ligne est reconnue, la même au milieu d’une phrase non', () => {
  assert.deepEqual(detectRemarkActivities('Contrôle des cahiers\nAbsents : 3').map(a => a.type), ['controle_cahiers']);
  assert.deepEqual(detectRemarkActivities('Rappel : contrôle des cahiers la semaine prochaine'), [],
    'une mention dans une phrase n’est pas une activité');
  assert.deepEqual(detectRemarkActivities(undefined), []);
  assert.deepEqual(detectRemarkActivities('   '), []);
});

test('la reconnaissance est insensible à la casse et aux accents', () => {
  assert.deepEqual(detectRemarkActivities('controle des cahiers').map(a => a.type), ['controle_cahiers']);
  assert.deepEqual(detectRemarkActivities('REMEDIATION — groupe B').map(a => a.type), ['remediation']);
});

test('l’arabe diacrité est reconnu comme sa forme simple', () => {
  const withTashkeel = detectRemarkActivities('حصّة استدراك').map(a => a.type);
  const plain = detectRemarkActivities('حصة استدراك').map(a => a.type);
  assert.deepEqual(withTashkeel, ['rattrapage']);
  assert.deepEqual(plain, withTashkeel, 'les diacritiques ne changent pas la reconnaissance');
  assert.deepEqual(detectRemarkActivities('مراقبة دفاتر التلاميذ').map(a => a.type), ['controle_cahiers']);
});

test('l’état d’une pastille reste souple : le libellé peut être n’importe où', () => {
  const soutien = byType('soutien');
  assert.equal(remarkHasActivity('Séance de soutien pour le groupe A', soutien), true);
  assert.equal(remarkHasActivity('Séance de révision', soutien), false);
  assert.equal(remarkHasActivity(undefined, soutien), false);
});

test('ajouter puis retirer une activité laisse les autres remarques intactes', () => {
  const rattrapage = byType('rattrapage');
  const added = addActivityLine('Absents : 2', activityShortLabel(rattrapage, 'fr'));
  assert.equal(added, 'Absents : 2\nRattrapage');
  const removed = removeActivityLines(added, rattrapage);
  assert.equal(removed, 'Absents : 2', 'la remarque du professeur survit au retrait');
  assert.equal(removeActivityLines('Rattrapage', rattrapage), '', 'retirer la seule ligne vide la remarque');
});

test('retirer une activité ne touche pas une phrase qui la mentionne', () => {
  const remediation = byType('remediation');
  const remark = 'Prévoir une remédiation en classe\nRemédiation';
  assert.equal(removeActivityLines(remark, remediation), 'Prévoir une remédiation en classe');
});

test('chaque activité porte ses trois langues et son type d’événement', () => {
  assert.equal(PEDAGOGICAL_ACTIVITIES.length, 4);
  for (const activity of PEDAGOGICAL_ACTIVITIES) {
    assert.ok(activity.short.fr && activity.short.en && activity.short.ar, `${activity.type} : trois libellés`);
    assert.ok(activity.synonyms.length >= 3, `${activity.type} : plusieurs graphies`);
    assert.ok(activity.labelKey.startsWith('evaluations.event.'), `${activity.type} : clé i18n`);
  }
});

test('la modale de séance consomme le catalogue au lieu d’en garder une copie', () => {
  const modal = readFileSync('src/features/editor/modals/AssignDateModal.tsx', 'utf8');
  assert.match(modal, /from '@\/domain\/evaluations\/pedagogicalActivities'/);
  assert.doesNotMatch(modal, /const PEDAGOGICAL_ACTIVITIES/, 'aucune seconde table de libellés dans l’écran');
  assert.doesNotMatch(modal, /getShortLabel/, 'les libellés viennent du domaine');
});
