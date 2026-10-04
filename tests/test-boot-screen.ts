import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldShowBootScreen } from '../src/domain/sync/bootScreen';

const base = {
  configLoading: false,
  authLoading: false,
  authenticated: true,
  firstLoadRunning: false,
  firstLoadComplete: false,
};

test('écran d’attente : la configuration et la session le déclenchent', () => {
  assert.equal(shouldShowBootScreen({ ...base, configLoading: true }), true);
  assert.equal(shouldShowBootScreen({ ...base, authLoading: true }), true);
});

test('écran d’attente : il couvre le PREMIER chargement cloud, et lui seul', () => {
  // Le maillon qui manquait : la progression réelle du premier chargement.
  assert.equal(shouldShowBootScreen({ ...base, firstLoadRunning: true }), true);
  // Un rapatriement périodique (espace déjà chargé) ne remet JAMAIS l'écran.
  assert.equal(shouldShowBootScreen({ ...base, firstLoadRunning: true, firstLoadComplete: true }), false);
  // Rien en cours : l'application s'affiche directement.
  assert.equal(shouldShowBootScreen(base), false);
});

test('écran d’attente : jamais de blocage, ni devant la page d’authentification', () => {
  // Hors ligne, serveur muet ou requête échouée : le signal retombe, donc
  // `firstLoadRunning` est faux et l'application reprend la main.
  assert.equal(shouldShowBootScreen({ ...base, firstLoadComplete: false }), false);
  // Un visiteur non authentifié voit la page de connexion, pas l'écran d'attente.
  assert.equal(shouldShowBootScreen({ ...base, authenticated: false, firstLoadRunning: true }), false);
});
