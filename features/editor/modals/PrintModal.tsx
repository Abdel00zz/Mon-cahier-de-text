import React, { useState } from 'react';
import { AppConfig } from '@/types';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Printer, CalendarCheck, CalendarDays, FileText } from '@/components/ui/icons';
import { formatDateDDMMYYYY } from '@/utils/dataUtils';
import { DescriptionVisibilityControl } from '@/features/settings/components/DescriptionVisibilityControl';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Segmented } from '@/components/ui/segmented';
import { useLocale } from '@/i18n/LocaleProvider';

export type PrintMode = 'new' | 'all' | 'custom';
export type PrintHeaderMode = 'first' | 'all' | 'none';
type PrintTextSize = 's' | 'm' | 'l';
type PrintLineSpacing = 'compact' | 'normal' | 'aere';
export interface PrintOptions {
  pageNumbers: boolean;
  /** affichage de l'en-tête administratif dans le document imprimé */
  headerMode: PrintHeaderMode;
  /** taille du texte du document imprimé */
  textSize: PrintTextSize;
  /** espacement entre les lignes (aération) */
  lineSpacing: PrintLineSpacing;
}

interface PrintModalProps {
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
  isOpen,
  onClose,
  totalDates,
  newDates,
  allDates,
  printedDates,
  lastPrintedAt,
  savedPrefs,
  isPrinting = false,
  config,
  onConfigChange,
  onPrint,
}) => {
  const { t, locale } = useLocale();
  const number = React.useMemo(() => new Intl.NumberFormat(locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-MA'), [locale]);
  const sessionCountLabel = (count: number) => t(count === 1 ? 'print.sessionOne' : 'print.sessionMany', { count: number.format(count) });
  const printedCount = totalDates - newDates.length;
  const hasHistory = lastPrintedAt !== null;
  const recommendNew = hasHistory && newDates.length > 0;
  const [mode, setMode] = useState<PrintMode>(recommendNew ? 'new' : 'all');
  const [pageNumbers, setPageNumbers] = useState(savedPrefs?.pageNumbers ?? true);
  const [headerMode, setHeaderMode] = useState<PrintHeaderMode>(savedPrefs?.headerMode ?? 'first');
  const [textSize, setTextSize] = useState<PrintTextSize>(savedPrefs?.textSize ?? 'm');
  const [lineSpacing, setLineSpacing] = useState<PrintLineSpacing>(savedPrefs?.lineSpacing ?? 'normal');
  // sélection à la séance : par défaut, les nouveautés (ou tout si aucune nouveauté)
  const [selectedDates, setSelectedDates] = useState<Set<string>>(
    () => new Set(newDates.length > 0 ? newDates : allDates)
  );
  const printedSet = React.useMemo(() => new Set(printedDates), [printedDates]);
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
    if (!isOpen) return;
    setMode(recommendNew ? 'new' : 'all');
    setSelectedDates(new Set(newDates.length > 0 ? newDates : allDates));
    if (savedPrefs) {
      setPageNumbers(savedPrefs.pageNumbers);
      setHeaderMode(savedPrefs.headerMode ?? 'first');
      setTextSize(savedPrefs.textSize);
      setLineSpacing(savedPrefs.lineSpacing);
    } else {
      // Évite de réutiliser silencieusement les préférences d'une autre
      // classe lorsque celle-ci n'a encore aucune préférence enregistrée.
      setPageNumbers(true);
      setHeaderMode('first');
      setTextSize('m');
      setLineSpacing('normal');
    }
  }, [allDates, isOpen, newDates, recommendNew, savedPrefs]);

  const printModes: Array<{
    value: PrintMode;
    label: string;
    title: string;
    subtitle: string;
    badge?: string;
    disabled?: boolean;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      value: 'new',
      label: t('print.modeNew'),
      title: t('print.newOnly'),
      subtitle: newDates.length > 0
        ? t(newDates.length === 1 ? 'print.newSubtitleOne' : 'print.newSubtitleMany', { count: number.format(newDates.length) })
        : t('print.noNew'),
      badge: recommendNew ? t('print.recommended') : undefined,
      disabled: newDates.length === 0,
      icon: CalendarCheck,
    },
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
  const activeMode = printModes.find(item => item.value === mode) ?? printModes[1];

  return (
    <Modal
      isOpen={isOpen}
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
      description={t('print.description')}
      maxWidth="2xl"
      className="sm:max-w-3xl sm:rounded-[32px]"
      headerClassName="px-5 pt-5 pb-3.5 sm:px-7 sm:pt-6 sm:pb-4 border-b border-slate-200/70 bg-white/70 backdrop-blur-md dark:border-white/[0.08] dark:bg-slate-900/60"
      bodyClassName="px-5 py-4 sm:px-7 sm:py-5"
      footerClassName="px-5 py-3.5 sm:px-7 sm:py-4 border-t border-slate-200/70 bg-white/70 backdrop-blur-md dark:border-white/[0.08] dark:bg-slate-900/60"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button type="button" variant="secondary" onClick={onClose} className="rounded-xl h-10 px-4 text-xs font-semibold sm:text-sm">
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            disabled={isPrinting || (mode === 'custom' && selectedDates.size === 0)}
            onClick={() => onPrint(mode, { pageNumbers, headerMode, textSize, lineSpacing }, mode === 'custom' ? Array.from(selectedDates) : undefined)}
            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-5 h-10 text-xs sm:text-sm shadow-sm"
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
      <div className="space-y-4">
        {/* État de l'impression */}
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
          <div className="grid grid-cols-3 divide-x divide-border/70 text-center">
            <div className="flex flex-col items-center justify-center p-3 sm:py-4">
              <span className="text-xl sm:text-2xl font-black text-foreground">{number.format(totalDates)}</span>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">{t('print.sessions')}</span>
            </div>
            <div className="flex flex-col items-center justify-center p-3 sm:py-4">
              <span className="text-xl sm:text-2xl font-black text-muted-foreground">{number.format(printedCount)}</span>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">{t('print.printed')}</span>
            </div>
            <div className="flex flex-col items-center justify-center p-3 sm:py-4 bg-emerald-500/[0.08] dark:bg-emerald-950/20">
              <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">{number.format(newDates.length)}</span>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mt-0.5">{t('print.new')}</span>
            </div>
          </div>
          {lastPrintedAt && (
            <p className="border-t border-border/70 bg-muted/30 px-4 py-2 text-center text-[11px] font-medium text-muted-foreground">
              {t('print.lastPrint')} · {formatDateDDMMYYYY(lastPrintedAt.slice(0, 10))}
            </p>
          )}
        </div>

        {/* Choix du mode */}
        <div className="rounded-2xl border border-border/70 bg-card p-3 sm:p-4 shadow-xs space-y-3">
          <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-muted/60 p-1.5" role="tablist" aria-label={t('print.typeAria')}>
            {printModes.map(item => {
              const Icon = item.icon;
              const selected = mode === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  role="tab"
                  disabled={item.disabled}
                  aria-selected={selected}
                  onClick={() => setMode(item.value)}
                  className={`flex min-w-0 items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-bold transition-all ${
                    selected ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:bg-card hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0 stroke-[2.2]" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
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
          <div className="flex flex-wrap justify-center gap-1.5 rounded-2xl border border-border/70 bg-card p-3 shadow-xs">
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
          <div className="space-y-2.5 rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
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
                    <span
                      className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase border ${
                        isNew ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-muted border-border/50 text-muted-foreground'
                      }`}
                    >
                      {isNew ? t('print.newSingle') : t('print.alreadyPrinted')}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Mise en page : taille du texte et aération des lignes */}
        <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-foreground">{t('print.textSize')}</span>
            <Segmented<PrintTextSize>
              value={textSize}
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
          className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs"
        />

        {/* Options d'impression regroupées pour éviter l'empilement de grandes cartes. */}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
            <div>
              <span className="block text-xs font-bold text-foreground">{t('print.pageNumbers')}</span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
                {t('print.pageNumbersHint')}
              </span>
            </div>
            <Switch
              checked={pageNumbers}
              onCheckedChange={setPageNumbers}
              className="data-[state=checked]:bg-primary shrink-0"
            />
          </label>

          <div className="space-y-2 rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
            <span className="block text-xs font-bold text-foreground">{t('print.header')}</span>
            <Segmented<PrintHeaderMode>
              value={headerMode}
              onChange={setHeaderMode}
              options={[
                { value: 'first', label: t('print.firstPage') },
                { value: 'all', label: t('print.allPages') },
                { value: 'none', label: t('print.noHeader') },
              ]}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};
