import { FC, useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { CalendarX, CalendarPlus, CalendarDays, TriangleAlert, Plus, X } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import type { SessionPatch } from '@/domain/notebook/sessionEditing';
import type { SessionEditorState } from '../hooks/useSessionAssignment';
import { todayInMorocco } from '@/domain/calendar/calendar';
import { addDaysIso } from '@/domain/notebook/dataUtils';
import { extractDateRange, formatPedagogicalDateCell } from '@/domain/evaluations/notebookSyncBridge';
import { useLocale } from '@/i18n/LocaleProvider';
import { cn } from '@/lib/utils';

interface AssignDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (patch: SessionPatch) => void;
  session: SessionEditorState;
  /** validation intelligente : alertes live pour la date choisie (emploi du temps, fériés, vacances, absences) */
  getDateWarnings?: (date: string) => { type: string; message: string }[];
}

const isoFromOffset = (offset: number) => addDaysIso(todayInMorocco(), offset);

export const AssignDateModal: FC<AssignDateModalProps> = ({
  isOpen,
  onClose,
  onApply,
  session,
  getDateWarnings,
}) => {
  const { t, locale, isRtl } = useLocale();
  const localeCode = locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-MA';
  const number = useMemo(() => new Intl.NumberFormat(localeCode), [localeCode]);
  const [actionType, setActionType] = useState<'associate' | 'dissociate'>('associate');
  const [selectedDate, setSelectedDate] = useState(() => isoFromOffset(0));
  const [endDate, setEndDate] = useState('');
  const [isRangeOpen, setIsRangeOpen] = useState(false);
  const [remark, setRemark] = useState('');
  const [dateChanged, setDateChanged] = useState(false);
  const [remarkChanged, setRemarkChanged] = useState(false);
  /*
   * Sens de saisie de la remarque : elle suit SON écriture, jamais celle du
   * cahier — un texte arabe commence à droite même dans un cahier latin, et un
   * texte latin commence à gauche dans une interface arabe. Un champ vide garde
   * le sens de l'interface, pour que le repère d'aide soit bien orienté (même
   * règle que les champs de contenu, voir ContentFields).
   */
  const fieldDir = remark ? 'auto' : isRtl ? 'rtl' : 'ltr';
  const { selection, intent, patch } = session;
  const selectedCount = selection.targets.length;

  useEffect(() => {
    if (!isOpen) return;
    setActionType(patch?.date === '' ? 'dissociate' : 'associate');
    const rawDate = patch?.date ?? selection.date;
    const { startDate, endDate: extractedEnd } = extractDateRange(rawDate);
    const initialStart = startDate || (selection.mixedDates ? '' : isoFromOffset(0));
    setSelectedDate(initialStart);
    setEndDate(extractedEnd || '');
    setIsRangeOpen(Boolean(extractedEnd));
    setRemark(patch?.remark ?? selection.remark);
    setDateChanged(patch?.date !== undefined);
    setRemarkChanged(patch?.remark !== undefined);
  }, [selection, patch, isOpen]);

  const appliesDate = dateChanged || (intent === 'date' && !selection.mixedDates);
  const chooseDate = (date: string) => { setSelectedDate(date); setDateChanged(true); };
  const invalidDate = appliesDate && actionType === 'associate' && !selectedDate;

  // Alertes live : recalculées à chaque changement de date choisie.
  const dateWarnings = useMemo(
    () => (appliesDate && actionType === 'associate' && getDateWarnings && selectedDate ? getDateWarnings(selectedDate) : []),
    [appliesDate, actionType, getDateWarnings, selectedDate]
  );

  const handleApply = () => {
    if (invalidDate) return;
    const effectiveLocale = locale === 'ar' ? 'ar' : locale === 'en' ? 'en' : 'fr';
    const finalDate = isRangeOpen && endDate && endDate > selectedDate
      ? formatPedagogicalDateCell(selectedDate, endDate, effectiveLocale)
      : selectedDate;
    onApply({
      ...(appliesDate ? { date: actionType === 'associate' ? finalDate : '' } : {}),
      ...(remarkChanged ? { remark } : {}),
    });
  };


  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
            <CalendarPlus className="h-5 w-5 stroke-[2.2]" />
          </span>
          <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-sans">
            {t('assignDate.title')}
          </span>
        </div>
      }
      description={t(selectedCount === 1 ? 'assignDate.selectedOne' : 'assignDate.selectedMany', { count: number.format(selectedCount) })}
      maxWidth="lg"
      className="sm:max-w-xl sm:rounded-2xl"
      headerClassName="border-b-0 bg-background"
      bodyClassName="px-5 py-4 sm:px-7 sm:py-5"
      footerClassName="border-t-0 bg-background"
      footer={
        <div className="flex items-center w-full gap-3">
          <Button type="button" variant="secondary" onClick={onClose} className="rounded-xl h-11 w-1/3 text-sm font-semibold bg-muted hover:bg-muted/80 text-foreground">
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={invalidDate}
            className={`rounded-xl h-11 flex-1 text-sm font-bold shadow-sm transition-all duration-150 ${
              actionType === 'associate'
                ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
            }`}
          >
            {!appliesDate ? <span>{t('remark.saveRemark')}</span> : actionType === 'associate' ? (
              <span>{t('assignDate.applyDate')}</span>
            ) : (
              <span>{t('assignDate.removeDates')}</span>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Sleek toggle selector */}
        <Segmented<'associate' | 'dissociate'>
          value={actionType}
          onChange={value => { setActionType(value); setDateChanged(true); }}
          className="grid w-full grid-cols-2"
          options={[
            {
              value: 'associate',
              label: (
                <span className="flex items-center gap-1.5 font-sans font-bold">
                   {t('assignDate.assign')}
                </span>
              ),
            },
            {
              value: 'dissociate',
              label: (
                <span className="flex items-center gap-1.5 font-sans font-bold">
                  {t('assignDate.unassign')}
                </span>
              ),
            },
          ]}
        />

        {/* Dynamic Section */}
        {actionType === 'associate' ? (
          <div className="space-y-6 animate-fade-in duration-200">
            {/* 1. Quick Presets */}
            <div className="grid grid-cols-3 gap-3">
              <Button
                type="button"
                className={`h-11 rounded-xl border py-1 text-sm font-sans font-bold shadow-xs transition-all duration-150 active:scale-95 ${
                  selectedDate === isoFromOffset(-1)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted text-foreground border-border'
                }`}
                onClick={() => chooseDate(isoFromOffset(-1))}
              >
                {t('assignDate.yesterday')}
              </Button>
              <Button
                type="button"
                className={`h-11 rounded-xl border py-1 text-sm font-sans font-bold shadow-xs transition-all duration-150 active:scale-95 ${
                  selectedDate === isoFromOffset(0)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted text-foreground border-border'
                }`}
                onClick={() => chooseDate(isoFromOffset(0))}
              >
                {t('assignDate.today')}
              </Button>
              <Button
                type="button"
                className={`h-11 rounded-xl border py-1 text-sm font-sans font-bold shadow-xs transition-all duration-150 active:scale-95 ${
                  selectedDate === isoFromOffset(1)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted text-foreground border-border'
                }`}
                onClick={() => chooseDate(isoFromOffset(1))}
              >
                {t('assignDate.tomorrow')}
              </Button>
            </div>

            {/* 2. Date Input(s) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-foreground text-start font-sans">
                  {isRangeOpen ? t('editor.dateRange') : `${t('assignDate.chooseDate')} :`}
                </label>
                {!isRangeOpen ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsRangeOpen(true);
                      setEndDate(selectedDate);
                      setDateChanged(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    <Plus className="size-3.5" />
                    <span>{t('editor.defineRange')}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsRangeOpen(false);
                      setEndDate('');
                      setDateChanged(true);
                    }}
                    className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1 cursor-pointer"
                    title={t('editor.removeRange')}
                  >
                    <X className="size-3.5" />
                    <span>{t('editor.removeRange')}</span>
                  </button>
                )}
              </div>

              <div className={cn("grid gap-3.5", isRangeOpen ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
                <div className="space-y-1.5">
                  {isRangeOpen && (
                    <label htmlFor="assign-date-input" className="block text-xs font-medium text-muted-foreground text-start font-sans">
                      {t('editor.startDate')} :
                    </label>
                  )}
                  <div className="relative flex items-center justify-between w-full h-12 px-4 rounded-xl border border-border bg-background shadow-sm hover:border-primary/50 transition-colors focus-within:ring-2 focus-within:ring-primary/20">
                    <span className="text-[16px] font-bold tracking-[0.02em] text-foreground" dir="ltr">
                      {selectedDate ? (() => {
                        const [y, m, d] = selectedDate.split('-');
                        return y && m && d ? `${d}/${m}/${y}` : 'JJ/MM/AAAA';
                      })() : 'JJ/MM/AAAA'}
                    </span>
                    <CalendarDays className="w-5 h-5 text-muted-foreground" />
                    <input
                      id="assign-date-input"
                      type="date"
                      value={selectedDate}
                      onChange={event => chooseDate(event.target.value)}
                      onClick={(e) => {
                        try {
                          if (typeof e.currentTarget.showPicker === 'function') {
                            e.currentTarget.showPicker();
                          }
                        } catch {
                          // fallback if showPicker fails
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                {isRangeOpen && (
                  <div className="space-y-1.5">
                    <label htmlFor="assign-end-date-input" className="block text-xs font-medium text-muted-foreground text-start font-sans">
                      {t('editor.endDate')} :
                    </label>
                    <div className="relative flex items-center justify-between w-full h-12 px-4 rounded-xl border border-border bg-background shadow-sm hover:border-primary/50 transition-colors focus-within:ring-2 focus-within:ring-primary/20">
                      <span className="text-[16px] font-bold tracking-[0.02em] text-foreground" dir="ltr">
                        {endDate ? (() => {
                          const [y, m, d] = endDate.split('-');
                          return y && m && d ? `${d}/${m}/${y}` : 'JJ/MM/AAAA';
                        })() : 'JJ/MM/AAAA'}
                      </span>
                      <CalendarDays className="w-5 h-5 text-muted-foreground" />
                      <input
                        id="assign-end-date-input"
                        type="date"
                        min={selectedDate || undefined}
                        value={endDate}
                        onChange={event => { setEndDate(event.target.value); setDateChanged(true); }}
                        onClick={(e) => {
                          try {
                            if (typeof e.currentTarget.showPicker === 'function') {
                              e.currentTarget.showPicker();
                            }
                          } catch {
                            // fallback
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {isRangeOpen && selectedDate && endDate && endDate > selectedDate && (
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="font-semibold text-foreground px-2.5 py-1 rounded-lg bg-muted/60 border border-border/80 text-xs">
                    {formatPedagogicalDateCell(selectedDate, endDate, locale === 'ar' ? 'ar' : locale === 'en' ? 'en' : 'fr')}
                  </span>
                </div>
              )}

              {selection.mixedDates && !dateChanged && <p className="text-xs text-muted-foreground">{t('assignDate.keepDates')}</p>}
            </div>

            {/* 3. Warnings */}
            {dateWarnings.length > 0 && (
              <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.08] p-4 text-start animate-fade-in duration-200" role="status">
                {dateWarnings.map((warning, i) => (
                  <p key={i} className="flex items-start gap-2.5 text-[13px] font-medium leading-snug text-amber-800 dark:text-amber-300 font-sans">
                    <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>{warning.message}</span>
                  </p>
                ))}
                <p className="ps-6.5 text-[12px] text-amber-700/90 dark:text-amber-400 font-medium font-sans">
                  {t('assignDate.warningOverride')}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="mx-auto max-w-sm animate-fade-in duration-200 space-y-2 rounded-xl border border-destructive/20 bg-destructive/10 p-5 text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-destructive/15 text-destructive mb-1">
              <CalendarX className="h-5 w-5 stroke-[2.2]" />
            </div>
            <h4 className="text-sm font-bold text-destructive uppercase tracking-wider font-sans">{t('assignDate.removeTitle')}</h4>
            <p className="text-sm text-destructive/80 font-medium leading-relaxed max-w-xs mx-auto font-sans">
              {t('assignDate.removeHint')}
            </p>
          </div>
        )}

        {/* 4. Remarque de la séance — hors du choix de date : une séance peut
            porter une remarque sans date, et une séance fusionnée est UNE
            ligne : la remarque s'écrit partout d'un seul coup. */}
        <div className="space-y-2.5 border-t border-border/60 pt-5">
          <label htmlFor="assign-date-remark" className="block text-sm font-medium text-foreground text-start font-sans">
            {t('remark.title')} :
          </label>
          <textarea
            id="assign-date-remark"
            value={remark}
            onChange={event => { setRemark(event.target.value); setRemarkChanged(true); }}
            dir={fieldDir}
            rows={3}
            placeholder={t(selection.mixedRemarks ? 'assignDate.keepRemarks' : 'remark.placeholder')}
            className="min-h-[88px] w-full resize-y rounded-xl border border-border bg-background p-3 text-sm font-medium leading-relaxed text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
          />
          {selectedCount > 1 && (
            <p className="text-[12px] font-medium leading-snug text-muted-foreground font-sans">
              {t('remark.groupHint', { count: number.format(selectedCount) })}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
};
