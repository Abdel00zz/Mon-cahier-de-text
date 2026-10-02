import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { rgbToHex } from '../src/platform/themeColor';
import { APP_VERSION, ANDROID_BUILD } from '../src/platform/appVersion';
import { canRestartForUpdate } from '../src/platform/nativeUpdates';
import { isNativeAsset } from '../build/vite/native-assets';
import { startPwaUpdateChecks } from '../src/pwa/updateCheck';

test('une surface CSS opaque se convertit sans ambiguïté pour les barres Android', () => {
  assert.equal(rgbToHex('rgb(247, 246, 242)'), '#f7f6f2');
  assert.equal(rgbToHex('rgb(20 26 24)'), '#141a18');
  assert.equal(rgbToHex('rgba(20, 26, 24, 1)'), '#141a18');
  for (const invalid of ['rgba(0, 0, 0, 0)', 'rgb(999, 0, 0)', 'transparent', 'url(x)', '']) assert.equal(rgbToHex(invalid), null);
});

test('version du guide, Android et fichier de verrouillage restent cohérents', () => {
  const metadata = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
  assert.equal(APP_VERSION, metadata.version);
  assert.equal(APP_VERSION, lock.version);
  assert.equal(APP_VERSION, lock.packages[''].version);
  assert.ok(Number.isInteger(ANDROID_BUILD) && ANDROID_BUILD > 1);
});

test('l’allègement Android conserve les cours, les polices et les captures du guide', () => {
  for (const file of ['doc_officiel/curriculum.json', 'contenus/manifest.json', 'contenus/mathematiques/1ac-mathematiques.json', 'guide/current/editor-ar.webp', 'arabswell-3.ttf', 'showcase/notebook-sculpture.png']) assert.ok(isNativeAsset(file), file);
  assert.equal(isNativeAsset('doc_officiel/source.jpeg'), false);
  assert.equal(isNativeAsset('showcase/portrait-fr.gif'), false);
  assert.equal(isNativeAsset('showcase\\portrait-fr.gif'), false);
});

test('une installation attend visibilité, fin des modales, des champs et des sauvegardes', t => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'document');
  let blocked = false;
  let editing = false;
  const doc = { visibilityState: 'visible', documentElement: { dataset: { nativeActive: 'true' } },
    querySelector: () => blocked ? {} : null, activeElement: { matches: () => editing } };
  Object.defineProperty(globalThis, 'document', { value: doc, configurable: true });
  t.after(() => { if (original) Object.defineProperty(globalThis, 'document', original); else Reflect.deleteProperty(globalThis, 'document'); });
  assert.equal(canRestartForUpdate(), true);
  blocked = true; assert.equal(canRestartForUpdate(), false);
  blocked = false; editing = true; assert.equal(canRestartForUpdate(), false);
  editing = false; doc.documentElement.dataset.nativeActive = 'false'; assert.equal(canRestartForUpdate(), false);
  doc.documentElement.dataset.nativeActive = 'true'; doc.visibilityState = 'hidden'; assert.equal(canRestartForUpdate(), false);
});

test('les vérifications de mise à jour PWA se font au retour, avec délai et sans doublon', async () => {
  let now = 0;
  let active = true;
  let wake = () => {};
  let finish!: () => void;
  let calls = 0;
  const stop = startPwaUpdateChecks({ update: () => { calls++; return new Promise<void>(resolve => { finish = resolve; }); } }, {
    active: () => active, now: () => now, subscribe: check => { wake = check; return () => { wake = () => {}; }; },
  });
  wake(); assert.equal(calls, 0);
  now = 3600_000; active = false; wake(); assert.equal(calls, 0);
  active = true; wake(); wake(); assert.equal(calls, 1);
  now += 3600_000; wake(); assert.equal(calls, 1); // Previous request still running.
  finish(); await new Promise(resolve => setImmediate(resolve));
  wake(); assert.equal(calls, 2);
  finish(); await new Promise(resolve => setImmediate(resolve));
  stop(); now += 3600_000; wake(); assert.equal(calls, 2);
});

const rgb = (value: string): number[] => value.startsWith('#')
  ? value.slice(1).match(/../g)!.map(channel => parseInt(channel, 16) / 255)
  : (() => {
    const [h, s, l] = value.split(/\s+/).map(Number);
    const a = s / 100 * Math.min(l / 100, 1 - l / 100);
    return [0, 8, 4].map(n => { const k = (n + h / 30) % 12; return l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); });
  })();
const luminance = (channels: number[]) => channels.map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4)
  .reduce((total, c, i) => total + c * [.2126, .7152, .0722][i], 0);
const contrast = (foreground: string, background: string) => {
  const values = [luminance(rgb(foreground)), luminance(rgb(background))].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
};

test('les tokens de texte et d’action gardent le contraste AA sur les deux thèmes', () => {
  const css = fs.readFileSync('src/styles/index.css', 'utf8');
  const light = css.slice(css.indexOf('--background: 45'), css.indexOf('--background: 160'));
  const dark = css.slice(css.indexOf('--background: 160'));
  for (const [name, section] of [['clair', light], ['sombre', dark]]) {
    const token = (key: string) => section.match(new RegExp(`--${key}: ([\\d. %]+);`))![1].replaceAll('%', '');
    for (const [ink, surface] of [['foreground', 'background'], ['card-foreground', 'card'], ['muted-foreground', 'background'], ['muted-foreground', 'muted'], ['primary-foreground', 'primary'], ['destructive-foreground', 'destructive'], ['scheduled-foreground', 'scheduled']]) {
      const ratio = contrast(token(ink), token(surface));
      assert.ok(ratio >= 4.5, `${name}: ${ink}/${surface} = ${ratio.toFixed(2)}`);
    }
  }
});

test('les huit couleurs de classe et les couleurs supplémentaires restent lisibles', () => {
  const css = fs.readFileSync('src/styles/index.css', 'utf8');
  for (const match of css.matchAll(/\[data-keep-tone="([a-z]+)"\] \{([^}]+)\}/g)) {
    const [, name, values] = match;
    const token = (key: string) => values.match(new RegExp(`--keep-${key}: (#[A-Fa-f0-9]{6});`))?.[1];
    const light = token('light');
    const surface = light ?? css.match(new RegExp(`\\[data-keep-tone="${name}"\\] \\{[^}]*--keep-dark: (#[A-Fa-f0-9]{6});`))![1];
    for (const ink of [token('accent')!, light ? '#343a40' : '#e3e6e8', light ? '#5f666d' : '#acb4bd']) {
      assert.ok(contrast(ink, surface) >= 4.5, `${name}: ${ink}/${surface}`);
    }
  }
  for (let hue = 0; hue < 360; hue++) {
    assert.ok(contrast(`${hue} 60 28`, `${hue} 60 97`) >= 4.5, `custom light ${hue}`);
    assert.ok(contrast(`${hue} 60 78`, `${hue} 22 15`) >= 4.5, `custom dark ${hue}`);
  }
});
