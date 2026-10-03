import { Capacitor, registerPlugin } from '@capacitor/core';
import { WebviewPrint } from 'capacitor-webview-print';
import { hasMathSyntax } from '../../lib/text/math';

export type PrintOutcome = 'completed' | 'confirmation-required' | 'cancelled' | 'failed';
const NativePrint = registerPlugin<{ print(options: { name: string }): Promise<{ status: PrintOutcome }> }>('NativePrint');

/** Opening a preview is not proof of printing. Android waits for the job. */
export const printDocument = async (fileName: string = 'cahier-de-textes'): Promise<PrintOutcome> => {
  const platform = Capacitor.getPlatform();
  try {
    if (platform === 'android') {
      const result = await NativePrint.print({ name: fileName });
      return ['completed', 'confirmation-required', 'cancelled'].includes(result.status) ? result.status : 'failed';
    } else if (platform !== 'web') {
      if (!WebviewPrint?.print) {
        throw new Error('Le plugin WebviewPrint n\'est pas correctement initialisé');
      }
      // The native implementations return status fields absent from the plugin's typings.
      const result = await WebviewPrint.print({ name: fileName }) as unknown as { printed?: boolean; isCancelled?: boolean; isFailed?: boolean } | undefined;
      if (result?.isCancelled) return 'cancelled';
      if (result?.isFailed || result?.printed === false) return 'failed';
      return result?.printed === true ? 'completed' : 'confirmation-required';
    } else {
      if (typeof window.print !== 'function') throw new Error('La fonction d\'impression est indisponible.');
      window.print();
      return 'confirmation-required';
    }
  } catch {
    // window.print() may be a silent no-op inside Android WebView.
    return 'failed';
  }
};

/** Prepare the measurable A4 document; never silently send raw TeX to paper. */
export const preparePrintContent = async (root: HTMLElement, timeoutMs = 12000): Promise<void> => {
  let timer: number | undefined;
  try {
    const prepare = (async () => {
      if (!root.isConnected || root.getBoundingClientRect().width === 0) throw new Error('Print surface is not measurable');
      // This also loads ordinary text fonts when the document contains no formula.
      await document.fonts?.ready;
      // KaTeX has already composed the formula during React's render. There is
      // no global typesetPromise to wait for. Ignore its MathML TeX annotations
      // while checking that no unrendered formula would be sent to paper.
      if (root.querySelector('.katex-error')) throw new Error('Invalid print formula');
      const walker = document.createTreeWalker(root, 4 /* SHOW_TEXT */);
      let plainText = '';
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.parentElement?.closest('.katex')) plainText += node.textContent ?? '';
      }
      if (hasMathSyntax(plainText)) throw new Error('Unrendered print formula');
      await Promise.all(Array.from(root.querySelectorAll('img')).map(img => img.decode()));
      if (!root.isConnected) throw new Error('Print surface detached');
      // A session taller than an A4 body must fragment; ordinary sessions stay together.
      const pageBodyHeight = 275 * 96 / 25.4;
      const headerHeight = root.querySelector('thead')?.getBoundingClientRect().height ?? 0;
      for (const row of root.querySelectorAll<HTMLElement>('.print-session-row')) {
        row.dataset.printOversized = String(row.getBoundingClientRect().height > pageBodyHeight - headerHeight - 2);
      }
    })();
    await Promise.race([
      prepare,
      new Promise<never>((_, reject) => {
        timer = window.setTimeout(() => reject(new Error('Print preparation timeout')), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) window.clearTimeout(timer);
  }
};
