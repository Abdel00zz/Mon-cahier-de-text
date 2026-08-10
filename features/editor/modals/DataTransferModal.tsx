import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { FileDown, FileUp } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useLocale } from '@/i18n/LocaleProvider';

interface DataTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any, mode: 'replace' | 'append') => void;
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

  useEffect(() => {
    if (!isOpen) return;
    setPanel('import');
    setJsonText('');
    setFileName('');
    setImportMode('replace');
    setMessage(null);
  }, [isOpen]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage(null);
    if (file.size > 10 * 1024 * 1024) {
      setMessage(t('transfer.fileTooLarge'));
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      setJsonText(typeof e.target?.result === 'string' ? e.target.result : '');
      setFileName(file.name);
    };
    reader.onerror = () => setMessage(t('transfer.readError'));
    reader.readAsText(file);
  };

  const handleImport = () => {
    setMessage(null);
    try {
      const parsed = JSON.parse(jsonText);
      onImport(parsed, importMode);
    } catch (error) {
      const detail = error instanceof Error ? error.message : t('transfer.invalidJson');
      setMessage(t('transfer.importError', { detail }));
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
            <Button type="button" onClick={handleImport} disabled={!jsonText} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-5 shadow-sm">{t('transfer.import')}</Button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1" role="tablist" aria-label={t('transfer.typeAria')}>
          <button
            type="button"
            role="tab"
            aria-selected={panel === 'import'}
            onClick={() => setPanel('import')}
            className={`min-h-9 rounded-lg px-3 font-mono text-[10px] font-extrabold uppercase tracking-wide transition-all duration-150 ${panel === 'import' ? 'bg-white text-zinc-800 shadow-xs border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-800'}`}
          >
            {t('transfer.import')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={panel === 'export'}
            onClick={() => setPanel('export')}
            className={`min-h-9 rounded-lg px-3 font-mono text-[10px] font-extrabold uppercase tracking-wide transition-all duration-150 ${panel === 'export' ? 'bg-white text-zinc-800 shadow-xs border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-800'}`}
          >
            {t('transfer.export')}
          </button>
        </div>

        {panel === 'export' ? (
          <section className="flex flex-col items-start gap-3 py-1 sm:flex-row sm:items-center">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700">
              <FileDown className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-zinc-800">{t('transfer.exportTitle')}</h3>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
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
                className="inline-flex min-h-24 w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-4 text-center text-zinc-500 transition-all hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-800"
              >
                <FileUp className="mb-2 h-5 w-5 text-zinc-400" aria-hidden />
                <span className="text-xs font-bold text-zinc-700">{fileName || t('transfer.chooseFile')}</span>
                <span className="mt-1 text-[10px] text-zinc-400 font-medium">{t('transfer.fileLimit')}</span>
              </label>
              <input type="file" id="data-transfer-json-file" accept=".json,application/json" onChange={handleFileChange} className="sr-only" />
            </div>

            <details className="group rounded-xl bg-zinc-50/65 border border-zinc-200/50 px-3 py-2.5">
              <summary className="cursor-pointer text-[11px] font-bold text-zinc-500 transition-colors hover:text-zinc-800">
                {t('transfer.pasteJson')}
              </summary>
              <Textarea
                value={jsonText}
                onChange={event => {
                  setJsonText(event.target.value);
                  setFileName('');
                  setMessage(null);
                }}
                placeholder={t('transfer.pastePlaceholder')}
                className="mt-3 h-32 resize-y bg-white border border-zinc-200 focus:ring-0 focus:border-zinc-300 font-mono text-xs"
              />
            </details>

            <div className="grid gap-2 sm:grid-cols-2" aria-label={t('transfer.modeAria')}>
              <button
                type="button"
                onClick={() => setImportMode('replace')}
                aria-pressed={importMode === 'replace'}
                className={`min-h-14 rounded-lg px-3 py-2 text-start transition-all duration-150 ${importMode === 'replace' ? 'bg-zinc-100/60 text-zinc-800 border border-zinc-300 shadow-xs' : 'bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50/50'}`}
              >
                <span className="block text-xs font-bold">{t('transfer.replace')}</span>
                <span className="mt-0.5 block text-[10px] font-medium leading-normal text-zinc-500">{t('transfer.replaceHint')}</span>
              </button>
              <button
                type="button"
                onClick={() => setImportMode('append')}
                aria-pressed={importMode === 'append'}
                className={`min-h-14 rounded-lg px-3 py-2 text-start transition-all duration-150 ${importMode === 'append' ? 'bg-zinc-100/60 text-zinc-800 border border-zinc-300 shadow-xs' : 'bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50/50'}`}
              >
                <span className="block text-xs font-bold">{t('transfer.append')}</span>
                <span className="mt-0.5 block text-[10px] font-medium leading-normal text-zinc-500">{t('transfer.appendHint')}</span>
              </button>
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
};
