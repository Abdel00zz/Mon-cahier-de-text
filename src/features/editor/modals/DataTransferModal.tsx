import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { FileDown, FileUp, HardDriveDownload, HardDriveUpload, Loader2 } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Segmented } from '@/components/ui/segmented';
import { useLocale } from '@/i18n/LocaleProvider';
import { numberFormat } from '@/lib/formatters';
import { MAX_JSON_FILE_BYTES, parseBoundedJson } from '@/domain/notebook/jsonInput';
import { StatusNotice } from '@/components/ui/status-notice';

/** Bloc de premier niveau du cahier ouvert, tel que la liste d'export le montre. */
export interface ExportableChapterOption {
  index: number;
  type: string;
  title: string;
  date: string;
  items: number;
  bytes: number;
}

interface DataTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Renvoie false si le contenu ne peut pas être appliqué : la modale reste ouverte. */
  onImport: (data: unknown, mode: 'replace' | 'append') => Promise<boolean> | boolean;
  /** `null` = tout le cahier ; sinon, les positions des blocs cochés. */
  onExport: (chapters: number[] | null) => void;
  /** Blocs de premier niveau du cahier ouvert, dans son ordre. */
  chapters: ExportableChapterOption[];
}

type TransferPanel = 'import' | 'export';
type ExportScope = 'all' | 'chapters';

export const DataTransferModal: React.FC<DataTransferModalProps> = ({ isOpen, onClose, onImport, onExport, chapters }) => {
  const { locale, t } = useLocale();
  const number = numberFormat(locale);
  const [panel, setPanel] = useState<TransferPanel>('import');
  const [jsonText, setJsonText] = useState('');
  const [fileName, setFileName] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [message, setMessage] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  /*
   * EXPORT : deux périmètres. « Tout le cahier » reste le geste d'un clic ;
   * « chapitres choisis » sert à archiver une leçon ou à l'échanger — ce que le
   * fichier complet ne permet pas (au-delà de 10 Mo il n'est plus importable).
   * Tout est coché par défaut : décocher ce dont on ne veut pas est plus court
   * que cocher dix chapitres un par un.
   */
  const [scope, setScope] = useState<ExportScope>('all');
  const [picked, setPicked] = useState<number[]>([]);
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
    setScope('all');
    /*
     * Tout est coché à l'ouverture : décocher ce dont on ne veut pas est plus
     * court que cocher dix chapitres un par un. La liste n'est PAS une
     * dépendance de cet effet — elle est recalculée à chaque ouverture, et la
     * relire ici décocherait ce que le professeur vient de choisir.
     */
    setPicked(chapters.map(chapter => chapter.index));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const requestId = ++readRequestRef.current;
    setIsReading(false);
    setJsonText('');
    setFileName(file.name);
    setMessage(null);
    if (file.size > MAX_JSON_FILE_BYTES) {
      setMessage(t('transfer.fileTooLarge'));
      return;
    }

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
      const parsed = parseBoundedJson(jsonText);
      const imported = await onImport(parsed, importMode);
      if (!imported) return;
    } catch (error) {
      const detail = error instanceof Error ? error.message : t('transfer.invalidJson');
      setMessage(t('transfer.importError', { detail }));
    } finally {
      setIsImporting(false);
    }
  };

  /*
   * Ce que l'export va peser. Les octets viennent du domaine (JSON compact) ;
   * l'affichage reste approximatif et le dit, tandis que la garde EXACTE est
   * posée par l'éditeur au moment d'écrire le fichier.
   */
  const weight = useMemo(() => {
    const total = chapters.reduce((sum, chapter) => sum + chapter.bytes, 0);
    const chosen = chapters.filter(chapter => picked.includes(chapter.index));
    return {
      all: total,
      picked: chosen.reduce((sum, chapter) => sum + chapter.bytes, 0),
      items: chosen.reduce((sum, chapter) => sum + chapter.items, 0),
      tooManyBytes: total > MAX_JSON_FILE_BYTES,
    };
  }, [chapters, picked]);

  const formatSize = (bytes: number): string => {
    const ko = bytes / 1024;
    return `${number.format(ko >= 10 ? Math.round(ko) : Math.round(ko * 10) / 10)} ko`;
  };

  /** Nom lisible d'un bloc : son titre, sinon le nom localisé de son type. */
  const chapterLabel = (chapter: ExportableChapterOption): string => {
    if (chapter.title) return chapter.title;
    const key = `manageLessons.type.${chapter.type}`;
    const label = t(key);
    return label === key ? t('transfer.chapterUntitled') : label;
  };

  const allPicked = chapters.length > 0 && picked.length === chapters.length;
  const exportChapters = scope === 'all' ? null : picked;
  const exportDisabled = scope === 'chapters' && picked.length === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      blockDismiss={isImporting}
      closeDisabled={isImporting}
      title={
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
            {panel === 'export' ? <FileDown className="h-5 w-5 stroke-[2.2]" /> : <FileUp className="h-5 w-5 stroke-[2.2]" />}
          </span>
          <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
            {t('transfer.title')}
          </span>
        </div>
      }
      maxWidth="xl"
      className="sm:max-w-2xl sm:rounded-2xl"
      headerClassName="border-b-0 bg-background"
      bodyClassName="px-5 py-4 sm:px-7 sm:py-5"
      footerClassName="border-t-0 bg-background"
      footer={
        <div className="flex w-full items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isImporting}>{t('common.close')}</Button>
          {panel === 'export'
            ? <Button onClick={() => onExport(exportChapters)} disabled={exportDisabled}>
                <HardDriveDownload aria-hidden />
                {scope === 'all' ? t('transfer.export') : t('transfer.exportSelected')}
              </Button>
            : <Button onClick={() => void handleImport()} disabled={!jsonText || isReading || isImporting} aria-busy={isImporting}>
                {isImporting ? <Loader2 aria-hidden className="animate-spin motion-reduce:animate-none" /> : <HardDriveUpload aria-hidden />}
                {isImporting ? t('common.loading') : t('transfer.import')}
              </Button>}
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
            { value: 'import', label: t('transfer.import'), disabled: isImporting },
            { value: 'export', label: t('transfer.export'), disabled: isImporting },
          ]}
        />

        {panel === 'export' ? (
          <section className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-background p-4 shadow-xs">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-muted/60 text-primary shadow-2xs">
                <FileDown className="h-5 w-5 stroke-[2.2]" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-foreground sm:text-base">{t('transfer.exportTitle')}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground text-pretty">
                  {t('transfer.exportHint')}
                </p>
              </div>
            </div>

            {/* Deux périmètres : tout, ou seulement les blocs cochés. */}
            <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label={t('transfer.exportScopeAria')}>
              <button
                type="button"
                role="radio"
                aria-checked={scope === 'all'}
                onClick={() => setScope('all')}
                className={`min-h-16 rounded-xl px-4 py-3 text-start transition-all duration-150 cursor-pointer ${scope === 'all' ? 'bg-primary/[0.08] text-foreground border-2 border-primary/50 shadow-xs' : 'bg-background border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40'}`}
              >
                <span className="block text-xs font-bold text-foreground">{t('transfer.scopeAll')}</span>
                <span className="mt-0.5 block text-[11px] font-medium leading-normal text-muted-foreground">{t('transfer.scopeAllHint')}</span>
              </button>
              {chapters.length > 0 && (
                <button
                  type="button"
                  role="radio"
                  aria-checked={scope === 'chapters'}
                  onClick={() => setScope('chapters')}
                  className={`min-h-16 rounded-xl px-4 py-3 text-start transition-all duration-150 cursor-pointer ${scope === 'chapters' ? 'bg-primary/[0.08] text-foreground border-2 border-primary/50 shadow-xs' : 'bg-background border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40'}`}
                >
                  <span className="block text-xs font-bold text-foreground">{t('transfer.scopeChapters')}</span>
                  <span className="mt-0.5 block text-[11px] font-medium leading-normal text-muted-foreground">{t('transfer.scopeChaptersHint')}</span>
                </button>
              )}
            </div>

            {scope === 'chapters' && chapters.length > 0 && (
              <div className="rounded-xl border border-border/70 bg-background p-2 shadow-xs">
                <div className="flex items-center justify-between gap-2 px-1.5 py-1">
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{t('transfer.chaptersAria')}</span>
                  <button
                    type="button"
                    onClick={() => setPicked(allPicked ? [] : chapters.map(chapter => chapter.index))}
                    className="min-h-9 shrink-0 rounded-lg px-2 text-[11px] font-semibold text-primary transition-colors hover:bg-accent cursor-pointer"
                  >
                    {allPicked ? t('transfer.clearChapters') : t('transfer.selectAllChapters')}
                  </button>
                </div>
                <ul className="max-h-60 overflow-y-auto overscroll-contain">
                  {chapters.map(chapter => {
                    const checked = picked.includes(chapter.index);
                    return (
                      <li key={chapter.index} className="min-w-0">
                        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/40">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => setPicked(current =>
                              current.includes(chapter.index)
                                ? current.filter(index => index !== chapter.index)
                                : [...current, chapter.index].sort((a, b) => a - b))}
                            aria-label={chapterLabel(chapter)}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-foreground">{chapterLabel(chapter)}</span>
                            <span className="block text-[11px] font-medium tabular-nums text-muted-foreground">
                              {chapter.items === 1 ? t('transfer.chapterItemsOne') : t('transfer.chapterItems', { count: chapter.items })}
                              {' · '}
                              {formatSize(chapter.bytes)}
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* L'aperçu dit ce que le fichier contiendra AVANT de le produire. */}
            <p role="status" aria-live="polite" className="rounded-xl border border-border/70 bg-muted/30 px-4 py-2.5 text-xs font-semibold text-muted-foreground tabular-nums">
              {t('transfer.exportSize', {
                size: formatSize(scope === 'all' || weight.picked === 0 ? weight.all : weight.picked),
              })}
            </p>
          </section>
        ) : (
          <section className="space-y-4">
            {message && (
              <StatusNotice tone="error" title={t('transfer.checkFile')} description={message} announce />
            )}

            <div>
              <label
                htmlFor="data-transfer-json-file"
                className="file-picker inline-flex min-h-28 w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-5 py-5 text-center text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/40"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background border border-border/80 shadow-2xs mb-2 text-primary">
                  <FileUp className="h-5 w-5 stroke-[2.2]" aria-hidden />
                </div>
                <span className="max-w-full break-all text-sm font-semibold text-foreground">{isReading ? t('common.loading') : fileName || t('transfer.chooseFile')}</span>
                <span className="mt-1 text-[11px] text-muted-foreground font-medium">{t('transfer.fileLimit')}</span>
              </label>
              <input type="file" id="data-transfer-json-file" accept=".json,application/json" onChange={handleFileChange} disabled={isImporting} className="sr-only" />
            </div>

            <details className="group rounded-xl bg-background border border-border/70 px-4 py-3 shadow-xs">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                <span>{t('transfer.pasteJson')}</span>
                <span className="text-[10px] uppercase font-bold text-primary font-mono">{jsonText ? 'JSON ✓' : '+'}</span>
              </summary>
              <Textarea
                aria-label={t('transfer.pasteJson')}
                disabled={isImporting}
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
                className={`min-h-16 rounded-xl px-4 py-3 text-start transition-all duration-150 ${importMode === 'replace' ? 'bg-primary/[0.08] text-foreground border-2 border-primary/50 shadow-xs' : 'bg-background border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40'}`}
              >
                <span className="block text-xs font-bold text-foreground">{t('transfer.replace')}</span>
                <span className="mt-0.5 block text-[11px] font-medium leading-normal text-muted-foreground">{t('transfer.replaceHint')}</span>
              </button>
              <button
                type="button"
                onClick={() => setImportMode('append')}
                aria-pressed={importMode === 'append'}
                className={`min-h-16 rounded-xl px-4 py-3 text-start transition-all duration-150 ${importMode === 'append' ? 'bg-primary/[0.08] text-foreground border-2 border-primary/50 shadow-xs' : 'bg-background border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40'}`}
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
