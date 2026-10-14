import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderDescriptionWithBold } from '../src/components/typography/textFormat';
import { nestHandTypedLists } from '../src/lib/text/handLists';
import { highlightMathSource } from '../src/lib/text/highlightMarkers';

const html = (source: string) => renderToStaticMarkup(React.createElement(React.Fragment, null, ...renderDescriptionWithBold(source)));
const count = (value: string, needle: string) => value.split(needle).length - 1;

test('1. / a. / - indentés deviennent des listes imbriquées, marqueurs conservés', () => {
  const source = '1. \n\n   a. Premier.\n\n      Suite du raisonnement.\n\n   b. Second :\n\n      - cas 1\n\n      - cas 2\n\n2. Question suivante.\n\nTexte libre.';
  const nested = nestHandTypedLists(source);
  assert.match(nested, /\\item\[1\.\]\n\\begin\{enumerate\}\n\\item\[a\.\] Premier\./);
  assert.match(nested, /\\item\[b\.\] Second :\n\\begin\{itemize\}\n\\item\[•\] cas 1\n\\item\[•\] cas 2\n\\end\{itemize\}/);
  assert.match(nested, /\\item\[2\.\] Question suivante\.\n\\end\{enumerate\}\n\nTexte libre\./);
  const output = html(source);
  assert.equal(count(output, 'editor-list'), 3, 'liste 1-2, sous-liste a-b, sous-liste à puces');
  for (const label of ['>1.<', '>a.<', '>b.<', '>2.<']) assert.ok(output.includes(label), label);
  assert.doesNotMatch(output, /\\item|\\begin|\\end/);
});

test('une liste à plat reste intacte, un titre ferme toujours le groupe', () => {
  for (const flat of ['1. a\n2. b\n\n- x\n- y', '-3 est négatif\n- puce', 'a. texte courant']) assert.equal(nestHandTypedLists(flat), flat);
  const cut = nestHandTypedLists('1. \n   a. x\n## Titre\n2. y');
  assert.match(cut, /\\end\{enumerate\}\n\n## Titre\n2\. y/);
});

test('==…== dans une formule devient un fond jaune KaTeX, == isolé intact', () => {
  assert.equal(highlightMathSource('a = ==-3==', true), 'a = \\colorbox{#fde68a}{$\\displaystyle \\textcolor{#24231f}{-3}$}');
  assert.match(highlightMathSource('==\\dfrac{x+1}{x+3}==', false), /^\\colorbox\{#fde68a\}\{\$\\textcolor\{#24231f\}\{\\dfrac\{x\+1\}\{x\+3\}\}\$\}$/);
  assert.equal(highlightMathSource('a == b', false), 'a == b');
  assert.equal(highlightMathSource('a === b', false), 'a === b');
  const output = html('$$f(x) = ==-3==$$');
  assert.match(output, /background-color:#fde68a/);
  assert.doesNotMatch(output, /katex-error/);
});

test('la ponctuation après une formule en ligne entre dans sa dernière boîte : jamais seule à la ligne', () => {
  const output = html('donc ==$\\displaystyle\\lim_{x\\to 1^-} f(x) = +\\infty$==.');
  assert.match(output, /<span class="katex-tail">\.<\/span><\/span><\/span><\/span><\/span><\/mark>/, 'le point est dans le surlignage, après la formule');
  assert.doesNotMatch(output, /<\/mark>\./);
  assert.match(html('Soit $x>1$, alors'), /<span class="katex-tail">,<\/span>/);
  assert.doesNotMatch(html('$$x$$.'), /katex-tail/, 'une formule affichée n’en reçoit pas');
});

test('une ligne vide devient une respiration compacte, jamais deux de suite', () => {
  const output = html('Un.\n\n\n\nDeux.');
  assert.equal(count(output, 'class="doc-gap"'), 1);
});

test('le mot d’attente est sous le spinner, sans toucher au chargement, et se retire si on réduit les mouvements', async () => {
  const { readFileSync } = await import('node:fs');
  const { translateLocaleMessage } = await import('../src/i18n/messages');
  const { PageTransitionLoader } = await import('../src/components/ui/PageSkeleton');
  const { LocaleProvider } = await import('../src/i18n/LocaleProvider');
  const output = renderToStaticMarkup(React.createElement(LocaleProvider, { locale: 'fr', children: React.createElement(PageTransitionLoader) }));
  assert.ok(output.indexOf('loading-spinner') < output.indexOf('loading-hint'), 'le texte vient après le spinner');
  assert.match(output, /Un petit instant, tout se prépare…/);
  assert.match(output, /class="sr-only">Chargement…</, 'l’annonce pour lecteurs d’écran reste unique');
  assert.equal(translateLocaleMessage('ar', 'loading.hint'), 'لحظة من فضلك، نُحضّر كل شيء…');
  assert.equal(translateLocaleMessage('en', 'loading.hintSlow'), 'Almost there, thank you for your patience.');
  const spinner = readFileSync('src/components/ui/LoadingSpinner.tsx', 'utf8');
  assert.doesNotMatch(spinner, /LoadingHint|loading-hint/, 'le spinner n’est pas modifié');
  const css = readFileSync('src/components/ui/loading-hint.css', 'utf8');
  assert.match(css, /700ms forwards/, 'une attente brève ne montre aucun texte');
  assert.match(css, /prefers-reduced-motion: reduce\)[\s\S]*animation: none/);
});

test('le guide reste accessible directement depuis les actions du tableau de bord', async () => {
  const { readFileSync } = await import('node:fs');
  const dashboard = readFileSync('src/features/dashboard/Dashboard.tsx', 'utf8');
  const actions = readFileSync('src/features/dashboard/DashboardActions.tsx', 'utf8');
  const css = readFileSync('src/features/dashboard/dashboardActions.css', 'utf8');
  assert.match(dashboard, /<DashboardActions[\s\S]*?onOpenGuide=\{onOpenGuide\}/, 'le guide est transmis aux actions');
  assert.match(actions, /onOpenGuide && \([\s\S]*?onClick=\{\(\) => \{ impact\('light'\); onOpenGuide\(\); \}\}/, 'l’action ouvre le guide');
  assert.match(actions, /t\('toolbar\.help'\)/, 'libellé traduit');
  assert.match(css, /\.dashboard-actions-bar__icon \{[\s\S]*?width: 44px;[\s\S]*?height: 44px;/, 'cible de 44 px');
  assert.match(readFileSync('src/app/App.tsx', 'utf8'), /<Dashboard[\s\S]{0,200}onOpenGuide=\{\(\) => setGuideOpen\(true\)\}/);
});
