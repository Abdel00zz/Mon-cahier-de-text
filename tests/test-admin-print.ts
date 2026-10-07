import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MathText } from '../src/components/ui/math-text';
import { MathTitle } from '../src/components/ui/math-title';
import {
  countExpectedSessions,
  listExpectedSessionDates,
  type HolidayCalendar,
} from '../src/domain/calendar/calendar';
import { analyseSessionProgression, snapshotSlots } from '../src/domain/notebook/sessionProgression';
import type { ClassSnapshot, LessonsData, ScheduleSlot } from '../src/types';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const sourceOf = (path: string) => read(path);

/* ── Le calendrier de référence : année 2026-2027, sans férié ni vacance ──── */
const schoolCalendar: HolidayCalendar = {
  version: 1,
  pays: 'MA',
  fuseau: 'Africa/Casablanca',
  anneeScolaire: { libelle: '2026-2027', debut: '2026-09-07', fin: '2027-07-03' },
  joursFeries: [],
  vacances: [],
};

/* ══════════════════════════════════════════════════════════════════════════
   1. Séances attendues : la règle métier, pas le calendrier civil
   ══════════════════════════════════════════════════════════════════════════ */

test('les séances attendues suivent les créneaux du professeur', () => {
  const slots: ScheduleSlot[] = [{ weekday: 1 }, { weekday: 2 }];
  assert.deepEqual(listExpectedSessionDates('2026-09-07', '2026-09-20', slots, schoolCalendar), [
    '2026-09-07',
    '2026-09-08',
    '2026-09-14',
    '2026-09-15',
  ]);
  // le compte, lui, additionne les séances doubles
  assert.equal(countExpectedSessions('2026-09-07', '2026-09-20', slots, schoolCalendar), 4);
});

test('une journée de classe n’apparaît qu’une fois, même avec des séances doubles', () => {
  const slots: ScheduleSlot[] = [{ weekday: 1, sessions: 2 }];
  assert.deepEqual(listExpectedSessionDates('2026-09-07', '2026-09-14', slots, schoolCalendar), [
    '2026-09-07',
    '2026-09-14',
  ]);
  assert.equal(countExpectedSessions('2026-09-07', '2026-09-14', slots, schoolCalendar), 4);
});

test('fériés, vacances et dimanche sont exclus des attentes', () => {
  const calendar: HolidayCalendar = {
    ...schoolCalendar,
    joursFeries: [{ date: '2026-09-14', nom: 'Fête test', type: 'national' }],
    vacances: [{ nom: 'Vacances test', debut: '2026-09-21', fin: '2026-09-27' }],
  };
  assert.deepEqual(listExpectedSessionDates('2026-09-07', '2026-09-27', [{ weekday: 1 }], calendar), ['2026-09-07']);
  // un créneau qui tombe un dimanche ne crée aucune attente fantôme
  assert.deepEqual(listExpectedSessionDates('2026-09-07', '2026-09-20', [{ weekday: 0 }], calendar), []);
  assert.deepEqual(listExpectedSessionDates('2026-09-07', '2026-09-20', [], calendar), []);
});

/* ══════════════════════════════════════════════════════════════════════════
   2. Progression d'un cahier : écart réel, jamais fictif
   ══════════════════════════════════════════════════════════════════════════ */

const notebook: LessonsData = [
  {
    type: 'chapter',
    title: 'Chapitre 1',
    items: [
      { type: 'définition', title: 'Continuité', description: 'Définition 1', date: '2026-09-07' },
      { type: 'exercice', title: 'Application 1', description: 'Exercice', date: '2026-09-07' },
    ],
  },
  {
    type: 'chapter',
    title: 'Chapitre 2',
    items: [
      { type: 'théorème', title: 'Théorème des valeurs intermédiaires', description: 'TVI', date: '2026-09-14' },
      { type: 'chapitre', title: 'Séance déjà planifiée', items: [
        { type: 'remarque', title: 'À venir', date: '2026-10-05' },
        { type: 'remarque', title: 'Encore à venir', date: '2026-10-05' },
        { type: 'remarque', title: 'Troisième titre', date: '2026-10-05' },
        { type: 'remarque', title: 'Quatrième titre', date: '2026-10-05' },
      ] },
    ],
  },
] as unknown as LessonsData;

test('l’écart ne compte que les séances échues : une séance future ne compense pas un retard', () => {
  const report = analyseSessionProgression(notebook, [{ weekday: 1 }], '2026-09-21', schoolCalendar);
  assert.equal(report.expectedSessions, 3, 'lundis 07, 14 et 21 septembre');
  assert.equal(report.actualSessions, 2, 'séances des 07 et 14 septembre uniquement');
  assert.equal(report.gap, 1);
  assert.deepEqual(report.missing, ['2026-09-21']);
  // l'invariant qui rassure la direction : le nombre de journées citées est
  // exactement l'écart affiché.
  assert.equal(report.missing.length, report.gap);
  assert.equal(report.coverage, 67);
  assert.equal(report.firstDate, '2026-09-07');
  assert.equal(report.lastDate, '2026-10-05');
  assert.equal(report.averageItems, 1.5, '3 contenus datés échus pour 2 séances');
});

test('chaque séance porte sa date, son volume et au plus trois intitulés', () => {
  const report = analyseSessionProgression(notebook, [{ weekday: 1 }], '2026-09-21', schoolCalendar);
  assert.deepEqual(report.sessions.map(session => session.date), ['2026-09-07', '2026-09-14', '2026-10-05']);
  assert.equal(report.sessions[0].items, 2);
  assert.deepEqual(report.sessions[0].titles, ['Continuité', 'Application 1']);
  assert.equal(report.sessions[2].items, 4);
  assert.equal(report.sessions[2].titles.length, 3, 'liste bornée pour rester lisible');
});

test('sans emploi du temps, aucune attente n’est inventée', () => {
  const report = analyseSessionProgression(notebook, [], '2026-09-21', schoolCalendar);
  assert.equal(report.expectedSessions, 0);
  assert.equal(report.gap, 0);
  assert.deepEqual(report.missing, []);
  assert.equal(report.coverage, 0, 'aucun pourcentage trompeur');
  const empty = analyseSessionProgression([], [{ weekday: 1 }], '2026-09-21', schoolCalendar);
  assert.equal(empty.actualSessions, 0);
  assert.equal(empty.averageItems, 0, 'aucune division par zéro');
  assert.equal(empty.firstDate, null);
});

test('les créneaux viennent de la projection fidèle, sinon des jours seuls', () => {
  const withSlots = { weekdays: [1], scheduleSlots: [{ weekday: 1, sessions: 2 }] } as ClassSnapshot;
  assert.deepEqual(snapshotSlots(withSlots), [{ weekday: 1, sessions: 2 }]);
  const legacy = { weekdays: [1, 3] } as ClassSnapshot;
  assert.deepEqual(snapshotSlots(legacy), [{ weekday: 1 }, { weekday: 3 }]);
  assert.deepEqual(snapshotSlots(null), []);
});

/* ══════════════════════════════════════════════════════════════════════════
   3. Modale d'impression : la variante « direction » reste honnête
   ══════════════════════════════════════════════════════════════════════════ */

const printModal = sourceOf('src/features/editor/modals/PrintModal.tsx');

test('la modale n’annonce « nouveautés » que si l’historique est consultable', () => {
  assert.match(printModal, /historyKnown\?: boolean;/, 'option explicite');
  assert.match(printModal, /historyKnown = true,/, 'comportement enseignant inchangé par défaut');
  assert.match(
    printModal,
    /const recommendNew = historyKnown && hasHistory && newDates\.length > 0;/,
    'aucune recommandation fondée sur un historique inconnu',
  );
  assert.match(printModal, /\.\.\.\(historyKnown \? \[\{/, 'le mode « nouveautés » disparaît quand l’historique est inconnu');
  assert.match(printModal, /\$\{historyKnown \? 'grid-cols-3' : 'grid-cols-2'\}/, 'deux modes au lieu de trois');
  assert.match(printModal, /\{!historyKnown \? \(/, 'état d’impression dédié');
  assert.match(printModal, /\{historyKnown && \(/, 'aucune pastille « déjà imprimée » inventée');
  assert.match(printModal, /t\('print\.historyUnavailable'\)/, 'explication affichée à la direction');
});

test('l’explication de l’historique manquant existe dans les trois langues', () => {
  const messages = sourceOf('src/i18n/messages.ts');
  const occurrences = messages.match(/'print\.historyUnavailable'/g) ?? [];
  assert.equal(occurrences.length, 3, 'fr, en et ar');
});

/* ══════════════════════════════════════════════════════════════════════════
   4. Fiche professeur : la MÊME impression que l'enseignant
   ══════════════════════════════════════════════════════════════════════════ */

const teacherDetail = sourceOf('src/admin/components/TeacherDetail.tsx');

test('la direction ouvre la modale d’impression de l’enseignant, pas une copie', () => {
  assert.match(
    teacherDetail,
    /import \{ PrintModal, type PrintMode, type PrintOptions \} from '\.\.\/\.\.\/features\/editor\/modals\/PrintModal';/,
    'même composant que l’éditeur',
  );
  assert.match(teacherDetail, /<PrintModal/, 'la modale est bien montée');
  assert.match(teacherDetail, /historyKnown=\{false\}/, 'historique non consultable assumé');
  assert.match(teacherDetail, /newDates=\{printDates\}/, 'aucune séance annoncée comme déjà tirée');
  assert.match(teacherDetail, /printedDates=\{\[\]\}/);
  assert.match(teacherDetail, /lastPrintedAt=\{null\}/);
  assert.doesNotMatch(teacherDetail, /printRequest/, 'l’ancien circuit parallèle a disparu');
  assert.doesNotMatch(teacherDetail, /window\.setTimeout\(async \(\) => \{/, 'plus d’impression à l’aveugle sur minuterie');
});

test('le document est figé, composé, puis imprimé par le circuit de l’éditeur', () => {
  const start = teacherDetail.indexOf('const handleExecutePrint');
  const execute = teacherDetail.slice(start, teacherDetail.indexOf('useEffect(', start));
  assert.ok(execute.length > 400, 'bloc d’exécution trouvé');
  assert.match(execute, /createPrintSelection\(target\.lessonsData, chosen, true\)/, 'numérotation figée avant filtrage');
  assert.match(execute, /flushSync\(\(\) => \{/, 'le document est figé avant la composition');
  assert.ok(
    execute.indexOf('preparePrintContent(root)') < execute.indexOf("printDocument('cahier-de-textes')"),
    'composition (polices, formules, images) avant le dialogue d’impression',
  );
  assert.match(execute, /\.print-document\.print-only/, 'même surface A4 que l’éditeur');
  assert.match(execute, /'confirmation-required'/, 'réponse honnête quand le navigateur ne confirme pas');
  assert.match(teacherDetail, /\{\.\.\.printSnapshot\.options\}/, 'les réglages choisis s’appliquent au document');
  assert.match(teacherDetail, /document\.body/, 'surface d’impression montée hors de l’échafaudage admin');
  assert.match(teacherDetail, /createPortal/, 'portail React');
});

test('seul le document A4 part à l’imprimante depuis l’administration', () => {
  const printCss = sourceOf('src/features/editor/print.css');
  assert.match(
    printCss,
    /body:has\(> \.print-document\.print-only\) > \*:not\(\.print-document\) \{ display: none !important; \}/,
    'l’écran d’administration reste à l’écran',
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   5. Progression : calcul dans le domaine, rendu dans l'admin
   ══════════════════════════════════════════════════════════════════════════ */

test('le panneau de progression s’appuie sur le domaine et ne charge qu’à la demande', () => {
  const progression = sourceOf('src/admin/components/ClassProgression.tsx');
  assert.match(progression, /analyseSessionProgression, snapshotSlots/, 'calcul délégué au domaine');
  assert.match(progression, /const report = useMemo\(/, 'calcul mémoïsé');
  assert.doesNotMatch(progression, /buildLessonRows\(/, 'pas de seconde analyse dans le composant');
  assert.match(progression, /if \(!next \|\| lessons !== null \|\| loading\) return;/, 'le cahier n’est chargé qu’à l’ouverture');
  assert.match(progression, /Journées de classe sans trace/, 'les trous sont nommés');
  assert.match(progression, /Sérénité pédagogique\./, 'état vide valorisé');
});

test('les encarts de dates du calendrier n’ont plus de filet vertical', () => {
  const calendar = sourceOf('src/features/dashboard/NotificationCalendar.tsx');
  assert.doesNotMatch(calendar, /absolute inset-y-4 start-2 w-1/, 'filet vertical supprimé');
  assert.match(calendar, /calendar-day-card flex items-start gap-3 p-3\.5/, 'encart retravaillé');
  assert.match(calendar, /calendar-day-card__title/, 'titre en sérif éditoriale');
  assert.match(calendar, /import '\.\/calendarDayCard\.css';/, 'styles dédiés chargés');
});

test('les icônes du calendrier sont celles de la navigation', () => {
  const calendar = sourceOf('src/features/dashboard/NotificationCalendar.tsx');
  // chapitre → cahier, évaluation → onglet Évaluations, absence → réglages Absences,
  // emploi du temps → carte Emploi du temps, férié → école fermée.
  assert.match(calendar, /if \(event\.kind === 'lesson'\) return BookOpen;/);
  assert.match(calendar, /if \(event\.kind === 'assessment'\) return CalendarCheck;/);
  assert.match(calendar, /if \(event\.kind === 'pedagogical'\) return ListChecks;/);
  assert.match(calendar, /if \(event\.kind === 'official'\) return CalendarRange;/);
  assert.match(calendar, /if \(event\.kind === 'holiday'\) return CalendarX;/);
  assert.match(calendar, /if \(event\.kind === 'vacation'\) return CalendarDays;/);
  assert.match(calendar, /return FileSignature;/, 'absence justifiée = icône des certificats');
  assert.doesNotMatch(calendar, /return Clock;/, 'l’ancienne icône horloge ne sert plus de repère de date');
});

test('l’encart de date assume le langage visuel du thème', () => {
  const css = sourceOf('src/features/dashboard/calendarDayCard.css');
  assert.match(css, /\.calendar-day-card \{/, 'encart');
  assert.doesNotMatch(css, /border-(inline-)?(left|right|start|end)/, 'aucun filet vertical');
  assert.match(css, /font-family: var\(--font-display\)/, 'sérif éditoriale');
  assert.match(css, /html\[lang='ar'\] \.calendar-day-card__title/, 'arabe traité à part');
  assert.match(css, /prefers-reduced-motion/, 'animations respectueuses');
});

/* ══════════════════════════════════════════════════════════════════════════
   6. Textes et formules : la direction lit le cahier comme l'enseignant
   ══════════════════════════════════════════════════════════════════════════ */

const progressionPanel = sourceOf('src/admin/components/ClassProgression.tsx');

const katexCount = (html: string) => (html.match(/class="katex/g) ?? []).length;

test('MathText et MathTitle composent réellement les formules, sans LaTeX résiduel', () => {
  const titles = 'Continuité $\\lim_{x\\to a} f(x)=f(a)$ · Dérivée $f(x)=\\frac{x^2+1}{x+1}$';
  const session = renderToStaticMarkup(
    React.createElement(MathText, { source: titles }, titles)
  );
  const chapter = renderToStaticMarkup(React.createElement(MathTitle, { text: 'Suites $u_{n+1}=f(u_n)$' }));
  const description = renderToStaticMarkup(
    React.createElement(MathText, { source: 'Calculer $\\int_0^1 f(x)\\,\\mathrm{d}x$' }, 'Calculer $\\int_0^1 f(x)\\,\\mathrm{d}x$')
  );
  const plain = renderToStaticMarkup(React.createElement(MathText, { source: 'Aucune formule ici' }, 'Aucune formule ici'));

  assert.ok(katexCount(session) >= 2, 'les deux formules de la ligne de séance sont composées');
  assert.ok(!session.includes('$'), 'aucun délimiteur LaTeX ne reste visible');
  assert.ok(katexCount(chapter) >= 1, 'titre de chapitre composé');
  assert.ok(katexCount(description) >= 1, 'description composée');
  assert.equal(katexCount(plain), 0, 'un texte sans formule reste du texte');
  assert.equal(plain, 'Aucune formule ici');
});

test('la fiche direction compose les titres, descriptions et séances en KaTeX', () => {
  assert.match(teacherDetail, /import \{ MathText \} from '\.\.\/\.\.\/components\/ui\/math-text';/);
  assert.match(teacherDetail, /import \{ MathTitle \} from '\.\.\/\.\.\/components\/ui\/math-title';/);
  // chapitre, élément et dernière séance inspectés dans la fiche
  assert.match(teacherDetail, /<MathTitle text=\{ch\.title\} \/>/, 'titre de chapitre');
  assert.match(teacherDetail, /<MathText source=\{item\.title\}>/, 'titre d’élément');
  assert.match(teacherDetail, /<MathText source=\{item\.description\}>/, 'description d’élément');
  // et la progression, dont les intitulés portent aussi des formules
  assert.match(progressionPanel, /<MathText source=\{titles\}>\{titles\}<\/MathText>/, 'intitulés de séance');
});

test('la direction décide de la direction d’écriture par le contenu, pas par la langue de l’interface', () => {
  // L'admin est en français, mais les cahiers peuvent être arabes : chaque
  // texte porte son propre `dir`, décidé par son premier caractère fort.
  assert.match(progressionPanel, /dir=\{textDirectionAttribute\(titles\)\}/);
  assert.match(teacherDetail, /dir=\{textDirectionAttribute\(item\.title\)\}/);
  assert.match(teacherDetail, /dir=\{textDirectionAttribute\(item\.description\)\}/);
});


test('admin print preserves independent absence dates and freezes the selected scope', () => {
  assert.match(teacherDetail, /buildAbsenceSessions\(config, cls.id, lessonsData\)/);
  assert.match(teacherDetail, /collectSessionDates\(printTarget.lessonsData, printTarget.absenceSessions\)/);
  assert.match(teacherDetail, /absenceSessions.filter\(session => chosen.includes\(session.date\)\)/);
  assert.match(teacherDetail, /config=\{printSnapshot.config\}/);
  assert.match(teacherDetail, /absenceSessions=\{printSnapshot.absenceSessions\}/);
  const api = sourceOf('api/admin.ts');
  for (const field of ['absences', 'timetable']) assert.ok(api.includes(`${field}: settings.${field}`));
});
