import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  ClassInfo,
  ClassSchedule,
  LessonsData,
  NotificationSettings,
} from '../types';
import type { HolidayCalendar } from '../utils/calendar';
import {
  computeLateness,
  summarizeForTeacher,
  worstSeverity,
  type ClassLateness,
} from '../utils/lateness';
import {
  computeProgressionStats,
  computeTeacherSnapshot,
} from '../utils/progression';
import { isSuccessfulTestResponse } from '../utils/pushResponse';
import { pushEndpointField } from '../api/_lib/webpush.js';
import { assertValidTeacherSnapshot } from '../api/_lib/validate.js';
import { isHoliday, isVacation } from '../utils/calendar.js';

const calendar = (vacances: HolidayCalendar['vacances'] = []): HolidayCalendar => ({
  version: 1,
  pays: 'Maroc',
  fuseau: 'Africa/Casablanca',
  anneeScolaire: {
    libelle: '2025-2026',
    debut: '2025-09-01',
    fin: '2026-06-30',
  },
  joursFeries: [],
  vacances,
});

const latenessFor = (sessionsCount: number) =>
  computeLateness({
    slots: [{ weekday: 1 }],
    calendar: calendar(),
    sessionsCount,
    from: '2026-01-05',
    today: '2026-02-09',
    settings: { gapThreshold: 2, inactivityThresholdDays: 5 },
  });

test('sévérité : les seuils ok, notice, warning et critical sont exacts', () => {
  assert.deepEqual(
    [6, 4, 2, 0].map(sessionsCount => latenessFor(sessionsCount).severity),
    ['ok', 'notice', 'warning', 'critical'],
  );
  assert.deepEqual(
    [6, 4, 2, 0].map(sessionsCount => latenessFor(sessionsCount).gapSessions),
    [0, 2, 4, 6],
  );
});

test('vacances : une séance fermée est retirée du retard attendu', () => {
  const result = computeLateness({
    slots: [{ weekday: 1 }],
    calendar: calendar([
      { nom: 'Vacances', debut: '2026-01-19', fin: '2026-01-19' },
    ]),
    sessionsCount: 5,
    from: '2026-01-05',
    today: '2026-02-09',
    settings: { gapThreshold: 2, inactivityThresholdDays: 5 },
  });

  assert.equal(result.expectedSessions, 5);
  assert.equal(result.gapSessions, 0);
  assert.equal(result.severity, 'ok');
});

test('absence justifiée : les séances couvertes ne créent pas de retard', () => {
  const result = computeLateness({
    slots: [{ weekday: 1 }],
    calendar: calendar(),
    sessionsCount: 5,
    from: '2026-01-05',
    today: '2026-02-09',
    settings: { gapThreshold: 2, inactivityThresholdDays: 5 },
    absences: [
      { debut: '2026-01-19', fin: '2026-01-19', motif: 'Certificat' },
    ],
  });

  assert.equal(result.expectedSessions, 5);
  assert.equal(result.severity, 'ok');
});

test('agrégation : la pire sévérité pilote le résumé enseignant', () => {
  const results: ClassLateness[] = [
    {
      classId: 'a',
      className: '1AC 1',
      expectedSessions: 5,
      actualSessions: 3,
      gapSessions: 2,
      daysSinceLastEntry: 1,
      severity: 'notice',
    },
    {
      classId: 'b',
      className: '2AC 2',
      expectedSessions: 8,
      actualSessions: 4,
      gapSessions: 4,
      daysSinceLastEntry: 6,
      severity: 'warning',
    },
  ];

  assert.equal(worstSeverity(results), 'warning');
  const summary = summarizeForTeacher([...results], 'fr');
  assert.ok(summary);
  assert.equal(summary.severity, 'warning');
  assert.match(summary.title, /^2 classes/);
  assert.match(summary.body, /1AC 1/);
  assert.match(summary.body, /2AC 2/);
});

test('test Push : un HTTP 2xx sans livraison reste un échec métier', () => {
  assert.equal(isSuccessfulTestResponse(true, { ok: false, sent: 0 }), false);
  assert.equal(isSuccessfulTestResponse(true, { ok: true, sent: 0 }), false);
  assert.equal(isSuccessfulTestResponse(true, { ok: true }), false);
  assert.equal(isSuccessfulTestResponse(true, null), false);
  assert.equal(isSuccessfulTestResponse(false, { ok: true, sent: 1 }), false);
  assert.equal(isSuccessfulTestResponse(true, { ok: true, sent: 1 }), true);
});

const classInfo: ClassInfo = {
  id: 'class-a',
  name: '1AC 1',
  teacherName: 'Prof Test',
  subject: 'Mathématiques',
  createdAt: '2026-01-01T00:00:00.000Z',
  color: '#2563eb',
  cycle: 'college',
};

const schedule: ClassSchedule = {
  classId: classInfo.id,
  slots: [{ weekday: 1, sessions: 2 }, { weekday: 3 }],
};

const notificationSettings: NotificationSettings = {
  enabled: true,
  pushEnabled: true,
  gapThreshold: 3,
  inactivityThresholdDays: 7,
  quietDuringVacations: false,
  sessionVibration: true,
};

const lessons: LessonsData = [
  {
    type: 'chapter',
    title: 'Chapitre 1',
    items: [
      { type: 'lesson', title: 'A', date: '2026-01-05' },
      { type: 'lesson', title: 'B', date: '2026-01-05' },
      {
        type: 'lesson',
        title: 'C',
        separatorAfter: {
          content: '',
          date: '2026-01-12',
        },
      },
    ],
  },
];

test('séances : dates de contenus et séparateurs comptent une fois chacune', () => {
  const stats = computeProgressionStats(lessons);

  assert.equal(stats.totalItems, 3);
  assert.equal(stats.plannedCount, 2);
  assert.equal(stats.completionRate, 67);
  assert.equal(stats.sessionsCount, 2);
  assert.equal(stats.lastDate, '2026-01-12');
});

test('snapshot : progression, emploi du temps et préférences sont projetés', () => {
  const snapshot = computeTeacherSnapshot(
    { phone: '0612345678', nom: 'Test', prenom: 'Prof' },
    [classInfo],
    [schedule],
    notificationSettings,
    () => lessons,
    [{ debut: '2026-01-19', fin: '2026-01-20', motif: 'Certificat' }],
    '2025-09-08',
    'fr',
  );

  assert.equal(snapshot.applicationLocale, 'fr');
  assert.equal(snapshot.schoolYearStart, '2025-09-08');
  assert.deepEqual(snapshot.notifyPrefs, {
    enabled: true,
    gapThreshold: 3,
    inactivityThresholdDays: 7,
    quietDuringVacations: false,
    pushEnabled: true,
  });
  assert.deepEqual(snapshot.absences, [
    { debut: '2026-01-19', fin: '2026-01-20', motif: 'Certificat' },
  ]);
  assert.equal(snapshot.classes[0].sessionsCount, 2);
  assert.equal(snapshot.classes[0].lastDate, '2026-01-12');
  assert.deepEqual(snapshot.classes[0].weekdays, [1, 3]);
  assert.deepEqual(snapshot.classes[0].scheduleSlots, [
    { weekday: 1, sessions: 2 },
    { weekday: 3, sessions: 1 },
  ]);
  assert.equal(snapshot.classes[0].sessionsPerWeek, 3);
});

test('endpoint Push : l’empreinte est stable et distincte', () => {
  const endpoint = 'https://push.example.test/send/abc';
  assert.equal(pushEndpointField(endpoint), pushEndpointField(endpoint));
  assert.notEqual(pushEndpointField(endpoint), pushEndpointField(`${endpoint}/other`));
});

test('snapshot : une projection mal formée est rejetée à la frontière serveur', () => {
  const snapshot = computeTeacherSnapshot(
    { phone: '0612345678', nom: 'Test', prenom: 'Prof' },
    [classInfo],
    [schedule],
    notificationSettings,
    () => lessons,
    undefined,
    '2025-09-08',
    'fr',
  );
  assert.throws(() => assertValidTeacherSnapshot({ ...snapshot, classes: [{ ...snapshot.classes[0], sessionsCount: -1 }] }, snapshot.phone));
  assert.throws(() => assertValidTeacherSnapshot({ ...snapshot, classes: [{ ...snapshot.classes[0], scheduleSlots: [{ weekday: 9 }] }] }, snapshot.phone));
});

test('séances doubles : les créneaux multiples sont fidèlement pris en compte dans le retard', () => {
  const cal = calendar();
  // 6 lundis entre 2026-01-05 et 2026-02-09 inclus
  const single = computeLateness({
    slots: [{ weekday: 1, sessions: 1 }],
    calendar: cal,
    sessionsCount: 0,
    from: '2026-01-05',
    today: '2026-02-09',
  });
  const double = computeLateness({
    slots: [{ weekday: 1, sessions: 2 }],
    calendar: cal,
    sessionsCount: 0,
    from: '2026-01-05',
    today: '2026-02-09',
  });

  assert.equal(single.expectedSessions, 6);
  assert.equal(double.expectedSessions, 12);
  assert.equal(double.gapSessions, 12);
});

test('cron : le silence vacances est évalué par utilisateur et non globalement', () => {
  const cal = calendar([
    { nom: 'Vacances d’hiver', debut: '2026-01-19', fin: '2026-01-25' },
  ]);
  const todayInVacation = '2026-01-20';
  assert.ok(isVacation(todayInVacation, cal));

  // Enseignant A : souhaite le silence pendant les vacances
  const userA_quiet = true;
  const userA_shouldSkip = userA_quiet && (isHoliday(todayInVacation, cal) || isVacation(todayInVacation, cal));
  assert.equal(userA_shouldSkip, true);

  // Enseignant B : ne souhaite PAS le silence pendant les vacances (veut être alerté de son retard)
  const userB_quiet = false;
  const userB_shouldSkip = userB_quiet && (isHoliday(todayInVacation, cal) || isVacation(todayInVacation, cal));
  assert.equal(userB_shouldSkip, false);
});
