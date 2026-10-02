import assert from 'node:assert/strict';
import test from 'node:test';
import { preparePrintContent } from '../src/infrastructure/printing/printUtils';

function fixture(context: test.TestContext, options: { rawMath?: boolean; invalidMath?: boolean; fonts?: Promise<void> } = {}) {
  const timers = new Map<number, () => void>();
  let id = 0;
  let decoded = false;
  const rows = [200, 1200].map(height => ({ dataset: { printOversized: '' }, getBoundingClientRect: () => ({ height }) }));
  const textNodes = [
    { textContent: options.rawMath ? 'Limite $x^2$' : 'Limite', parentElement: { closest: () => null } },
    // Accessibility annotation contains TeX; it is not raw text awaiting render.
    { textContent: '$x^2$', parentElement: { closest: () => ({}) } },
  ];
  const root = {
    isConnected: true, getBoundingClientRect: () => ({ width: 800 }),
    querySelector: (selector: string) => selector === '.katex-error' && options.invalidMath ? {} : selector === 'thead' ? { getBoundingClientRect: () => ({ height: 30 }) } : null,
    querySelectorAll: (selector: string) => selector === 'img' ? [{ decode: async () => { decoded = true; } }] : rows,
  };
  const descriptors = ['window', 'document'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    setTimeout: (callback: () => void) => { timers.set(++id, callback); return id; },
    clearTimeout: (timer: number) => { timers.delete(timer); },
  } });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    fonts: { ready: options.fonts ?? Promise.resolve() },
    createTreeWalker: () => { let index = 0; return { nextNode: () => textNodes[index++] ?? null }; },
  } });
  context.after(() => {
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  });
  return { root: root as unknown as HTMLElement, rows, timers, decoded: () => decoded };
}

test('impression : KaTeX déjà rendu sans runtime global, polices/images attendues, lignes longues fragmentables', async context => {
  let ready = () => {};
  const fonts = new Promise<void>(resolve => { ready = resolve; });
  const document = fixture(context, { fonts });
  const preparation = preparePrintContent(document.root);
  await Promise.resolve();
  assert.equal(document.decoded(), false);
  ready(); await preparation;
  assert.equal(document.decoded(), true);
  assert.deepEqual(document.rows.map(row => row.dataset.printOversized), ['false', 'true']);
  assert.equal(document.timers.size, 0);
});

test('impression : formule invalide bloquée avant impression', async context => {
  const document = fixture(context, { invalidMath: true });
  await assert.rejects(preparePrintContent(document.root), /Invalid print formula/);
  assert.equal(document.decoded(), false); assert.equal(document.timers.size, 0);
});

test('impression : syntaxe non composée bloquée, sans attente d’un moteur absent', async context => {
  const document = fixture(context, { rawMath: true });
  await assert.rejects(preparePrintContent(document.root), /Unrendered print formula/);
  assert.equal(document.timers.size, 0);
});
