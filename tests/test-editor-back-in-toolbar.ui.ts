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
 * Retour rapide dans le cahier.
 *
 * Contrat : UN seul bouton, un seul style (`.editor-back-button`). Il vit dans
 * l'en-tête en haut de page, puis le conteneur collant le reprend dès que la
 * page défile — POSÉ À CÔTÉ de la barre, jamais dedans. Le sens de lecture le
 * place seul : à gauche de la barre en français, à droite en arabe.
 */

// Les suites `.ui.ts` sont empaquetées par esbuild depuis la racine du dépôt :
// on lit les sources par chemin relatif, `import.meta.url` n'étant plus fiable.
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

const BACK_FR = 'Retour aux classes';
const BACK_AR = 'الرجوع إلى الأقسام';

test('la barre ne contient aucun bouton de retour', () => {
  assert.ok(toolbar.includes('data-editor-toolbar'), 'la barre est montée');
  assert.ok(!toolbar.includes(BACK_FR), 'le retour n’est pas dans la barre');
  assert.ok(!toolbar.includes('editor-back-button'), 'aucune trace du bouton dans la barre');
});

test('le bouton de retour est un composant séparé, au style d’origine', () => {
  const standalone = withLocale('fr', React.createElement(EditorBackButton, { onBack: noop }));
  assert.ok(standalone.includes('editor-back-button'), 'le style d’origine est restauré');
  assert.ok(standalone.includes('editor-back-button__arrow'), 'la flèche d’origine est conservée');
  assert.ok(standalone.includes(BACK_FR), 'libellé français');
  assert.doesNotMatch(standalone, /data-editor-toolbar/, 'il ne vit pas dans la barre');
  assert.match(source('src/features/editor/EditorBackButton.tsx'), /impact\('light'\)/, 'retour haptique conservé');
});

test('en arabe, la flèche suit le sens de lecture', () => {
  const arabic = withLocale('ar', React.createElement(EditorBackButton, { onBack: noop }));
  assert.ok(arabic.includes(BACK_AR), 'libellé arabe');
  assert.match(arabic, /dir="rtl"/, 'le bouton s’écrit de droite à gauche');
});

test('l’en-tête réutilise exactement le même bouton', () => {
  const header = withLocale('fr', React.createElement(Header, {
    classInfo, onClassInfoChange: noop, onBack: noop,
  }));
  assert.ok(header.includes('editor-back-button'), 'l’en-tête porte toujours son bouton');
  const headerSource = source('src/features/editor/Header.tsx');
  assert.match(headerSource, /<EditorBackButton onBack=\{onBack\} \/>/, 'même composant, donc même style');
  assert.doesNotMatch(headerSource, /ArrowLeft/, 'plus de bouton dupliqué dans l’en-tête');
});

test('le bouton voyage avec la barre dès que la page défile, à côté d’elle', () => {
  const editor = source('src/features/editor/Editor.tsx');
  // Un seul conteneur collant porte [retour séparé] puis [barre].
  assert.match(
    editor,
    /<div className="editor-toolbar-row sticky top-0 z-\[50\] flex items-center gap-2 print:hidden">\s*\{isScrolled && onBack && \(\s*<EditorBackButton/,
    'le retour est le premier enfant du conteneur collant, hors de la barre',
  );
  assert.match(editor, /<div className="min-w-0 flex-1">\s*<Toolbar/, 'la barre reste seule dans son propre bloc');
  assert.match(editor, /window\.scrollY > 96/, 'seuil de défilement explicite');
  assert.match(
    editor,
    /setIsScrolled\(current => \(current === next \? current : next\)\)/,
    'seule la bascule re-rend l’éditeur',
  );
  assert.match(editor, /addEventListener\('scroll', onScroll, \{ passive: true \}\)/, 'écoute passive');
  assert.match(editor, /removeEventListener\('scroll', onScroll\)/, 'écoute retirée au démontage');
});

test('le sens de lecture place le bouton sans règle dédiée', () => {
  // Ordre DOM [bouton][barre] dans une rangée flex : en français le bouton est
  // à gauche, en arabe à droite — c'est le flux logique qui décide.
  const editor = source('src/features/editor/Editor.tsx');
  assert.ok(editor.match(/sticky top-0 z-\[50\] flex items-center gap-2/), 'rangée flex logique');
  assert.doesNotMatch(editor, /order-(first|last)|float-(left|right)/, 'aucune règle de direction dupliquée');
});

