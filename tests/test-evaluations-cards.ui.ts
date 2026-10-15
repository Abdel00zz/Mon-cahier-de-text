import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '../src/i18n/LocaleProvider';
import { DevoirsView } from '../src/features/evaluations/DevoirsView';
import { translateLocaleMessage } from '../src/i18n/messages';
import { getBundledCalendar, todayInMorocco } from '../src/domain/calendar/calendar';
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
      classInfo, config: configWith(events), onConfigChange: () => {},
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
  // Les TROIS colonnes d'une ligne : identité, période, actions. Ni colonne d'état
  // (la date la dit), ni colonne d'icône : « ne pas utiliser des icônes dans les zones ».
  for (const cell of ['ev-row__id', 'ev-row__date', 'ev-row__actions']) {
    assert.equal(occurrences(olympiade, cell), 1, `colonne ${cell} sur la ligne`);
  }
  assert.doesNotMatch(olympiade, /ev-row__kind|hub-card__icon|ev-row__state/, 'aucune pastille d’icône de nature ni colonne d’état dans la zone');
  // Document : facultatif pour une olympiade (neutre), inexistant pour un contrôle des cahiers.
  assert.match(olympiade, /data-doc-state="idle"/, 'olympiade : document facultatif, absent = neutre');
  assert.doesNotMatch(cahiers, /data-doc-state/, 'contrôle des cahiers : jamais de bouton document');
  // Une teinte par nature : ambre pour l'olympiade, ardoise pour le contrôle des
  // cahiers (une vérification administrative, pas une épreuve). On vise la ligne
  // (`data-activity-type`), pas le document : la teinte de l'en-tête de famille
  // — violette — ne compte pas comme une nature.
  assert.equal(occurrences(olympiade, 'data-activity-type="olympiade" data-tone="amber"'), 1);
  assert.equal(occurrences(cahiers, 'data-activity-type="controle_cahiers" data-tone="slate"'), 1);
  // L'en-tête de famille : le titre, puis le compte — aucune icône à côté.
  assert.match(olympiade, /class="kind-group evaluation-tone" data-tone="violet"/, 'la famille des activités ouvre sa section');
  assert.doesNotMatch(olympiade, /kind-group__count/, 'les statistiques sont réservées au suivi');
  assert.doesNotMatch(olympiade, /kind-group__badge/, 'le titre d’une catégorie ne porte pas d’icône');
  // Le sigle de la famille est écrit, la ligne dit ce qu'elle est.
  assert.match(olympiade, /class="tone-chip">Olympiade</);
  // Le titre généré (ici enregistré en arabe) se dit en français sur un écran français : il porte déjà la nature, donc pas de pastille en double.
  assert.match(cahiers, /dir="auto">Contrôle des cahiers des élèves<\/h4>/);
  assert.doesNotMatch(cahiers, /class="tone-chip"/);
  assert.match(olympiade, /Olympiade de mathématiques/);
  // La liste d'élèves consignés est comptée DANS la commande de la ligne.
  assert.match(cahiers, /<span>Élèves<\/span><span class="ev-action__count">2<\/span>/, 'commande écrite, avec son compte');
  assert.match(cahiers, /aria-label="Suivi des cahiers — [^"]* · 2"/, 'le nom accessible garde le compte');
  // État et suppression restent des commandes, jamais un clic sur la ligne.
  assert.doesNotMatch(olympiade, /aria-label="Marquer Olympiade de mathématiques comme réalisé"/, 'le bouton marquer comme réalisé est purgé');
  assert.match(olympiade, /aria-label="Supprimer Olympiade de mathématiques"/);
});

test('les commandes portent un pictogramme, un libellé écrit et une infobulle explicative', () => {
  const documentLabel = translateLocaleMessage('fr', 'evaluations.doc.open');
  const studentsLabel = translateLocaleMessage('fr', 'evaluations.students.open');
  const notebookLabel = translateLocaleMessage('fr', 'evaluations.notebook.title');
  const olympiade = renderSheet([event('e1', 'olympiade', 'Olympiade de mathématiques', '2026-09-14')]);
  const cahiers = renderSheet([event('e2', 'controle_cahiers', 'Contrôle des cahiers', '2026-09-15')]);
  // Les commandes sont des MOTS : libellé court visible, nom accessible complet, infobulle explicative.
  assert.match(olympiade, /<span>Contenu<\/span>/, 'un seul mot : « Contenu » ; le plus vit dans le pictogramme, seulement quand le contenu est requis');
  assert.doesNotMatch(olympiade, /<span>\+ /, 'aucun « + » dans un libellé de commande');
  assert.match(olympiade, /<span>Élèves<\/span>/, 'les élèves consignés : un mot');
  assert.match(cahiers, /<span>Élèves<\/span>/, 'le suivi des cahiers : le même mot, « Élèves »');
  assert.doesNotMatch(cahiers, /<span>Cahiers<\/span>/, 'aucun second mot pour la même commande');
  assert.match(olympiade, /data-tippy-content="[^"]+"/, 'chaque commande a son infobulle');
  // Un pictogramme décoratif (famille d'icônes maison) précède chaque mot ; il ne remplace jamais le libellé.
  assert.match(olympiade, /class="ev-action[^>]*>\s*<svg[^>]*ev-action__icon/, 'chaque commande porte son pictogramme décoratif');
  assert.doesNotMatch(olympiade, /ev-action__icon[^>]*>(?:(?!<\/svg>).)*<\/svg>\s*<\/button>/, 'le pictogramme n’est jamais seul : le libellé suit');
  assert.ok(documentLabel && studentsLabel && notebookLabel, 'libellés complets disponibles pour les lecteurs d’écran');
  // Un contrôle des cahiers n'a pas de sujet à joindre : pas de bouton document.
  assert.equal(occurrences(cahiers, `<span>${documentLabel}</span>`), 0);
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

test('sans activité, la zone oriente vers le tableau, sans bouton de création', () => {
  const view = readFileSync('src/features/evaluations/DevoirsView.tsx', 'utf8') + readFileSync('src/features/evaluations/components/ActivitiesEmptyState.tsx', 'utf8');
  // Plus de bouton « + » : la modale capture et affiche, elle ne crée plus.
  assert.match(view, /<ActivitiesEmptyState \/>/);
  assert.doesNotMatch(view, /onCreate=\{\(\) => openKindChooser/, 'plus de porte de création ici');
  assert.match(view, /onCreate\?/, 'l’action de création est facultative, jamais imposée');
  assert.doesNotMatch(view, /activeTab/, 'plus aucun onglet de filtrage');
  assert.match(view, /SchedulePlanningIllustration size=\{120\}/);
  assert.match(view, /evaluations\.activitiesEmptyTitle/);
  assert.match(view, /evaluations\.activitiesEmptyHint/);
});

test('une icône et une teinte par nature, aucune couleur inventée', () => {
  const view = readFileSync('src/features/evaluations/DevoirsView.tsx', 'utf8') + readFileSync('src/features/evaluations/components/PedagogicalEventsSection.tsx', 'utf8');
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

test('trois fonctions, trois pictogrammes : document, élèves, corbeille — les mêmes pour toutes les natures', () => {
  const icon = readFileSync('src/features/evaluations/components/ActionIcon.tsx', 'utf8');
  assert.match(icon, /const ICONS = \{ document: FileText, students: Users, absents: UserX, deadline: CalendarCheck \} as const;/);
  for (const path of ['src/features/evaluations/DevoirsView.tsx', 'src/features/evaluations/components/PedagogicalEventsSection.tsx']) {
    const source = readFileSync(path, 'utf8');
    assert.match(source, /<ActionIcon name="document" \/>/, `${path} : un seul pictogramme de document`);
    assert.match(source, /<ActionIcon name="students" \/>/, `${path} : un seul pictogramme d’élèves`);
    assert.doesNotMatch(source, /Mic|Presentation|ClipboardCheck|BookOpen|FileCheck|FilePlus/, `${path} : plus de pictogramme propre à une nature`);
    assert.match(source, /<AnimatedTrashButton/, `${path} : la même corbeille`);
  }
});
// ── Devoir maison : DEUX entrées, et deux seulement ───────────────────────────
test('un devoir maison s’affiche en deux entrées : assigné aux élèves, puis sa correction', () => {
  const view = readFileSync('src/features/evaluations/DevoirsView.tsx', 'utf8');
  const split = view.indexOf('const correctionRow = (');
  assert.ok(split > 0, 'la correction est une entrée à part');
  const assigned = view.slice(view.indexOf('const assignedRow = ('), split);
  const correction = view.slice(split, view.indexOf('return <React.Fragment key={a.id}>'));
  // Assigné aux élèves : document · date limite · corbeille — ni absents, ni remises.
  assert.match(assigned, /<ActionIcon name="document" \/>/);
  assert.match(assigned, /field: 'due'/, 'le bouton de la date limite');
  assert.match(assigned, /<ActionIcon name="deadline" \/>/);
  assert.match(assigned, /<AnimatedTrashButton/);
  assert.match(assigned, /kindPolicy\.absences && a\.type !== 'maison'/, 'jamais d’absents sur un devoir maison');
  assert.match(assigned, /kindPolicy\.students && a\.type !== 'maison'/, 'le bouton d’élèves des autres devoirs ne s’applique pas');
  assert.doesNotMatch(assigned, /evaluations\.action\.submissions/, 'plus de bouton « Remises » sur le devoir');
  // Correction : document (corrigé) · élèves non rendus · corbeille.
  assert.match(correction, /evaluations\.action\.correctionContent/, "le libellé du corrigé");
  assert.match(correction, /evaluations\.action\.notReturned/, "les élèves qui n’ont pas rendu");
  assert.match(correction, /setSubmissionsFor\(link\)/);
  assert.match(correction, /field: 'correction'/, "sa date est la séance de correction");
  assert.match(correction, /setDeletingCorrection\(link\)/, "sa corbeille supprime la correction seule");
  assert.equal((correction.match(/<AnimatedTrashButton/g) ?? []).length, 1);
  assert.doesNotMatch(correction, /evaluations\.action\.absent|evaluations\.action\.dueDate/, "ni absents, ni date limite");
});
test('un titre généré se dit dans la langue de l’écran, sans pastille ni remarque en doublon', () => {
  // Titre enregistré en français dans un cahier lu en arabe : « تقويم تشخيصي 1 », à la place de « Évaluation diagnostique1 ».
  const stored = event('d1', 'evaluation_diagnostic', 'Évaluation diagnostique1', '2026-09-14', { note: 'غياب معظم التلاميذ' });
  const ar = renderSheet([stored], 'ar');
  assert.match(ar, /dir="auto">تقويم تشخيصي 1<\/h4>/, 'titre localisé, numéro conservé');
  assert.doesNotMatch(ar, /Évaluation diagnostique/, 'aucune seconde langue sur la ligne');
  assert.doesNotMatch(ar, /class="tone-chip"/, 'la pastille de nature ne répète pas le titre');
  assert.doesNotMatch(ar, /غياب معظم التلاميذ/, 'la remarque du cahier reste dans l’éditeur');
  // En français, l’espace manquant est rétabli ; la remarque n’y paraît pas non plus.
  const fr = renderSheet([event('d2', 'evaluation_diagnostic', 'Évaluation diagnostique1', '2026-09-14', { note: 'Absences nombreuses' })]);
  assert.match(fr, /dir="auto">Évaluation diagnostique 1<\/h4>/);
  assert.doesNotMatch(fr, /Absences nombreuses/);
  // Un titre écrit par le professeur n’est jamais touché, et garde sa pastille de nature.
  const own = renderSheet([event('o1', 'olympiade', 'Olympiade de mathématiques', '2026-09-14')]);
  assert.match(own, />Olympiade de mathématiques<\/h4>/);
  assert.match(own, /class="tone-chip">Olympiade</);
});

test('sans date, la ligne le dit simplement : rien à cliquer, la date vient du tableau de l’éditeur', () => {
  const undated = renderSheet([event('u1', 'olympiade', 'Olympiade', '')]);
  assert.match(undated, /<span class="ev-date-empty">Pas encore de date<\/span>/);
  assert.doesNotMatch(undated, /ev-date-trigger/, 'aucun bouton de date sans date');
  assert.doesNotMatch(undated, /Définir une date/, 'plus de « + Définir une date »');
  const arabic = renderSheet([event('u2', 'olympiade', 'أولمبياد', '')], 'ar');
  assert.match(arabic, /<span class="ev-date-empty">لا يوجد تاريخ بعد<\/span>/);
  const dated = renderSheet([event('u3', 'olympiade', 'Olympiade', '2026-09-14')]);
  assert.match(dated, /class="ev-date-trigger[^"]*"/, 'une date posée reste modifiable');
  assert.doesNotMatch(dated, /ev-date-empty/);
});

test('le jour de la date limite, le bouton pulse avec l’effet existant ; avant et après, il reste calme', () => {
  const today = todayInMorocco(new Date(), getBundledCalendar());
  const day = (offset: number) => new Date(Date.parse(`${today}T12:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);
  const render = (due: string) => renderToStaticMarkup(React.createElement(LocaleProvider, { locale: 'fr', children:
    React.createElement(DevoirsView, { classInfo, onConfigChange: () => {}, onLessonsChange: () => {},
      lessonsData: [{ type: 'devoir_maison', title: 'Devoir à la maison 1', sections: [] }] as never, config: {
      manualAssessments: { c1: [{ id: 'maison-1-custom', schoolYear: '2026-2027', type: 'maison', num: 1, semestre: 1, dateISO: day(-3), dueDateISO: due }] },
    } as unknown as AppConfig }) }));
  const dueToday = render(today);
  assert.match(dueToday, /class="ev-action shrink-0 glow-pulse-warning"[^>]*data-due="today"/, 'halo ambré le jour même');
  assert.match(dueToday, /À rendre aujourd’hui/, 'la ligne le dit aussi');
  for (const offset of [-1, 1]) {
    const other = render(day(offset));
    assert.doesNotMatch(other, /glow-pulse-warning|data-due=/, `${offset > 0 ? 'avant' : 'après'} : aucun halo`);
  }
});

test('le halo d’échéance réutilise l’animation des commandes à ne pas manquer et respecte la réduction des mouvements', () => {
  const css = readFileSync('src/components/ui/modal-motion.css', 'utf8');
  assert.match(css, /\.glow-pulse-warning \{[^}]*animation: modal-glow-pulse/, 'même animation que glow-pulse-danger / primary');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.glow-pulse-warning[\s\S]*animation: none/);
});

test('la fenêtre du rendu se dit « Rendu du devoir », sans la phrase « élèves n’ayant pas rendu »', () => {
  assert.equal(translateLocaleMessage('fr', 'evaluations.homework.notReturnedTitle'), 'Rendu du devoir');
  assert.equal(translateLocaleMessage('en', 'evaluations.homework.notReturnedTitle'), 'Homework hand-in');
  assert.equal(translateLocaleMessage('ar', 'evaluations.homework.notReturnedTitle'), 'تسليم الفرض');
  for (const locale of ['fr', 'en', 'ar'] as const) {
    for (const key of ['evaluations.homework.notReturnedTitle', 'evaluations.tip.notReturned', 'evaluations.deleteCorrectionDescription']) {
      assert.doesNotMatch(translateLocaleMessage(locale, key), /n’ayant pas rendu|n’ont pas rendu|did not hand in|لم يسلّموا/, `${locale}/${key}`);
    }
  }
});
