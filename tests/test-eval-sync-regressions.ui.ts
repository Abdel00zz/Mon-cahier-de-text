import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { LocaleProvider } from '../src/i18n/LocaleProvider';
import { DevoirsView } from '../src/features/evaluations/DevoirsView';
import { RemarkCell } from '../src/features/editor/tableRowCells';
import type { AppConfig, ClassInfo, LessonsData } from '../src/types';

const renderFr = (element: React.ReactElement) =>
  renderToStaticMarkup(React.createElement(LocaleProvider, { locale: 'fr', children: element }));

// ── M9 : DevoirsView lit effectiveConfig (ex: date de correction issue du tableau)
test('M9 : DevoirsView affiche la date de correction réconciliée depuis effectiveConfig même avant persistance dans config', () => {
  const classInfo = { id: 'c1', name: '2BAC SM', subject: 'Mathématiques', cycle: 'lycee', level: '2ème Bac' } as ClassInfo;
  const config: AppConfig = {
    establishmentName: 'Lycée',
    defaultTeacherName: 'Prof',
    printShowDescriptions: true,
    manualAssessments: {
      c1: [{
        id: '2026-2027:s1-maison1',
        schoolYear: '2026-2027',
        type: 'maison',
        num: 1,
        dateISO: '2026-10-05',
        semestre: 1,
      }],
    },
    assessmentDates: { c1: { '2026-2027:s1-maison1': '2026-10-05' } },
  };
  const lessonsData: LessonsData = [
    { type: 'chapter', title: 'Ch 1', items: [{ type: 'cours', title: 'L1', date: '2026-10-05' }] },
    { type: 'correction_devoir_maison', title: 'Correction du devoir maison 1', date: '2026-10-20', _tempId: 'corr-1' },
  ];

  const html = renderFr(React.createElement(DevoirsView, {
    classInfo,
    config,
    onConfigChange: () => {},
    lessonsData,
    onLessonsChange: () => {},
  }));

  assert.match(html, /20\/10\/2026/, 'la date de correction calculée dans effectiveConfig doit apparaître dans la ligne correction');
});

// ── M5b : RemarkCell ne duplique pas Contrôle des cahiers quand les états d'élèves enrichissent sessionAnnotation
test('M5b : RemarkCell ne duplique pas le titre Contrôle des cahiers quand sessionAnnotation porte les compteurs', () => {
  const html = renderFr(React.createElement(RemarkCell, {
    value: 'Contrôle des cahiers des élèves\nNote libre',
    sessionAnnotation: 'Contrôle des cahiers des élèves\nBon: 12, Moyen: 3',
    lineClass: '',
    hasAssignedDate: true,
  }));

  const count = html.split('Contrôle des cahiers des élèves').length - 1;
  assert.equal(count, 1, 'le titre « Contrôle des cahiers des élèves » ne doit apparaître qu’une seule fois');
  assert.ok(html.includes('Bon: 12, Moyen: 3'), 'le résumé des états reste visible');
  assert.ok(html.includes('Note libre'), 'la note libre reste visible');
});

// ── M8 : DevoirsView sait supprimer un lien synthétique (épreuve non datée absente de assessments)
test('M8 : deleteAssessment dans DevoirsView résout la cible via links (y compris les épreuves non datées)', () => {
  const view = readFileSync('src/features/evaluations/DevoirsView.tsx', 'utf8');
  assert.doesNotMatch(
    view,
    /const target = assessments\.find\(item => item\.id === id\);/,
    'deleteAssessment ne doit pas se limiter à assessments (sinon les liens synthétiques ne sont jamais supprimés)',
  );
});

// ── m10 : AssignDateModal filtre ses pastilles avec isKindOffered (pas de contrôle des cahiers en Prépa)
test('m10 : AssignDateModal filtre les activités proposées selon le cycle (isKindOffered)', () => {
  const modal = readFileSync('src/features/editor/modals/AssignDateModal.tsx', 'utf8');
  assert.match(modal, /isKindOffered/, 'AssignDateModal doit filtrer ses pastilles via isKindOffered');
});
