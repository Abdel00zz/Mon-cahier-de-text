import assert from 'node:assert/strict';
import test from 'node:test';
import { groupDashboardClasses } from '../src/features/dashboard/dashboardClassGroups';
import { computeClassSessionSchedule, type SessionScheduleStatus } from '../src/domain/calendar/sessionScheduleStatus';
import type { ClassInfo, TimetableEntry } from '../src/types';
import type { HolidayCalendar } from '../src/domain/calendar/calendar';

const calendar: HolidayCalendar = { version: 1, pays: 'MA', fuseau: 'Africa/Casablanca',
  anneeScolaire: { libelle: '2026-2027', debut: '2026-09-07', fin: '2027-07-03' }, vacances: [], joursFeries: [] };
const cls = (id: string): ClassInfo => ({ id, name: id, subject: 'Maths', teacherName: '', color: '', createdAt: '2026-09-07' });
const classes = ['a', 'b', 'c'].map(cls);
function groups(time: string, timetable: TimetableEntry[]) {
  const statuses = new Map(classes.map(c => [c.id, computeClassSessionSchedule(timetable, 0, c.id, {
    calendar, now: new Date(`2026-09-14T${time}+01:00`),
  })]));
  return groupDashboardClasses(classes, statuses, 'fr');
}
test('a finished class moves from Today to Tomorrow exactly at teaching end, without disappearing', () => {
  const timetable = [{day: 1, slot: 0, classId: 'a'}, {day: 2, slot: 0, classId: 'a'}, {day: 1, slot: 2, classId: 'b'}];
  assert.deepEqual(groups('08:54:59', timetable).map(g => [g.key, g.label, g.items.map(i => i.classInfo.id)]), [
    ['now', 'En cours', ['a']], ['day-0', 'Aujourd’hui', ['b']],
    ['other', 'Autres classes', ['c']],
  ]);
  const after = groups('08:55:00', timetable);
  assert.deepEqual(after.map(g => [g.label, g.items.map(i => i.classInfo.id)]), [
    ['Aujourd’hui', ['b']], ['Demain', ['a']], ['Autres classes', ['c']],
  ]);
});
test('a class with another lesson today remains today, including a teaching break', () => {
  const timetable = [{day: 1, slot: 0, classId: 'a'}, {day: 1, slot: 1, classId: 'a'}, {day: 1, slot: 5, classId: 'a'}];
  for (const time of ['08:55:00', '10:00:00', '14:00:00']) {
    const result = groups(time, timetable);
    const classGroup = result.find(group => group.items.some(item => item.classInfo.id === 'a'));
    assert.ok(classGroup);
    assert.ok(['now', 'day-0'].includes(classGroup.key));
  }
});

test('a current session has its own localized Now group, ahead of other days', () => {
  const current: SessionScheduleStatus = { state: 'in_progress', label: '', shortLabel: '', dayOffset: 0 };
  const today: SessionScheduleStatus = { state: 'today_later', label: '', shortLabel: '', dayOffset: 0, startMin: 600 };
  const tomorrow: SessionScheduleStatus = { state: 'upcoming', label: '', shortLabel: '', dayOffset: 1, startMin: 480 };
  const result = groupDashboardClasses(classes, new Map([
    ['a', tomorrow], ['b', current], ['c', today],
  ]), 'ar');

  assert.deepEqual(result.map(group => [group.key, group.label]), [
    ['now', 'الآن'], ['day-0', 'اليوم'], ['day-1', 'غداً'],
  ]);
  assert.deepEqual(result.map(group => group.items.map(item => item.classInfo.id)), [['b'], ['c'], ['a']]);
});
test('weekdays from different weeks never merge; ties retain manual ordering', () => {
  const upcoming = (offset: number, date: string): SessionScheduleStatus => ({state: 'upcoming', label: '', shortLabel: '', dayOffset: offset, date, dayLabel: 'Lundi', startMin: 480});
  const statuses = new Map([['a', upcoming(7, '2026-09-21')], ['b', upcoming(14, '2026-09-28')], ['c', upcoming(7, '2026-09-21')]]);
  const result = groupDashboardClasses([classes[2], classes[1], classes[0]], statuses, 'ar');
  assert.equal(result.length, 2);
  assert.notEqual(result[0].label, result[1].label);
  assert.deepEqual(result[0].items.map(i => i.classInfo.id), ['c', 'a']);
});
test('no future session keeps the class accessible without an empty Today heading', () => {
  const result = groups('23:59:00', []);
  assert.equal(result.length, 1);
  assert.equal(result[0].showTitle, false);
  assert.equal(result[0].items.length, classes.length);
});
