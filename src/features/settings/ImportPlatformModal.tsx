import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { HardDriveUpload, FileUp, Loader2 } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useLocale } from '@/i18n/LocaleProvider';
import { MAX_JSON_FILE_BYTES, parseBoundedJson } from '@/domain/notebook/jsonInput';
import { StatusNotice } from '@/components/ui/status-notice';
import { ImportSummary } from '@/components/ui/import-summary';
import { inspectBackup } from '@/infrastructure/storage/backup';

interface ImportPlatformModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (fileContent: string) => boolean | void | Promise<boolean | void>;
}

export const ImportPlatformModal: React.FC<ImportPlatformModalProps> = ({ isOpen, onClose, onImport }) => {
  const { t } = useLocale();
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readRequestRef = useRef(0);
  const readerRef = useRef<FileReader | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [readError, setReadError] = useState('');
  const [preview, setPreview] = useState<ReturnType<typeof inspectBackup> | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const importingRef = useRef(false);

  useEffect(() => {
    readRequestRef.current += 1;
    readerRef.current?.abort();
    setIsReading(false);
    if (!isOpen) return;
    setFileContent(null);
    setFileName('');
    setIsConfirmed(false);
    setReadError('');
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    return () => { readRequestRef.current += 1; readerRef.current?.abort(); };
  }, [isOpen]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (importingRef.current) return;
      const requestId = ++readRequestRef.current;
      readerRef.current?.abort();
      setFileContent(null);
      setPreview(null);
      setIsConfirmed(false);
      setFileName(file.name);
      setReadError('');
      setIsReading(false);
      if (file.size > MAX_JSON_FILE_BYTES) { setReadError(t('transfer.fileTooLarge')); return; }
      const reader = new FileReader();
      readerRef.current = reader;
      setIsReading(true);
      reader.onload = (e) => {
        if (requestId !== readRequestRef.current) return;
        const content = typeof e.target?.result === 'string' ? e.target.result : '';
        try {
          setPreview(inspectBackup(parseBoundedJson(content)));
          setFileContent(content);
        } catch {
          setPreview(null);
          setFileContent(null);
          setReadError(t('transfer.preview.invalidBackup'));
        }
        setIsReading(false);
      };
      reader.onerror = () => {
        if (requestId !== readRequestRef.current) return;
        setIsReading(false);
        setReadError(t('transfer.readError'));
      };
      reader.readAsText(file);
      setFileName(file.name);
    }
  };

  const handleImport = async () => {
    if (!fileContent || !preview || !isConfirmed || isReading || importingRef.current) return;
    importingRef.current = true;
    setIsImporting(true);
    try {
      if (await onImport(fileContent) === false) setReadError(t('transfer.preview.restoreFailed'));
    } catch { setReadError(t('transfer.preview.restoreFailed')); }
    finally { importingRef.current = false; setIsImporting(false); }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { if (!importingRef.current) onClose(); }}
      blockDismiss={isImporting}
      closeDisabled={isImporting}
      title={
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <HardDriveUpload className="h-5 w-5 stroke-[1.8]" aria-hidden />
          </span>
          <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
            {t('settings.importModal.title')}
          </span>
        </div>
      }
      maxWidth="xl"
      className="sm:max-w-2xl sm:rounded-2xl"
      headerClassName="border-b-0 bg-background/60"
      bodyClassName="px-5 py-4 sm:px-7 sm:py-5"
      footerClassName="border-t-0 bg-background/60"
      footer={
        <div className="flex w-full items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isImporting}>{t('common.cancel')}</Button>
          <Button variant="destructive" onClick={() => void handleImport()} disabled={!preview || !isConfirmed || isReading || isImporting} aria-busy={isImporting}>
            {isImporting ? <Loader2 aria-hidden className="animate-spin motion-reduce:animate-none"/> : <HardDriveUpload aria-hidden />}{t(isImporting ? 'common.loading' : 'settings.importModal.importAction')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {readError && <StatusNotice tone="error" title={t('transfer.checkFile')} description={readError} announce />}
        <StatusNotice tone="warning" title={t('settings.importModal.irreversibleTitle')}
          description={<>{t('settings.importModal.warningBeforeAll')} <strong>{t('settings.importModal.all')}</strong> {t('settings.importModal.warningAfterAll')}</>} />
        <div>
          <label
            htmlFor="platform-json-file-input"
            className="file-picker group relative inline-flex min-h-32 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-center transition-all hover:border-primary/50 hover:bg-muted/40"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card border border-border/80 shadow-xs mb-2.5 text-muted-foreground transition-transform duration-200 group-hover:scale-105">
              <FileUp className="h-6 w-6 stroke-[1.8]" aria-hidden />
            </div>
            <span className="max-w-full break-all font-semibold text-sm text-foreground">
              {isReading ? t('common.loading') : fileName || t('settings.importModal.chooseFile')}
            </span>
            <span className="text-[11px] text-muted-foreground font-medium mt-1">{t('settings.importModal.jsonOnly')}</span>
          </label>
          <input ref={fileInputRef} type="file" id="platform-json-file-input" accept=".json" onChange={handleFileChange} disabled={isImporting} className="sr-only" />
        </div>

        {preview && <ImportSummary fileName={fileName} {...preview} date={preview.exportedAt}/>}
        {preview && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <label className="flex min-h-11 items-center gap-3 cursor-pointer text-foreground">
              <Checkbox
                checked={isConfirmed}
                disabled={isImporting}
                onCheckedChange={(checked) => setIsConfirmed(checked === true)}
                className="border-destructive/40 data-[state=checked]:bg-destructive data-[state=checked]:text-destructive-foreground data-[state=checked]:border-destructive"
              />
              <span className="text-xs sm:text-sm font-bold text-destructive select-none">
                {t('settings.importModal.confirm')}
              </span>
            </label>
          </div>
        )}
      </div>
    </Modal>
  );
};
