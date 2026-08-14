import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { FileDown, FileUp } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Segmented } from '@/components/ui/segmented';
import { useLocale } from '@/i18n/LocaleProvider';

interface DataTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Renvoie false si le contenu ne peut pas être appliqué : la modale reste ouverte. */
  onImport: (data: unknown, mode: 'replace' | 'append') => Promise<boolean> | boolean;
  onExport: () => void;
}

type TransferPanel = 'import' | 'export';

export const DataTransferModal: React.FC<DataTransferModalProps> = ({ isOpen, onClose, onImport, onExport }) => {
  const { t } = useLocale();
  const [panel, setPanel] = useState<TransferPanel>('import');
  const [jsonText, setJsonText] = useState('');
  const [fileName, setFileName] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [message, setMessage] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  // Un fichier A peut finir de se lire après le fichier B. Ce compteur rend
  // le dernier choix seul autorisé à mettre à jour la modale.
  const readRequestRef = useRef(0);

  useEffect(() => {
    readRequestRef.current += 1;
    if (!isOpen) {
      setIsReading(false);
      setIsImporting(false);
      return;
    }
    setPanel('import');
    setJsonText('');
    setFileName('');
    setImportMode('replace');
    setMessage(null);
    setIsReading(false);
    setIsImporting(false);
  }, [isOpen]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage(null);
    if (file.size > 10 * 1024 * 1024) {
      setMessage(t('transfer.fileTooLarge'));
      return;
    }

    const requestId = ++readRequestRef.current;
    setIsReading(true);
    setJsonText('');
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      if (requestId !== readRequestRef.current) return;
      setJsonText(typeof e.target?.result === 'string' ? e.target.result : '');
      setFileName(file.name);
      setIsReading(false);
    };
    reader.onerror = () => {
      if (requestId !== readRequestRef.current) return;
      setIsReading(false);
      setMessage(t('transfer.readError'));
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (isReading || isImporting) return;
    setMessage(null);
    setIsImporting(true);
    try {
      const parsed = JSON.parse(jsonText);
      const imported = await onImport(parsed, importMode);
      if (!imported) return;
    } catch (error) {
      const detail = error instanceof Error ? error.message : t('transfer.invalidJson');
      setMessage(t('transfer.importError', { detail }));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
            {panel === 'export' ? <FileDown className="h-5 w-5 stroke-[2.2]" /> : <FileUp className="h-5 w-5 stroke-[2.2]" />}
          </span>
          <span className="text-base sm:text-lg font-bold text-foreground">
            {t('transfer.title')}
          </span>
        </div>
      }
      description={t('transfer.description')}
      maxWidth="xl"
      className="sm:max-w-2xl sm:rounded-[28px]"
      headerClassName="px-5 pt-5 pb-3.5 sm:px-7 sm:pt-6 sm:pb-4 border-b border-border/50 bg-card/60"
      bodyClassName="px-5 py-4 sm:px-7 sm:py-5"
      footerClassName="px-5 py-3.5 sm:px-7 sm:py-4 border-t border-border/50 bg-card/60"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button type="button" onClick={onClose} variant="secondary" className="rounded-xl h-10 px-4 text-xs font-semibold sm:text-sm">
            {t('common.close')}
          </Button>
          {panel === 'export' ? (
            <Button type="button" onClick={onExport} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-5 h-10 text-xs sm:text-sm shadow-sm">
              {t('transfer.export')}
            </Button>
          ) : (
            <Button type="button" onClick={handleImport} disabled={!jsonText || isReading || isImporting} aria-busy={isImporting} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-5 h-10 text-xs sm:text-sm shadow-sm">
              {t('transfer.import')}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        <Segmented<TransferPanel>
          value={panel}
          onChange={setPanel}
          ariaLabel={t('transfer.typeAria')}
          className="grid w-full grid-cols-2 max-w-sm mx-auto"
          options={[
            { value: 'import', label: t('transfer.import') },
            { value: 'export', label: t('transfer.export') },
          ]}
        />

        {panel === 'export' ? (
          <section className="flex flex-col items-start gap-4 p-5 rounded-2xl border border-border/70 bg-card shadow-xs sm:flex-row sm:items-center">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-muted/60 text-primary shadow-2xs">
              <FileDown className="h-6 w-6" aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-foreground sm:text-base">{t('transfer.exportTitle')}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t('transfer.exportHint')}
              </p>
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            {message && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] px-4 py-3 text-xs leading-relaxed text-amber-900 dark:text-amber-200" role="status">
                <p className="font-bold">{t('transfer.checkFile')}</p>
                <p className="mt-0.5 text-amber-800/90 dark:text-amber-300">{message}</p>
              </div>
            )}

            <div>
              <label
                htmlFor="data-transfer-json-file"
                className="inline-flex min-h-28 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/80 bg-muted/30 px-5 py-5 text-center text-muted-foreground transition-all hover:border-primary/50 hover:bg-muted/60 hover:text-foreground"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card border border-border/80 shadow-2xs mb-2 text-primary">
                  <FileUp className="h-5 w-5" aria-hidden />
                </div>
                <span className="text-xs sm:text-sm font-bold text-foreground">{fileName || t('transfer.chooseFile')}</span>
                <span className="mt-1 text-[11px] text-muted-foreground font-medium">{t('transfer.fileLimit')}</span>
              </label>
              <input type="file" id="data-transfer-json-file" accept=".json,application/json" onChange={handleFileChange} className="sr-only" />
            </div>

            <details className="group rounded-2xl bg-card border border-border/70 px-4 py-3 shadow-xs">
              <summary className="cursor-pointer text-xs font-bold text-muted-foreground transition-colors hover:text-foreground list-none flex items-center justify-between">
                <span>{t('transfer.pasteJson')}</span>
                <span className="text-[10px] uppercase font-bold text-primary font-mono">{jsonText ? 'JSON ✓' : '+'}</span>
              </summary>
              <Textarea
                value={jsonText}
                onChange={event => {
                  readRequestRef.current += 1;
                  setJsonText(event.target.value);
                  setFileName('');
                  setMessage(null);
                  setIsReading(false);
                }}
                placeholder={t('transfer.pastePlaceholder')}
                className="mt-3 min-h-32 resize-y bg-background border border-border/80 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono text-xs p-3 leading-relaxed"
              />
            </details>

            <div className="grid gap-2.5 sm:grid-cols-2" aria-label={t('transfer.modeAria')}>
              <button
                type="button"
                onClick={() => setImportMode('replace')}
                aria-pressed={importMode === 'replace'}
                className={`min-h-16 rounded-2xl px-4 py-3 text-start transition-all duration-150 ${importMode === 'replace' ? 'bg-primary/[0.08] text-foreground border-2 border-primary/50 shadow-xs' : 'bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40'}`}
              >
                <span className="block text-xs font-bold text-foreground">{t('transfer.replace')}</span>
                <span className="mt-0.5 block text-[11px] font-medium leading-normal text-muted-foreground">{t('transfer.replaceHint')}</span>
              </button>
              <button
                type="button"
                onClick={() => setImportMode('append')}
                aria-pressed={importMode === 'append'}
                className={`min-h-16 rounded-2xl px-4 py-3 text-start transition-all duration-150 ${importMode === 'append' ? 'bg-primary/[0.08] text-foreground border-2 border-primary/50 shadow-xs' : 'bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40'}`}
              >
                <span className="block text-xs font-bold text-foreground">{t('transfer.append')}</span>
                <span className="mt-0.5 block text-[11px] font-medium leading-normal text-muted-foreground">{t('transfer.appendHint')}</span>
              </button>
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
};
