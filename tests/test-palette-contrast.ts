import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { KEEP_TONES } from '../src/platform/keepTheme';

/*
 * Garde-fou chromatique.
 *
 * La palette est entièrement portée par les jetons CSS de `src/styles/index.css` :
 * aucune couleur n'échappe au thème (le réglage d'apparence se limite à
 * clair / sombre / système). Ce test lit donc les VRAIES valeurs, les convertit
 * en luminance relative et vérifie les paires réellement utilisées dans
 * l'interface — texte sur fond, encre sur aplat d'accent, séparateurs.
 *
 * C'est ce qui permet d'assombrir la palette (confort de nuit, sensation
 * native Android) sans casser la lisibilité au passage.
 */

const css = readFileSync(new URL('../src/styles/index.css', import.meta.url), 'utf8');

/** Les jetons sont définis une fois en clair (`:root`) puis redéclarés en sombre. */
const darkStart = css.indexOf('\n  .dark {');
assert.ok(darkStart > 0, 'le bloc sombre doit exister');
const lightCss = css.slice(0, darkStart);
const darkCss = css.slice(darkStart);

type Rgb = { r: number; g: number; b: number };

const hslTriplet = (source: string, token: string): [number, number, number] => {
  const matches = [...source.matchAll(new RegExp(`--${token}:\\s*([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%`, 'g'))];
  assert.ok(matches.length > 0, `jeton --${token} introuvable`);
  const last = matches[matches.length - 1];
  return [Number(last[1]), Number(last[2]), Number(last[3])];
};

const hslToRgb = ([h, s, l]: [number, number, number]): Rgb => {
  const saturation = s / 100;
  const lightness = l / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const secondary = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const match = lightness - chroma / 2;
  const sector = Math.floor(h / 60) % 6;
  const [r, g, b] = [
    [chroma, secondary, 0],
    [secondary, chroma, 0],
    [0, chroma, secondary],
    [0, secondary, chroma],
    [secondary, 0, chroma],
    [chroma, 0, secondary],
  ][sector];
  return { r: (r + match) * 255, g: (g + match) * 255, b: (b + match) * 255 };
};

const luminance = ({ r, g, b }: Rgb): number => {
  const linear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
};

const ratio = (foreground: [number, number, number], background: [number, number, number]): number => {
  const a = luminance(hslToRgb(foreground));
  const b = luminance(hslToRgb(background));
  const [high, low] = a > b ? [a, b] : [b, a];
  return (high + 0.05) / (low + 0.05);
};

/**
 * Paires réellement peintes par l'interface, avec le seuil qui les concerne :
 * 4.5:1 pour du texte courant (WCAG AA), 3:1 pour un repère non textuel
 * (indicateur, bordure signifiante).
 */
const PAIRS: { fg: string; bg: string; min: number; label: string }[] = [
  { fg: 'foreground', bg: 'background', min: 4.5, label: 'texte principal sur le fond' },
  { fg: 'foreground', bg: 'card', min: 4.5, label: 'texte principal sur une carte' },
  { fg: 'card-foreground', bg: 'card', min: 4.5, label: 'texte de carte sur une carte' },
  { fg: 'muted-foreground', bg: 'background', min: 4.5, label: 'texte secondaire sur le fond' },
  { fg: 'muted-foreground', bg: 'card', min: 4.5, label: 'texte secondaire sur une carte' },
  { fg: 'muted-foreground', bg: 'muted', min: 4.5, label: 'texte secondaire sur un aplat muet' },
  { fg: 'primary-foreground', bg: 'primary', min: 4.5, label: 'texte sur le bouton principal' },
  { fg: 'secondary-foreground', bg: 'secondary', min: 4.5, label: 'texte sur un bouton secondaire' },
  { fg: 'accent-foreground', bg: 'accent', min: 4.5, label: 'texte sur un survol d’accent' },
  { fg: 'destructive-foreground', bg: 'destructive', min: 4.5, label: 'texte sur une action destructive' },
  { fg: 'badge-text', bg: 'badge-bg', min: 4.5, label: 'texte de pastille sur son aplat' },
  { fg: 'scheduled-foreground', bg: 'scheduled', min: 4.5, label: 'texte de séance planifiée sur son aplat' },
  { fg: 'primary', bg: 'background', min: 3, label: 'accent repère sur le fond' },
  { fg: 'primary', bg: 'card', min: 3, label: 'accent repère sur une carte' },
  { fg: 'success', bg: 'card', min: 3, label: 'repère de réussite sur une carte' },
  { fg: 'destructive', bg: 'card', min: 3, label: 'repère d’alerte sur une carte' },
  { fg: 'alert', bg: 'card', min: 3, label: 'repère d’erreur sur une carte' },
  { fg: 'border', bg: 'background', min: 1.25, label: 'séparation des cartes sur le fond' },
];

const surfacePairs: { fg: string; bg: string; min: number; label: string }[] = [
  { fg: 'warning-strong', bg: 'background', min: 1.6, label: 'aplat d’avertissement fort sur le fond' },
];

for (const theme of ['clair', 'sombre'] as const) {
  const source = theme === 'clair' ? lightCss : darkCss;
  const token = (name: string) => hslTriplet(source, name);

  test(`contrastes WCAG · thème ${theme}`, () => {
    const failures: string[] = [];
    for (const pair of PAIRS) {
      const measured = ratio(token(pair.fg), token(pair.bg));
      if (measured + 0.005 < pair.min) {
        failures.push(`${pair.label} : ${measured.toFixed(2)}:1 (minimum ${pair.min})`);
      }
    }
    assert.deepEqual(failures, [], `contrastes insuffisants en ${theme} :\n${failures.join('\n')}`);
  });

  test(`repères non textuels · thème ${theme}`, () => {
    for (const pair of surfacePairs) {
      const measured = ratio(token(pair.fg), token(pair.bg));
      assert.ok(measured >= pair.min, `${pair.label} : ${measured.toFixed(2)}:1`);
    }
  });

  test(`la profondeur reste perceptible · thème ${theme}`, () => {
    // Material : les surfaces élevées sont plus CLAIRES que le fond ; en clair,
    // la carte se détache du papier. Sans écart mesurable, l'étagement disparaît.
    const card = token('card');
    const background = token('background');
    const ratioBg = ratio(card, background);
    const cardL = hslTriplet(source, 'card')[2];
    const bgL = hslTriplet(source, 'background')[2];
    if (theme === 'sombre') {
      assert.ok(cardL > bgL, `la carte (${cardL}%) doit être plus claire que le fond (${bgL}%)`);
      assert.ok(ratioBg >= 1.12, `étagement carte/fond trop faible : ${ratioBg.toFixed(3)}`);
    } else {
      assert.ok(cardL > bgL, `la carte (${cardL}%) doit se détacher du fond (${bgL}%)`);
      assert.ok(ratioBg >= 1.05, `étagement carte/fond trop faible : ${ratioBg.toFixed(3)}`);
    }
  });
}

test('les aplats d’avertissement portent l’encre de leur thème', () => {
  // En clair, l'ambre est foncé : on écrit en blanc. En sombre, les accents
  // s'éclaircissent (Material) et l'encre passe au noir chaud — exactement ce
  // que fait déjà le couple --primary-foreground / --primary.
  const lightRatio = ratio([0, 0, 100], hslTriplet(lightCss, 'warning-strong'));
  assert.ok(lightRatio >= 4.5, `blanc sur --warning-strong (clair) : ${lightRatio.toFixed(2)}:1`);
  const darkRatio = ratio(hslTriplet(darkCss, 'primary-foreground'), hslTriplet(darkCss, 'warning-strong'));
  assert.ok(darkRatio >= 4.5, `encre sombre sur --warning-strong (sombre) : ${darkRatio.toFixed(2)}:1`);
  const darkDestructive = ratio(hslTriplet(darkCss, 'destructive-foreground'), hslTriplet(darkCss, 'destructive-strong'));
  assert.ok(darkDestructive >= 4.5, `encre sur --destructive-strong (sombre) : ${darkDestructive.toFixed(2)}:1`);
});

test('les cartes reprennent le numéro décoratif de la référence sans masquer le nom', () => {
  const cards = readFileSync(new URL('../src/features/dashboard/classCards.css', import.meta.url), 'utf8');
  const start = cards.indexOf('.class-card .class-card__group {');
  assert.ok(start > 0);
  const group = cards.slice(start, cards.indexOf('.dark .class-card .class-card__group {'));
  assert.match(group, /font-family: system-ui, sans-serif/);
  assert.match(group, /font-weight: 900;/);
  assert.match(group, /font-size: 5.2rem;/);
  assert.match(group, /opacity: .35;/);
  assert.match(group, /position: absolute;/);
  assert.match(group, /inset-inline-end: 0;/);
  assert.match(group, /pointer-events: none;/);
  assert.match(cards, /padding-inline-end: 76px;/, 'espace réservé au chiffre');
  assert.match(cards, /@media \(max-width: 639px\)[\s\S]*font-size: 4rem;/);
  const classCard = readFileSync(new URL('../src/features/dashboard/ClassCard.tsx', import.meta.url), 'utf8');
  const identity = classCard.slice(classCard.indexOf('<div className="class-card__identity"'), classCard.indexOf('</div>', classCard.indexOf('variant="engraved"')));
  assert.match(identity, /class-card__title[\s\S]*variant="engraved"/);
  assert.match(identity, /sr-only[\s\S]*aria-hidden/, 'le nom accessible porte déjà le groupe');

  // Le numéro de la liste : encre pleine et même contour net.
  const styles = readFileSync(new URL('../src/styles/index.css', import.meta.url), 'utf8');
  const watermark = styles.slice(styles.indexOf('.keep-group-watermark {'), styles.indexOf(".keep-group-watermark[data-variant='end']"));
  assert.match(watermark, /color: hsl\(var\(--foreground\)\)/);
  assert.match(watermark, /opacity: 1/);
  assert.match(watermark, /-webkit-text-stroke: 1\.5px hsl\(var\(--card\)\)/);
});

test('le numéro de groupe est gravé, à l’italique, et reste lisible sur les huit tons', () => {
  // Le chiffre n'est plus une pastille : c'est une ENCRE adoucie, la grande
  // italique serif et deux ombres de gravure. L'encre ne descend pas sous 68 %
  // de l'encre du thème — mesuré 5,3:1 à 6,7:1 sur les huit tons — sinon le
  // filigrane devient illisible sur les surfaces claires.
  const hexToRgb = (hex: string): Rgb => ({
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  });
  const mix = (base: Rgb, coat: Rgb, weight: number): Rgb => ({
    r: base.r * (1 - weight) + coat.r * weight,
    g: base.g * (1 - weight) + coat.g * weight,
    b: base.b * (1 - weight) + coat.b * weight,
  });
  const ratioRgb = (foreground: Rgb, background: Rgb): number => {
    const a = luminance(foreground);
    const b = luminance(background);
    const [high, low] = a > b ? [a, b] : [b, a];
    return (high + 0.05) / (low + 0.05);
  };
  const toneRules = (tone: string) => [...css.matchAll(new RegExp(`(?:^|\\n)([^\\n{}]*)\\[data-keep-tone="${tone}"\\]\\s*\\{([^}]*)\\}`, 'g'))]
    .map(([, prefix, body]) => ({ dark: prefix.includes('.dark'), body }));
  const hexToken = (body: string, name: string): string => {
    const found = body.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`));
    assert.ok(found, `--${name} introuvable dans le ton`);
    return found![1];
  };
  const inkOf = (theme: 'clair' | 'sombre') => hslToRgb(hslTriplet(theme === 'clair' ? lightCss : darkCss, 'foreground'));

  const failures: string[] = [];
  let floor = Number.POSITIVE_INFINITY;
  for (const tone of KEEP_TONES) {
    const rules = toneRules(tone);
    const light = rules.find(rule => !rule.dark);
    const dark = rules.find(rule => rule.dark);
    assert.ok(light && dark, `le ton ${tone} doit être déclaré dans les deux thèmes`);
    const cases = [
      ['clair', hexToken(light!.body, 'keep-light')],
      ['sombre', hexToken(light!.body, 'keep-dark')],
    ] as const;
    for (const [theme, surfaceHex] of cases) {
      const surface = hexToRgb(surfaceHex);
      const ink = mix(surface, inkOf(theme), 0.68);
      const measured = ratioRgb(ink, surface);
      floor = Math.min(floor, measured);
      if (measured < 4.5) failures.push(`${tone} en ${theme} : ${measured.toFixed(2)}:1`);
    }
  }
  assert.deepEqual(failures, [], `numéros gravés insuffisamment lisibles :\n${failures.join('\n')}`);
  assert.ok(floor >= 4.5, `planche de lisibilité du numéro gravé : ${floor.toFixed(2)}:1`);
});

test('l’écran de lancement et l’icône suivent la palette, sans saut de couleur', () => {
  const hexOf = (source: string, token: string) => {
    const rgb = hslToRgb(hslTriplet(source, token));
    return `#${[rgb.r, rgb.g, rgb.b].map(value => Math.round(value).toString(16).padStart(2, '0')).join('')}`;
  };
  const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  const light = hexOf(lightCss, 'background');
  const dark = hexOf(darkCss, 'background');

  const capacitor = read('capacitor.config.ts');
  assert.ok(capacitor.includes(`backgroundColor: '${light}'`), `splash clair = ${light}`);

  const styles = read('android/app/src/main/res/values/styles.xml');
  assert.ok(styles.includes(`windowSplashScreenBackground">${light}<`), `styles.xml clair = ${light}`);

  const night = read('android/app/src/main/res/values-night/styles.xml');
  assert.ok(night.includes(`windowSplashScreenBackground">${dark}<`), `styles.xml nuit = ${dark}`);

  const launcher = read('android/app/src/main/res/values/ic_launcher_background.xml');
  assert.ok(launcher.toUpperCase().includes(light.toUpperCase()), `icône adaptative = ${light}`);

  const themeColor = read('src/platform/themeColor.ts');
  assert.ok(themeColor.includes(`'${dark}'`) && themeColor.includes(`'${light}'`), 'repli des barres système à jour');
});

test('aucune couleur de marque codée en dur dans les composants ne contredit la charte', () => {
  const notifications = readFileSync(new URL('../android/app/src/main/java/ma/cahier/textes/NotificationCenter.java', import.meta.url), 'utf8');
  const capacitor = readFileSync(new URL('../capacitor.config.ts', import.meta.url), 'utf8');
  const javaColor = notifications.match(/COLOR = Color\.rgb\((\d+), (\d+), (\d+)\)/);
  const configColor = capacitor.match(/iconColor:\s*'#([0-9a-fA-F]{6})'/);
  assert.ok(javaColor, 'la couleur d’accent native doit être déclarée explicitement');
  assert.ok(configColor, 'la couleur d’icône de notification doit être déclarée');
  const native = [Number(javaColor![1]), Number(javaColor![2]), Number(javaColor![3])];
  const declared = [
    parseInt(configColor![1].slice(0, 2), 16),
    parseInt(configColor![1].slice(2, 4), 16),
    parseInt(configColor![1].slice(4, 6), 16),
  ];
  const hex = (rgb: number[]) => rgb.map(value => value.toString(16).padStart(2, '0')).join('');
  assert.equal(
    hex(native),
    hex(declared),
    `l’accent natif Android (${hex(native)}) doit être celui de la charte (${hex(declared)})`,
  );
});

test('chaque teinte du catalogue de natures a sa couleur, en clair comme en sombre', () => {
  // Régression réelle : le catalogue déclarait huit teintes quand la palette
  // n'en définissait que sept — « Autre » (slate) retombait silencieusement sur
  // le bleu par défaut de `.hub-card`, donc deux natures identiques à l'écran.
  // Même famille de bug pour la classe `evaluation-tone` (le rappel de nature de
  // l'étape 2) : elle portait `data-tone` sans qu'aucune règle ne la reconnaisse,
  // donc aucune teinte du tout. Une palette, plusieurs porteurs — et ce test.
  const catalog = readFileSync(new URL('../src/features/evaluations/kindCatalog.ts', import.meta.url), 'utf8');
  const tones = [...new Set([...catalog.matchAll(/tone: '([a-z]+)'/g)].map(match => match[1]))];
  assert.ok(tones.length >= 8, `le catalogue doit couvrir ses familles de teintes (${tones.length})`);

  // Toutes les déclarations de teinte passent par la MÊME forme de sélecteur :
  // la palette est partagée entre les cartes de rubrique et les pastilles
  // d'étape, il n'existe pas de liste jumelle à tenir à jour.
  const declarations = [...css.matchAll(/(\.dark\s+)?:is\(\.hub-card, \.evaluation-tone\)\[data-tone='([a-z]+)'\] \{ --tone: ([^;]+);/g)];
  const declared = new Set(declarations.map(match => match[2]));
  assert.equal(
    (css.match(/\[data-tone='[a-z]+'\] \{ --tone:/g) ?? []).length,
    declarations.length,
    'une teinte déclarée hors de la palette partagée échapperait au thème',
  );
  for (const tone of tones) {
    assert.ok(declared.has(tone), `teinte « ${tone} » absente de la palette`);
    const forTone = declarations.filter(match => match[2] === tone);
    assert.ok(forTone.some(match => !match[1]), `teinte « ${tone} » sans valeur claire`);
    assert.ok(forTone.some(match => match[1]), `teinte « ${tone} » sans valeur sombre`);
  }
});
