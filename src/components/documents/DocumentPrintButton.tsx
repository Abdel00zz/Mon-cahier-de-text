import { useEffect, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { toast } from 'sonner';
import { SheetPrinter } from '../ui/icons';
import { renderDescriptionWithBold } from '../typography/textFormat';
import { preparePrintContent, printDocument } from '../../infrastructure/printing/printUtils';
import { fitDocumentMath } from '../../infrastructure/printing/documentMathLayout';
import { headerTitleFor } from '../../domain/evaluations/documentSheet';
import { resolveDocumentDirection, textDirectionAttribute } from '../../lib/text/textDirection';
import { useLocale } from '../../i18n/LocaleProvider';
import { DocumentSheetHeader } from './DocumentSheetHeader';
import './documentPrint.css';
import './documentSheet.css';

export interface DocumentPrintButtonProps {
  source?: string | null;
  /** Titre de l'élément, porté en en-tête de la page imprimée. */
  title?: string;
  /** Classe, portée à l'autre bord de l'en-tête. */
  classLabel?: string;
  className?: string;
}

/** One text/math renderer and one native print circuit for teacher and direction. */
export function DocumentPrintButton({ source, title, classLabel, className }: DocumentPrintButtonProps) {
  const { t, isRtl } = useLocale();
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
  // Même sens que l'aperçu : la première lettre hors formules décide, la langue de l'interface départage.
  const sheetDir = textDirectionAttribute(snapshot ?? source) ?? resolveDocumentDirection(snapshot ?? source, title, isRtl ? 'rtl' : 'ltr');
  return <>
    {/* Icône seule : le nom accessible et l'infobulle disent « Imprimer au format A5 ». */}
    <button type="button" onClick={() => void print()} disabled={printing || !source?.trim()} aria-busy={printing}
      title={t('documentPreview.printA5')} aria-label={t('documentPreview.printA5')}
      className={className ? `doc-icon-btn ${className}` : 'doc-icon-btn'}>
      <SheetPrinter aria-hidden="true" />
    </button>
    {snapshot !== null && createPortal(<div className="pedagogical-print-root" ref={paper} dir={sheetDir}>
      <style media="print">{'@page { margin: 7mm 0; }'}</style>
      <DocumentSheetHeader title={headerTitleFor(title, snapshot)} classLabel={classLabel} dir={sheetDir} />
      <article className="devoir-document" dir={sheetDir}>{renderDescriptionWithBold(snapshot)}</article>
    </div>, document.body)}
  </>;
}
