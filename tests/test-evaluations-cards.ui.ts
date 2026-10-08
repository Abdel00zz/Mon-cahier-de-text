import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '../src/i18n/LocaleProvider';
import { DevoirsView } from '../src/features/evaluations/DevoirsView';
import { translateLocaleMessage } from '../src/i18n/messages';
import type { AppConfig, ClassInfo, PedagogicalEvent, PedagogicalEventType } from '../src/types';

/*
 * Fenêtre « Évaluations et activités » : de GRANDES cartes, une par activité,
 * avec une icône et une teinte choisies pour sa nature. Ces verrous tiennent
 * deux promesses : la même organisation que les réglages (grandes cartes, une
 * colonne sur téléphone, deux dès 640 px) et aucune icône décorative dans les
 * commandes — le libellé suffit.
 */

const classInfo = {
  id: 'c1', name: '2Bac PC 1', subject: 'Mathématiques', cycle: 'lycee',
  createdAt: '2026-09-01T00:00:00.000Z', color: 'indigo',
} as unknown as ClassInfo;

const event = (id: string, type: PedagogicalEventType, title: string, date: string, extra: Partial<PedagogicalEvent> = {}): PedagogicalEvent => ({
  id, type, title, date, status: 'planned', createdAt: '2026-09-01T00:00:00.000Z', ...extra,
});

const configWith = (events: PedagogicalEvent[]) => ({ pedagogicalEvents: { c1: events } } as unknown as AppConfig);

const renderSheet = (events: PedagogicalEvent[], locale: 'fr' | 'ar' = 'fr') => renderToStaticMarkup(
  React.createElement(LocaleProvider, { locale, children:
    React.createElement(DevoirsView, {
      classes: [classInfo], config: configWith(events), onConfigChange: () => {}, embedded: true,
    }),
  }),
);

const occurrences = (html: string, needle: string) => html.split(needle).length - 1;

test('les neuf types affichent leur titre sans répéter la nature ou la note', () => {
  const types: PedagogicalEventType[] = ['evaluation_diagnostic', 'olympiade', 'concours', 'soutien', 'remediation', 'examen_blanc', 'rattrapage', 'controle_cahiers', 'autre'];
  for (const locale of ['fr', 'ar'] as const) {
    for (const type of types) {
      const title = translateLocaleMessage(locale, `evaluations.event.${type}`);
      const html = renderSheet([event('e1', type, title, '2026-10-06', { note: `  ${title}  ` })], locale);
      // La pastille de compte du tiroir dit « 1 activité » : on vérifie qu'aucune
      // pastille ne répète le libellé de la nature, qui est déjà le titre.
      assert.doesNotMatch(html, new RegExp(`class="tone-chip">${title}<`), `${locale}/${type} : aucun libellé de nature répété`);
      assert.doesNotMatch(html, /line-clamp-2/, `${locale}/${type} : aucune note identique au titre`);
      assert.match(html, /data-activity-card="true"/);
    }
  }
});

test('chaque activité est une ligne de tableau, teintée selon sa nature', () => {
  // Une activité à la fois : le tiroir de la première est ouvert d'emblée, donc
  // ses occurrences sont visibles en rendu statique.
  const olympiade = renderSheet([
    event('e1', 'olympiade', 'Olympiade de mathématiques', '2026-09-14'),
  ]);
  const cahiers = renderSheet([
    event('e2', 'controle_cahiers', 'مراقبة دفاتر التلاميذ', '2026-09-15', { students: { names: ['Amin', 'Salma'], updatedAt: '2026-09-15T00:00:00.000Z' } }),
  ]);

  // UN tableau : une surface, un en-tête de colonnes, et une ligne par occurrence.
  // La fenêtre est montée par `ClassEvaluationsSheet`, dont la modale ne se
  // sérialise pas hors navigateur — on éprouve donc son corps, ici.
  assert.match(olympiade, /class="ev-board"/);
  assert.match(olympiade, /class="ev-board__head" aria-hidden="true"/, 'les colonnes sont nommées');
  assert.match(olympiade, /class="ev-board__rows"/);
  assert.match(olympiade, /class="ev-accordion__toggle"/, 'l’activité s’ouvre en tiroir');
  assert.equal(occurrences(olympiade, 'class="ev-row evaluation-tone"'), 1);
  assert.equal(occurrences(olympiade, 'data-activity-card="true"'), 1);
  // Les QUATRE colonnes d'une ligne : identité, état, période, actions. Aucune
  // colonne d'icône : « ne pas utiliser des icônes dans les zones ».
  for (const cell of ['ev-row__id', 'ev-row__state', 'ev-row__date', 'ev-row__actions']) {
    assert.equal(occurrences(olympiade, cell), 1, `colonne ${cell} sur la ligne`);
  }
  assert.doesNotMatch(olympiade, /ev-row__kind|hub-card__icon/, 'aucune pastille d’icône de nature dans la zone');
  // Une teinte par nature : ambre pour l'olympiade, ardoise pour le contrôle des
  // cahiers (une vérification administrative, pas une épreuve). On vise la ligne
  // (`data-activity-type`), pas le document : la teinte de l'en-tête de famille
  // — violette — ne compte pas comme une nature.
  assert.equal(occurrences(olympiade, 'data-activity-type="olympiade" data-tone="amber"'), 1);
  assert.equal(occurrences(cahiers, 'data-activity-type="controle_cahiers" data-tone="slate"'), 1);
  // L'en-tête de famille : le titre, puis le compte — aucune icône à côté.
  assert.match(olympiade, /class="kind-group evaluation-tone" data-tone="violet"[\s\S]{0,200}kind-group__count/, 'la famille des activités ouvre sa section');
  assert.doesNotMatch(olympiade, /kind-group__badge/, 'le titre d’une catégorie ne porte pas d’icône');
  // Le sigle de la famille est écrit, la ligne dit ce qu'elle est.
  assert.match(olympiade, /class="tone-chip">Olympiade</);
  assert.match(cahiers, /class="tone-chip">Contrôle des cahiers des élèves</);
  assert.match(olympiade, /Olympiade de mathématiques/);
  // La liste d'élèves consignés est comptée DANS la commande de la ligne.
  assert.match(cahiers, /Élèves consignés · 2/);
  // État et suppression restent des commandes, jamais un clic sur la ligne.
  assert.match(olympiade, /aria-label="Marquer Olympiade de mathématiques comme réalisé"/);
  assert.match(olympiade, /aria-label="Supprimer Olympiade de mathématiques"/);
});

test('les commandes portent un libellé, pas une icône', () => {
  const documentLabel = translateLocaleMessage('fr', 'evaluations.doc.open');
  const studentsLabel = translateLocaleMessage('fr', 'evaluations.students.open');
  const olympiade = renderSheet([event('e1', 'olympiade', 'Olympiade de mathématiques', '2026-09-14')]);
  const cahiers = renderSheet([event('e2', 'controle_cahiers', 'Contrôle des cahiers', '2026-09-15')]);
  // Un bouton dont le contenu est exactement le libellé : aucune icône injectée.
  assert.match(olympiade, new RegExp(`<button[^>]*>${documentLabel}</button>`));
  assert.match(olympiade, new RegExp(`<button[^>]*>${studentsLabel}</button>`));
  assert.match(cahiers, new RegExp(`<button[^>]*>${studentsLabel}</button>`));
  // Un contrôle des cahiers n'a pas de sujet à joindre : pas de bouton.
  assert.equal(occurrences(cahiers, `>${documentLabel}</button>`), 0);
});

test('les titres disent ce que la fenêtre contient, sans répétition', () => {
  const html = renderSheet([event('e1', 'soutien', 'Soutien', '2026-09-14')]);
  assert.match(html, /Activités pédagogiques/);
  // La classe ouverte coiffe l'écran ; les devoirs n'apparaissent que si la
  // classe en porte (ici, aucune) — la vue montre donc une seule famille.
  assert.match(html, /2ème Bac Sciences Physiques 1/);
  assert.doesNotMatch(html, /evaluations.classActivitiesHint|Les activités de cette classe|أنشطة هذا القسم/);
  // L'ancien titre juxtaposait deux libellés équivalents (« Activités &
  // Activités intégrées et étapes didactiques ») : il n'a plus lieu d'être.
  assert.equal(html.includes('Activités & '), false);
  assert.equal(html.includes('étapes didactiques'), false);
  for (const locale of ['fr', 'en', 'ar'] as const) {
    const value = translateLocaleMessage(locale, 'evaluations.pedagogicalEvents');
    assert.ok(value.length <= 24, `${locale} : le titre d'une section reste court (${value})`);
  }
});

test('sans activité, la zone invite à en créer une', () => {
  const view = readFileSync('src/features/evaluations/DevoirsView.tsx', 'utf8');
  // Plus d'onglet : la zone des activités est toujours là, pour la classe ouverte.
  assert.match(view, /<ActivitiesEmptyState onCreate=\{openKindChooser\} \/>/);
  assert.doesNotMatch(view, /activeTab/, 'plus aucun onglet de filtrage');
  assert.match(view, /SchedulePlanningIllustration size=\{120\}/);
  assert.match(view, /evaluations\.activitiesEmptyTitle/);
  assert.match(view, /evaluations\.activitiesEmptyHint/);
});

test('une icône et une teinte par nature, aucune couleur inventée', () => {
  const view = readFileSync('src/features/evaluations/DevoirsView.tsx', 'utf8');
  // Les natures vivent désormais dans le catalogue partagé : c'est lui qui porte
  // les icônes et les teintes, la page ne fait que les lire.
  const catalog = readFileSync('src/features/evaluations/kindCatalog.ts', 'utf8');
  const config = catalog.slice(catalog.indexOf('export const PEDAGOGICAL_EVENT_CONFIG'), catalog.indexOf('export const DEVOIR_KIND_CONFIG'));
  const types: PedagogicalEventType[] = [
    'evaluation_diagnostic', 'olympiade', 'concours', 'soutien', 'remediation',
    'examen_blanc', 'rattrapage', 'controle_cahiers', 'correction_controle_continu', 'autre',
  ];
  for (const type of types) assert.match(config, new RegExp(`${type}: \\{ labelKey`), `${type} a sa carte`);
  assert.equal((config.match(/tone: '/g) ?? []).length, types.length, 'une teinte par nature');
  // Les icônes sont distinctes : deux natures ne se confondent pas.
  const icons = [...config.matchAll(/Icon: ([A-Z]\w+)/g)].map(match => match[1]);
  assert.equal(icons.length, types.length, 'une icône par nature');
  assert.equal(new Set(icons).size, icons.length, 'aucune icône partagée par deux natures');
  // Plus aucune couleur de pastille inventée à la main.
  assert.equal(config.includes('badgeColor'), false);
  assert.equal(config.includes('bg-'), false);
  // La pastille de famille lit la teinte de la carte, elle ne la réinvente pas.
  assert.match(view, /className="tone-chip"/);
});

test('la fenêtre annonce un contenu précis, pas une redite du titre', () => {
  const sheet = readFileSync('src/features/evaluations/ClassEvaluationsSheet.tsx', 'utf8');
  assert.match(sheet, /formatLocalizedClassDisplayName\(classInfo.name, locale\)/);
  assert.match(sheet, /description=\{[\s\S]*className/, 'la classe est le seul contexte sous le titre');
  assert.equal(sheet.includes("t('evaluations.assessments')} · {t('evaluations.activities')"), false);
  for (const locale of ['fr', 'en', 'ar'] as const) {
    const subtitle = translateLocaleMessage(locale, 'evaluationsSheet.subtitle');
    const title = translateLocaleMessage(locale, 'evaluationsSheet.title', { className: 'X' });
    assert.ok(subtitle.length > 0 && !title.startsWith(subtitle), `${locale} : le sous-titre ajoute une information`);
  }
});
