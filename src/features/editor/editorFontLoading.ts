type FontLoader = Pick<FontFaceSet, 'load'>;

const EDITOR_FONT_REQUESTS = [
  { descriptor: '400 16px "Readex Pro"', sample: 'Notebook' },
  { descriptor: '400 16px "Readex Pro"', sample: 'دفتر' },
  { descriptor: '500 16px "Computer Modern Sans Serif Medium"', sample: 'Lesson content' },
  { descriptor: '600 16px "Computer Modern Sans Serif Medium"', sample: 'Chapter title' },
  { descriptor: '600 16px "Computer Modern Sans Serif Demi Condensed"', sample: 'Section title' },
  { descriptor: 'italic 500 16px "Computer Modern Sans Serif Oblique"', sample: 'Academic title' },
] as const;

const pendingLoads = new WeakMap<FontLoader, Promise<void>>();

/**
 * Fetches the exact typefaces used by the notebook before its table is shown.
 * The requests run together and are shared by concurrent editor mounts.
 */
export function preloadEditorFonts(fontSet: FontLoader | undefined =
  typeof document === 'undefined' ? undefined : document.fonts): Promise<void> {
  if (!fontSet) return Promise.resolve();

  const pending = pendingLoads.get(fontSet);
  if (pending) return pending;

  const loading = Promise.all(EDITOR_FONT_REQUESTS.map(async ({ descriptor, sample }) => {
    const loadedFaces = await fontSet.load(descriptor, sample);
    if (loadedFaces.length === 0) {
      throw new Error(`No editor font face matched "${descriptor}"`);
    }
  })).then(() => undefined);

  pendingLoads.set(fontSet, loading);
  void loading.catch(() => pendingLoads.delete(fontSet));
  return loading;
}
