import assert from 'node:assert/strict';
import test from 'node:test';
import { localizedActivityTitle } from '../src/domain/evaluations/activityTitle';

test('les titres générés se disent dans la langue courante, numéro conservé', () => {
  assert.equal(localizedActivityTitle('Évaluation diagnostique1', 'evaluation_diagnostic', 'ar'), 'تقويم تشخيصي 1');
  assert.equal(localizedActivityTitle('Évaluation diagnostique 1', 'evaluation_diagnostic', 'ar'), 'تقويم تشخيصي 1');
  assert.equal(localizedActivityTitle('التقويم التشخيصي 2', 'evaluation_diagnostic', 'fr'), 'Évaluation diagnostique 2');
  assert.equal(localizedActivityTitle('Diagnostic assessment 3', 'evaluation_diagnostic', 'fr'), 'Évaluation diagnostique 3');
  assert.equal(localizedActivityTitle('التقويم التشخيصي ٤', 'evaluation_diagnostic', 'en'), 'Diagnostic assessment 4', 'chiffres arabo-indiens ramenés à ceux de l’écran');
  assert.equal(localizedActivityTitle('Olympiade', 'olympiade', 'ar'), 'أولمبياد');
});

test('un titre vide prend le libellé de la nature ; un titre du professeur n’est jamais modifié', () => {
  assert.equal(localizedActivityTitle('', 'concours', 'fr'), 'Concours');
  assert.equal(localizedActivityTitle('   ', 'concours', 'ar'), 'مباراة');
  assert.equal(localizedActivityTitle('Olympiade de mathématiques', 'olympiade', 'ar'), 'Olympiade de mathématiques');
  assert.equal(localizedActivityTitle('Diagnostic des prérequis du chapitre 1', 'evaluation_diagnostic', 'ar'), 'Diagnostic des prérequis du chapitre 1');
  // Le numéro n’est repris que derrière la base exacte de SA nature.
  assert.equal(localizedActivityTitle('Olympiade 2', 'concours', 'fr'), 'Olympiade 2');
});
