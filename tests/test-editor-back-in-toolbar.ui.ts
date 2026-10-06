import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Toolbar } from '../src/features/editor/Toolbar';
import { LocaleProvider } from '../src/i18n/LocaleProvider';

/*
 * Retour rapide dans le cahier.
 *
 * Contrat : le bouton de retour reste dans l'en-tête en haut de page ; une fois
 * la page défilée, le bandeau collant le reprend À CÔTÉ du groupe
 * annuler/refaire — jamais fusionné avec lui — pour revenir sans remonter.
 */

// Les suites `.ui.ts` sont empaquetées par esbuild depuis la racine du dépôt :
// on lit les sources par chemin relatif, `import.meta.url` n'étant plus fiable.
const source = (path: string) => readFileSync(path, 'utf8');

const noop = () => undefined;

const render = (locale: 'fr' | 'ar', showBack: boolean) =>
  renderToStaticMarkup(
    React.createElement(LocaleProvider, {
      locale,
      children: React.createElement(Toolbar, {
        onUndo: noop,
        onRedo: noop,
        canUndo: true,
        canRedo: true,
        onSave: noop,
        saveStatus: 'saved' as const,
        onOpenDataTransfer: noop,
        onOpenManageLessons: noop,
        onOpenGuide: noop,
        onOpenAnalyse: noop,
        onOpenEvaluations: noop,
        onPrint: noop,
        searchQuery: '',
        setSearchQuery: noop,
        onBack: noop,
        showBack,
      }),
    })
  );

const BACK_FR = 'Retour aux classes';
const BACK_AR = 'الرجوع إلى الأقسام';

test('en haut de page, le bandeau ne double pas le bouton de retour', () => {
  const html = render('fr', false);
  assert.ok(html.includes('data-editor-toolbar'), 'le bandeau est monté');
  assert.ok(!html.includes(BACK_FR), 'aucun retour dans le bandeau tant que l’en-tête est visible');
  assert.match(html, /aria-label="[^"]*(Annuler|Undo)/, 'le groupe annuler/refaire reste seul');
});

test('après défilement, le retour apparaît à côté du groupe annuler/refaire', () => {
  const html = render('fr', true);
  const back = html.indexOf(BACK_FR);
  assert.ok(back > -1, 'le retour est monté dans le bandeau');
  const undo = html.indexOf('aria-label="Annuler');
  assert.ok(undo > -1, 'le groupe annuler/refaire est présent');
  assert.ok(back < undo, 'le retour précède le groupe, il ne le remplace pas');
  // Non fusionné : la séquence exacte est [retour] [filet] [groupe annuler/refaire].
  assert.match(
    html,
    /<\/button><span aria-hidden="true" class="h-6 w-px[^"]*"><\/span><div class="flex items-center gap-0\.5 rounded-lg border border-border\/40/,
    'le filet sépare le retour de la boîte du groupe',
  );
});

test('en arabe, la flèche du retour suit le sens de lecture', () => {
  const html = render('ar', true);
  assert.ok(html.includes(BACK_AR), 'libellé arabe');
  const backIndex = html.indexOf(BACK_AR);
  const button = html.slice(backIndex, html.indexOf('</button>', backIndex));
  assert.match(button, /scaleX\(-1\)/, 'la flèche est retournée en RTL');
});

test('le bandeau ne reprend le retour qu’après un vrai défilement', () => {
  const editor = source('src/features/editor/Editor.tsx');
  assert.match(editor, /window\.scrollY > 96/, 'seuil de défilement explicite');
  assert.match(
    editor,
    /setIsScrolled\(current => \(current === next \? current : next\)\)/,
    'seule la bascule re-rend l’éditeur',
  );
  assert.match(editor, /addEventListener\('scroll', onScroll, \{ passive: true \}\)/, 'écoute passive');
  assert.match(editor, /removeEventListener\('scroll', onScroll\)/, 'écoute retirée au démontage');
  assert.match(editor, /onBack=\{onBack\}\n\s+showBack=\{isScrolled\}/, 'le bandeau reçoit l’état de défilement');
  // L'en-tête garde sa place et son bouton : rien n'est déplacé ni fusionné.
  assert.match(editor, /onBack=\{onBack\}\n\s+\/>/, 'l’en-tête conserve son propre bouton');
});
