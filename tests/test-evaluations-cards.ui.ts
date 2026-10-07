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
      assert.doesNotMatch(html, /class="tone-chip">/, `${locale}/${type} : aucun libellé de nature répété`);
      assert.doesNotMatch(html, /line-clamp-2/, `${locale}/${type} : aucune note identique au titre`);
      assert.match(html, /data-activity-card="true"/);
    }
  }
});

test('chaque activité est une grande carte, teintée selon sa nature', () => {
  const html = renderSheet([
    event('e1', 'olympiade', 'Olympiade de mathématiques', '2026-09-14'),
    event('e2', 'controle_cahiers', 'مراقبة دفاتر التلاميذ', '2026-09-15', { students: { names: ['Amin', 'Salma'], updatedAt: '2026-09-15T00:00:00.000Z' } }),
  ]);
  // La grille des réglages, en une colonne sur téléphone et deux dès 640 px :
  // la fenêtre est montée par `ClassEvaluationsSheet`, dont la modale ne se
  // sérialise pas hors navigateur — on éprouve donc son corps, ici.
  assert.match(html, /class="hub-grid" data-rows/);
  assert.equal(occurrences(html, 'class="hub-card"'), 2);
  assert.equal(occurrences(html, 'data-static="true"'), 2);
  // Une teinte par nature : ambre pour l'olympiade, bleu pour le contrôle des
  // cahiers. On vise la carte (`data-activity-type`), pas le document : la
  // teinte de l'en-tête de famille — bleu lui aussi — ne compte pas deux fois.
  assert.equal(occurrences(html, 'data-activity-type="olympiade" data-tone="amber"'), 1);
  assert.equal(occurrences(html, 'data-activity-type="controle_cahiers" data-tone="blue"'), 1);
  // L'en-tête de famille : une pastille d'icône teintée, puis le titre.
  assert.match(html, /class="kind-group evaluation-tone" data-tone="violet"[\s\S]{0,120}kind-group__badge/, 'la famille des activités ouvre sa section');
  // Le sigle de la famille est écrit, la carte dit ce qu'elle est.
  assert.match(html, /class="tone-chip">Olympiade</);
  assert.match(html, /class="tone-chip">Contrôle des cahiers des élèves</);
  assert.match(html, /Olympiade de mathématiques/);
  // La liste d'élèves consignés est comptée DANS la carte.
  assert.match(html, /Élèves consignés · 2/);
  // État et suppression restent des commandes, jamais un clic sur la carte.
  assert.match(html, /aria-label="Marquer Olympiade de mathématiques comme réalisé"/);
  assert.match(html, /aria-label="Supprimer Olympiade de mathématiques"/);
});

test('les commandes portent un libellé, pas une icône', () => {
  const html = renderSheet([
    event('e1', 'olympiade', 'Olympiade de mathématiques', '2026-09-14'),
    event('e2', 'controle_cahiers', 'Contrôle des cahiers', '2026-09-15'),
  ]);
  const documentLabel = translateLocaleMessage('fr', 'evaluations.doc.open');
  const studentsLabel = translateLocaleMessage('fr', 'evaluations.students.open');
  // Un bouton dont le contenu est exactement le libellé : aucune icône injectée.
  assert.match(html, new RegExp(`<button[^>]*>${documentLabel}</button>`));
  assert.match(html, new RegExp(`<button[^>]*>${studentsLabel}</button>`));
  // Un contrôle des cahiers n'a pas de sujet à joindre : pas de bouton.
  assert.equal(occurrences(html, `>${documentLabel}</button>`), 1);
  assert.equal(occurrences(html, `>${studentsLabel}</button>`), 2);
});

test('les titres disent ce que la fenêtre contient, sans répétition', () => {
  const html = renderSheet([event('e1', 'soutien', 'Soutien', '2026-09-14')]);
  assert.match(html, /Activités pédagogiques/);
  assert.match(html, /Devoirs et évaluations/);
  // L'ancien titre juxtaposait deux libellés équivalents (« Activités &
  // Activités intégrées et étapes didactiques ») : il n'a plus lieu d'être.
  assert.equal(html.includes('Activités & '), false);
  assert.equal(html.includes('étapes didactiques'), false);
  for (const locale of ['fr', 'en', 'ar'] as const) {
    const value = translateLocaleMessage(locale, 'evaluations.pedagogicalEvents');
    assert.ok(value.length <= 24, `${locale} : le titre d'une section reste court (${value})`);
  }
});

test('sans activité, l’onglet invite à en créer une', () => {
  const view = readFileSync('src/features/evaluations/DevoirsView.tsx', 'utf8');
  assert.match(view, /<ActivitiesEmptyState onCreate=\{openKindChooser\} compact=\{activeTab === 'all'\} \/>/);
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
    'examen_blanc', 'rattrapage', 'controle_cahiers', 'autre',
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
  assert.match(sheet, /t\('evaluationsSheet\.subtitle'\)/);
  assert.equal(sheet.includes("t('evaluations.assessments')} · {t('evaluations.activities')"), false);
  for (const locale of ['fr', 'en', 'ar'] as const) {
    const subtitle = translateLocaleMessage(locale, 'evaluationsSheet.subtitle');
    const title = translateLocaleMessage(locale, 'evaluationsSheet.title', { className: 'X' });
    assert.ok(subtitle.length > 0 && !title.startsWith(subtitle), `${locale} : le sous-titre ajoute une information`);
  }
});
