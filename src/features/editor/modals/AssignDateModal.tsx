import { sessionDateKeys } from '@/domain/evaluations/homeworkPlacement';
import { findItem } from '@/domain/notebook/dataUtils';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { CalendarX, CalendarPlus, CalendarDays, TriangleAlert, Plus, X, Eye, FileText, Check } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import type { SessionPatch } from '@/domain/notebook/sessionEditing';
import type { SessionEditorState } from '../hooks/useSessionAssignment';
import type { TimetableEntry, TimetableClockPolicy, LessonsData } from '@/types';
import type { NotebookDocumentPreview } from '@/domain/evaluations/assessmentSync';
import type { SessionRemarkEntry } from '@/domain/evaluations/sessionActivityRemarks';
import { todayInMorocco } from '@/domain/calendar/calendar';
import { addDaysIso } from '@/domain/notebook/dataUtils';
import { extractDateRange, formatPedagogicalDateCell } from '@/domain/evaluations/notebookSyncBridge';
import { resolveClassSessionDatesInRange } from '@/domain/notebook/classSessionDates';
import { useLocale } from '@/i18n/LocaleProvider';
import { cn } from '@/lib/utils';

interface AssignDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (patch: SessionPatch) => void;
  session: SessionEditorState;
  /** validation intelligente : alertes live pour la date choisie (emploi du temps, fériés, vacances, absences) */
  getDateWarnings?: (date: string) => { type: string; message: string }[];
  classId?: string;
  timetable?: TimetableEntry[];
  timetableClock?: TimetableClockPolicy;
  lessonsData?: LessonsData | unknown;
  /** Annotations de la séance (ex: Devoir maison 1 donné, Contrôle des cahiers...) */
  sessionAnnotation?: string;
  getSessionAnnotation?: (date?: string) => string | undefined;
  getSessionRemarkEntries?: (date?: string) => readonly SessionRemarkEntry[];
  /** Sujets et documents associés à cette séance pour aperçu */
  sessionDocuments?: readonly NotebookDocumentPreview[];
  getSessionDocuments?: (date: string) => readonly NotebookDocumentPreview[] | undefined;
  onOpenDocumentPreview?: (preview: NotebookDocumentPreview) => void;
}

const isoFromOffset = (offset: number) => addDaysIso(todayInMorocco(), offset);

export const AssignDateModal: FC<AssignDateModalProps> = ({
  isOpen,
  onClose,
  onApply,
  session,
  getDateWarnings,
  classId,
  timetable,
  timetableClock,
  lessonsData,
  sessionAnnotation,
  getSessionAnnotation,
  getSessionRemarkEntries,
  sessionDocuments,
  getSessionDocuments,
  onOpenDocumentPreview,
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
  const [activityRemarks, setActivityRemarks] = useState<Record<string, string | null>>({});
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
  const activityEntries = useMemo(() => [...new Map(selection.targets.flatMap(indices =>
    sessionDateKeys(findItem(session.source, indices).item?.date).flatMap(date => getSessionRemarkEntries?.(date) ?? []),
  ).map(entry => [entry.id, entry])).values()], [selection, session.source, getSessionRemarkEntries]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (isOpen && intent === 'remark') {
      const timer = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const len = textareaRef.current.value.length;
          textareaRef.current.setSelectionRange(len, len);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, intent]);

  useEffect(() => {
    if (!isOpen) return;
    setActionType(patch?.date === '' ? 'dissociate' : 'associate');
    const rawDate = patch?.date ?? selection.date;
    const { startDate, endDate: extractedEnd } = extractDateRange(rawDate);
    const initialStart = startDate || (selection.mixedDates ? '' : isoFromOffset(0));
    setSelectedDate(initialStart);
    setEndDate(extractedEnd || '');
    setIsRangeOpen(Boolean(extractedEnd));

    // Initialisation intelligente : intégrer directement le devoir maison et les annotations
    // de la séance dans la zone remarque pour une édition unifiée, sans blocs redondants en bas.
    const rawRemark = (patch?.remark ?? selection.remark ?? '').trim();
    const activeAnnotation = ((initialStart ? getSessionAnnotation?.(initialStart) : undefined)
      ?? sessionAnnotation
      ?? activityEntries.filter(entry => !entry.hidden).map(entry => entry.text).join('\n')
    ).trim();

    let computedRemark = rawRemark;
    if (activeAnnotation) {
      if (!rawRemark) {
        computedRemark = activeAnnotation;
      } else if (!rawRemark.includes(activeAnnotation)) {
        computedRemark = `${activeAnnotation}\n${rawRemark}`;
      }
    }

    setRemark(computedRemark);
    setActivityRemarks(patch?.activityRemarks ?? {});
    setDateChanged(patch?.date !== undefined);
    setRemarkChanged(patch?.remark !== undefined || computedRemark !== rawRemark);
  }, [selection, patch, isOpen, sessionAnnotation, getSessionAnnotation, activityEntries]);

  const activeDate = selectedDate || (selection.date ? extractDateRange(selection.date).startDate : '');
  const resolvedDocs = sessionDocuments ?? (activeDate ? getSessionDocuments?.(activeDate) : undefined);

  const appliesDate = dateChanged || (intent === 'date' && !selection.mixedDates);
  const chooseDate = (newDate: string) => {
    const prevDate = selectedDate;
    setSelectedDate(newDate);
    setDateChanged(true);

    // Adaptation contextuelle ultra avancée : réactualiser l'annotation de séance dans la remarque
    const prevAnnotation = ((prevDate ? getSessionAnnotation?.(prevDate) : undefined) ?? sessionAnnotation ?? '').trim();
    const nextAnnotation = ((newDate ? getSessionAnnotation?.(newDate) : undefined) ?? '').trim();

    if (prevAnnotation !== nextAnnotation) {
      setRemark(current => {
        const trimmed = current.trim();
        if (!trimmed || trimmed === prevAnnotation) {
          return nextAnnotation;
        }
        if (prevAnnotation && trimmed.includes(prevAnnotation)) {
          return nextAnnotation
            ? trimmed.replace(prevAnnotation, nextAnnotation)
            : trimmed.replace(prevAnnotation, '').trim();
        }
        if (nextAnnotation && !trimmed.includes(nextAnnotation)) {
          return `${nextAnnotation}\n${trimmed}`;
        }
        return current;
      });
      setRemarkChanged(true);
    }
  };
  const invalidDate = appliesDate && actionType === 'associate' && !selectedDate;

  // Alertes live : recalculées à chaque changement de date choisie.
  const dateWarnings = useMemo(
    () => (appliesDate && actionType === 'associate' && getDateWarnings && selectedDate ? getDateWarnings(selectedDate) : []),
    [appliesDate, actionType, getDateWarnings, selectedDate]
  );

  const handleApply = () => {
    if (invalidDate) return;
    const effectiveLocale = locale === 'ar' ? 'ar' : locale === 'en' ? 'en' : 'fr';
    let finalDate = selectedDate;
    if (isRangeOpen && endDate && endDate > selectedDate) {
      const intersecting = resolveClassSessionDatesInRange(selectedDate, endDate, classId, timetable, timetableClock, lessonsData ?? session.source);
      finalDate = formatPedagogicalDateCell(selectedDate, endDate, effectiveLocale, intersecting);
    }

    // Synchronisation intelligente : si l'annotation d'activité a été effacée ou modifiée,
    // refléter fidèlement le choix de l'enseignant pour éviter toute réapparition fantôme.
    const targetDate = actionType === 'associate' ? selectedDate : '';
    const relevantEntries = (targetDate ? getSessionRemarkEntries?.(targetDate) : undefined) ?? activityEntries;
    const syncedActivityRemarks = { ...activityRemarks };

    if (relevantEntries && relevantEntries.length > 0) {
      for (const entry of relevantEntries) {
        const hasText = remark.includes(entry.text) || remark.includes(entry.originalText);
        if (!hasText && (remark.trim() === '' || !Object.hasOwn(activityRemarks, entry.id))) {
          syncedActivityRemarks[entry.id] = null;
        }
      }
    }

    onApply({
      ...(appliesDate ? { date: actionType === 'associate' ? finalDate : '' } : {}),
      ...(intent === 'remark' || remarkChanged || remark !== (selection.remark ?? '') ? { remark } : {}),
      ...(Object.keys(syncedActivityRemarks).length ? { activityRemarks: syncedActivityRemarks } : {}),
    });
  };

  const remarkInputSection = (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <label htmlFor="assign-date-remark" className="block text-sm font-bold text-foreground text-start font-sans">
            {t('remark.title')} :
          </label>
          {resolvedDocs && resolvedDocs.length > 0 && onOpenDocumentPreview && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {resolvedDocs.map(preview => (
                <button
                  key={preview.assessmentId}
                  type="button"
                  onClick={() => onOpenDocumentPreview(preview)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 active:scale-95 text-xs font-bold text-primary transition-all cursor-pointer shadow-2xs"
                  title={t('documentPreview.openAria', { title: preview.title })}
                >
                  <Eye className="size-3.5 shrink-0" />
                  <span dir="auto" className="truncate max-w-[160px]">{preview.title}</span>
                  <span className="text-[10px] font-medium opacity-80 underline underline-offset-2">
                    ({isRtl ? 'معاينة' : 'Aperçu'})
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        {remark ? (
          <button
            type="button"
            onClick={() => { setRemark(''); setRemarkChanged(true); }}
            className="text-xs font-semibold text-muted-foreground hover:text-destructive inline-flex items-center gap-1 cursor-pointer transition-colors shrink-0"
            title={t('common.delete')}
          >
            <X className="size-3" />
            <span>{t('remark.clearRemark')}</span>
          </button>
        ) : null}
      </div>

      {/* Quick insert chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => {
            const dm = t('remark.devoirMaisonGivenSimple');
            setRemark(current => {
              const trimmed = current.trim();
              if (!trimmed) return dm;
              if (trimmed.includes(dm)) return current;
              return `${trimmed}\n${dm}`;
            });
            setRemarkChanged(true);
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-primary/25 bg-primary/5 hover:bg-primary/10 active:scale-95 text-xs font-bold text-primary transition-all cursor-pointer shadow-2xs"
        >
          <Plus className="size-3 stroke-[2.5]" />
          <span>{t('remark.devoirMaisonGivenSimple')}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            const cc = t('evaluations.event.controle_cahiers');
            setRemark(current => {
              const trimmed = current.trim();
              if (!trimmed) return cc;
              if (trimmed.includes(cc)) return current;
              return `${trimmed}\n${cc}`;
            });
            setRemarkChanged(true);
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-primary/25 bg-primary/5 hover:bg-primary/10 active:scale-95 text-xs font-bold text-primary transition-all cursor-pointer shadow-2xs"
        >
          <Plus className="size-3 stroke-[2.5]" />
          <span>{t('evaluations.event.controle_cahiers')}</span>
        </button>
      </div>

      <textarea
        ref={textareaRef}
        id="assign-date-remark"
        value={remark}
        onChange={event => { setRemark(event.target.value); setRemarkChanged(true); }}
        dir={fieldDir}
        rows={intent === 'remark' ? 4 : 3}
        placeholder={t(selection.mixedRemarks ? 'assignDate.keepRemarks' : 'remark.placeholder')}
        className="min-h-[105px] w-full resize-y rounded-xl border border-border bg-background p-3 text-sm font-medium leading-relaxed text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
      />

      {selectedCount > 1 && (
        <p className="text-[12px] font-medium leading-snug text-muted-foreground font-sans">
          {t('remark.groupHint', { count: number.format(selectedCount) })}
        </p>
      )}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
            {intent === 'remark' ? (
              <FileText className="h-5 w-5 stroke-[2.2]" />
            ) : (
              <CalendarPlus className="h-5 w-5 stroke-[2.2]" />
            )}
          </span>
          <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-sans">
            {intent === 'remark' ? t('remark.title') : t('assignDate.title')}
          </span>
        </div>
      }
      description={
        intent === 'remark' ? (
          <span className="flex items-center gap-2 flex-wrap text-xs sm:text-sm text-muted-foreground font-sans">
            <span>
              {t(selectedCount === 1 ? 'assignDate.selectedOne' : 'assignDate.selectedMany', {
                count: number.format(selectedCount),
              })}
            </span>
            {selectedDate && (
              <>
                <span className="opacity-40">•</span>
                <span className="font-semibold text-foreground/80" dir="ltr">
                  {(() => {
                    const [y, m, d] = selectedDate.split('-');
                    return y && m && d ? `${d}/${m}/${y}` : selectedDate;
                  })()}
                </span>
              </>
            )}
          </span>
        ) : (
          t(selectedCount === 1 ? 'assignDate.selectedOne' : 'assignDate.selectedMany', {
            count: number.format(selectedCount),
          })
        )
      }
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
            disabled={intent !== 'remark' && invalidDate}
            className={`rounded-xl h-11 flex-1 text-sm font-bold shadow-sm transition-all duration-150 ${
              intent === 'remark' || actionType === 'associate'
                ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
            }`}
          >
            {intent === 'remark' || !appliesDate ? (
              <span className="inline-flex items-center justify-center gap-1.5">
                <Check className="size-4 stroke-[2.4]" />
                <span>{t('remark.saveRemark')}</span>
              </span>
            ) : actionType === 'associate' ? (
              <span>{t('assignDate.applyDate')}</span>
            ) : (
              <span>{t('assignDate.removeDates')}</span>
            )}
          </Button>
        </div>
      }
    >
      {intent === 'remark' ? (
        <div className="space-y-4 animate-fade-in duration-200">
          {remarkInputSection}

          {/* Compact session date row */}
          <div className="pt-2 border-t border-border/60">
            <div className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-muted/25 transition-colors">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CalendarDays className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-[11px] font-semibold text-muted-foreground font-sans">
                    {t('remark.sessionDate')}
                  </div>
                  <div className="text-sm font-bold text-foreground font-sans" dir="ltr">
                    {selectedDate ? (() => {
                      const [y, m, d] = selectedDate.split('-');
                      return y && m && d ? `${d}/${m}/${y}` : selectedDate;
                    })() : t('assignDate.unassign')}
                  </div>
                </div>
              </div>
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg text-xs font-semibold gap-1.5 border-border hover:bg-muted cursor-pointer"
                >
                  <CalendarDays className="size-3.5" />
                  <span>{t('common.edit')}</span>
                </Button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={event => chooseDate(event.target.value)}
                  onClick={e => {
                    try {
                      if (typeof e.currentTarget.showPicker === 'function') e.currentTarget.showPicker();
                    } catch {}
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>
            </div>

            {/* Warnings if any */}
            {dateWarnings.length > 0 && (
              <div className="mt-3 space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.08] p-3 text-start animate-fade-in duration-200" role="status">
                {dateWarnings.map((warning, i) => (
                  <p key={i} className="flex items-start gap-2 text-[12px] font-medium leading-snug text-amber-800 dark:text-amber-300 font-sans">
                    <TriangleAlert aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>{warning.message}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
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
                      {(() => {
                        const effLocale = locale === 'ar' ? 'ar' : locale === 'en' ? 'en' : 'fr';
                        const intersecting = resolveClassSessionDatesInRange(selectedDate, endDate, classId, timetable, timetableClock, lessonsData ?? session.source);
                        return formatPedagogicalDateCell(selectedDate, endDate, effLocale, intersecting);
                      })()}
                    </span>
                  </div>
                )}

                {selection.mixedDates && !dateChanged && <p className="text-xs text-muted-foreground">{t('assignDate.keepDates')}</p>}
              </div>

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

          <div className="border-t border-border/60 pt-5">
            {remarkInputSection}
          </div>
        </div>
      )}
    </Modal>
  );
};
