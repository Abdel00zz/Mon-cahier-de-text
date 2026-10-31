import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { TextHistory } from '../src/lib/text/textHistory';

const type = (history: TextHistory, text: string, at: number, now: number) => {
  const before = history.current;
  const value = before.slice(0, at) + text + before.slice(at);
  history.record({ value, start: at + text.length, end: at + text.length }, now);
  return at + text.length;
};

test('une série de frappes rapprochées fait UNE étape, et un mot de plus en ouvre une autre', () => {
  const history = new TextHistory('');
  let caret = 0;
  let now = 1000;
  for (const char of 'Bonjour') caret = type(history, char, caret, (now += 80));
  assert.equal(history.current, 'Bonjour');
  caret = type(history, ' ', caret, (now += 80));
  for (const char of 'monde') caret = type(history, char, caret, (now += 80));
  assert.equal(history.current, 'Bonjour monde');
  assert.equal(history.undo()?.value, 'Bonjour ', 'la dernière étape retire le mot « monde »');
  assert.equal(history.undo()?.value, '', 'puis « Bonjour »');
  assert.equal(history.undo(), null, 'rien avant le texte initial');
});

test('une pause ouvre une nouvelle étape ; rétablir refait ce qui a été défait ; une nouvelle saisie vide le rétablissement', () => {
  const history = new TextHistory('a');
  type(history, 'b', 1, 1000);
  type(history, 'c', 2, 5000);
  assert.equal(history.undo()?.value, 'ab');
  assert.equal(history.undo()?.value, 'a');
  assert.equal(history.redo()?.value, 'ab');
  assert.equal(history.redo()?.value, 'abc');
  assert.equal(history.redo(), null);
  history.undo();
  type(history, 'x', 2, 9000);
  assert.equal(history.canRedo, false, 'une saisie après un annuler efface les étapes rétablissables');
});

test('un collage ou une mise en forme est une étape à part, annulable en un geste', () => {
  const history = new TextHistory('Le théorème');
  history.record({ value: 'Le ==théorème==', start: 4, end: 12 }, 2000);
  history.record({ value: 'Le ==théorème== est vrai, démontré plus haut.', start: 44, end: 44 }, 2100);
  assert.equal(history.undo()?.value, 'Le ==théorème==');
  assert.equal(history.undo()?.value, 'Le théorème');
});

test('suppressions rapprochées : une étape ; le curseur retombe là où le texte a changé', () => {
  const history = new TextHistory('abcdef');
  history.record({ value: 'abcde', start: 5, end: 5 }, 1000);
  history.record({ value: 'abcd', start: 4, end: 4 }, 1050);
  history.record({ value: 'abc', start: 3, end: 3 }, 1100);
  const back = history.undo();
  assert.equal(back?.value, 'abcdef');
  assert.equal(back?.start, 6, 'le texte rendu est sélectionné à sa fin');
  const forward = history.redo();
  assert.equal(forward?.value, 'abc');
  assert.equal(forward?.start, 3);
});

test('l’historique est borné en étapes et en caractères', () => {
  const history = new TextHistory('', 5, 1000);
  for (let i = 0; i < 40; i += 1) history.record({ value: `${'x'.repeat(i + 1)}`.padEnd(i + 1, 'y'), start: i + 1, end: i + 1 }, i * 5000);
  let steps = 0;
  while (history.undo()) steps += 1;
  assert.ok(steps <= 4, `au plus 5 états gardés (${steps} annulations)`);
  const heavy = new TextHistory('', 400, 100);
  for (let i = 1; i <= 10; i += 1) heavy.record({ value: 'z'.repeat(i * 30), start: 0, end: 0 }, i * 5000);
  let heavySteps = 0;
  while (heavy.undo()) heavySteps += 1;
  assert.ok(heavySteps <= 3, 'le budget de caractères retire les plus anciennes étapes');
});

test('reset repart de zéro, et les deux éditeurs de contenu s’en servent sans bouton', () => {
  const history = new TextHistory('un');
  type(history, 'e', 2, 1000);
  history.reset('autre');
  assert.equal(history.canUndo, false);
  assert.equal(history.current, 'autre');
  const hook = readFileSync('src/hooks/useTextHistory.ts', 'utf8');
  assert.match(hook, /key === 'z' && !event\.shiftKey/);
  assert.match(hook, /key === 'z' && event\.shiftKey\) \|\| key === 'y'/);
  assert.match(hook, /historyUndo/);
  assert.match(hook, /historyRedo/);
  assert.match(hook, /event\.nativeEvent\.isComposing/, 'jamais pendant une composition de clavier');
  const modal = readFileSync('src/features/evaluations/components/ContentDocumentModal.tsx', 'utf8');
  assert.match(modal, /useTextHistory\(\{ value: source/);
  assert.match(modal, /onKeyDown=\{history\.onKeyDown\}/);
  assert.match(modal, /resetHistory\(initialSource\)/);
  assert.doesNotMatch(modal, /(Undo2|Redo2)/, 'aucun bouton annuler / rétablir');
  assert.match(readFileSync('src/features/editor/modals/ContextualDescriptionEditor.tsx', 'utf8'), /useTextHistory\(\{ value, setValue: onChange/);
});

test('le sens de la zone de rédaction suit chaque ligne, pas la première lettre du document', () => {
  const modal = readFileSync('src/features/evaluations/components/ContentDocumentModal.tsx', 'utf8');
  assert.match(modal, /dir=\{source\.trim\(\) \? 'auto' : \(isRtl \? 'rtl' : 'ltr'\)\}/);
  assert.doesNotMatch(modal, /<Textarea[\s\S]{0,400}dir=\{documentDir\}/, 'plus de sens unique pour tout le document');
});
