import assert from 'node:assert/strict';
import test from 'node:test';
import {
  initialOnboardingStep,
  canAdvanceOnboarding,
} from '../features/dashboard/onboarding/navigation';
import {
  applyRegistrationSetup,
  normalizeRegistrationSetup,
  type RegistrationSetup,
} from '../features/auth/registrationSetup';
import { gettingStartedState } from '../features/dashboard/onboarding/gettingStarted';
import {
  extractSyncableSettings,
  mergeSyncableSettings,
} from '../utils/syncSettings';
import { switchAccountWorkspace } from '../utils/accountWorkspace';
import type { ClassInfo } from '../types';

const owner = '0600000001';
const setup: RegistrationSetup = {
  cycle: 'college',
  className: '1AC 1',
  subject: 'Mathématiques',
  applicationLocale: 'fr',
  firstTitle: 'Les fonctions',
};
const classroom: ClassInfo = {
  id: 'a',
  name: '1AC 1',
  subject: 'Mathématiques',
  teacherName: 'Test',
  createdAt: '2026-08-31',
  color: '',
  cycle: 'college',
};
class MemoryStorage implements Storage {
  private entries = new Map<string, string>();
  fail: ((key: string) => boolean) | null = null;
  get length() {
    return this.entries.size;
  }
  key(index: number) {
    return [...this.entries.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.entries.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.fail?.(key)) throw new Error('Quota');
    this.entries.set(key, value);
  }
  removeItem(key: string) {
    this.entries.delete(key);
  }
  clear() {
    this.entries.clear();
  }
}
function fresh() {
  const storage = new MemoryStorage();
  switchAccountWorkspace(owner, { storage });
  storage.setItem(
    'appConfig_v1',
    JSON.stringify({
      defaultTeacherName: 'Prof Test',
      applicationLocale: 'ar',
    }),
  );
  return storage;
}

test('parcours de quatre étapes : commence par le cycle, pas par les préférences', () => {
  assert.equal(initialOnboardingStep({}, []), 1);
  assert.equal(initialOnboardingStep({ selectedCycles: ['college'] }, []), 2);
  assert.equal(
    initialOnboardingStep(
      { selectedCycles: ['college'], selectedSubjects: ['Mathématiques'] },
      [],
    ),
    3,
  );
  assert.equal(
    initialOnboardingStep(
      { selectedCycles: ['college'], selectedSubjects: ['Mathématiques'] },
      [classroom],
    ),
    4,
  );
});
test('un nom vide ne bloque pas ; les choix pédagogiques restent requis', () => {
  assert.equal(canAdvanceOnboarding(1, false, true), false);
  assert.equal(canAdvanceOnboarding(1, true, false), true);
  assert.equal(canAdvanceOnboarding(2, true, false), false);
  assert.equal(canAdvanceOnboarding(3, true, true), true);
  assert.equal(canAdvanceOnboarding(4, false, false), true);
});
test('la reprise ignore les cycles invalides et les matières vides', () => {
  assert.equal(
    initialOnboardingStep({ selectedCycles: ['bad' as never] }, [classroom]),
    1,
  );
  assert.equal(
    initialOnboardingStep(
      { selectedCycles: ['college', 'college'], selectedSubjects: [' '] },
      [],
    ),
    2,
  );
});
test('préparation normalisée, bornée et limitée aux champs autorisés', () => {
  assert.deepEqual(
    normalizeRegistrationSetup({ ...setup, className: ' 1AC 1 ', admin: true }),
    setup,
  );
  for (const value of [
    null,
    { ...setup, cycle: 'other' },
    { ...setup, applicationLocale: 'xx' },
    { ...setup, subject: '' },
    { ...setup, className: 'x'.repeat(121) },
    { ...setup, firstTitle: 'x'.repeat(301) },
  ])
    assert.equal(normalizeRegistrationSetup(value), null);
});
test('l’inscription conserve classe, matière et titre dans le nouvel espace', () => {
  const storage = fresh();
  const id = applyRegistrationSetup(setup, owner, storage)!;
  const config = JSON.parse(storage.getItem('appConfig_v1')!);
  assert.deepEqual(config.selectedCycles, ['college']);
  assert.equal(config.defaultTeacherName, 'Prof Test');
  assert.equal(config.applicationLocale, 'fr');
  assert.equal(config.hasCompletedWelcome, undefined);
  const classes = JSON.parse(storage.getItem('classManager_v1')!);
  assert.equal(classes[0].id, id);
  assert.equal(classes[0].name, '1AC 1');
  assert.equal(
    JSON.parse(storage.getItem('classData_v1_' + id)!).lessonsData[0].title,
    'Les fonctions',
  );
  assert.equal(storage.getItem('app_first_launch_v1'), 'true');
});
test('aucune préparation n’est appliquée au mauvais propriétaire', () => {
  const storage = fresh();
  assert.throws(() => applyRegistrationSetup(setup, '0600000002', storage));
  assert.equal(storage.getItem('classManager_v1'), null);
});
test('un espace déjà configuré n’est jamais remplacé par l’essai', () => {
  for (const data of [
    { hasCompletedWelcome: true },
    { selectedCycles: ['lycee'] },
    { selectedSubjects: ['Français'] },
  ]) {
    const storage = fresh();
    storage.setItem('appConfig_v1', JSON.stringify(data));
    assert.equal(applyRegistrationSetup(setup, owner, storage), null);
    assert.deepEqual(JSON.parse(storage.getItem('appConfig_v1')!), data);
  }
  const storage = fresh();
  storage.setItem('classManager_v1', JSON.stringify([classroom]));
  assert.equal(applyRegistrationSetup(setup, owner, storage), null);
  assert.deepEqual(JSON.parse(storage.getItem('classManager_v1')!), [
    classroom,
  ]);
});
test('quota pendant création du cahier : retour à l’espace original', () => {
  const storage = fresh();
  const before = storage.getItem('appConfig_v1');
  storage.fail = (key) => key.startsWith('classData_v1_');
  assert.throws(() => applyRegistrationSetup(setup, owner, storage));
  assert.equal(storage.getItem('appConfig_v1'), before);
  assert.equal(storage.getItem('classManager_v1'), null);
  assert.equal(storage.getItem('app_first_launch_v1'), null);
});
test('titre arabe conservé tel quel, même dans une interface française', () => {
  const storage = fresh();
  const id = applyRegistrationSetup(
    { ...setup, firstTitle: 'الدوال العددية' },
    owner,
    storage,
  )!;
  const notebook = JSON.parse(storage.getItem('classData_v1_' + id)!);
  assert.equal(notebook.contentDirection, 'rtl');
  assert.equal(notebook.lessonsData[0].title, 'الدوال العددية');
});
test('sans titre saisi, aucune donnée de démonstration n’est injectée', () => {
  const storage = fresh();
  const id = applyRegistrationSetup(
    { ...setup, firstTitle: '' },
    owner,
    storage,
  )!;
  assert.deepEqual(
    JSON.parse(storage.getItem('classData_v1_' + id)!).lessonsData,
    [],
  );
});
test('checklist progressive : vraie classe, ouverture et créneau valide', () => {
  assert.equal(gettingStartedState({}, [classroom]).visible, false);
  assert.deepEqual(
    gettingStartedState({ showGettingStarted: true }, [classroom]).done,
    [true, false, false],
  );
  assert.deepEqual(
    gettingStartedState(
      { showGettingStarted: true, firstNotebookOpened: true },
      [classroom],
    ).done,
    [true, true, false],
  );
  assert.equal(
    gettingStartedState({ showGettingStarted: false }, [classroom]).visible,
    false,
  );
  const config = {
    showGettingStarted: true,
    firstNotebookOpened: true,
    timetable: [{ classId: 'a', day: 1, startHour: 8, endHour: 9 } as never],
  };
  assert.equal(gettingStartedState(config, [classroom]).visible, false);
  assert.deepEqual(gettingStartedState(config, []).done, [false, false, false]);
});
test('états de checklist synchronisés sans ressaisie sur un autre appareil', () => {
  const settings = extractSyncableSettings({
    showGettingStarted: false,
    firstNotebookOpened: true,
  });
  const merged = mergeSyncableSettings(
    { applicationLocale: 'ar', showGettingStarted: true },
    settings,
  );
  assert.equal(merged.showGettingStarted, false);
  assert.equal(merged.firstNotebookOpened, true);
  assert.equal(merged.applicationLocale, 'ar');
});
