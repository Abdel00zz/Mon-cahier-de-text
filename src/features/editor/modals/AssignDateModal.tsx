import { sessionDateKeys } from '@/domain/evaluations/homeworkPlacement';
import {
  extractHomeworkAssignmentNumber,
  hasHomeworkAssignmentMention,
  getChronologicalHomeworkNumber,
  replaceOrInsertHomeworkInRemark,
  removeHomeworkFromRemark,
} from '@/domain/evaluations/homeworkNumbering';
import { type HomeworkMoment } from '@/domain/evaluations/homeworkCycle';
import { findItem } from '@/domain/notebook/dataUtils';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { motion, AnimatePresence } from 'framer-motion';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import {
  CalendarDays,
  CalendarX,
  FileText,
  CheckSquare,
  Lightbulb,
  Users,
  CalendarCheck,
  X,
  Plus,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import type { SessionPatch } from '@/domain/notebook/sessionEditing';
import type { SessionEditorState } from '../hooks/useSessionAssignment';
import type { TimetableEntry, TimetableClockPolicy, LessonsData, AppLocale } from '@/types';
import type { NotebookDocumentPreview } from '@/domain/evaluations/assessmentSync';
import type { SessionRemarkEntry } from '@/domain/evaluations/sessionActivityRemarks';
import {
  PEDAGOGICAL_ACTIVITIES,
  activityShortLabel,
  addActivityLine,
  remarkHasActivity,
  removeActivityLines,
  type SessionActivityType,
} from '@/domain/evaluations/pedagogicalActivities';
import { todayInMorocco } from '@/domain/calendar/calendar';
import { addDaysIso } from '@/domain/notebook/dataUtils';
import { extractDateRange, formatPedagogicalDateCell } from '@/domain/evaluations/notebookSyncBridge';
import { resolveClassSessionDatesInRange } from '@/domain/notebook/classSessionDates';
import { useLocale } from '@/i18n/LocaleProvider';
import { cn } from '@/lib/utils';
import { ContextualDescriptionEditor } from './ContextualDescriptionEditor';
import { renderDescriptionWithBold } from '@/components/typography/textFormat';
import { MathText } from '@/components/ui/math-text';
import './AssignDateModal.premium.css';
import './paperFormModal.css';

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
  /** Cycle des devoirs maison de la classe : donnés puis corrigés (deux séances). */
  homeworkMoments?: readonly HomeworkMoment[];
  /** Sujets et documents associés à cette séance pour aperçu */
  sessionDocuments?: readonly NotebookDocumentPreview[];
  getSessionDocuments?: (date: string) => readonly NotebookDocumentPreview[] | undefined;
  onOpenDocumentPreview?: (preview: NotebookDocumentPreview) => void;
}

const isoFromOffset = (offset: number) => addDaysIso(todayInMorocco(), offset);

const triggerHaptic = () => {
  try {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  } catch {}
};

/**
 * Pictogrammes des activités : la seule part « écran » du catalogue.
 * Les libellés et les synonymes vivent dans le domaine
 * (`domain/evaluations/pedagogicalActivities`), partagés et testables.
 */
const ACTIVITY_ICONS: Record<SessionActivityType, React.ComponentType<{ className?: string }>> = {
  controle_cahiers: CheckSquare,
  remediation: Lightbulb,
  soutien: Users,
  rattrapage: CalendarCheck,
};

interface RemarqueSimplifieeProps {
  remark: string;
  onRemarkChange: (newRemark: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  fieldDir: 'auto' | 'rtl' | 'ltr';
  placeholder: string;
  hasHomework: boolean;
  activeHomeworkNum: number;
  detectedHomeworkNum: number | null;
  chronologicalNumForDate: number;
  resolvedDocs?: readonly NotebookDocumentPreview[];
  onOpenDocumentPreview?: (preview: NotebookDocumentPreview) => void;
  locale: string;
  isRtl: boolean;
  t: (key: string, values?: Record<string, string | number>) => string;
}

export const RemarqueSimplifiee: FC<RemarqueSimplifieeProps> = ({
  remark,
  onRemarkChange,
  textareaRef,
  fieldDir,
  placeholder,
  hasHomework,
  activeHomeworkNum,
  resolvedDocs,
  onOpenDocumentPreview,
  locale,
  isRtl,
  t,
}) => {
  const charCount = remark.length;

  const handleClear = () => {
    triggerHaptic();
    onRemarkChange('');
  };

  return (
    <div className="space-y-3.5">
      {/* Section des activités pédagogiques & prévisualisation */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/75 ps-0.5 font-sans">
            {t('remark.pedagogicalActivities')}
          </span>
          <div className="flex items-center gap-3">
            {resolvedDocs && resolvedDocs.length > 0 && onOpenDocumentPreview && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {resolvedDocs.map(preview => (
                  <motion.button
                    key={preview.assessmentId}
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { triggerHaptic(); onOpenDocumentPreview(preview); }}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-border/80 bg-muted/40 hover:bg-muted text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs"
                    title={t('documentPreview.openAria', { title: preview.title })}
                  >
                    <Eye className="size-3 text-muted-foreground" />
                    <span dir="auto" className="truncate max-w-[130px]">{preview.title}</span>
                    <span className="text-[10px] text-muted-foreground">
                      ({isRtl ? 'معاينة' : 'Aperçu'})
                    </span>
                  </motion.button>
                ))}
              </div>
            )}
            <AnimatePresence>
              {remark ? (
                <motion.button
                  type="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={handleClear}
                  className="remark-clear-btn"
                  title={t('common.delete')}
                >
                  <span>{locale === 'ar' ? 'مسح' : locale === 'en' ? 'Clear' : 'Effacer'}</span>
                </motion.button>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        {/* Action Dock : Puces sans bordures agressives, beige doux par défaut, sans icône de validation */}
        <div className="remark-chips-grid">
          {/* Devoir maison avec numérotation chronologique (toggle simple) */}
          <motion.button
            type="button"
            data-selected={hasHomework}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            onClick={() => {
              triggerHaptic();
              if (hasHomework) {
                onRemarkChange(removeHomeworkFromRemark(remark));
              } else {
                const dmText = t('remark.devoirMaisonGiven', { num: activeHomeworkNum });
                onRemarkChange(replaceOrInsertHomeworkInRemark(remark, dmText));
              }
            }}
            className="remark-chip"
            title={t('remark.devoirMaisonGivenSimple')}
          >
            <FileText className="remark-chip-icon" />
            <span>{t('remark.devoirMaisonGivenSimple')}</span>
          </motion.button>

          {/* Les activités pédagogiques : Contrôle des cahiers, Remédiation, Soutien, Rattrapage */}
          {PEDAGOGICAL_ACTIVITIES.map(act => {
            const fullText = t(act.labelKey);
            const chipLabel = activityShortLabel(act, locale as AppLocale);
            const active = remarkHasActivity(remark, act);
            const Icon = ACTIVITY_ICONS[act.type];

            return (
              <motion.button
                key={act.type}
                type="button"
                data-selected={active}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                onClick={() => {
                  triggerHaptic();
                  if (active) {
                    onRemarkChange(removeActivityLines(remark, act));
                  } else {
                    onRemarkChange(addActivityLine(remark, fullText));
                  }
                }}
                className="remark-chip"
                title={fullText}
              >
                <Icon className="remark-chip-icon" />
                <span>{chipLabel}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Zone de saisie enrichie avec menu contextuel de sélection identique à la création de contenu */}
      <div className="space-y-2">
        <div className="remark-textarea-wrapper">
          <ContextualDescriptionEditor
            id="assign-date-remark"
            externalRef={textareaRef}
            value={remark}
            onChange={onRemarkChange}
            dir={fieldDir}
            rows={4}
            placeholder={placeholder}
            className="!min-h-[125px]"
          />
        </div>
        <div className="flex justify-end pe-1">
          <span className="text-xs text-muted-foreground/75 font-sans font-medium">
            {charCount} {locale === 'ar' ? 'حرف' : locale === 'en' ? 'characters' : 'caractères'}
          </span>
        </div>
        {remark.trim() && (
          <div className="rounded-2xl border border-border/70 bg-muted/25 p-3 text-sm text-foreground shadow-2xs">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
              {t('editContent.preview')}
            </p>
            <MathText source={remark} cacheKey={`remark-preview-${remark}`}>
              <div dir="auto" className="editor-type-remark space-y-1 text-start text-xs sm:text-sm leading-relaxed">
                {renderDescriptionWithBold(remark)}
              </div>
            </MathText>
          </div>
        )}
      </div>
    </div>
  );
};

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
  homeworkMoments,
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
  const [isSuccessSaved, setIsSuccessSaved] = useState(false);
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
    setIsSuccessSaved(false);
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

  // Détection et synchronisation avancée du numéro de devoir maison (إعطاء الفرض المنزلي).
  // Attribution et correction sont DEUX lignes distinctes du même devoir :
  // chaque détection ignore l'autre temps pour que les pastilles ne se confondent pas.
  const detectedHomeworkNum = useMemo(() => extractHomeworkAssignmentNumber(remark), [remark]);
  const hasHomework = useMemo(() => Boolean(detectedHomeworkNum !== null || hasHomeworkAssignmentMention(remark)), [detectedHomeworkNum, remark]);
  const hasPedagogicalActivity = useMemo(
    () => PEDAGOGICAL_ACTIVITIES.some(activity => remarkHasActivity(remark, activity)),
    [remark],
  );
  const chronologicalNumForDate = useMemo(() => {
    /*
     * Les devoirs déjà donnés vivent dans la FEUILLE d'évaluations
     * (`manualAssessments` + `assessmentDates`) : la mention de séance est un
     * badge, plus une ligne de texte dans la remarque. Sans ces sources, le
     * calcul ne voyait aucun jalon et chaque nouveau devoir valait « 1 ».
     */
    const moments = homeworkMoments ?? [];
    return getChronologicalHomeworkNumber({
      lessons: lessonsData as LessonsData,
      targetDate: selectedDate,
      manualAssessments: moments.map(moment => ({
        id: moment.id, type: 'maison', num: moment.num, dateISO: moment.givenDateISO,
      })),
      assessmentDates: Object.fromEntries(moments.map(moment => [moment.id, moment.givenDateISO ?? ''])),
    });
  }, [homeworkMoments, lessonsData, selectedDate]);
  const activeHomeworkNum = useMemo(() => {
    if (detectedHomeworkNum !== null && detectedHomeworkNum > 0) return detectedHomeworkNum;
    return chronologicalNumForDate;
  }, [detectedHomeworkNum, chronologicalNumForDate]);

  const appliesDate = dateChanged || ((intent === 'date' || (!selection.date && (hasHomework || hasPedagogicalActivity))) && !selection.mixedDates);
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
      // La pastille « Devoir maison N donné » crée le devoir dans la feuille
      // d'évaluations (contrôle continu) : un texte ne suffit pas.
      ...(hasHomework && actionType === 'associate' && selectedDate ? { homeworkGiven: activeHomeworkNum } : {}),

    });
  };

  const handleApplyWithFeedback = () => {
    if (isSuccessSaved) return;
    setIsSuccessSaved(true);
    triggerHaptic();
    window.setTimeout(() => {
      handleApply();
    }, 280);
  };

  const renderRemarque = () => (
    <RemarqueSimplifiee
      remark={remark}
      onRemarkChange={newVal => {
        setRemark(newVal);
        setRemarkChanged(true);
      }}
      textareaRef={textareaRef}
      fieldDir={fieldDir}
      placeholder={t(selection.mixedRemarks ? 'assignDate.keepRemarks' : 'remark.placeholder')}
      hasHomework={hasHomework}
      activeHomeworkNum={activeHomeworkNum}
      detectedHomeworkNum={detectedHomeworkNum}
      chronologicalNumForDate={chronologicalNumForDate}
      resolvedDocs={resolvedDocs}
      onOpenDocumentPreview={onOpenDocumentPreview}
      locale={locale}
      isRtl={isRtl}
      t={t}
    />
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      hideClose={true}
      title={
        <div className="flex items-center justify-between gap-3 w-full">
          <div className="flex flex-col text-start min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold text-foreground truncate font-sans">
                {intent === 'remark' ? t('remark.title') : t('assignDate.title')}
              </span>
              {selectedCount > 1 && (
                <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md font-sans">
                  {number.format(selectedCount)}
                </span>
              )}
            </div>
            {intent === 'remark' && (
              <span className="text-xs text-muted-foreground/80 font-medium">
                {locale === 'ar' ? 'ملاحظات وأنشطة' : locale === 'en' ? 'Notes & activities' : 'Notes & activités'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {selectedDate && (
              <div className="relative inline-flex items-center">
                <button
                  type="button"
                  className="remark-date-badge"
                  dir="ltr"
                >
                  <span>
                    {(() => {
                      const [y, m, d] = selectedDate.split('-');
                      return y && m && d ? `${d}/${m}/${y}` : selectedDate;
                    })()}
                  </span>
                </button>
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
                  aria-label={t('remark.sessionDate')}
                />
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="remark-close-btn"
              title={t('common.close')}
              aria-label={t('common.close')}
            >
              <X className="size-4 stroke-[2.2]" />
            </button>
          </div>
        </div>
      }
      maxWidth="lg"
      className="paper-form-modal sm:max-w-xl"
      headerClassName="py-3 px-5 sm:px-6 min-h-0 border-b border-border/30 bg-background/95 backdrop-blur-md"
      bodyClassName="px-5 py-4 sm:px-6 sm:py-5"
      footerClassName="py-3 px-5 sm:px-6 border-t border-border/30 bg-background/95 backdrop-blur-md"
      footer={
        intent === 'remark' ? (
          <div className="flex w-full items-center justify-center gap-3">
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              onClick={handleApplyWithFeedback}
              disabled={isSuccessSaved}
              className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-7 h-11 text-sm shadow-sm min-w-[120px] inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              {isSuccessSaved ? (
                <span className="inline-flex items-center gap-1.5 animate-in fade-in duration-150">
                  <svg className="w-4 h-4 stroke-current shrink-0" viewBox="0 0 24 24" fill="none" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" className="animate-draw-check" />
                  </svg>
                  <span>{locale === 'ar' ? 'تم الحفظ' : locale === 'en' ? 'Saved' : 'Enregistré'}</span>
                </span>
              ) : (
                <span>{t('common.save')}</span>
              )}
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              onClick={onClose}
              disabled={isSuccessSaved}
              className="rounded-xl h-11 px-6 text-sm font-semibold bg-[#f2f2ef] hover:bg-[#e8e8e4] text-[#5e5e5a] dark:bg-[#242421] dark:hover:bg-[#2c2c28] dark:text-[#a8a8a2] border-none cursor-pointer transition-colors"
            >
              {t('common.cancel')}
            </motion.button>
          </div>
        ) : (
          <div className="flex w-full items-center gap-2.5">
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              onClick={onClose}
              disabled={isSuccessSaved}
              className="rounded-xl h-10 w-1/3 text-xs sm:text-sm font-semibold bg-[#f2f2ef] hover:bg-[#e8e8e4] text-[#5e5e5a] dark:bg-[#242421] dark:hover:bg-[#2c2c28] dark:text-[#a8a8a2] border-none cursor-pointer transition-colors"
            >
              {t('common.cancel')}
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              onClick={handleApplyWithFeedback}
              disabled={invalidDate || isSuccessSaved}
              className={`rounded-xl h-10 flex-1 text-xs sm:text-sm font-bold shadow-sm inline-flex items-center justify-center gap-2 cursor-pointer transition-all duration-150 ${
                actionType === 'associate'
                  ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                  : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
              }`}
            >
              {isSuccessSaved ? (
                <span className="inline-flex items-center gap-1.5 animate-in fade-in duration-150">
                  <svg className="w-4 h-4 stroke-current shrink-0" viewBox="0 0 24 24" fill="none" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" className="animate-draw-check" />
                  </svg>
                  <span>{actionType === 'associate' ? (locale === 'ar' ? 'تم التعيين' : 'Assigné') : (locale === 'ar' ? 'تم الإلغاء' : 'Dissocié')}</span>
                </span>
              ) : actionType === 'associate' ? (
                <span>{t('assignDate.applyDate')}</span>
              ) : (
                <span>{t('assignDate.removeDates')}</span>
              )}
            </motion.button>
          </div>
        )
      }
    >
      {intent === 'remark' ? (
        <div className="space-y-4 animate-fade-in duration-200">
          {renderRemarque()}

          {/* Warnings if any */}
          {dateWarnings.length > 0 && (
            <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.08] p-3 text-start animate-fade-in duration-200" role="status">
              {dateWarnings.map((warning, i) => (
                <p key={i} className="flex items-start gap-2 text-[12px] font-medium leading-snug text-amber-800 dark:text-amber-300 font-sans">
                  <AlertTriangle aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>{warning.message}</span>
                </p>
              ))}
            </div>
          )}
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
                      <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
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
            {renderRemarque()}
          </div>
        </div>
      )}
    </Modal>
  );
};
