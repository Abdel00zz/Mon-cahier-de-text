import { useEffect, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { Printer } from 'lucide-react';
import { toast } from 'sonner';
import { renderDescriptionWithBold } from '../typography/textFormat';
import { preparePrintContent, printDocument } from '../../infrastructure/printing/printUtils';
import { fitDocumentMath } from '../../infrastructure/printing/documentMathLayout';
import { useLocale } from '../../i18n/LocaleProvider';
import './documentPrint.css';

export interface DocumentPrintButtonProps {
  source?: string | null;
  showLabel?: boolean;
  className?: string;
}

/** One text/math renderer and one native print circuit for teacher and direction. */
export function DocumentPrintButton({ source, showLabel = false, className }: DocumentPrintButtonProps) {
  const { t } = useLocale();
  const [printing, setPrinting] = useState(false);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const paper = useRef<HTMLDivElement>(null);
  const cleanup = useRef<() => void>(() => {});
  useEffect(() => () => cleanup.current(), []);
  const print = async () => {
    if (!source?.trim() || printing || document.body.hasAttribute('data-document-print')) return;
    let timer: number | undefined;
    const release = () => {
      window.removeEventListener('afterprint', release);
      if (timer) window.clearTimeout(timer);
      document.body.removeAttribute('data-document-print');
      setPrinting(false);
      setSnapshot(null);
    };
    cleanup.current = release;
    document.body.setAttribute('data-document-print', 'a5');
    flushSync(() => { setPrinting(true); setSnapshot(source); });
    try {
      if (!paper.current) throw new Error('Print surface unavailable');
      await preparePrintContent(paper.current);
      fitDocumentMath(paper.current);
      window.addEventListener('afterprint', release, { once: true });
      timer = window.setTimeout(release, 120_000);
      const result = await printDocument('contenu-pedagogique-A5', 'A5');
      if (result === 'failed') throw new Error('Print failed');
      if (result !== 'confirmation-required') release();
    } catch {
      release();
      toast.error(t('documentPreview.printError'));
    }
  };
  return <>
    <button type="button" onClick={() => void print()} disabled={printing || !source?.trim()} aria-busy={printing}
      title={t('documentPreview.printA5')} aria-label={t('documentPreview.printA5')}
      className={className ?? (showLabel
        ? "inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-primary cursor-pointer"
        : "ms-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-primary cursor-pointer"
      )}>
      <Printer className={showLabel ? "h-4 w-4 shrink-0" : "h-5 w-5"} aria-hidden="true" />
      {showLabel && <span>{t('toolbar.print')}</span>}
    </button>
    {snapshot !== null && createPortal(<div className="pedagogical-print-root" ref={paper}>
      <style media="print">{'@page { size: A5 portrait; margin: 6mm 8mm; }'}</style>
      <article className="devoir-document" dir="auto">{renderDescriptionWithBold(snapshot)}</article>
    </div>, document.body)}
  </>;
}

