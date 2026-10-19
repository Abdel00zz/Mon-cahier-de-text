import React, { useState } from 'react';
import { AppConfig } from '@/types';
import { formatDateDDMMYYYY } from '@/domain/notebook/dataUtils';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Printer, CalendarCheck, CalendarDays, FileText } from '@/components/ui/icons';
import { DescriptionVisibilityControl } from '@/features/settings/components/DescriptionVisibilityControl';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Segmented } from '@/components/ui/segmented';
import { useLocale } from '@/i18n/LocaleProvider';
import './PrintModal.css';

export type PrintMode = 'new' | 'all' | 'custom';
export type PrintHeaderMode = 'first' | 'all' | 'none';
type PrintTextSize = 's' | 'm' | 'l';
type PrintLineSpacing = 'compact' | 'normal' | 'aere';
export interface PrintOptions {
  pageNumbers: boolean;
  /** conserver les couleurs pédagogiques des badges et repères */
  colorContent?: boolean;
  /** affichage de l'en-tête administratif dans le document imprimé */
  headerMode: PrintHeaderMode;
  /** taille du texte du document imprimé */
  textSize: PrintTextSize;
  /** espacement entre les lignes (aération) */
  lineSpacing: PrintLineSpacing;
}

interface PrintModalProps {
  classId: string;
  isOpen: boolean;
  onClose: () => void;
  /** nombre total de séances datées du cahier */
  totalDates: number;
  /** dates jamais imprimées */
  newDates: string[];
  /** toutes les dates de séances datées (triées), pour la sélection à la séance */
  allDates: string[];
  /** dates déjà imprimées (pour marquer la liste) */
  printedDates: string[];
  /** dernière impression enregistrée (ISO) ou null */
  lastPrintedAt: string | null;
  /** dernières préférences de mise en page mémorisées pour cette classe */
  savedPrefs?: PrintOptions | null;
  /**
   * false lorsque l'historique d'impression n'est pas consultable (impression
   * depuis la direction : l'historique reste sur l'appareil de l'enseignant).
   * La modale masque alors l'état « déjà imprimé » au lieu d'annoncer un faux
   * zéro, et ne propose que les modes document complet / séances choisies.
   */
  historyKnown?: boolean;
  isPrinting?: boolean;
  config: AppConfig;
  onConfigChange: (patch: Partial<AppConfig>) => void;
  onPrint: (mode: PrintMode, options: PrintOptions, selectedDates?: string[]) => void;
}

/**
 * Modale d'impression intelligente : montre CE qui a déjà été imprimé et
 * CE qui est nouveau, et recommande le mode le plus économique.
 */
export const PrintModal: React.FC<PrintModalProps> = ({
  classId,
  isOpen,
  onClose,
  totalDates,
  newDates,
  allDates,
  printedDates,
  lastPrintedAt,
  savedPrefs,
  historyKnown = true,
  isPrinting = false,
  config,
  onConfigChange,
  onPrint,
}) => {
  const { t, locale } = useLocale();
  const number = React.useMemo(() => new Intl.NumberFormat(locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-MA'), [locale]);
  const sessionCountLabel = (count: number) => {
    if (count === 1) return t('print.sessionOne', { count: number.format(count) });
    if (count === 2) return t('print.sessionTwo', { count: number.format(count) });
    return t('print.sessionMany', { count: number.format(count) });
  };
  const hasHistory = lastPrintedAt !== null;
  // sans historique consultable, « nouveauté » n'a aucun sens : on ne
  // recommande jamais un mode qui prétendrait savoir ce qui a déjà été tiré.
  const recommendNew = historyKnown && hasHistory && newDates.length > 0;
  const [mode, setMode] = useState<PrintMode>(recommendNew ? 'new' : 'all');
  const [pageNumbers, setPageNumbers] = useState(savedPrefs?.pageNumbers ?? true);
  const [colorContent, setColorContent] = useState(savedPrefs?.colorContent ?? false);
  const [headerMode, setHeaderMode] = useState<PrintHeaderMode>(savedPrefs?.headerMode ?? 'first');
  const [textSize, setTextSize] = useState<PrintTextSize>(savedPrefs?.textSize ?? 'm');
  const [lineSpacing, setLineSpacing] = useState<PrintLineSpacing>(savedPrefs?.lineSpacing ?? 'normal');
  // sélection à la séance : par défaut, les nouveautés (ou tout si aucune nouveauté)
  const [selectedDates, setSelectedDates] = useState<Set<string>>(
    () => new Set(newDates.length > 0 ? newDates : allDates)
  );
  const printedSet = React.useMemo(() => new Set(printedDates), [printedDates]);
  const openedClass = React.useRef<string | null>(null);
  const toggleDate = (date: string) =>
    setSelectedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });

  // à chaque ouverture : resynchronise le mode recommandé, la sélection de
  // séances et les préférences de mise en page mémorisées pour cette classe.
  React.useEffect(() => {
    if (!isOpen) { openedClass.current = null; return; }
    if (openedClass.current === classId) return;
    openedClass.current = classId;
    setMode(recommendNew ? 'new' : 'all');
    setSelectedDates(new Set(newDates.length > 0 ? newDates : allDates));
    if (savedPrefs) {
      setPageNumbers(savedPrefs.pageNumbers);
      setColorContent(savedPrefs.colorContent ?? false);
      setHeaderMode(savedPrefs.headerMode ?? 'first');
      setTextSize(savedPrefs.textSize);
      setLineSpacing(savedPrefs.lineSpacing);
    } else {
      // Évite de réutiliser silencieusement les préférences d'une autre
      // classe lorsque celle-ci n'a encore aucune préférence enregistrée.
      setPageNumbers(true);
      setColorContent(false);
      setHeaderMode('first');
      setTextSize('m');
      setLineSpacing('normal');
    }
  }, [classId, allDates, isOpen, newDates, recommendNew, savedPrefs]);

  React.useEffect(() => {
    if (!isOpen) return;
    const available = new Set(allDates);
    setSelectedDates(previous => {
      const valid = new Set([...previous].filter(date => available.has(date)));
      return valid.size === previous.size ? previous : valid;
    });
    if (newDates.length === 0) setMode(previous => previous === 'new' ? 'all' : previous);
  }, [allDates, isOpen, newDates.length]);

  const printModes: Array<{
    value: PrintMode;
    label: string;
    title: string;
    subtitle: string;
    badge?: string;
    disabled?: boolean;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    // Le mode « nouveautés » n'a de sens que si l'historique est consultable.
    ...(historyKnown ? [{
      value: 'new' as PrintMode,
      label: t('print.modeNew'),
      title: t('print.newOnly'),
      subtitle: newDates.length > 0
        ? t(newDates.length === 1 ? 'print.newSubtitleOne' : 'print.newSubtitleMany', { count: number.format(newDates.length) })
        : t(totalDates === 0 ? 'print.noDates' : 'print.noNew'),
      badge: recommendNew ? t('print.recommended') : undefined,
      disabled: newDates.length === 0,
      icon: CalendarCheck,
    }] : []),
    {
      value: 'all',
      label: t('print.modeAll'),
      title: t('print.fullDocument'),
      subtitle: t('print.fullSubtitle'),
      icon: FileText,
    },
    {
      value: 'custom',
      label: t('print.modeCustom'),
      title: t('print.customTitle'),
      subtitle: t('print.customSubtitle'),
      disabled: allDates.length === 0,
      icon: CalendarDays,
    },
  ];
  const activeMode = printModes.find(item => item.value === mode) ?? printModes[historyKnown ? 1 : 0];

  return (
    <Modal
      isOpen={isOpen}
      blockDismiss={isPrinting}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
            <Printer className="h-5 w-5 stroke-[2.2]" />
          </span>
          <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
            {t('print.title')}
          </span>
        </div>
      }
      maxWidth="2xl"
      className="print-settings-modal sm:max-w-3xl sm:rounded-2xl"
      headerClassName="border-b-0 bg-background"
      bodyClassName="px-5 py-4 sm:px-7 sm:py-5 [&_button]:min-h-11"
      footerClassName="border-t-0 bg-background"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button type="button" variant="secondary" disabled={isPrinting} onClick={onClose} className="rounded-xl min-h-11 px-4 text-xs font-semibold sm:text-sm">
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            disabled={isPrinting || (mode === 'custom' && selectedDates.size === 0) || (mode === 'new' && newDates.length === 0)}
            onClick={() => onPrint(mode, { pageNumbers, colorContent, headerMode, textSize, lineSpacing }, mode === 'custom' ? Array.from(selectedDates) : undefined)}
            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-5 min-h-11 text-xs sm:text-sm shadow-sm active:scale-[0.96] transition-transform duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]"
          >
            {isPrinting ? t('print.preparing') : <>{t('print.print')} · {mode === 'new'
              ? sessionCountLabel(newDates.length)
              : mode === 'custom'
                ? sessionCountLabel(selectedDates.size)
                : t('print.complete')}</>}
          </Button>
        </div>
      }
    >
      <fieldset disabled={isPrinting} aria-label={t('print.title')} aria-busy={isPrinting} className="min-w-0 space-y-4">
        {/* Sortie physique du document inspirée du motif Receipt Printer #1 */}
        {isPrinting && (
          <div className="receipt-slot-container flex flex-col items-center justify-center py-4 px-3 rounded-2xl bg-[#fafaf8] dark:bg-[#181816] border border-[#e4e4e0] dark:border-[#2e2e28] shadow-xs animate-in fade-in duration-200">
            <div className="receipt-slot w-[220px]">
              <div className="receipt-printer-head w-full" />
              <div className="receipt-paper w-[196px] p-3 text-xs font-mono space-y-1.5 rounded-b-md">
                <div className="flex justify-between items-center text-[#5e5e5a] dark:text-[#a8a8a2] text-[10px]">
                  <span>{t('print.title')}</span>
                  <span>{new Date().toLocaleDateString(locale === 'ar' ? 'ar-MA' : 'fr-FR')}</span>
                </div>
                <div className="border-t border-dashed border-[#d8d8d4] dark:border-[#3e3e38] my-1" />
                <div className="text-center font-bold text-foreground text-[13px] py-0.5">
                  {mode === 'new'
                    ? sessionCountLabel(newDates.length)
                    : mode === 'custom'
                      ? sessionCountLabel(selectedDates.size)
                      : t('print.complete')}
                </div>
                <div className="border-t border-dashed border-[#d8d8d4] dark:border-[#3e3e38] my-1" />
                <div className="flex justify-between text-[11px] text-primary font-semibold">
                  <span>{locale === 'ar' ? 'الوثيقة' : 'Document'}</span>
                  <span className="animate-pulse">{t('print.preparing')}...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {!historyKnown && <p className="text-xs text-muted-foreground">{t('print.historyUnavailable')}</p>}

        {/* Choix du mode */}
        <div className="rounded-2xl border border-border/70 bg-background p-3 sm:p-4 shadow-xs space-y-3">
          <Segmented<PrintMode>
            value={mode}
            onChange={setMode}
            ariaLabel={t('print.typeAria')}
            className={`grid w-full ${historyKnown ? 'grid-cols-3' : 'grid-cols-2'}`}
            options={printModes.map(item => ({
              value: item.value,
              disabled: item.disabled || isPrinting,
              label: <span className="flex min-w-0 flex-wrap items-center justify-center gap-1.5"><item.icon className="h-4 w-4 shrink-0" aria-hidden /><span className="whitespace-normal">{item.label}</span></span>,
            }))}
          />
          <div className="px-1">
            <div className="flex items-center gap-2">
              <p className="text-xs sm:text-sm font-bold text-foreground">{activeMode.title}</p>
              {activeMode.badge && <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-700 dark:text-emerald-300">{activeMode.badge}</span>}
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{activeMode.subtitle}</p>
          </div>
        </div>

        {/* Aperçu des nouvelles dates */}
        {mode === 'new' && newDates.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 rounded-2xl border border-border/70 bg-background p-3 shadow-xs">
            {newDates.slice(0, 12).map(date => (
              <span key={date} className="rounded-xl bg-muted/60 border border-border/70 px-2.5 py-1 text-xs font-bold text-foreground shadow-2xs">
                {formatDateDDMMYYYY(date)}
              </span>
            ))}
            {newDates.length > 12 && (
              <span className="rounded-xl bg-muted/40 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                {t('print.otherCount', { count: number.format(newDates.length - 12) })}
              </span>
            )}
          </div>
        )}

        {/* Sélection à la séance : liste cochable de toutes les dates */}
        {mode === 'custom' && allDates.length > 0 && (
          <div className="space-y-2.5 rounded-2xl border border-border/70 bg-background p-4 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs sm:text-sm font-bold text-foreground">
                {t('print.sessionsToPrint', { selected: number.format(selectedDates.size), total: number.format(allDates.length) })}
              </span>
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <button type="button" onClick={() => setSelectedDates(new Set(allDates))} className="hover:text-foreground transition-colors">{t('print.all')}</button>
                <span className="text-muted-foreground/50">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedDates(new Set(newDates))}
                  disabled={newDates.length === 0}
                  className="hover:text-foreground disabled:opacity-40 transition-colors"
                >
                  {t('print.newOnlyShort')}
                </button>
                <span className="text-muted-foreground/50">|</span>
                <button type="button" onClick={() => setSelectedDates(new Set())} className="hover:text-foreground transition-colors">{t('print.none')}</button>
              </div>
            </div>
            <div className="max-h-48 space-y-1.5 overflow-y-auto pe-1.5 overscroll-contain">
              {allDates.map(date => {
                const isNew = !printedSet.has(date);
                return (
                  <label
                    key={date}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border/70 bg-background px-3 py-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Checkbox
                        checked={selectedDates.has(date)}
                        onCheckedChange={() => toggleDate(date)}
                      />
                      <span className="text-xs font-bold text-foreground">{formatDateDDMMYYYY(date)}</span>
                    </div>
                    {historyKnown && (
                      <span
                        className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase border ${
                          isNew ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-muted border-border/50 text-muted-foreground'
                        }`}
                      >
                        {isNew ? t('print.newSingle') : t('print.alreadyPrinted')}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Mise en page : taille du texte et aération des lignes */}
        <div className="space-y-3 rounded-2xl border border-border/70 bg-background p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-foreground">{t('print.textSize')}</span>
            <Segmented<PrintTextSize>
              value={textSize}
              ariaLabel={t('print.textSize')}
              onChange={setTextSize}
              options={[
                { value: 's', label: t('print.small') },
                { value: 'm', label: t('print.normal') },
                { value: 'l', label: t('print.large') },
              ]}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-foreground">{t('print.lineSpacing')}</span>
            <Segmented<PrintLineSpacing>
              value={lineSpacing}
              ariaLabel={t('print.lineSpacing')}
              onChange={setLineSpacing}
              options={[
                { value: 'compact', label: t('print.compact') },
                { value: 'normal', label: t('print.normal') },
                { value: 'aere', label: t('print.airy') },
              ]}
            />
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {t('print.spacingHint')}
          </p>
        </div>

        <DescriptionVisibilityControl
          context="print"
          mode={config.printDescriptionMode ?? 'all'}
          types={config.printDescriptionTypes ?? []}
          onChange={next => onConfigChange({ printDescriptionMode: next.mode, printDescriptionTypes: next.types })}
          className="rounded-2xl border border-border/70 bg-background p-4 shadow-xs"
        />

        {/* Options d'impression regroupées pour éviter l'empilement de grandes cartes. */}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="print-option-row">
            <span>
              <span className="block text-xs font-bold text-foreground">{t('print.colorContent')}</span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">{t('print.colorContentHint')}</span>
            </span>
            <Switch checked={colorContent} disabled={isPrinting} aria-label={t('print.colorContent')}
              onCheckedChange={setColorContent} className="print-option-switch" />
          </label>
          <label className="print-option-row">
            <div>
              <span className="block text-xs font-bold text-foreground">{t('print.pageNumbers')}</span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
                {t('print.pageNumbersHint')}
              </span>
            </div>
            <Switch
              checked={pageNumbers}
              disabled={isPrinting}
              aria-label={t('print.pageNumbers')}
              onCheckedChange={setPageNumbers}
              className="print-option-switch"
            />
          </label>

          <div className="space-y-2 rounded-xl border border-border/70 bg-background/75 p-4 shadow-xs">
            <span className="block text-xs font-bold text-foreground">{t('print.header')}</span>
            <Segmented<PrintHeaderMode>
              value={headerMode}
              ariaLabel={t('print.header')}
              onChange={setHeaderMode}
              options={[
                { value: 'first', label: t('print.firstPage') },
                { value: 'all', label: t('print.allPages') },
                { value: 'none', label: t('print.noHeader') },
              ]}
            />
          </div>
        </div>
      </fieldset>
    </Modal>
  );
};
