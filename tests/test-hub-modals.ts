import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { translateLocaleMessage } from '../src/i18n/messages';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/* Même esprit pour les deux fenêtres : cartes-boutons, retour dans l'en-tête, aucun mot répété. */

test('paramètres : le titre de la rubrique vit dans l’en-tête avec le retour, sans doublon de « Paramètres »', () => {
  const modal = read('src/features/settings/ConfigModal.tsx');
  assert.match(modal, /className="hub-back"[\s\S]{0,200}ChevronLeft/, 'bouton de retour dans l’en-tête');
  assert.match(modal, /inSection \? \(/, 'l’en-tête change seulement sous 1024 px, dans une rubrique');
  assert.match(modal, /useMediaQuery\('\(min-width: 1024px\)'\)/, 'la bascule suit la largeur réelle');
  assert.ok(!modal.includes('settings-backbar'), 'plus de ligne de retour dans le contenu');
  const primitives = read('src/features/settings/components/SettingsPrimitives.tsx');
  assert.match(primitives, /max-lg:sr-only/, 'le titre de rubrique n’est plus affiché deux fois, mais reste lu par les lecteurs d’écran');
  const css = read('src/styles/index.css');
  assert.match(css, /\.hub-modal-header\.modal-pro-header \{ min-height: 0;/, 'en-tête compact');
  assert.match(css, /\[data-has-handle='true'\]\.hub-modal \.dialog-close \{ top: 1\.75rem; \}/, 'titre et bouton fermer sur le même axe');
  assert.match(css, /\.hub-back \{[\s\S]{0,200}width: 2\.75rem;[\s\S]{0,60}height: 2\.75rem;/, 'cible tactile de 44 px');
  assert.match(css, /\[dir='rtl'\] \.hub-back__chevron \{ transform: scaleX\(-1\); \}/, 'chevron inversé en arabe');
});

test('suivi pédagogique : une seule fenêtre à trois vues, retour dans l’en-tête, plus de fenêtre empilée', () => {
  const modal = read('src/features/editor/modals/AnalysisModal.tsx');
  assert.equal((modal.match(/<Modal\b/g) ?? []).length, 1, 'une seule fenêtre');
  assert.ok(!modal.includes('OfficialCurriculumModal'), 'la fenêtre « Relier » n’est plus empilée sur la première');
  for (const view of ["'overview'", "'program'", "'link'"]) assert.ok(modal.includes(view), `vue ${view}`);
  assert.match(modal, /className="hub-back"[\s\S]{0,200}ChevronLeft/, 'retour dans l’en-tête');
  assert.ok(!modal.includes('analysis.close'), 'pas de bouton « Fermer » en double de la croix');
  assert.ok(!modal.includes('footer='), 'pas de pied de fenêtre : la croix suffit');
  assert.match(modal, /data-tone="blue"[\s\S]{0,1200}data-tone="violet"/, 'deux cartes colorées : programme, liens');
  assert.match(modal, /useCurriculumProgress\(current, config, lessonsData, catalog\)/, 'un seul calcul d’avancement, sur la classe à jour');
  assert.match(modal, /getWarningItems/);
  assert.match(modal, /analysis\.calendarWarnings/);
  assert.equal(existsSync(new URL('../src/components/curriculum/OfficialCurriculumModal.tsx', import.meta.url)), false);
});

test('relier mes chapitres : enregistrement immédiat, synchronisation groupée et jamais perdue', () => {
  const view = read('src/components/curriculum/CurriculumLinkView.tsx');
  assert.match(view, /SYNC_DELAY_MS = 700/);
  assert.match(view, /useEffect\(\(\) => flushSync, \[flushSync\]\)/, 'la synchronisation en attente part à la fermeture de la vue');
  assert.ok(!/void syncNow\(\)/.test(view.replace(/void syncNowRef/g, '')), 'plus de synchronisation à chaque choix');
  assert.match(view, /fingerprint\(latest\) !== baseline\.current/, 'une modification venue d’ailleurs n’est jamais écrasée');
  assert.ok(!/l\('/.test(view), 'textes traduits par le catalogue, pas en ligne');
});

test('catalogue des programmes : figé après la première ouverture de « Relier », partagé par toutes les vues', () => {
  const hook = read('src/hooks/useCurriculumCatalog.ts');
  assert.match(hook, /if \(!lockedRef\.current\) setCatalog\(value\)/);
  assert.match(hook, /controller\.abort\(\)/, 'requête annulée à la fermeture');
  const progress = read('src/hooks/useCurriculumProgress.ts');
  assert.match(progress, /catalog\?: CurriculumCatalog/);
  const modal = read('src/features/editor/modals/AnalysisModal.tsx');
  assert.match(modal, /useCurriculumCatalog\(isOpen, linkOpened\)/);
});

test('textes des deux fenêtres : chaque clé existe en français, anglais et arabe', () => {
  const files = [
    'src/features/editor/modals/AnalysisModal.tsx',
    'src/components/curriculum/CurriculumLinkView.tsx',
    'src/components/curriculum/CurriculumProgramView.tsx',
    'src/features/settings/ConfigModal.tsx',
  ];
  for (const file of files) {
    const keys = [...read(file).matchAll(/\bt\('([a-zA-Z0-9_.]+)'/g)].map(match => match[1]);
    for (const key of keys) {
      const values = (['fr', 'en', 'ar'] as const).map(locale => translateLocaleMessage(locale, key));
      assert.ok(values.every(value => value && value !== key), `${file} : clé manquante ${key}`);
    }
  }
});
