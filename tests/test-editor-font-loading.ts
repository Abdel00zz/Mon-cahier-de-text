import assert from 'node:assert/strict';
import test from 'node:test';
import { preloadEditorFonts } from '../src/features/editor/editorFontLoading';

type FontLoader = Parameters<typeof preloadEditorFonts>[0];

test('les fontes du cahier démarrent en parallèle et partagent le même chargement', async () => {
  const requests: Array<[string, string | undefined]> = [];
  const fontSet: FontLoader = {
    load: async (descriptor, sample) => {
      requests.push([descriptor, sample]);
      return [{} as FontFace];
    },
  };

  const first = preloadEditorFonts(fontSet);
  const second = preloadEditorFonts(fontSet);
  assert.equal(first, second, 'les montages concurrents partagent les mêmes requêtes');
  await first;

  assert.equal(requests.length, 6);
  assert.ok(requests.some(([font, sample]) => font.includes('Readex Pro') && sample === 'دفتر'));
  assert.ok(requests.some(([font]) => font.includes('Computer Modern Sans Serif Medium') && font.startsWith('600')));
  assert.ok(requests.some(([font]) => font.includes('Demi Condensed')));
  assert.ok(requests.some(([font]) => font.includes('Oblique') && font.startsWith('italic')));
});

test('un échec de fonte est explicite et peut être retenté', async () => {
  let shouldFail = true;
  const fontSet: FontLoader = {
    load: async () => {
      if (shouldFail) return [];
      return [{} as FontFace];
    },
  };

  await assert.rejects(preloadEditorFonts(fontSet), /No editor font face matched/);
  shouldFail = false;
  await preloadEditorFonts(fontSet);
});
