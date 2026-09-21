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

test('chaque ton de carte conserve un contraste AA pour les libellés secondaires', () => {
  const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8');
  const luminance = (hex: string) => {
    const rgb = hex.match(/[\da-f]{2}/gi)!.map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  };
  const tones = [...css.matchAll(/--keep-vivid: (#\w{6}); --keep-light: (#\w{6}); --keep-dark: (#\w{6});/g)];
  // Un jeu de jetons par entrée de KEEP_TONES : la palette ne peut pas se désynchroniser.
  assert.equal(tones.length, KEEP_TONES.length);
  for (const [, , light, dark] of tones) {
    assert.ok((luminance(light) + .05) / (luminance('#5f6368') + .05) >= 4.5, light);
    assert.ok((luminance('#bdc1c6') + .05) / (luminance(dark) + .05) >= 4.5, dark);
  }
  assert.ok(css.includes('@custom-variant dark (&:where(.dark, .dark *));'));
});

test('emploi du temps : la case suit la teinte de la carte, jamais une palette parallèle', () => {
  const source = readFileSync(
    new URL('../features/settings/components/ScheduleTab.tsx', import.meta.url),
    'utf8',
  );
  // Même fonction de teinte que la carte en grille et que la liste.
  assert.match(source, /classBranchToneFor\(classIdentityFor\(/);
  // La case porte le ton, les couleurs viennent des jetons partagés.
  assert.match(source, /data-keep-tone=\{tone \?\? undefined\}/);
  assert.match(source, /bg-\[var\(--keep-cell\)\]/);
  assert.match(source, /text-\[var\(--keep-cell-ink\)\]/);
  // Plus aucune teinte de ton codée en dur : une seule source, les jetons partagés
  // (les fonds neutres des cases vides restent, eux, légitimes).
  for (const vivid of ['#FFC701', '#FE7235', '#E5FE96', '#21C08B', '#38BDF8', '#4D4AFD', '#E28CF8', '#F43F5E']) {
    assert.equal(source.includes(vivid), false, vivid);
  }
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
  // Le pied de carte tient sa taille du jeton CSS unique (`class-card__status`) ;
  // la liste garde sa paire compacte 10,5 / 11,9 px.
  assert.match(card, /className="class-card__status"/);
  assert.equal((card.match(/text-\[11\.9px\]/g) ?? []).length, 0);
  assert.equal((list.match(/text-\[10\.5px\] sm:text-\[11\.9px\]/g) ?? []).length, 1);
  // Les actions de classe restent une liste déroulante dans les deux vues.
  assert.match(card, /MoreVertical/);
  assert.match(list, /MoreVertical/);
  // Profil modifié : abandonner ou confirmer, alignés en fin de ligne.
  assert.match(settings, /hasProfileChanges && \(/);
  assert.match(settings, /sm:justify-between/);
});

test('éditeur : la hiérarchie typographique du titre de chapitre reste verrouillée', () => {
  const content = readFileSync(
    new URL('../features/editor/ContentRenderer.tsx', import.meta.url),
    'utf8',
  );
  const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8');
  assert.match(content, /renderChapterLabel/);
  assert.match(content, /text-\[0\.95em\]/);
  assert.match(content, /text-\[0\.85em\]/);
  // Teinte et échelle du chapitre : un seul jeton, partagé écran et papier.
  assert.match(css, /\.editor-type-chapter \{ font-size: var\(--editor-fs-chapter\)/);
});

test('éditeur : une échelle mobile unique reste stable après rotation', () => {
  const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8');
  const content = readFileSync(
    new URL('../features/editor/ContentRenderer.tsx', import.meta.url),
    'utf8',
  );

  for (const role of [
    'chapter',
    'top',
    'section',
    'subsection',
    'subsubsection',
    'item-title',
    'description',
    'page',
    'badge',
  ]) {
    assert.match(content, new RegExp(`editor-type-${role}`));
  }

  assert.match(css, /--editor-fs-chapter: 20px/);
  assert.match(css, /--editor-fs-item-title: 14px/);
  assert.match(css, /--editor-fs-badge: 10px/);
  assert.match(css, /editor-type-badge[\s\S]*font-size: var\(--editor-fs-badge\) !important/);
  assert.match(css, /padding-inline: var\(--editor-badge-padding-inline\) !important/);
  assert.match(css, /pointer: coarse\) and \(max-width: 960px\) and \(max-height: 540px\) and \(orientation: landscape/);
  assert.match(css, /editor-type-separator-date:focus[\s\S]*font-size: 16px/);
});

test('modales & sidebar arabe : augmentation de taille (+15%)', () => {
  const css = readFileSync(
    new URL('../index.css', import.meta.url),
    'utf8',
  );
  assert.match(css, /html\[lang="ar"\] \[role="dialog"\]/);
  assert.match(css, /0\.75rem \* 1\.15/);
  assert.match(css, /0\.875rem \* 1\.15/);

  const tabBar = readFileSync(
    new URL('../components/navigation/TabBar.tsx', import.meta.url),
    'utf8',
  );
  assert.match(tabBar, /locale === 'ar' && ["']text-\[15px\]["']/);
  assert.match(tabBar, /locale === 'ar' && ["']text-\[12px\]/);
});

test('cartes de classe : clic continu sur mobile/tablette et bouton Keep au survol sur PC', () => {
  const card = readFileSync(
    new URL('../features/dashboard/ClassCard.tsx', import.meta.url),
    'utf8',
  );
  const list = readFileSync(
    new URL('../features/dashboard/ClassListItem.tsx', import.meta.url),
    'utf8',
  );
  // Appui continu (mobile/tablette) partagé par les deux vues…
  assert.match(card, /useClassPress/);
  assert.match(list, /useClassPress/);
  // …et actions accessibles par la même liste déroulante dédiée.
  assert.match(card, /class-card__menu/);
  assert.match(list, /MoreVertical/);
  // Titres : module typographique partagé côté carte, classe dédiée côté liste.
  assert.match(card, /classTitleStyle\(isRtl\)/);
  assert.match(list, /keep-class-title/);
});

test('sidebar : le nom de l’enseignant reflète la configuration active', () => {
  const app = readFileSync(
    new URL('../App.tsx', import.meta.url),
    'utf8',
  );
  const tabBar = readFileSync(
    new URL('../components/navigation/TabBar.tsx', import.meta.url),
    'utf8',
  );
  assert.match(app, /teacherName=\{config\.defaultTeacherName/);
  assert.match(tabBar, /userName = teacherName\?\.trim\(\)/);
});
