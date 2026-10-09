import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '../src/i18n/LocaleProvider';
import { ContentRenderer } from '../src/features/editor/ContentRenderer';
import type { LessonsData, TopLevelItem, PedagogicalEvent, AppConfig } from '../src/types';
import {
  placeBlockChronologically,
  syncEventToNotebook,
  syncAssessmentDateToNotebook,
  syncNotebookSessionToEvaluations,
  formatPedagogicalDateCell,
  extractEarliestDate,
} from '../src/domain/evaluations/notebookSyncBridge';
import type { NotebookDocumentPreview } from '../src/domain/evaluations/assessmentSync';

test('placement chronologique intelligent des blocs dans le tableau', () => {
  const initialLessons: LessonsData = [
    {
      type: 'chapter',
      title: 'Chapitre 1 : Nombres réels',
      date: '2026-09-20',
      sections: [],
      items: [],
      _tempId: 'c1',
    },
    {
      type: 'chapter',
      title: 'Chapitre 2 : Fonctions',
      date: '2026-10-15',
      sections: [],
      items: [],
      _tempId: 'c2',
    },
  ];

  // 1. Ajouter une évaluation diagnostique datée du 10 septembre (antérieure au chapitre 1)
  const diag: TopLevelItem = {
    type: 'evaluation_diagnostic',
    title: 'Évaluation diagnostique',
    date: '2026-09-10',
    sections: [],
    items: [],
    _tempId: 'diag-1',
  };

  const { lessons: withDiag, index: diagIndex } = placeBlockChronologically(initialLessons, diag);
  assert.equal(diagIndex, 0, 'L’évaluation diagnostique se place au tout début');
  assert.equal(withDiag[0].type, 'evaluation_diagnostic');
  assert.equal(withDiag[1].title, 'Chapitre 1 : Nombres réels');

  // 2. Ajouter un contrôle continu daté du 5 octobre (entre le chapitre 1 et le chapitre 2)
  const cc: TopLevelItem = {
    type: 'controle_continu',
    title: 'Contrôle continu 1',
    date: '2026-10-05',
    sections: [],
    items: [],
    _tempId: 'cc-1',
  };

  const { lessons: withCC, index: ccIndex } = placeBlockChronologically(withDiag, cc);
  assert.equal(ccIndex, 2, 'Le contrôle se place entre Chapitre 1 et Chapitre 2');
  assert.equal(withCC[1].title, 'Chapitre 1 : Nombres réels');
  assert.equal(withCC[2].title, 'Contrôle continu 1');
  assert.equal(withCC[3].title, 'Chapitre 2 : Fonctions');

  // 3. Cahier avec uniquement des chapitres non datés : l'évaluation diagnostique se pose en tête (index 0)
  const undatedLessons: LessonsData = [
    { type: 'chapter', title: 'Chapitre non daté 1', sections: [], items: [] },
    { type: 'chapter', title: 'Chapitre non daté 2', sections: [], items: [] },
  ];
  const { lessons: withDiagAtStart, index: startIdx } = placeBlockChronologically(undatedLessons, diag);
  assert.equal(startIdx, 0, 'L’évaluation diagnostique se place au début même face à des chapitres non datés');
  assert.equal(withDiagAtStart[0].type, 'evaluation_diagnostic');
  assert.equal(withDiagAtStart[1].title, 'Chapitre non daté 1');
});

test('synchronisation d’une évaluation diagnostique avec plage de dates XX à YY vers le cahier', () => {
  const initialLessons: LessonsData = [
    {
      type: 'chapter',
      title: 'Chapitre 1',
      date: '2026-09-25',
      sections: [],
      items: [],
    },
  ];

  const event: PedagogicalEvent = {
    id: 'evt-diag-1',
    type: 'evaluation_diagnostic',
    title: 'التقويم التشخيصي والدعم الاستدراكي',
    date: '2026-09-08',
    endDate: '2026-09-15',
    note: 'تمرير روائز التقويم والدعم',
    status: 'planned',
    createdAt: '2026-09-01T08:00:00.000Z',
  };

  const { lessons, updated } = syncEventToNotebook(initialLessons, event, 'ar');
  assert.equal(updated, true);
  assert.equal(lessons.length, 2);
  assert.equal(lessons[0].type, 'evaluation_diagnostic');
  assert.equal(lessons[0].date, 'من 2026-09-08 إلى 2026-09-15', 'La plage est dans la cellule date avec connecteur convenable');
  assert.equal(lessons[0].remark, 'تمرير روائز التقويم والدعم', 'La remarque ne porte plus la date et garde la note de l’enseignant');

  // Test de deux jours consécutifs : utilisation du connecteur 'et' en français et 'و' en arabe
  const twoDaysEvent: PedagogicalEvent = {
    id: 'evt-2days',
    type: 'evaluation_diagnostic',
    title: 'Évaluation diagnostique',
    date: '2026-09-08',
    endDate: '2026-09-09',
    note: 'Passation des tests',
    status: 'planned',
    createdAt: '2026-09-01T08:00:00.000Z',
  };
  const { lessons: lessonsFr } = syncEventToNotebook(initialLessons, twoDaysEvent, 'fr');
  assert.equal(lessonsFr[0].date, '2026-09-08 et 2026-09-09', 'Deux jours utilisent le connecteur "et"');
  assert.equal(lessonsFr[0].remark, 'Passation des tests', 'La remarque reste pure');
});

test('synchronisation inverse : une séance modifiée dans le tableau met à jour les évaluations', () => {
  const config: AppConfig = {
    theme: 'light',
    appTextSize: 'md',
    applicationLocale: 'fr',
    pedagogicalEvents: {
      'class-1': [
        {
          id: 'diag-1',
          type: 'evaluation_diagnostic',
          title: 'Évaluation diagnostique',
          date: '2026-09-10',
          status: 'planned',
          createdAt: '2026-09-01T08:00:00.000Z',
        },
      ],
    },
    assessmentDates: {},
  };

  const lessons: LessonsData = [
    {
      type: 'evaluation_diagnostic',
      title: 'Évaluation diagnostique',
      date: '2026-09-12',
      sections: [],
      items: [],
    },
  ];

  const { patch, updated } = syncNotebookSessionToEvaluations('class-1', config, lessons[0], lessons);
  assert.equal(updated, true);
  assert.equal(patch.pedagogicalEvents?.['class-1']?.[0].date, '2026-09-12', 'La date de l’activité a suivi le tableau');
});

test('titre cliquable en bleu si un contenu/document est associé dans la table', () => {
  const preview: NotebookDocumentPreview = {
    document: { source: '## Sujet du devoir surveillé\nExercice 1...', updatedAt: '2026-10-01T09:00:00.000Z' },
    title: 'Contrôle continu 1',
    assessmentId: 'cc-1',
  };

  let opened = false;
  const markupWithDoc = renderToStaticMarkup(
    React.createElement(LocaleProvider, {
      locale: 'fr',
      children: React.createElement(ContentRenderer, {
        data: { type: 'controle_continu', title: 'Contrôle continu 1' },
        indices: { chapterIndex: 0 },
        elementType: 'controle_continu',
        getDocumentPreview: () => preview,
        onOpenDocumentPreview: () => { opened = true; },
      }),
    })
  );

  assert.match(markupWithDoc, /data-document-title-link="true"/, 'Le titre porte le lien de document cliquable');
  assert.match(markupWithDoc, /data-document-highlight="true"/, 'Le titre porte le highlight moderne');
  assert.match(markupWithDoc, /editor-document-highlight/, 'La classe de style moderne est appliquée');
  assert.doesNotMatch(markupWithDoc, /data-document-chip="true"/, 'Le bouton séparé de document/contenu est éliminé');

  // Sans document
  const markupWithoutDoc = renderToStaticMarkup(
    React.createElement(LocaleProvider, {
      locale: 'fr',
      children: React.createElement(ContentRenderer, {
        data: { type: 'controle_continu', title: 'Contrôle continu 1' },
        indices: { chapterIndex: 0 },
        elementType: 'controle_continu',
        getDocumentPreview: () => undefined,
        onOpenDocumentPreview: () => undefined,
      }),
    })
  );

  assert.doesNotMatch(markupWithoutDoc, /data-document-title-link="true"/);
  assert.doesNotMatch(markupWithoutDoc, /data-document-highlight="true"/);
});

test('formatage de la cellule Date selon les règles pédagogiques (1 jour, 2 jours "et", >2 jours "Du...au")', () => {
  // 1. Date simple
  assert.equal(formatPedagogicalDateCell('2026-09-08', undefined, 'fr'), '2026-09-08');
  assert.equal(formatPedagogicalDateCell('2026-09-08', '2026-09-08', 'fr'), '2026-09-08');

  // 2. Exactement deux jours : connecteur 'et' en français et 'و' en arabe
  assert.equal(formatPedagogicalDateCell('2026-09-08', '2026-09-09', 'fr'), '2026-09-08 et 2026-09-09');
  assert.equal(formatPedagogicalDateCell('2026-09-08', '2026-09-09', 'ar'), '2026-09-08 و 2026-09-09');

  // 3. Plus de deux jours : connecteur 'Du XX au YY' en français et 'من XX إلى YY' en arabe
  assert.equal(formatPedagogicalDateCell('2026-09-08', '2026-09-15', 'fr'), 'Du 2026-09-08 au 2026-09-15');
  assert.equal(formatPedagogicalDateCell('2026-09-08', '2026-09-15', 'ar'), 'من 2026-09-08 إلى 2026-09-15');

  // 4. Extraction de la date de début pour le tri chronologique
  assert.equal(extractEarliestDate('2026-09-08 et 2026-09-09'), '2026-09-08');
  assert.equal(extractEarliestDate('Du 2026-09-08 au 2026-09-15'), '2026-09-08');
  assert.equal(extractEarliestDate('من 2026-09-08 إلى 2026-09-15'), '2026-09-08');
});
