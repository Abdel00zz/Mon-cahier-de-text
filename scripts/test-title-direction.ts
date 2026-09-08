import assert from 'node:assert/strict';
import { test } from 'node:test';
import { titleDirection } from '../utils/contentDirection';

test('le contenu français reste LTR dans une interface arabe', () => {
  assert.equal(titleDirection('Évaluation diagnostique 1', 'rtl'), 'ltr');
  assert.equal(titleDirection('Chapitre 2 : Fractions : Opérations', 'rtl'), 'ltr');
});
test('le contenu arabe reste RTL dans une interface française', () => {
  assert.equal(titleDirection('١. الدرس : الدوال f(x)', 'ltr'), 'rtl');
});
test('les formules et nombres initiaux ne déterminent pas la langue', () => {
  assert.equal(titleDirection('$f(x)$ الدوال العددية', 'ltr'), 'rtl');
  assert.equal(titleDirection('١٢ : Fractions', 'rtl'), 'ltr');
  assert.equal(titleDirection('\\(x^2\\) الدوال', 'ltr'), 'rtl');
  assert.equal(titleDirection('2026 / 2027', 'rtl'), 'rtl');
  assert.equal(titleDirection('', 'ltr'), 'ltr');
});
test('un intitulé bilingue suit sa première lettre de prose', () => {
  assert.equal(titleDirection('Fonctions — الدوال'), 'ltr');
  assert.equal(titleDirection('الدوال — Fonctions'), 'rtl');
});
