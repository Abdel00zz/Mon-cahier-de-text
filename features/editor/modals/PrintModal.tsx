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
        <span className="flex items-center gap-2">
          <Printer className="h-4 w-4 text-foreground" />
          {t('print.title')}
        </span>
      }
      description={t('print.description')}
      maxWidth="md"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            type="button"
            disabled={isPrinting || (mode === 'custom' && selectedDates.size === 0)}
            onClick={() => onPrint(mode, { pageNumbers, headerMode, textSize, lineSpacing }, mode === 'custom' ? Array.from(selectedDates) : undefined)}
            className="px-3.5 font-semibold"
          >
            {isPrinting ? t('print.preparing') : <>{t('print.print')} · {mode === 'new'
              ? sessionCountLabel(newDates.length)
              : mode === 'custom'
                ? sessionCountLabel(selectedDates.size)
                : t('print.complete')}</>}
          </Button>
        </>
      }
    >
      <div className="space-y-2.5">
        {/* État de l'impression */}
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="grid grid-cols-3 divide-x divide-border/70 text-center">
            <div className="flex items-baseline justify-center gap-1.5 px-2 py-2.5">
              <span className="text-sm font-black text-foreground">{number.format(totalDates)}</span>
              <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{t('print.sessions')}</span>
            </div>
            <div className="flex items-baseline justify-center gap-1.5 px-2 py-2.5">
              <span className="text-sm font-black text-muted-foreground">{number.format(printedCount)}</span>
              <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{t('print.printed')}</span>
            </div>
            <div className="flex items-baseline justify-center gap-1.5 bg-emerald-50/70 px-2 py-2.5">
              <span className="text-sm font-black text-emerald-700">{number.format(newDates.length)}</span>
              <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-700">{t('print.new')}</span>
            </div>
          </div>
          {lastPrintedAt && (
            <p className="border-t border-border/70 px-3 py-1.5 text-center text-[9px] font-medium text-muted-foreground">
              {t('print.lastPrint')} · {formatDateDDMMYYYY(lastPrintedAt.slice(0, 10))}
            </p>
          )}
        </div>

        {/* Choix du mode */}
        <div className="rounded-lg border border-border bg-card p-2">
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1" role="tablist" aria-label={t('print.typeAria')}>
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
                  className={`flex min-w-0 items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-[10px] font-bold transition-colors ${
                    selected ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:bg-card hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
          <div className="px-2 pb-0.5 pt-2">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-extrabold text-foreground">{activeMode.title}</p>
              {activeMode.badge && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[8px] font-bold uppercase text-emerald-700">{activeMode.badge}</span>}
            </div>
            <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{activeMode.subtitle}</p>
          </div>
        </div>

        {/* Aperçu des nouvelles dates */}
        {mode === 'new' && newDates.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 rounded-lg border border-border bg-card p-2">
            {newDates.slice(0, 12).map(date => (
              <span key={date} className="rounded-full bg-muted border border-border/60 px-2 py-0.5 text-[10px] font-bold text-foreground">
                {formatDateDDMMYYYY(date)}
              </span>
            ))}
            {newDates.length > 12 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {t('print.otherCount', { count: number.format(newDates.length - 12) })}
              </span>
            )}
          </div>
        )}

        {/* Sélection à la séance : liste cochable de toutes les dates */}
        {mode === 'custom' && allDates.length > 0 && (
          <div className="space-y-2 rounded-lg border border-border bg-card p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-foreground">
                {t('print.sessionsToPrint', { selected: number.format(selectedDates.size), total: number.format(allDates.length) })}
              </span>
              <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                <button type="button" onClick={() => setSelectedDates(new Set(allDates))} className="hover:text-foreground transition-colors">{t('print.all')}</button>
                <span className="text-muted-foreground/70">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedDates(new Set(newDates))}
                  disabled={newDates.length === 0}
                  className="hover:text-foreground disabled:opacity-40 transition-colors"
                >
                  {t('print.newOnlyShort')}
                </button>
                <span className="text-muted-foreground/70">|</span>
                <button type="button" onClick={() => setSelectedDates(new Set())} className="hover:text-foreground transition-colors">{t('print.none')}</button>
              </div>
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto pe-1">
              {allDates.map(date => {
                const isNew = !printedSet.has(date);
                return (
                  <label
                    key={date}
                    className="flex cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-border/70 bg-card px-2.5 py-1.5 hover:bg-muted/80"
                  >
                    <Checkbox
                      checked={selectedDates.has(date)}
                      onCheckedChange={() => toggleDate(date)}
                    />
                    <span className="text-xs font-semibold text-foreground">{formatDateDDMMYYYY(date)}</span>
                    <span
                      className={`ms-auto rounded-full px-2 py-0.5 text-[9px] font-bold uppercase border ${
                        isNew ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-muted border-border/50 text-muted-foreground'
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
        <div className="space-y-2.5 rounded-lg border border-border bg-card p-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
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
          <div className="flex flex-wrap items-center justify-between gap-2">
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
          <p className="text-[10px] leading-snug text-muted-foreground">
            {t('print.spacingHint')}
          </p>
        </div>

        <DescriptionVisibilityControl
          context="print"
          mode={config.printDescriptionMode ?? 'all'}
          types={config.printDescriptionTypes ?? []}
          onChange={next => onConfigChange({ printDescriptionMode: next.mode, printDescriptionTypes: next.types })}
          className="rounded-lg bg-card p-2.5"
        />

        {/* Options d'impression regroupées pour éviter l'empilement de grandes cartes. */}
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start justify-between gap-2.5 rounded-lg border border-border bg-card p-2.5">
            <span>
              <span className="block text-[11px] font-bold text-foreground">{t('print.pageNumbers')}</span>
              <span className="mt-0.5 block text-[9px] leading-snug text-muted-foreground">
                {t('print.pageNumbersHint')}
              </span>
            </span>
            <Switch
              checked={pageNumbers}
              onCheckedChange={setPageNumbers}
              className="mt-0.5 data-[state=checked]:bg-primary"
            />
          </label>

          <div className="space-y-2 rounded-lg border border-border bg-card p-2.5">
            <span className="block text-[11px] font-bold text-foreground">{t('print.header')}</span>
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
