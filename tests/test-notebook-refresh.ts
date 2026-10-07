import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { injectAbsenceLine } from '../src/domain/notebook/absenceInjection';
import { readInitialNotebook } from '../src/features/editor/initialNotebook';
import { storedNotebookChanged } from '../src/features/editor/notebookRefresh';
import { saveNotebook } from '../src/infrastructure/storage/saveNotebook';
import { getPendingWork, reloadSyncState } from '../src/infrastructure/sync/syncBus';
import type { ContentDirection, LessonsData } from '../src/types';

const read = (path: string) => readFileSync(path, 'utf8');

/** Storage en mémoire, installé en global : `saveNotebook` écrit dans `localStorage`. */
const memoryStorage = () => {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() { return values.size; },
  };
};

const installGlobal = (context: test.TestContext, storage: ReturnType<typeof memoryStorage>) => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  context.after(() => {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  });
  reloadSyncState();
};

// Legacy certificate copies must not enter the editor tree after reload.

/** Un cahier réel, avec son chapitre daté. */
const notebook: LessonsData = [
  {
    type: 'chapter', title: 'Chapitre 1', date: '2026-09-07',
    items: [{ type: 'définition', title: 'D1', date: '2026-09-07' }],
  },
] as unknown as LessonsData;

const absenceLine = {
  date: '2026-09-14',
  title: 'Certificat de maladie',
  // Le motif seul : la date est portée par le champ `date`, donc par la cellule
  // « date » du tableau — jamais répétée dans le texte du contenu.
  description: 'Congé maladie',
  id: 'free-absence-c1-2026-09-14',
};

const injectedOf = (classId: string): LessonsData =>
  injectAbsenceLine(notebook, { ...absenceLine, id: `free-absence-${classId}-2026-09-14` })! as unknown as LessonsData;

test('un ancien certificat synchronisé reste exclu du tableau', context => {
  const storage = memoryStorage();
  installGlobal(context, storage);
  saveNotebook('c1', notebook, 'rtl');

  const next = injectAbsenceLine(JSON.parse(storage.getItem('classData_v1_c1')!).lessonsData, absenceLine);
  assert.ok(next, 'la première injection écrit quelque chose');
  saveNotebook('c1', next as unknown as LessonsData, 'rtl');

  // 1 · Le tableau : l'éditeur lit ce cahier au premier rendu, sans squelette.
  const stored = readInitialNotebook({ classId: 'c1', locale: 'ar' })!;
  const chapter = stored.lessons[0] as unknown as { items: Array<{ type?: string; title?: string; date?: string }> };
  assert.deepEqual(chapter.items.map(item => item.title), ['D1']);
  assert.deepEqual(stored.lessons, notebook, 'le certificat reste hors du plan pédagogique');

  // 2 · La synchronisation : `saveNotebook` marque la classe sale APRÈS l'écriture.
  assert.deepEqual(getPendingWork().dirtyClassIds, ['c1'], 'le cahier part au prochain push');

  // 3 · Réinjection : rien de plus, donc aucune écriture, donc aucun bruit réseau.
  assert.equal(injectAbsenceLine(next, absenceLine), null);
});

test('une ancienne copie de certificat ne déclenche pas de relecture pédagogique', context => {
  const storage = memoryStorage();
  installGlobal(context, storage);
  saveNotebook('c1', notebook, 'rtl');

  // Ce que l'éditeur a en mémoire : le cahier AVANT l'absence.
  const memory = { lessons: notebook, direction: 'rtl' as ContentDirection };

  // Ce que les Réglages viennent d'écrire sur le disque.
  const injected = injectAbsenceLine(notebook, absenceLine)! as unknown as LessonsData;
  saveNotebook('c1', injected, 'rtl');

  assert.equal(
    storedNotebookChanged(storage.getItem('classData_v1_c1'), memory),
    false,
    'une copie administrative ne change pas le contenu pédagogique',
  );
  // Une fois relu, l'éditeur et le disque coïncident : plus aucune relecture.
  assert.equal(storedNotebookChanged(storage.getItem('classData_v1_c1'), { lessons: notebook, direction: 'rtl' }), false);
});

test('aucune relecture inutile : notre propre enregistrement, une autre classe, un cahier illisible', context => {
  const storage = memoryStorage();
  installGlobal(context, storage);
  saveNotebook('c1', notebook, 'rtl');
  const raw = storage.getItem('classData_v1_c1');
  const memory = { lessons: notebook, direction: 'rtl' as ContentDirection };

  // Notre propre écriture ne doit pas réinitialiser l'historique d'annulation.
  assert.equal(storedNotebookChanged(raw, memory), false, 'contenu identique');
  // Le sens d'écriture, lui, doit suivre.
  assert.equal(storedNotebookChanged(raw, { lessons: notebook, direction: 'ltr' }), true, 'sens d’écriture changé ailleurs');
  // Une classe jamais écrite, ou un cahier abîmé : on ne touche à rien.
  assert.equal(storedNotebookChanged(null, memory), false);
  assert.equal(storedNotebookChanged('', memory), false);
  assert.equal(storedNotebookChanged('{"lessonsData":', memory), false);
  // Le contenu d'une AUTRE classe ne concerne pas cet éditeur.
  saveNotebook('c2', injectedOf('c2'), 'rtl');
  assert.equal(storedNotebookChanged(storage.getItem('classData_v1_c1'), memory), false);
});

test('branchement : l’éditeur écoute les écritures locales, pas seulement le cloud', () => {
  const editor = read('src/features/editor/Editor.tsx');
  const refresh = read('src/features/editor/notebookRefresh.ts');
  // Les deux sources de changement : pull cloud ET écriture locale (Réglages).
  assert.match(editor, /subscribe\('pull-applied', reloadStoredNotebook\)/, 'un pull cloud reste relu');
  assert.match(editor, /subscribe\('dirty', reloadStoredNotebook\)/, 'une écriture locale est relue');
  assert.match(editor, /storedNotebookChanged\(raw, \{ lessons: lessonsDataRef\.current, direction: contentDirectionRef\.current \}\)/, 'la décision est isolée et mesurable');
  // On ne relit jamais par-dessus une saisie en cours.
  assert.match(editor, /saveStatusRef\.current !== 'saved'\) return;[\s\S]{0,400}storedNotebookChanged/, 'saisie en cours préservée');
  // Le réglage écrit AVANT d'émettre l'événement, sinon la relecture verrait l'ancien cahier.
  assert.match(read('src/infrastructure/storage/saveNotebook.ts'), /writeDurably\(key, serialized, storage\);[\s\S]{0,200}markClassDirty\(classId\);/, 'écriture puis marquage');
  // « Absences » suit le compte d'un appareil à l'autre, et quitter les Réglages pousse tout de suite.
  assert.match(read('src/infrastructure/sync/syncSettings.ts'), /\| 'absences'/, 'réglage synchronisé');
  assert.match(read('src/app/App.tsx'), /wasInSettingsRef[\s\S]{0,400}flushPush\(\)/, 'la sortie des Réglages envoie le cahier réinjecté sans attendre');
  assert.match(refresh, /JSON\.parse\(raw\)/, 'la relecture compare deux instantanés');
});
