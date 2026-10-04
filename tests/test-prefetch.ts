import assert from 'node:assert/strict';
import test from 'node:test';
import { PREFETCH_ORDER, startIdlePrefetch, type PrefetchEnvironment, type PrefetchTarget } from '../src/app/prefetch';

const environment = (overrides: Partial<PrefetchEnvironment> = {}) => {
  const scheduled: (() => void)[] = [];
  const cancelled: number[] = [];
  const value: PrefetchEnvironment = {
    online: true, saveData: false, effectiveType: '4g', visible: true,
    requestIdle: task => { scheduled.push(task); return scheduled.length; },
    cancelIdle: handle => { cancelled.push(handle); },
    ...overrides,
  };
  return { value, scheduled, cancelled };
};

const recorder = () => {
  const loaded: PrefetchTarget[] = [];
  return { loaded, load: async (target: PrefetchTarget) => { loaded.push(target); } };
};

test('préchargement : l’accueil précède l’éditeur, puis viennent les autres onglets', () => {
  assert.deepEqual([...PREFETCH_ORDER], ['dashboard', 'editor', 'settings', 'notifications', 'evaluations', 'guide']);
});

test('préchargement : la préparation est différée, jamais immédiate', () => {
  const harness = environment();
  const { loaded } = recorder();
  startIdlePrefetch({ environment: harness.value, load: async target => { loaded.push(target); } });
  assert.equal(harness.scheduled.length, 1);
  assert.deepEqual(loaded, []);
});

test('préchargement : tous les écrans sont préparés, l’accueil en premier', () => {
  const harness = environment();
  const { loaded, load } = recorder();
  startIdlePrefetch({ environment: harness.value, load });
  harness.scheduled[0]();
  assert.deepEqual(loaded, [...PREFETCH_ORDER]);
});

test('préchargement : sur une URL d’éditeur, le retour accueil passe devant', () => {
  const harness = environment();
  const { loaded, load } = recorder();
  startIdlePrefetch({ initialView: 'editor', environment: harness.value, load });
  harness.scheduled[0]();
  assert.equal(loaded[0], 'dashboard');
  assert.equal(loaded.length, PREFETCH_ORDER.length);
});

test('préchargement : un onglet caché ne charge aucun écran', () => {
  const harness = environment({ visible: false });
  const { loaded, load } = recorder();
  startIdlePrefetch({ environment: harness.value, load });
  harness.scheduled[0]();
  assert.deepEqual(loaded, []);
});

test('préchargement : une connexion économe ne prépare rien et s’annule sans erreur', () => {
  for (const overrides of [{ online: false }, { saveData: true }, { effectiveType: '2g' }, { effectiveType: 'slow-2g' }]) {
    const harness = environment(overrides);
    const { loaded, load } = recorder();
    const cancel = startIdlePrefetch({ environment: harness.value, load });
    assert.equal(harness.scheduled.length, 0, JSON.stringify(overrides));
    assert.deepEqual(loaded, []);
    cancel();
  }
});

test('préchargement : l’annulation retire la tâche planifiée', () => {
  const harness = environment();
  const cancel = startIdlePrefetch({ environment: harness.value, load: async () => undefined });
  cancel();
  assert.deepEqual(harness.cancelled, [1]);
});
