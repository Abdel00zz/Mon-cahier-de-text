import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '../src/i18n/LocaleProvider';
import { ChoiceSelect, type ChoiceOption } from '../src/features/evaluations/components/ChoiceSelect';
import { AnimatedTrashButton } from '../src/components/ui/AnimatedTrashButton';
import { CircleCheck, CircleX } from '../src/components/ui/icons';

const read = (path: string) => readFileSync(path, 'utf8');
const walk = (directory: string): string[] => readdirSync(directory).flatMap(name => {
  const path = join(directory, name);
  return statSync(path).isDirectory() ? walk(path) : [path];
});
const render = (node: React.ReactNode, locale: 'fr' | 'ar' = 'fr') =>
  renderToStaticMarkup(React.createElement(LocaleProvider, { locale, children: node }));

/*
 * LISTE DE CHOIX (retour sur le travail d'un élève) et CORBEILLE (un seul bouton, une seule icône).
 */
const options: ChoiceOption<'given' | 'missing'>[] = [
  { value: 'given', label: 'Rendu', icon: CircleCheck },
  { value: 'missing', label: 'Non rendu', icon: CircleX },
];
const field = (value: 'given' | 'missing' | null, locale: 'fr' | 'ar' = 'fr') => render(
  React.createElement(ChoiceSelect<'given' | 'missing'>, { value, options, onChange: () => undefined, placeholder: 'À vérifier', clearLabel: 'À vérifier', ariaLabel: 'Amina B.' }),
  locale,
);

// ── 1. La liste de choix ─────────────────────────────────────────────────────
test('le champ montre le choix courant, sa teinte et un nom accessible', () => {
  const chosen = field('missing');
  assert.match(chosen, /role="combobox"/);
  assert.match(chosen, /aria-label="Amina B\."/);
  assert.match(chosen, /data-tone="missing"/);
  assert.match(chosen, /Non rendu/);
  const pending = field(null);
  assert.match(pending, /data-tone="none"/, 'rien de choisi : teinte neutre');
  assert.match(pending, /À vérifier/);
  assert.match(pending, /data-placeholder/);
});

test('la liste suit le sens de lecture', () => {
  assert.match(field('given', 'ar'), /dir="rtl"/);
  assert.match(field('given', 'fr'), /dir="ltr"/);
});

test('chaque ligne d’élève, et le filtre, utilisent la même liste — plus de pastilles ni de liste native', () => {
  const list = read('src/features/evaluations/components/NotebookConditionList.tsx');
  assert.equal((list.match(/<ChoiceSelect</g) ?? []).length, 2, 'une liste par élève et une pour le filtre');
  assert.match(list, /variant="filter"/);
  assert.doesNotMatch(list, /notebook-segment|eval-pill|type="radio"|<select|<option/, 'plus de pastilles radio ni de select natif');
  assert.match(list, /const pendingLabel = t\(`\$\{copy\}\.pending`\);/);
  assert.match(list, /clearLabel=\{pendingLabel\}/, 'on peut revenir à « À vérifier »');
  assert.match(list, /const StudentRow = memo\(StudentRowView\)/, 'une fiche mémoïsée : choisir pour un élève ne refait pas toute la liste');
  assert.match(list, /const \{ \[name\]: _removed, \.\.\.rest \} = current;/, 'revenir à « à vérifier » retire l’état de l’élève');
});

test('la liste est accessible, tactile et fluide — et sans mouvement si on le demande', () => {
  const component = read('src/features/evaluations/components/ChoiceSelect.tsx');
  assert.match(component, /@radix-ui\/react-select/, 'clavier, saisie d’une lettre, rôles ARIA, repositionnement');
  assert.match(component, /collisionPadding/);
  const css = read('src/features/evaluations/components/choiceSelect.css');
  assert.match(css, /\.choice-trigger \{[^}]*min-height: 2\.75rem/, 'cible de 44 px');
  assert.match(css, /\.choice-item \{[^}]*min-height: 2\.75rem/);
  assert.match(css, /animation-delay: calc\(var\(--i, 0\) \* 28ms/, 'les choix se révèlent l’un après l’autre');
  assert.match(css, /cubic-bezier\(0\.34, 1\.56, 0\.64, 1\)/, 'ressort');
  assert.match(css, /stroke-dasharray: 24/, 'la coche se dessine');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none/);
  for (const tone of ['good', 'average', 'needs_work', 'missing']) assert.match(css, new RegExp(`data-tone='${tone}'`), tone);
  assert.match(css, /\.dark :is\(\.choice-trigger, \.choice-item\)\[data-tone='good'\]/, 'teintes du mode sombre désaturées');
  assert.match(css, /@media \(max-width: 680px\)[\s\S]*\.notebook-choice \{[^}]*grid-column: 1 \/ -1/, 'téléphone : pleine largeur sous le nom');
});

// ── 2. La corbeille ──────────────────────────────────────────────────────────
test('la corbeille est l’icône de la famille : mêmes tracés que Trash2, pas un dessin à part', () => {
  const icons = read('src/components/ui/icons.ts');
  assert.match(icons, /export const TRASH_PATHS = \{/);
  assert.match(icons, /\['path', \{ d: TRASH_PATHS\.wash, className: 'icon-wash', stroke: 'none' \}\]/);
  const button = read('src/components/ui/AnimatedTrashButton.tsx');
  assert.match(button, /TRASH_PATHS\.wash/);
  assert.match(button, /TRASH_PATHS\.lid/);
  assert.match(button, /TRASH_PATHS\.slits/);
  assert.match(button, /className="app-icon del-btn__icon"/, 'même classe d’icône que le reste');
  assert.doesNotMatch(button, /del-btn__letters|letterDrop|clipPath/, 'plus de lettres volantes ni de dessin à 48 px');
});

test('le bouton se rend avec son couvercle et sa silhouette, au bon format', () => {
  const html = render(React.createElement(AnimatedTrashButton, { iconOnly: true, size: 'md', variant: 'icon', 'aria-label': 'Supprimer' }));
  assert.match(html, /class="del-btn del-btn--icon del-btn--md"/);
  assert.match(html, /del-btn__lid/);
  assert.match(html, /del-btn__body/);
  assert.match(html, /icon-wash/);
  assert.match(html, /aria-label="Supprimer"/);
  const labelled = render(React.createElement(AnimatedTrashButton, { label: 'Supprimer', variant: 'destructive' }));
  assert.match(labelled, /<span class="del-btn__label">Supprimer<\/span>/);
});

test('le geste est doux : couvercle qui se soulève, ressort court, aucune animation en mouvement réduit', () => {
  const css = read('src/components/ui/AnimatedTrashButton.css');
  assert.match(css, /\.del-btn:not\(:disabled\):hover \.del-btn__lid \{ transform: translate\(-0\.4px, -1\.4px\) rotate\(-15deg\)/);
  assert.match(css, /\.del-btn:not\(:disabled\):focus-visible \.del-btn__lid/, 'le clavier a le même geste que la souris');
  assert.match(css, /@keyframes trashLid/);
  assert.match(css, /\.del-btn:not\(:disabled\):active \{ transform: scale\(0\.94\)/);
  assert.match(css, /hsl\(var\(--destructive\)\)/, 'le rouge sémantique des suppressions');
  assert.match(css, /\.del-btn--icon\.del-btn--sm \{ width: 2\.5rem; height: 2\.5rem; \}[\s\S]*\(pointer: coarse\)[\s\S]*2\.75rem/, 'au moins 44 px au doigt');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none/);
  const button = read('src/components/ui/AnimatedTrashButton.tsx');
  assert.match(button, /animationName === "trashLid"/, 'l’action part à la fin du geste');
  assert.match(button, /prefers-reduced-motion: reduce/, 'sans mouvement, l’action part tout de suite');
});

test('plus aucune corbeille « maison » dans l’application : une seule famille d’icônes', () => {
  const offenders = walk('src')
    .filter(path => /\.(tsx?|ts)$/.test(path))
    .filter(path => /import\s*\{[^}]*\bTrash2?\b[^}]*\}\s*from\s*['"]lucide-react['"]/.test(read(path)));
  assert.deepEqual(offenders, [], 'aucune importation de corbeille depuis lucide-react');
  assert.match(read('src/features/dashboard/ClassActionsMenu.tsx'), /import \{ Trash2 \} from '@\/components\/ui\/icons';/);
  assert.match(read('src/admin/components/CalendarManager.tsx'), /<AnimatedTrashButton iconOnly/, 'la suppression d’un jour férié a le même bouton');
});
