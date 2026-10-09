import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Toolbar } from '../src/features/editor/Toolbar';
import { Header } from '../src/features/editor/Header';
import { EditorBackButton } from '../src/features/editor/EditorBackButton';
import { LocaleProvider } from '../src/i18n/LocaleProvider';
import type { ClassInfo } from '../src/types';

/*
 * Navigation retour dans le cahier.
 *
 * Contrat : aucun bouton flèche de retour dans la barre ni dans l'en-tête.
 * La navigation retour passe par la navigation native (bouton/geste Android et navigateur).
 */

const source = (path: string) => readFileSync(path, 'utf8');

const noop = () => undefined;
const classInfo = {
  id: 'demo', name: '2ème Année Collégiale 2', subject: 'Mathématiques',
  cycle: 'college', teacherName: '', createdAt: '2026-09-01',
} as ClassInfo;

const withLocale = (locale: 'fr' | 'ar', children: React.ReactElement) =>
  renderToStaticMarkup(React.createElement(LocaleProvider, { locale, children }));

const toolbar = withLocale('fr', React.createElement(Toolbar, {
  onUndo: noop, onRedo: noop, canUndo: true, canRedo: true, saveStatus: 'saved' as const,
  onOpenDataTransfer: noop, onOpenManageLessons: noop, onOpenGuide: noop, onOpenAnalyse: noop,
  onOpenEvaluations: noop, onPrint: noop, searchQuery: '', setSearchQuery: noop,
}));

test('la barre ne contient aucun bouton de retour', () => {
  assert.ok(toolbar.includes('data-editor-toolbar'), 'la barre est montée');
  assert.ok(!toolbar.includes('Retour aux classes'), 'le retour n’est pas dans la barre');
  assert.ok(!toolbar.includes('editor-back-button'), 'aucune trace du bouton dans la barre');
});

test('le bouton flèche est éliminé au profit de la navigation native Android et navigateur', () => {
  const standaloneFr = withLocale('fr', React.createElement(EditorBackButton, { onBack: noop }));
  assert.equal(standaloneFr, '', 'aucun bouton flèche monté en français');
  const standaloneAr = withLocale('ar', React.createElement(EditorBackButton, { onBack: noop }));
  assert.equal(standaloneAr, '', 'aucun bouton flèche monté en arabe');
});

test('l’en-tête ne monte aucun bouton flèche de retour', () => {
  const header = withLocale('fr', React.createElement(Header, {
    classInfo, onClassInfoChange: noop, onBack: noop,
  }));
  assert.ok(!header.includes('editor-back-button'), 'l’en-tête ne monte aucun bouton flèche');
  assert.doesNotMatch(header, /editor-back-button__arrow/, 'aucune flèche dans l’en-tête');
  const headerSource = source('src/features/editor/Header.tsx');
  assert.doesNotMatch(headerSource, /ArrowLeft/, 'plus de flèche ArrowLeft dans l’en-tête');
});

test('le défilement ne fait pas réapparaître une flèche de retour dans la barre', () => {
  const editor = source('src/features/editor/Editor.tsx');
  assert.match(editor, /<div className="min-w-0 flex-1">\s*<Toolbar/, 'la barre reste seule dans son propre bloc');
  assert.doesNotMatch(editor, /EditorBackButton|isScrolled|window\.scrollY > 96/);
});

test('le sens de lecture place la barre sans règle dédiée', () => {
  const editor = source('src/features/editor/Editor.tsx');
  assert.ok(editor.match(/sticky top-0 z-\[50\] flex items-center gap-2/), 'rangée flex logique');
  assert.doesNotMatch(editor, /order-(first|last)|float-(left|right)/, 'aucune règle de direction dupliquée');
});

test('Android et le Web ne montent aucun bouton de retour dans l’en-tête ni dans la barre', () => {
  const headerFr = withLocale('fr', React.createElement(Header, { classInfo, onClassInfoChange: noop, onBack: noop }));
  const headerAr = withLocale('ar', React.createElement(Header, { classInfo, onClassInfoChange: noop, onBack: noop }));
  assert.ok(!headerFr.includes('editor-back-button'));
  assert.ok(!headerAr.includes('editor-back-button'));
});
