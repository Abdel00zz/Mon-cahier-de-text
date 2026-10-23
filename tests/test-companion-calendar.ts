import assert from 'node:assert/strict';
import test from 'node:test';
import type { HolidayCalendar } from '../src/domain/calendar/calendar';
import { getBundledCalendar } from '../src/domain/calendar/calendar';
import { companionCalendarNotice } from '../src/domain/assistant/companionCalendar';
import { companionCalendarMessage } from '../src/features/assistant/companionCalendarCopy';
import { PEDAGOGICAL_TIPS, pedagogicalTipForDay } from '../src/constants/pedagogicalTips';

const calendar: HolidayCalendar = { version: 1, pays: 'MA', fuseau: 'Africa/Casablanca',
  anneeScolaire: { libelle: '2026-2027', debut: '2026-09-07', fin: '2027-07-03' },
  joursFeries: [], vacances: [{ nom: '1re pause interstitielle (الفترة البينية الأولى)', debut: '2026-10-18', fin: '2026-10-25' }] };
const target = { id: 'pc3', name: '2ème Bac Sciences Physiques 3', subject: 'Physique', cycle: 'lycee' as const };
const config = { timetable: [{ day: 1, slot: 0, classId: target.id }] };

test('configured vacation dates produce targeted context and a timetable-based next lesson', () => {
  const notice = companionCalendarNotice(calendar, '2026-10-23', config, target)!;
  assert.equal(notice.kind, 'vacation');
  assert.equal(notice.end, '2026-10-25');
  assert.equal(notice.resumeDate, '2026-10-26');
  assert.equal(companionCalendarNotice(calendar, '2026-10-23', {}, target)?.resumeDate, undefined);
  assert.equal(companionCalendarNotice(calendar, '2026-10-23', { ...config, timetable: [], schedules: [{ classId: target.id, slots: [{ weekday: 2 }] }] }, target)?.resumeDate, undefined,
    'a cleared canonical timetable cannot resurrect old schedule slots');
  assert.equal(companionCalendarNotice(calendar, '2026-10-23', { ...config, absences: [{ debut: '2026-10-26', fin: '2026-10-26' }] }, target)?.resumeDate, '2026-11-02');
  assert.equal(companionCalendarNotice({ ...calendar, vacances: [] }, '2026-10-23', config, target), undefined, 'a calendar update immediately removes stale context');
});

test('overlapping or adjacent closed periods never promise a premature return and retain uncertainty', () => {
  const overlap: HolidayCalendar = { ...calendar,
    vacances: [...calendar.vacances, { nom: 'Aïd (estimé)', debut: '2026-10-24', fin: '2026-10-27' }],
    joursFeries: [{ nom: 'Férié', date: '2026-10-28', type: 'national' }],
  };
  const notice = companionCalendarNotice(overlap, '2026-10-23', { timetable: [{ day: 3, slot: 0, classId: target.id }] }, target)!;
  assert.equal(notice.end, '2026-10-28');
  assert.equal(notice.name, '', 'merged closure is not attributed to one event’s name');
  assert.equal(notice.resumeDate, '2026-11-04');
  assert.equal(notice.approximate, true);
});

test('upcoming holidays, first return days, unknown years and class teaching closure are distinct', () => {
  assert.equal(companionCalendarNotice(calendar, '2026-10-16', config, target)?.kind, 'upcoming');
  assert.equal(companionCalendarNotice(calendar, '2026-10-26', config, target)?.kind, 'return');
  assert.equal(companionCalendarNotice(calendar, '2026-10-27', config, target), undefined);
  assert.equal(companionCalendarNotice(calendar, '2026-10-26', {}, target), undefined, 'no timetable means no verified return');
  assert.equal(companionCalendarNotice(calendar, '2030-01-01', config, target), undefined);
  assert.equal(companionCalendarNotice(calendar, 'not-a-date', config, target), undefined);
  const ended: HolidayCalendar = { ...calendar, vacances: [{ nom: 'Congé', debut: '2027-06-13', fin: '2027-06-20' }] };
  assert.equal(companionCalendarNotice(ended, '2027-06-15', config, target)?.resumeDate, undefined, 'the level’s official teaching end prevents a fictional return');
  const holiday: HolidayCalendar = { ...calendar, joursFeries: [{ nom: 'Aïd al-Mawlid (1er jour)', date: '2026-10-16', type: 'religieux', approximatif: true }] };
  const notice = companionCalendarNotice(holiday, '2026-10-16', {}, target)!;
  assert.equal(notice.kind, 'holiday'); assert.equal(notice.approximate, true);
});

test('calendar phrasing is standalone, localized and cautious about provisional dates', () => {
  const notice = companionCalendarNotice(calendar, '2026-10-23', config, target)!;
  for (const locale of ['ar', 'fr', 'en'] as const) {
    const copy = companionCalendarMessage({ ...notice, approximate: true }, locale, target.name);
    assert.match(copy.id, /^calendar:/);
    assert.equal(copy.action, undefined, 'a holiday notice has no content or sales action');
    assert.ok(copy.detailHighlights?.every(keyword => copy.detail.includes(keyword)));
    assert.doesNotMatch(copy.detail, /\r|\n|هل تعلم|Le saviez-vous|Did you know|WhatsApp|واتساب|تمارين|exercises|exercices/u);
    assert.match(copy.detail, locale === 'ar' ? /تقديري/ : locale === 'en' ? /Indicative/ : /indicative/);
  }
  const arabic = companionCalendarMessage(notice, 'ar', `قسم ${target.name}`);
  assert.ok(arabic.detail.includes('العطلة البينية الأولى'));
  assert.doesNotMatch(arabic.detail, /قسم\s+قسم/u);
  assert.equal(companionCalendarNotice(getBundledCalendar(), '2026-10-23', config, target)?.end, '2026-10-25', 'uses the real configured bulletin dates');
});

test('every calendar topic only highlights text actually shown, without an invented resumption', () => {
  for (const kind of ['vacation', 'holiday', 'upcoming', 'return'] as const) {
    for (const locale of ['ar', 'fr', 'en'] as const) {
      const message = companionCalendarMessage({ kind, name: 'Congé', start: '2026-10-18', end: '2026-10-25', approximate: false }, locale);
      assert.ok(message.detailHighlights?.every(value => message.detail.includes(value)));
      assert.doesNotMatch(message.detail, /undefined|null|WhatsApp|واتساب|الحصة المبرمجة التالية|Next scheduled lesson|Prochain cours prévu/u);
    }
  }
});

test('13 sourced teaching practices rotate predictably and distinguish Arabic excerpts from adaptations', () => {
  assert.equal(PEDAGOGICAL_TIPS.length, 13);
  assert.equal(new Set(PEDAGOGICAL_TIPS.map(tip => tip.id)).size, 13);
  const quotedWordsBySource = new Map<string, number>();
  for (const tip of PEDAGOGICAL_TIPS) {
    assert.equal(new URL(tip.source.url).protocol, 'https:');
    assert.ok(tip.source.label);
    assert.equal(tip.copy.ar.quotation, true, 'Arabic uses an attributed published excerpt');
    assert.equal(tip.copy.fr.quotation, undefined, 'adaptations must not be presented as literal quotations');
    assert.equal(tip.copy.en.quotation, undefined);
    quotedWordsBySource.set(tip.source.url, (quotedWordsBySource.get(tip.source.url) ?? 0) + tip.copy.ar.text.trim().split(/\s+/u).length);
    for (const locale of ['ar', 'fr', 'en'] as const) {
      const text = tip.copy[locale];
      assert.ok(text.text.includes(text.keyword));
      assert.doesNotMatch(text.text, /\n|\r|<[^>]+>|\*\*/);
      assert.ok(text.text.length < 180, `${tip.id}/${locale} remains concise`);
    }
  }
  for (const [url, words] of quotedWordsBySource) assert.ok(words <= 25, `${url}: keep excerpts brief across the collection`);
  const ids = Array.from({ length: 13 }, (_, offset) => pedagogicalTipForDay('2026-10-23', offset).id);
  assert.equal(new Set(ids).size, 13);
  assert.equal(pedagogicalTipForDay('2026-10-23', 13), pedagogicalTipForDay('2026-10-23'));
  assert.ok(pedagogicalTipForDay('invalid', NaN));
});
