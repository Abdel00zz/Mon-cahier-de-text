import assert from 'node:assert/strict';
import test from 'node:test';
import type { AppConfig, ClassInfo, LessonsData } from '../src/types';
import { syncNotebookToEvaluations, detectEventsFromRemarks, reconcileClassesEvaluationConfig } from '../src/domain/evaluations/notebookReconciliation';
import { sessionRemarkSettingsPatch } from '../src/domain/evaluations/sessionRemarkChanges';
import { buildSessionRemarkEntries } from '../src/domain/evaluations/sessionActivityRemarks';
import { buildFollowUpDeadlines, deadlineState } from '../src/domain/evaluations/followUpDeadlines';
import { localizedActivityTitle } from '../src/domain/evaluations/activityTitle';
import { touchesImmediateSettings } from '../src/infrastructure/sync/settingsPush';
import { buildLessonRows } from '../src/domain/notebook/lessonRows';

const baseConfig: AppConfig = {
  establishmentName: 'Test School',
  defaultTeacherName: 'Teacher',
  printShowDescriptions: true,
  pedagogicalEvents: {},
};

test('detectEventsFromRemarks detects pedagogical activities across FR, AR, EN', () => {
  const variations = [
    { text: 'Contrôle des cahiers des élèves', type: 'controle_cahiers', title: 'Contrôle des cahiers' },
    { text: 'controle cahiers', type: 'controle_cahiers', title: 'Contrôle des cahiers' },
    { text: 'مراقبة دفاتر التلاميذ', type: 'controle_cahiers', title: 'Contrôle des cahiers' },
    { text: 'Notebook check', type: 'controle_cahiers', title: 'Contrôle des cahiers' },
    { text: 'Remédiation sur les fractions', type: 'remediation', title: 'Remédiation' },
    { text: 'معالجة التعثرات في الهندسة', type: 'remediation', title: 'Remédiation' },
    { text: 'Soutien aux élèves en difficulté', type: 'soutien', title: 'Soutien' },
    { text: 'دعم تربوي', type: 'soutien', title: 'Soutien' },
    { text: 'Rattrapage séance 2', type: 'rattrapage', title: 'Rattrapage' },
    { text: 'حصة استدراك', type: 'rattrapage', title: 'Rattrapage' },
    { text: 'حصّة استدراك', type: 'rattrapage', title: 'Rattrapage' },
    { text: 'make-up session', type: 'rattrapage', title: 'Rattrapage' },
  ];

  for (const v of variations) {
    const lessons: LessonsData = [{
      type: 'chapter',
      title: 'Chapitre 1',
      items: [{ type: 'cours', title: 'Séance', date: '2026-10-15', remark: v.text, _tempId: 'test-row' }],
    }];
    const rows = buildLessonRows(lessons);
    const events = detectEventsFromRemarks(rows[1], 'c1');
    assert.equal(events.length, 1, `Failed to detect activity for "${v.text}"`);
    assert.equal(events[0].type, v.type);
    assert.equal(events[0].title, v.title);
    assert.equal(events[0].date, '2026-10-15');
    assert.equal(events[0].id, `remark-${v.type}-test-row`);
  }
});

test('multiple activities in a single remark generate multiple pedagogical events', () => {
  const lessons: LessonsData = [{
    type: 'chapter',
    title: 'Chapitre 1',
    items: [{
      type: 'cours',
      title: 'Séance double',
      date: '2026-10-20',
      remark: 'Contrôle des cahiers\nSoutien aux élèves',
      _tempId: 'row-multi',
    }],
  }];
  const rows = buildLessonRows(lessons);
  const detected = detectEventsFromRemarks(rows[1], 'c1');
  assert.equal(detected.length, 2);
  assert.deepEqual(detected.map(e => e.type), ['controle_cahiers', 'soutien']);

  const { patch } = syncNotebookToEvaluations('c1', baseConfig, lessons);
  const events = patch.pedagogicalEvents?.c1 ?? [];
  assert.equal(events.length, 2);
  assert.ok(events.some(e => e.type === 'controle_cahiers' && e.date === '2026-10-20'));
  assert.ok(events.some(e => e.type === 'soutien' && e.date === '2026-10-20'));
});

test('removing an activity from remarks automatically removes the synced event from evaluations', () => {
  const initialLessons: LessonsData = [{
    type: 'chapter',
    title: 'Chapitre 1',
    items: [{
      type: 'cours',
      title: 'Séance',
      date: '2026-10-20',
      remark: 'Remédiation',
      _tempId: 'row-rem',
    }],
  }];
  const { patch: patch1 } = syncNotebookToEvaluations('c1', baseConfig, initialLessons);
  const updatedConfig: AppConfig = {
    ...baseConfig,
    pedagogicalEvents: { c1: patch1.pedagogicalEvents!.c1 },
  };
  assert.equal(updatedConfig.pedagogicalEvents!.c1.length, 1);

  // User clears or removes the remark
  const modifiedLessons: LessonsData = [{
    type: 'chapter',
    title: 'Chapitre 1',
    items: [{
      type: 'cours',
      title: 'Séance',
      date: '2026-10-20',
      remark: '',
      _tempId: 'row-rem',
    }],
  }];
  const { patch: patch2 } = syncNotebookToEvaluations('c1', updatedConfig, modifiedLessons, {
    previousLessons: initialLessons,
  });
  assert.deepEqual(patch2.pedagogicalEvents?.c1, [], 'Event should be removed when remark is cleared');
});

test('explicit evaluation blocks are not duplicated by remarks on the same date', () => {
  const lessons: LessonsData = [
    {
      type: 'chapter',
      title: 'Chapitre 1',
      items: [{
        type: 'cours',
        title: 'Séance',
        date: '2026-10-22',
        remark: 'Contrôle des cahiers',
        _tempId: 'course-row',
      }],
    },
    {
      type: 'controle_continu',
      title: 'Contrôle des cahiers',
      date: '2026-10-22',
      _tempId: 'event-explicit-cahiers',
    },
  ];
  // Even if remark mentions it, the explicit block already represents the date
  const { patch } = syncNotebookToEvaluations('c1', baseConfig, lessons);
  const events = patch.pedagogicalEvents?.c1 ?? [];
  const cahierEvents = events.filter(e => e.date === '2026-10-22');
  assert.equal(cahierEvents.length, 1, 'Should not create duplicate event for same date/activity');
});

test('manual events in evaluations tab are preserved when syncing remarks', () => {
  const manualEvent = {
    id: 'manual-event-uuid',
    type: 'soutien' as const,
    title: 'Soutien personnalisé',
    date: '2026-11-01',
    status: 'planned' as const,
    createdAt: '2026-10-01T00:00:00Z',
  };
  const configWithManual: AppConfig = {
    ...baseConfig,
    pedagogicalEvents: { c1: [manualEvent] },
  };

  const lessons: LessonsData = [{
    type: 'chapter',
    title: 'Chapitre 1',
    items: [{
      type: 'cours',
      title: 'Séance',
      date: '2026-10-25',
      remark: 'Rattrapage',
      _tempId: 'row-rattrapage',
    }],
  }];

  const { patch } = syncNotebookToEvaluations('c1', configWithManual, lessons);
  const events = patch.pedagogicalEvents?.c1 ?? [];
  assert.equal(events.length, 2);
  assert.ok(events.some(e => e.id === 'manual-event-uuid'), 'Manual event must be preserved');
  assert.ok(events.some(e => e.id === 'remark-rattrapage-row-rattrapage'), 'Remark event must be added');
});

test('sessionRemarkSettingsPatch immediately materializes Contrôle des cahiers into pedagogicalEvents and FollowUpDeadlines (محطات)', () => {
  const source: LessonsData = [{
    type: 'chapter',
    title: 'Chapitre 1',
    items: [{ type: 'cours', title: 'Séance 1', date: '2026-10-16', _tempId: 'row-cahiers' }],
  }];
  const target = [{ chapterIndex: 0, itemIndex: 0 }];
  const entries = buildSessionRemarkEntries(baseConfig, 'c1', k => k, ', ', source);
  const patch = sessionRemarkSettingsPatch(baseConfig, 'c1', source, target, { remark: 'مراقبة الدفاتر' }, entries);
  assert.equal(patch.pedagogicalEvents?.c1?.length, 1, 'Contrôle des cahiers is immediately created on remark save');
  assert.equal(patch.pedagogicalEvents?.c1?.[0].type, 'controle_cahiers');
  assert.equal(patch.pedagogicalEvents?.c1?.[0].date, '2026-10-16');

  const classInfo = { id: 'c1', name: '1AC 1', subject: 'Mathématiques', cycle: 'college' } as ClassInfo;
  const deadlines = buildFollowUpDeadlines([classInfo], {
    homework: [],
    assessments: [],
    activities: [{ classId: 'c1', event: patch.pedagogicalEvents!.c1![0] }],
    official: [],
  });
  assert.equal(deadlines.length, 1);
  assert.equal(deadlines[0].kind, 'activity');
  assert.equal(localizedActivityTitle(patch.pedagogicalEvents!.c1![0].title, 'controle_cahiers', 'ar'), 'مراقبة دفاتر التلاميذ');
  assert.equal(localizedActivityTitle(patch.pedagogicalEvents!.c1![0].title, 'controle_cahiers', 'fr'), 'Contrôle des cahiers des élèves');

  const completedEvent = {
    ...patch.pedagogicalEvents!.c1![0],
    students: {
      names: ['Amine', 'Salma'],
      notebookConditions: { Amine: 'good' as const, Salma: 'needs_work' as const },
      updatedAt: '2026-10-16T10:00:00Z',
    },
  };
  const completedDeadlines = buildFollowUpDeadlines([classInfo], {
    homework: [],
    assessments: [],
    activities: [{ classId: 'c1', event: completedEvent }],
    official: [],
  });
  assert.equal(deadlineState(completedDeadlines[0], '2026-10-16'), 'complete');
});

test('reconcileClassesEvaluationConfig and touchesImmediateSettings keep cloud and dashboard in sync', () => {
  const lessonsByClass: Record<string, LessonsData> = {
    c1: [{
      type: 'chapter',
      title: 'Chapitre 1',
      items: [{ type: 'cours', title: 'Séance', date: '2026-10-14', remark: 'Contrôle des cahiers', _tempId: 'r1' }],
    }],
  };
  const reconciled = reconcileClassesEvaluationConfig([{ id: 'c1' }], baseConfig, id => lessonsByClass[id] ?? []);
  assert.equal(reconciled.updated, true);
  assert.equal(reconciled.config.pedagogicalEvents?.c1?.[0].type, 'controle_cahiers');
  assert.equal(touchesImmediateSettings(['pedagogicalEvents']), true);
  assert.equal(touchesImmediateSettings(['manualAssessments']), true);
  assert.equal(touchesImmediateSettings(['assessmentParticipants']), true);
});
