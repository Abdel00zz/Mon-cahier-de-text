import { sessionDateKeys } from '@/domain/evaluations/homeworkPlacement';
import {
  extractHomeworkNumber,
  hasHomeworkMention,
  getNextHomeworkNumber,
  getChronologicalHomeworkNumber,
  replaceOrInsertHomeworkInRemark,
  removeHomeworkFromRemark,
} from '@/domain/evaluations/homeworkNumbering';
import { findItem } from '@/domain/notebook/dataUtils';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { motion, AnimatePresence } from 'framer-motion';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import {
  CalendarDays,
  CalendarPlus,
  CalendarX,
  FileText,
  Home,
  ClipboardCheck,
  RefreshCw,
  BookOpen,
  History,
  Check,
  X,
  Trash2,
  Plus,
  Minus,
  Eye,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
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

const triggerHaptic = () => {
  try {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  } catch {}
};

interface PedagogicalRemarkActivity {
  key: 'controle_cahiers' | 'remediation' | 'soutien' | 'rattrapage';
  labelKey: string;
  getShortLabel: (locale: string) => string;
  Icon: React.ComponentType<{ className?: string }>;
  synonyms: string[];
}

const PEDAGOGICAL_ACTIVITIES: readonly PedagogicalRemarkActivity[] = [
  {
    key: 'controle_cahiers',
    labelKey: 'evaluations.event.controle_cahiers',
    getShortLabel: (locale) => locale === 'ar' ? 'مراقبة الدفاتر' : locale === 'en' ? 'Notebook check' : 'Contrôle des cahiers',
    Icon: ClipboardCheck,
    synonyms: ['مراقبة دفاتر التلاميذ', 'مراقبة الدفاتر', 'Contrôle des cahiers des élèves', 'Contrôle des cahiers', 'Cahiers vérifiés'],
  },
  {
    key: 'remediation',
    labelKey: 'evaluations.event.remediation',
    getShortLabel: (locale) => locale === 'ar' ? 'معالجة التعثرات' : locale === 'en' ? 'Remediation' : 'Remédiation',
    Icon: RefreshCw,
    synonyms: ['معالجة التعثرات', 'معالجة', 'Remédiation', 'Remediation'],
  },
  {
    key: 'soutien',
    labelKey: 'evaluations.event.soutien',
    getShortLabel: (locale) => locale === 'ar' ? 'دعم تربوي' : locale === 'en' ? 'Support' : 'Soutien',
    Icon: BookOpen,
    synonyms: ['دعم تربوي', 'دعم', 'Soutien'],
  },
  {
    key: 'rattrapage',
    labelKey: 'evaluations.event.rattrapage',
    getShortLabel: (locale) => locale === 'ar' ? 'حصة استدراك' : locale === 'en' ? 'Make-up' : 'Rattrapage',
    Icon: History,
    synonyms: ['استدراك', 'حصّة استدراك', 'حصة استدراك', 'Rattrapage'],
  },
];

const isActivityInRemark = (currentRemark: string, label: string, synonyms: string[]): boolean => {
  if (!currentRemark) return false;
  const candidates = [label, ...synonyms].filter(Boolean);
  const lines = currentRemark.split('\n').map(l => l.trim());
  return candidates.some(cand => {
    const cLower = cand.toLowerCase();
    return lines.some(line => {
      const lLower = line.toLowerCase();
      return lLower === cLower || lLower.startsWith(cLower) || line.includes(cand);
    });
  });
};

const addActivityToRemark = (currentRemark: string, label: string): string => {
  const trimmed = currentRemark.trim();
  if (!trimmed) return label;
  return `${trimmed}\n${label}`;
};

const removeActivityFromRemark = (currentRemark: string, label: string, synonyms: string[]): string => {
  const candidates = [label, ...synonyms].filter(Boolean).map(c => c.toLowerCase());
  const lines = currentRemark.split('\n');
  const remaining = lines.filter(line => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    const tLower = trimmed.toLowerCase();
    return !candidates.some(c => tLower === c || tLower.startsWith(c) || trimmed.includes(c));
  });
  return remaining.join('\n').replace(/\n{3,}/g, '\n\n').trim();
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

  // Détection et synchronisation avancée du numéro de devoir maison (إعطاء الفرض المنزلي)
  const detectedHomeworkNum = useMemo(() => extractHomeworkNumber(remark), [remark]);
  const hasHomework = useMemo(() => Boolean(detectedHomeworkNum !== null || hasHomeworkMention(remark)), [detectedHomeworkNum, remark]);
  const chronologicalNumForDate = useMemo(() => {
    return getChronologicalHomeworkNumber({
      lessons: lessonsData as LessonsData,
      targetDate: selectedDate,
    });
  }, [lessonsData, selectedDate]);
  const activeHomeworkNum = useMemo(() => {
    if (detectedHomeworkNum !== null && detectedHomeworkNum > 0) return detectedHomeworkNum;
    return chronologicalNumForDate;
  }, [detectedHomeworkNum, chronologicalNumForDate]);

  const remarkInputSection = (
    <div className="space-y-2.5">
      {/* Barre d'activités pédagogiques & prévisualisation */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/75 ps-0.5 font-sans">
            {t('remark.pedagogicalActivities')}
          </span>
          <div className="flex items-center gap-2">
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
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => {
                    triggerHaptic();
                    setRemark('');
                    setRemarkChanged(true);
                  }}
                  className="text-xs font-medium text-muted-foreground hover:text-destructive inline-flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                  title={t('common.delete')}
                >
                  <Trash2 className="size-3" />
                  <span>{t('remark.clearRemark')}</span>
                </motion.button>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        {/* Action Dock neutre et réactif */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Devoir maison avec numérotation chronologique et stepper */}
          {!hasHomework ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              onClick={() => {
                triggerHaptic();
                const dmText = t('remark.devoirMaisonGiven', { num: activeHomeworkNum });
                setRemark(current => replaceOrInsertHomeworkInRemark(current, dmText));
                setRemarkChanged(true);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border/80 bg-muted/30 hover:bg-muted text-xs font-semibold text-foreground/80 hover:text-foreground transition-all cursor-pointer shadow-2xs"
              title={t('remark.devoirMaisonGiven', { num: activeHomeworkNum })}
            >
              <Plus className="size-3 stroke-[2.5] text-muted-foreground shrink-0" />
              <Home className="size-3.5 text-muted-foreground shrink-0" />
              <span>{t('remark.devoirMaisonGiven', { num: activeHomeworkNum })}</span>
            </motion.button>
          ) : (
            <motion.div
              layout
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-foreground/30 bg-muted text-xs font-bold text-foreground shadow-2xs ring-1 ring-border/40"
            >
              <Check className="size-3.5 stroke-[2.5] text-foreground shrink-0" />
              <Home className="size-3.5 text-foreground shrink-0" />
              <span>{t('remark.devoirMaisonGiven', { num: activeHomeworkNum })}</span>
              <div className="flex items-center gap-0.5 ms-1 border-s border-border/80 ps-1">
                <button
                  type="button"
                  title="-1"
                  aria-label="-1"
                  onClick={() => {
                    triggerHaptic();
                    const nextVal = Math.max(1, activeHomeworkNum - 1);
                    const dmText = t('remark.devoirMaisonGiven', { num: nextVal });
                    setRemark(current => replaceOrInsertHomeworkInRemark(current, dmText));
                    setRemarkChanged(true);
                  }}
                  className="size-5 flex items-center justify-center rounded hover:bg-foreground/10 active:scale-90 text-[11px] font-bold text-foreground cursor-pointer transition-colors"
                >
                  <Minus className="size-2.5 stroke-[2.5]" />
                </button>
                <button
                  type="button"
                  title="+1"
                  aria-label="+1"
                  onClick={() => {
                    triggerHaptic();
                    const nextVal = activeHomeworkNum + 1;
                    const dmText = t('remark.devoirMaisonGiven', { num: nextVal });
                    setRemark(current => replaceOrInsertHomeworkInRemark(current, dmText));
                    setRemarkChanged(true);
                  }}
                  className="size-5 flex items-center justify-center rounded hover:bg-foreground/10 active:scale-90 text-[11px] font-bold text-foreground cursor-pointer transition-colors"
                >
                  <Plus className="size-2.5 stroke-[2.5]" />
                </button>
                {detectedHomeworkNum !== null && detectedHomeworkNum !== chronologicalNumForDate && (
                  <button
                    type="button"
                    title={`Synchroniser avec la date (${chronologicalNumForDate})`}
                    aria-label="Synchroniser avec la date"
                    onClick={() => {
                      triggerHaptic();
                      const dmText = t('remark.devoirMaisonGiven', { num: chronologicalNumForDate });
                      setRemark(current => replaceOrInsertHomeworkInRemark(current, dmText));
                      setRemarkChanged(true);
                    }}
                    className="size-5 flex items-center justify-center rounded hover:bg-foreground/10 text-muted-foreground hover:text-foreground active:scale-90 cursor-pointer transition-colors"
                  >
                    <RefreshCw className="size-3" />
                  </button>
                )}
                <button
                  type="button"
                  title={t('common.delete')}
                  aria-label={t('common.delete')}
                  onClick={() => {
                    triggerHaptic();
                    setRemark(current => removeHomeworkFromRemark(current));
                    setRemarkChanged(true);
                  }}
                  className="ms-0.5 size-5 flex items-center justify-center rounded hover:bg-destructive/15 text-muted-foreground hover:text-destructive active:scale-90 cursor-pointer transition-colors"
                >
                  <X className="size-3" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Les activités pédagogiques : Contrôle des cahiers, Remédiation, Soutien, Rattrapage */}
          {PEDAGOGICAL_ACTIVITIES.map(act => {
            const fullText = t(act.labelKey);
            const chipLabel = act.getShortLabel(locale);
            const active = isActivityInRemark(remark, fullText, act.synonyms);
            const Icon = act.Icon;

            if (active) {
              return (
                <motion.div
                  key={act.key}
                  layout
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-foreground/30 bg-muted text-xs font-bold text-foreground shadow-2xs ring-1 ring-border/40 transition-all"
                >
                  <Check className="size-3.5 stroke-[2.5] text-foreground shrink-0" />
                  <Icon className="size-3.5 stroke-[2] text-foreground shrink-0" />
                  <span>{chipLabel}</span>
                  <button
                    type="button"
                    title={t('common.delete')}
                    aria-label={`${t('common.delete')} ${chipLabel}`}
                    onClick={() => {
                      triggerHaptic();
                      setRemark(current => removeActivityFromRemark(current, fullText, act.synonyms));
                      setRemarkChanged(true);
                    }}
                    className="ms-0.5 size-5 flex items-center justify-center rounded hover:bg-destructive/15 text-muted-foreground hover:text-destructive active:scale-90 cursor-pointer transition-colors"
                  >
                    <X className="size-3" />
                  </button>
                </motion.div>
              );
            }

            return (
              <motion.button
                key={act.key}
                type="button"
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                onClick={() => {
                  triggerHaptic();
                  setRemark(current => addActivityToRemark(current, fullText));
                  setRemarkChanged(true);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border/80 bg-muted/30 hover:bg-muted text-xs font-semibold text-foreground/80 hover:text-foreground transition-all cursor-pointer shadow-2xs"
                title={fullText}
              >
                <Plus className="size-3 stroke-[2.5] text-muted-foreground shrink-0" />
                <Icon className="size-3.5 stroke-[2] text-muted-foreground shrink-0" />
                <span>{chipLabel}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <textarea
        ref={textareaRef}
        id="assign-date-remark"
        value={remark}
        onChange={event => { setRemark(event.target.value); setRemarkChanged(true); }}
        dir={fieldDir}
        rows={intent === 'remark' ? 4 : 3}
        placeholder={t(selection.mixedRemarks ? 'assignDate.keepRemarks' : 'remark.placeholder')}
        className="min-h-[110px] w-full resize-y rounded-xl border border-border/80 bg-background/90 p-3 text-sm font-medium leading-relaxed text-foreground shadow-2xs outline-none transition-all placeholder:text-muted-foreground/60 focus-visible:border-foreground/40 focus-visible:ring-2 focus-visible:ring-foreground/15"
      />
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground shadow-2xs">
              {intent === 'remark' ? (
                <FileText className="h-4 w-4" />
              ) : (
                <CalendarPlus className="h-4 w-4" />
              )}
            </span>
            <span className="text-sm sm:text-base font-bold text-foreground truncate font-sans">
              {intent === 'remark' ? t('remark.title') : t('assignDate.title')}
            </span>
            {selectedCount > 1 && (
              <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md font-sans">
                {number.format(selectedCount)}
              </span>
            )}
          </div>

          {selectedDate && (
            <div className="relative inline-flex items-center shrink-0">
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/80 bg-muted/40 hover:bg-muted text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs hover:border-foreground/30 active:scale-95"
                dir="ltr"
              >
                <CalendarDays className="size-3 text-muted-foreground" />
                <span>
                  {(() => {
                    const [y, m, d] = selectedDate.split('-');
                    return y && m && d ? `${d}/${m}/${y}` : selectedDate;
                  })()}
                </span>
                <ChevronDown className="size-2.5 text-muted-foreground opacity-60" />
              </motion.button>
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
        </div>
      }
      maxWidth="lg"
      className="sm:max-w-xl sm:rounded-2xl"
      headerClassName="py-2.5 sm:py-3 px-4 sm:px-6 min-h-0 border-b border-border/40 bg-background/95 backdrop-blur-md"
      bodyClassName="px-4 py-3.5 sm:px-6 sm:py-4"
      footerClassName="py-2.5 sm:py-3 px-4 sm:px-6 border-t border-border/40 bg-background/95 backdrop-blur-md"
      footer={
        <div className="flex items-center w-full gap-3">
          <Button type="button" variant="secondary" onClick={onClose} className="rounded-xl h-10 w-1/3 text-xs sm:text-sm font-semibold bg-muted hover:bg-muted/80 text-foreground cursor-pointer">
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={intent !== 'remark' && invalidDate}
            className={`rounded-xl h-10 flex-1 text-xs sm:text-sm font-bold shadow-sm transition-all duration-150 cursor-pointer ${
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
            {remarkInputSection}
          </div>
        </div>
      )}
    </Modal>
  );
};
