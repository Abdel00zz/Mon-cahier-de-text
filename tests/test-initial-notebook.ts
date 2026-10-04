import assert from 'node:assert/strict';
import test from 'node:test';
import { notebookStorageKey, readInitialNotebook } from '../src/features/editor/initialNotebook';

const storage = (entries: Record<string, string> = {}): Pick<Storage, 'getItem'> => ({
  getItem: (key: string) => entries[key] ?? null,
});

const item = (title: string, date = '') => ({ type: 'cours', title, date });

test('cahier initial : le contenu stocké est lu de façon synchrone, avec sa direction', () => {
  const entries = { [notebookStorageKey('c1')]: JSON.stringify({ lessonsData: [item('Leçon 1', '2026-10-01')], contentDirection: 'rtl' }) };
  const notebook = readInitialNotebook({ classId: 'c1', locale: 'fr', storage: storage(entries) });
  assert.ok(notebook);
  assert.equal(notebook.lessons.length, 1);
  assert.equal((notebook.lessons[0] as { title?: string }).title, 'Leçon 1');
  assert.equal(notebook.direction, 'rtl');
  assert.equal(notebook.repaired, false);
});

test('cahier initial : un cahier vierge reçoit son diagnostic de départ', () => {
  const notebook = readInitialNotebook({ classId: 'c2', locale: 'fr', storage: storage() });
  assert.ok(notebook);
  assert.equal(notebook.lessons.length, 1);
  assert.equal(notebook.repaired, true);
  // La direction par défaut suit la langue demandée.
  assert.equal(notebook.direction, 'ltr');
  assert.equal(readInitialNotebook({ classId: 'c2', locale: 'ar', storage: storage() })!.direction, 'rtl');
});

test('cahier initial : un contenu illisible rend null au lieu d’écraser le cahier', () => {
  const entries = { [notebookStorageKey('c3')]: '{ ceci n’est pas du JSON' };
  assert.equal(readInitialNotebook({ classId: 'c3', locale: 'fr', storage: storage(entries) }), null);
});

test('cahier initial : sans direction enregistrée, le contenu décide — un cahier latin reste ltr en interface arabe', () => {
  const entries = { [notebookStorageKey('c7')]: JSON.stringify([item('Leçon', '2026-10-01'), item('Exercice', '2026-10-02')]) };
  const notebook = readInitialNotebook({ classId: 'c7', locale: 'ar', storage: storage(entries) })!;
  assert.equal(notebook.direction, 'ltr');
  // La déduction est persistée : plus de détection refaite sur chaque appareil.
  assert.equal(notebook.repaired, true);
});

test('cahier initial : une direction enregistrée n’est jamais écrasée par la déduction', () => {
  const entries = { [notebookStorageKey('c8')]: JSON.stringify({ lessonsData: [item('Leçon')], contentDirection: 'rtl' }) };
  const notebook = readInitialNotebook({ classId: 'c8', locale: 'fr', storage: storage(entries) })!;
  assert.equal(notebook.direction, 'rtl');
  assert.equal(notebook.repaired, false);
});

test('cahier initial : la clé d’une classe ne peut pas servir une autre classe', () => {
  const entries = { [notebookStorageKey('c4')]: JSON.stringify([item('Classe 4')]) };
  assert.equal(readInitialNotebook({ classId: 'c5', locale: 'fr', storage: storage(entries) })!.lessons.length, 1);
  const other = readInitialNotebook({ classId: 'c5', locale: 'fr', storage: storage(entries) })!;
  // La classe sans cahier reçoit un diagnostic, jamais le contenu de la classe voisine.
  assert.equal((other.lessons[0] as { title?: string }).title !== 'Classe 4', true);
});

test('cahier initial : un ancien cahier en tableau simple reste lisible', () => {
  const entries = { [notebookStorageKey('c6')]: JSON.stringify([item('Ancien format', '2026-09-01')]) };
  const notebook = readInitialNotebook({ classId: 'c6', locale: 'fr', storage: storage(entries) })!;
  assert.equal((notebook.lessons[0] as { title?: string }).title, 'Ancien format');
  // Sans direction enregistrée, elle est déduite du contenu puis persistée.
  assert.equal(notebook.repaired, true);
});
