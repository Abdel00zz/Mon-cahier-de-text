import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { formatMoroccanPhone, isCompleteMoroccanPhone, passwordScore } from '../features/auth/authForm';
import { keepToneForClass, KEEP_TONES } from '../utils/keepTheme';
import { translateLocaleMessage } from '../i18n/LocaleProvider';

test('format marocain : saisie locale, collage international et chiffres arabes', () => {
  for (const value of ['0612345678', '+212 612345678', '00212612345678', '٠٦١٢٣٤٥٦٧٨', '۰۶۱۲۳۴۵۶۷۸']) {
    assert.equal(formatMoroccanPhone(value), '06 12 34 56 78');
    assert.equal(isCompleteMoroccanPhone(value), true);
  }
  assert.equal(formatMoroccanPhone('06 12 34 56 78'), '06 12 34 56 78');
  assert.equal(formatMoroccanPhone('06a12'), '06 12');
  assert.equal(formatMoroccanPhone(''), '');
});
test('le badge attend dix chiffres et un préfixe marocain', () => {
  for (const value of ['06', '06123456', '061234567', '0112345678', '1234567890', '06123456789']) assert.equal(isCompleteMoroccanPhone(value), false);
  for (const value of ['0512345678', '0612345678', '0712345678']) assert.equal(isCompleteMoroccanPhone(value), true);
  // Existing development/legacy accounts remain enterable, without a misleading valid badge.
  assert.equal(formatMoroccanPhone('06000000'), '06 00 00 00');
});
test('la jauge reste entre zéro et quatre, un mot court ne paraît jamais robuste', () => {
  assert.equal(passwordScore(''), 0);
  assert.equal(passwordScore('A1!'), 1);
  assert.equal(passwordScore('abcdefgh'), 2);
  assert.equal(passwordScore('abcdefgh1234'), 3);
  assert.equal(passwordScore('UnePhrase2026!'), 4);
  assert.equal(passwordScore('كلمةمرورطويلة١٢!'), 4);
});
test('la couleur suit la classe dans les deux vues, indépendamment du tri', () => {
  const ids = ['classe-a', 'classe-b', 'classe-c', 'classe-d', 'classe-e'];
  const colors = new Map(ids.map(id => [id, keepToneForClass(id)]));
  for (const id of ids.reverse()) {
    assert.equal(keepToneForClass(id), colors.get(id));
    assert.ok(KEEP_TONES.includes(keepToneForClass(id)));
  }
  assert.equal(new Set(colors.values()).size, 5);
});
test('les trois libellés institutionnels sont complets dans les trois langues', () => {
  const keys = ['settings.school', 'settings.academyRegion', 'settings.educationProvince'];
  for (const locale of ['fr', 'en', 'ar'] as const) {
    for (const key of keys) assert.notEqual(translateLocaleMessage(locale, key), key);
  }
  assert.equal(translateLocaleMessage('en', 'settings.educationProvince'), 'Provincial office');
  assert.equal(translateLocaleMessage('ar', 'settings.school'), 'المؤسسة التعليمية');
});

test('les cinq pastels conservent un contraste AA pour les libellés secondaires', () => {
  const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8');
  const luminance = (hex: string) => {
    const rgb = hex.match(/[\da-f]{2}/gi)!.map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  };
  const tones = [...css.matchAll(/--keep-light: (#\w{6}); --keep-dark: (#\w{6});/g)];
  assert.equal(tones.length, 5);
  for (const [, light, dark] of tones) {
    assert.ok((luminance(light) + .05) / (luminance('#5f6368') + .05) >= 4.5, light);
    assert.ok((luminance('#bdc1c6') + .05) / (luminance(dark) + .05) >= 4.5, dark);
  }
  assert.ok(css.includes('@custom-variant dark (&:where(.dark, .dark *));'));
});

test('emploi du temps : une seule zone d’avis reste avant la grille', () => {
  const source = readFileSync(
    new URL('../features/settings/components/ScheduleTab.tsx', import.meta.url),
    'utf8',
  );
  const advisoryCalls = source.match(/<HoursAdvisory\s/g) ?? [];
  assert.equal(advisoryCalls.length, 1);
  assert.ok(source.indexOf('<HoursAdvisory ') < source.indexOf('<table'));
  assert.equal(source.includes('classesWithoutSlots'), false);
  const neutralSummary = source.slice(source.indexOf('Récapitulatif neutre'));
  assert.equal(neutralSummary.includes('officialReferenceTitle'), false);
  assert.equal(neutralSummary.includes('<HoursAdvisory '), false);
});

test('cartes : dernière ouverture réduite ; bouton Fermer aligné en fin de ligne', () => {
  const card = readFileSync(
    new URL('../features/dashboard/ClassCard.tsx', import.meta.url),
    'utf8',
  );
  const list = readFileSync(
    new URL('../features/dashboard/ClassListItem.tsx', import.meta.url),
    'utf8',
  );
  const settings = readFileSync(
    new URL('../features/settings/ConfigModal.tsx', import.meta.url),
    'utf8',
  );
  assert.match(card, /classOpeningLabel\(classInfo\.lastOpenedAt, locale\)/);
  assert.match(list, /classOpeningLabel\(classInfo\.lastOpenedAt, locale\)/);
  assert.equal((card.match(/text-\[11\.9px\]/g) ?? []).length, 1);
  assert.equal((list.match(/text-\[11\.9px\]/g) ?? []).length, 1);
  assert.match(
    settings,
    /hasProfileChanges \? 'items-stretch justify-between' : 'items-end justify-end'/,
  );
});
