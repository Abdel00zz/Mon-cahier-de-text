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
      title={t('transfer.title')}
      description={t('transfer.description')}
      maxWidth="xl"
      footer={
        <>
          <Button type="button" onClick={onClose} variant="secondary" className="rounded-xl">{t('common.close')}</Button>
          {panel === 'export' ? (
            <Button type="button" onClick={onExport} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-5 shadow-sm">{t('transfer.export')}</Button>
          ) : (
            <Button type="button" onClick={handleImport} disabled={!jsonText || isReading || isImporting} aria-busy={isImporting} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-5 shadow-sm">{t('transfer.import')}</Button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        <Segmented<TransferPanel>
          value={panel}
          onChange={setPanel}
          ariaLabel={t('transfer.typeAria')}
          className="grid w-full grid-cols-2"
          options={[
            { value: 'import', label: t('transfer.import') },
            { value: 'export', label: t('transfer.export') },
          ]}
        />

        {panel === 'export' ? (
          <section className="flex flex-col items-start gap-3 py-1 sm:flex-row sm:items-center">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground">
              <FileDown className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-foreground">{t('transfer.exportTitle')}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t('transfer.exportHint')}
              </p>
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            {message && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2.5 text-xs leading-relaxed text-amber-900" role="status">
                <p className="font-bold">{t('transfer.checkFile')}</p>
                <p className="mt-0.5 text-amber-800/90">{message}</p>
              </div>
            )}

            <div>
              <label
                htmlFor="data-transfer-json-file"
                className="inline-flex min-h-24 w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-4 py-4 text-center text-muted-foreground transition-all hover:border-border hover:bg-muted hover:text-foreground"
              >
                <FileUp className="mb-2 h-5 w-5 text-muted-foreground" aria-hidden />
                <span className="text-xs font-bold text-foreground">{fileName || t('transfer.chooseFile')}</span>
                <span className="mt-1 text-[10px] text-muted-foreground font-medium">{t('transfer.fileLimit')}</span>
              </label>
              <input type="file" id="data-transfer-json-file" accept=".json,application/json" onChange={handleFileChange} className="sr-only" />
            </div>

            <details className="group rounded-xl bg-muted/65 border border-border/50 px-3 py-2.5">
              <summary className="cursor-pointer text-[11px] font-bold text-muted-foreground transition-colors hover:text-foreground">
                {t('transfer.pasteJson')}
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
                className="mt-3 h-32 resize-y bg-card border border-border focus:ring-0 focus:border-border font-mono text-xs"
              />
            </details>

            <div className="grid gap-2 sm:grid-cols-2" aria-label={t('transfer.modeAria')}>
              <button
                type="button"
                onClick={() => setImportMode('replace')}
                aria-pressed={importMode === 'replace'}
                className={`min-h-14 rounded-lg px-3 py-2 text-start transition-all duration-150 ${importMode === 'replace' ? 'bg-muted/60 text-foreground border border-border shadow-xs' : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
              >
                <span className="block text-xs font-bold">{t('transfer.replace')}</span>
                <span className="mt-0.5 block text-[10px] font-medium leading-normal text-muted-foreground">{t('transfer.replaceHint')}</span>
              </button>
              <button
                type="button"
                onClick={() => setImportMode('append')}
                aria-pressed={importMode === 'append'}
                className={`min-h-14 rounded-lg px-3 py-2 text-start transition-all duration-150 ${importMode === 'append' ? 'bg-muted/60 text-foreground border border-border shadow-xs' : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
              >
                <span className="block text-xs font-bold">{t('transfer.append')}</span>
                <span className="mt-0.5 block text-[10px] font-medium leading-normal text-muted-foreground">{t('transfer.appendHint')}</span>
              </button>
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
};
