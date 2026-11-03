import assert from 'node:assert/strict';
import test from 'node:test';
import { classIdentityFor } from '../src/domain/classes/classIdentity';
import { scheduleClassLabel } from '../src/domain/classes/classAbbreviation';

test('mixed legacy class names produce the same localized timetable label as canonical names', () => {
  for (const name of ['قسم الثانية بكالوريا Sciences Physiques 3', '2ème Bac علوم فيزيائية 3', 'قسم الثانية بكالوريا PC 3']) {
    for (const locale of ['fr', 'ar'] as const) {
      const label = scheduleClassLabel(classIdentityFor(name, locale), locale, true);
      const canonical = scheduleClassLabel(classIdentityFor('2ème Bac Sciences Physiques 3', locale), locale, true);
      assert.equal(label, canonical, `${locale}: ${name}`);
      assert.doesNotMatch(label, locale === 'ar' ? /Sciences|Bac|PC/ : /[\p{Script=Arabic}]/u);
    }
  }
});

test('custom names and official CPGE acronyms are preserved', () => {
  for (const locale of ['fr', 'ar'] as const) {
    assert.equal(scheduleClassLabel(classIdentityFor('Atelier Einstein', locale), locale), 'Atelier Einstein');
    assert.match(scheduleClassLabel(classIdentityFor('1re année MPSI 2', locale), locale), /MPSI/);
  }
});
