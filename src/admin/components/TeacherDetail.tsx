import { buildAbsenceSessions, type AbsenceSession } from '../../domain/notebook/absenceSessions';
import { migrateLessonsData } from '../../domain/notebook/dataUtils';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { startForegroundPolling } from '../../platform/mobileScheduling';
import { blockTeacher, deleteTeacher, deleteTeacherClass, fetchClassLessons, fetchTeacher, fetchTeacherMessages, notifyTeacher, saveAssessmentDate, upsertTeacherClass, type AdminActivityDocument, type ClassLessonsImportResult, type TeacherPrintSettings, TeacherDetail as TeacherDetailData } from '../api';
import { getBundledCalendar, loadHolidayCalendar, todayInMorocco } from '../../domain/calendar/calendar';
import { computeLateness } from '../../domain/calendar/lateness';
import { getClassTeachingEndForYear } from '../../domain/evaluations/officialStudentEvents';
import { loadPlanning, resolveClassAssessments, type PlannedAssessment } from '../../domain/evaluations/assessments';
import { documentIndicator, documentRequirementForAssessment, documentRequirementForEvent, documentRequirementForHomeworkCorrection, type DocumentIndicator } from '../../domain/evaluations/documentRequirement';
import { homeworkCorrectionDocumentId } from '../../domain/evaluations/homeworkIds';
import { completionColor, timeAgo } from '../utils';
import { Button } from '../../components/ui/button';
import {
    ArrowLeft,
    Clock,
    SlidersHorizontal,
    Bell,
    Lock,
    Unlock,
    Plus,
    Printer,
    FileCode2,
    Users,
    Pencil,
    Eye,
    BookOpen,
    CalendarCheck,
    FileText,
    ChevronDown,
    Loader2,
    Check,
} from 'lucide-react';
import { Trash2 } from '../../components/ui/icons';
import { Modal } from '../../components/ui/modal';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { MathText } from '../../components/ui/math-text';
import { MathTitle } from '../../components/ui/math-title';
import { textDirectionAttribute } from '../../lib/text/textDirection';
import type { AbsencePeriod, AdminMessage, AppConfig, ClassInfo, ClassSnapshot, ContentDirection, ContentDocument, Cycle, EvaluationPolicy, LessonsData, TeacherSnapshot, TimetableClockPolicy, TimetableEntry } from '../../types';
import { computeClassSessionSchedule } from '../../domain/calendar/sessionScheduleStatus';
import { PrintView } from '../../features/editor/PrintView';
import { PrintModal, type PrintMode, type PrintOptions } from '../../features/editor/modals/PrintModal';
import { collectSessionDates, createPrintSelection } from '../../infrastructure/printing/printMeta';
import { preparePrintContent, printDocument } from '../../infrastructure/printing/printUtils';
import { ClassJsonImportModal } from './ClassJsonImportModal';
import { ClassRosterModal } from './ClassRosterModal';
import { AdminDocumentPreview } from './AdminDocumentPreview';
import { ClassProgression } from './ClassProgression';
import { CreateClassModal } from '../../features/dashboard/modals/CreateClassModal';
import './adminClassCreation.css';

const calendar = getBundledCalendar();

/* ── Inspection des chapitres d'un cahier (lecture seule) ─────────────────── */

interface LeafItem {
    title?: string;
    type?: string;
    date?: string;
    description?: string;
}

/** Tous les éléments feuilles d'un bloc (sections/sous-sections/items, récursif). */
const collectLeafItems = (node: unknown): LeafItem[] => {
    const leaves: LeafItem[] = [];
    const visit = (n: any): void => {
        if (!n || typeof n !== 'object') return;
        for (const key of ['sections', 'subsections', 'subsubsections'] as const) {
            if (Array.isArray(n[key])) n[key].forEach(visit);
        }
        if (Array.isArray(n.items)) {
            for (const item of n.items) {
                leaves.push(item as LeafItem);
                visit(item);
            }
        }
    };
    visit(node);
    return leaves;
};

interface ChapterSummary {
    title: string;
    totalItems: number;
    datedCount: number;
    lastDate: string | null;
    /** contenu exact de la dernière séance (éléments datés du dernier jour) */
    lastSessionItems: LeafItem[];
}

const summarizeChapter = (chapter: any): ChapterSummary => {
    const leaves = collectLeafItems(chapter);
    const dated = leaves.filter(l => typeof l.date === 'string' && l.date);
    const lastDate = dated.reduce((max, l) => ((l.date as string) > max ? (l.date as string) : max), '') || null;
    return {
        title: chapter?.title || chapter?.name || 'Sans titre',
        totalItems: leaves.length,
        datedCount: dated.length,
        lastDate,
        lastSessionItems: lastDate ? dated.filter(l => l.date === lastDate) : [],
    };
};

const formatDateFr = (iso: string | null): string => {
    if (!iso) return 'Non renseignée';
    try {
        const [y, m, d] = iso.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
        return iso;
    }
};

const formatDateTimeFr = (iso: string | null | undefined): string => {
    if (!iso) return 'Non renseignée';
    try {
        return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
        return iso;
    }
};

/** Construit le AppConfig minimal attendu par PrintView à partir des réglages de l'enseignant. */
const buildPrintConfig = (settings: TeacherPrintSettings | null | undefined, classInfo: ClassInfo): AppConfig => ({
    establishmentName: settings?.establishmentName ?? '',
    defaultTeacherName: settings?.defaultTeacherName ?? classInfo.teacherName ?? '',
    printShowDescriptions: true,
    academyRegion: settings?.academyRegion,
    educationProvince: settings?.educationProvince,
    schoolYearStart: settings?.schoolYearStart,
    printDescriptionMode: settings?.printDescriptionMode ?? 'all',
    printDescriptionTypes: settings?.printDescriptionTypes ?? [],
    contentNumbering: settings?.contentNumbering,
    sessionRemarkOverrides: settings?.sessionRemarkOverrides,
    assessmentDates: settings?.assessmentDates,
    manualAssessments: settings?.manualAssessments,
    removedAssessments: settings?.removedAssessments,
    absences: settings?.absences,
    timetable: settings?.timetable,
    timetableClock: settings?.timetableClock,
});

/**
 * Chapitres d'une classe : dépliable à la demande (le cahier complet n'est
 * chargé qu'au clic), puis chaque chapitre révèle sa dernière séance -
 * date, contenu exact et horodatage de synchronisation.
 */
const ClassChapters: React.FC<{
    phone: string;
    classId: string;
    timetable?: TimetableEntry[];
    timetableClock?: TimetableClockPolicy;
    absences?: AbsencePeriod[];
}> = ({ phone, classId, timetable, timetableClock, absences }) => {
    const [open, setOpen] = useState(false);
    const [chapters, setChapters] = useState<ChapterSummary[] | null>(null);
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState<number | null>(null);
    const contentId = `class-chapters-${classId}`;

    const scheduleStatus = useMemo(
        () => computeClassSessionSchedule(timetable, timetableClock, classId, { locale: 'fr', absences }),
        [timetable, timetableClock, classId, absences]
    );

    const toggle = async () => {
        const next = !open;
        setOpen(next);
        if (!next || chapters !== null || loading) return;
        setLoading(true);
        setError(null);
        try {
            const blob = await fetchClassLessons(phone, classId);
            const data = (Array.isArray(blob.lessonsData) ? blob.lessonsData : []) as LessonsData;
            setChapters(data.map(summarizeChapter));
            setUpdatedAt(blob.updatedAt ?? null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Chargement impossible.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-3 border-t border-border/80 pt-2">
            <button
                type="button"
                onClick={toggle}
                aria-expanded={open}
                aria-controls={contentId}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-primary transition-all hover:bg-primary/10 active:scale-95"
            >
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Inspecter les chapitres</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>

            {open && (
                <div id={contentId} className="mt-2 space-y-1.5">
                    {loading && <p className="text-xs text-muted-foreground">Chargement du cahier…</p>}
                    {error && <p className="rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">{error}</p>}

                    <div className="flex flex-wrap items-center justify-between gap-2">
                        {updatedAt && (
                            <p className="text-[11px] text-muted-foreground">
                                Cahier synchronisé le <b>{formatDateTimeFr(updatedAt)}</b>
                            </p>
                        )}
                        {scheduleStatus && scheduleStatus.state !== 'none' && (
                            scheduleStatus.state === 'in_progress' ? (
                                <span
                                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400"
                                    title={scheduleStatus.label}
                                >
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                                    {scheduleStatus.label}
                                </span>
                            ) : (
                                <span
                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground/80 hover:text-foreground transition-colors"
                                    title={scheduleStatus.label}
                                >
                                    <Clock className="h-3 w-3 text-primary/70 shrink-0" aria-hidden="true" />
                                    <span>{scheduleStatus.label}</span>
                                </span>
                            )
                        )}
                    </div>

                    {chapters !== null && chapters.length === 0 && (
                        <p className="text-xs text-muted-foreground">Cahier vide.</p>
                    )}

                    {chapters?.map((ch, index) => (
                        <div key={index} className="rounded-lg border border-border bg-background/60">
                            <button
                                type="button"
                                onClick={() => setExpanded(current => (current === index ? null : index))}
                                aria-expanded={expanded === index}
                                className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/40"
                            >
                                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground"><MathTitle text={ch.title} /></span>
                                <span className="shrink-0 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                    {scheduleStatus.state === 'in_progress' && ch.lastDate && (
                                        <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                            En cours
                                        </span>
                                    )}
                                    <span>
                                        {ch.datedCount}/{ch.totalItems} datés
                                        {ch.lastDate && <> · dernière séance {ch.lastDate}</>}
                                    </span>
                                </span>
                            </button>

                            {expanded === index && (
                                <div className="border-t border-border px-3 py-2.5">
                                    {ch.lastDate ? (
                                        <>
                                            <p className="text-[11px] font-semibold text-foreground">
                                                Dernière séance : <span className="capitalize">{formatDateFr(ch.lastDate)}</span>
                                            </p>
                                            <ul className="mt-1.5 space-y-1">
                                                {ch.lastSessionItems.map((item, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                                        <span className="mt-0.5 shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">
                                                            {item.type || 'contenu'}
                                                        </span>
                                                        <span className="min-w-0">
                                                            <span className="font-medium text-foreground" dir={textDirectionAttribute(item.title)}>
                                                                <MathText source={item.title}>{item.title || 'Sans titre'}</MathText>
                                                            </span>
                                                            {item.description && (
                                                                <span className="block truncate text-[11px] text-muted-foreground/80" dir={textDirectionAttribute(item.description)}>
                                                                    <MathText source={item.description}>{item.description}</MathText>
                                                                </span>
                                                            )}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">Aucune séance datée dans ce chapitre.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// mêmes paramètres que la liste : absences justifiées + seuils du prof
const latenessBadge = (snapshot: ClassSnapshot, teacher?: TeacherSnapshot | null) =>
    computeLateness({
        slots: snapshot.scheduleSlots ?? snapshot.weekdays.map(weekday => ({ weekday })),
        calendar,
        sessionsCount: snapshot.sessionsCount,
        lastDate: snapshot.lastDate,
        from: teacher?.schoolYearStart,
        settings: teacher?.notifyPrefs,
        absences: teacher?.absences,
        teachingEnd: getClassTeachingEndForYear(snapshot, calendar, teacher?.schoolYearStart),
    });

/** Libellés des activités, côté direction : l'administration n'est pas traduite. */
const ACTIVITY_LABELS: Record<string, string> = {
    evaluation_diagnostic: 'Évaluation diagnostique',
    olympiade: 'Olympiade',
    concours: 'Concours',
    soutien: 'Soutien',
    remediation: 'Remédiation',
    examen_blanc: 'Examen blanc',
    rattrapage: 'Rattrapage',
    controle_cahiers: 'Contrôle des cahiers',
    correction_controle_continu: 'Correction du devoir surveillé',
    autre: 'Autre activité',
};

/** Teinte du bouton « document » : vert = associé, rouge = requis et manquant, neutre = facultatif. */
const DOCUMENT_TONE: Record<Exclude<DocumentIndicator, 'none'>, string> = {
    attached: 'border-success/30 text-success hover:bg-success/10',
    missing: 'border-destructive/30 text-destructive hover:bg-destructive/10',
    idle: 'border-border text-muted-foreground hover:bg-secondary',
};

/** Cible de la relecture : un document, son titre et son contexte. */
interface DocumentPreviewTarget {
    title: string;
    subtitle: string;
    /** En-tête de la feuille : le titre de l'élément et, à l'autre bord, la classe. */
    heading?: string;
    classLabel?: string;
    source?: string | null;
    updatedLabel?: string;
}

/** Ce qu'un document du professeur devient pour la direction. */
const previewTarget = (document: ContentDocument | null | undefined, title: string, subtitle: string, sheet?: { heading: string; classLabel: string }): DocumentPreviewTarget => ({
    title,
    subtitle,
    ...sheet,
    source: document?.source,
    updatedLabel: document?.updatedAt ? `mise à jour le ${formatDateTimeFr(document.updatedAt)}` : undefined,
});

/**
 * Activités pédagogiques du professeur : la direction voit ce qui a été mené,
 * combien d'élèves ont été consignés, et relit le document quand il existe.
 */
const AdminActivities: React.FC<{
    classes: ClassInfo[];
    activities: Record<string, AdminActivityDocument[]>;
    /** Politique appliquée à CE compte : l'indicateur de document la respecte. */
    policy?: EvaluationPolicy;
    onPreview: (target: DocumentPreviewTarget) => void;
}> = ({ classes, activities, policy, onPreview }) => {
    const rows = classes.flatMap(classInfo => (activities[classInfo.id] ?? []).map(activity => ({ classInfo, activity })));
    if (rows.length === 0) return null;
    return (
        <section className="mb-5 rounded-2xl border bg-card p-4 shadow-sm">
            <div className="mb-3">
                <h2 className="text-sm font-black text-foreground">Activités pédagogiques</h2>
                <p className="text-[11px] text-muted-foreground">Olympiades, soutien, contrôle des cahiers… Cliquez sur une activité pour lire le document rédigé.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
                {rows.map(({ classInfo, activity }) => {
                    const label = ACTIVITY_LABELS[activity.type] ?? 'Activité';
                    const indicator = documentIndicator(documentRequirementForEvent(activity.type, policy), activity.document);
                    return (
                        <article key={`${classInfo.id}-${activity.id}`} className="flex items-center gap-3 rounded-xl bg-secondary/45 p-3">
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-bold text-foreground">{activity.title || label}</span>
                                <span className="block truncate text-[10px] text-muted-foreground">
                                    {classInfo.name} · {label} · {formatDateFr(activity.date)}
                                    {activity.students > 0 && ` · ${activity.students} élève${activity.students > 1 ? 's' : ''} consigné${activity.students > 1 ? 's' : ''}`}
                                </span>
                            </span>
                            {/* Un contrôle des cahiers ne porte jamais de document : pas de bouton. */}
                            {indicator !== 'none' && (
                                <button
                                    type="button"
                                    onClick={() => onPreview(previewTarget(activity.document, activity.title || label, `${classInfo.name} · ${label}`, { heading: activity.title || label, classLabel: classInfo.name }))}
                                    title={indicator === 'attached' ? 'Aperçu du document rédigé' : indicator === 'missing' ? 'Document manquant' : 'Aucun document'}
                                    aria-label={`Aperçu du document : ${activity.title || label}`}
                                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border shadow-2xs transition-all active:scale-95 ${DOCUMENT_TONE[indicator]}`}
                                >
                                    {indicator === 'attached' ? <Eye className="h-4 w-4" aria-hidden="true" /> : <FileText className="h-4 w-4" aria-hidden="true" />}
                                </button>
                            )}
                        </article>
                    );
                })}
            </div>
        </section>
    );
};

const AssessmentDateEditor: React.FC<{
    phone: string;
    classes: ClassInfo[];
    initial: Record<string, Record<string, string>>;
    schoolYearStart?: string;
    assessmentConfig?: Pick<AppConfig, 'manualAssessments' | 'removedAssessments'>;
    documents: Record<string, Record<string, ContentDocument>>;
    activities: Record<string, AdminActivityDocument[]>;
    policy?: EvaluationPolicy;
    teacherName: string;
    onPreview: (target: DocumentPreviewTarget) => void;
}> = ({ phone, classes, initial, schoolYearStart, assessmentConfig, documents, activities, policy, teacherName, onPreview }) => {
    const [dates, setDates] = useState(initial);
    const [rows, setRows] = useState<Array<PlannedAssessment & { classId: string; className: string }>>([]);
    const [message, setMessage] = useState('');
    const [isPlanningLoaded, setPlanningLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setPlanningLoaded(false);
        setDates(initial);
        setRows([]);
        Promise.all([loadPlanning(), loadHolidayCalendar()]).then(([planning, calendar]) => {
            if (cancelled) return;
            const today = todayInMorocco(new Date(), calendar);
            const next = classes.flatMap(classInfo => resolveClassAssessments(
                classInfo,
                planning ?? { version: 1, plans: [] },
                { ...assessmentConfig, assessmentDates: initial, schoolYearStart },
                calendar,
                today,
            ).map(item => ({ ...item, classId: classInfo.id, className: classInfo.name })));
            setRows(next.sort((a, b) => a.dateISO.localeCompare(b.dateISO)));
        }).catch(() => {
            if (!cancelled) setRows([]);
        }).finally(() => {
            if (!cancelled) setPlanningLoaded(true);
        });
        return () => { cancelled = true; };
    }, [classes, initial, schoolYearStart, assessmentConfig]);

    const change = async (row: PlannedAssessment & { classId: string }, date: string) => {
        setDates(current => ({ ...current, [row.classId]: { ...(current[row.classId] ?? {}), [row.id]: date } }));
        setRows(current => current.map(item => item.classId === row.classId && item.id === row.id ? { ...item, dateISO: date } : item));
        try {
            await saveAssessmentDate(phone, row.classId, row.id, date);
            setMessage('Date du devoir synchronisée avec le compte enseignant.');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Modification impossible.');
        }
    };

    if (!isPlanningLoaded) {
        return <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">Chargement du calendrier des devoirs…</div>;
    }
    return (
        <>
        {rows.length === 0 && <p className="mb-4 rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Aucun devoir enregistré pour ces classes.</p>}
        <section className="mb-5 rounded-2xl bg-accent/50 p-4">
            <div className="mb-3"><h2 className="text-sm font-black text-foreground">Dates des devoirs</h2><p className="text-[11px] text-muted-foreground">Les modifications sont appliquées au planning du professeur et synchronisées sur son téléphone. Chaque carte ouvre le sujet rédigé.</p></div>
            <div className="grid gap-2 sm:grid-cols-2">
                {rows.map(row => {
                    const document = documents[row.classId]?.[row.id]
                        ?? (row.legacyId ? documents[row.classId]?.[row.legacyId] : undefined);
                    const indicator = documentIndicator(documentRequirementForAssessment(row.type, policy), document);
                    const title = `${row.label} — ${row.className}`;
                    // Un devoir maison a DEUX entrées : le devoir assigné (avec sa date limite) et sa correction.
                    const manualItem = row.type === 'maison'
                        ? assessmentConfig?.manualAssessments?.[row.classId]?.find(item => item.id === row.id || item.id === row.legacyId)
                        : undefined;
                    const dueDate = manualItem?.dueDateISO ? manualItem.dueDateISO.split('-').reverse().join('/') : '';
                    const correctionDocument = row.type === 'maison' ? documents[row.classId]?.[homeworkCorrectionDocumentId(row.id)] : undefined;
                    const correctionIndicator = row.type === 'maison'
                        ? documentIndicator(documentRequirementForHomeworkCorrection(policy), correctionDocument)
                        : 'none';
                    const correctionTitle = `Correction du devoir maison ${row.num} — ${row.className}`;
                    return (
                        <React.Fragment key={`${row.classId}-${row.id}`}>
                        <div className="flex items-center gap-2 rounded-xl bg-card p-3 shadow-sm">
                            <button
                                type="button"
                                onClick={() => onPreview(previewTarget(document, title, `${row.className} · ${teacherName}`, { heading: row.label, classLabel: row.className }))}
                                className="min-w-0 flex-1 rounded-lg px-1 py-1 text-start transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                aria-label={`Aperçu du sujet : ${title}`}
                            >
                                <span className="block truncate text-xs font-bold text-foreground">{row.className}</span>
                                <span className={`block truncate text-[10px] ${indicator === 'attached' ? 'text-success' : indicator === 'missing' ? 'text-destructive' : 'text-muted-foreground'}`}>
                                    {row.label} · {indicator === 'attached' ? 'sujet rédigé' : indicator === 'missing' ? 'sujet manquant' : 'sans sujet'}{dueDate ? ` · à rendre avant le ${dueDate}` : ''}
                                </span>
                            </button>
                            <input
                                type="date"
                                value={dates[row.classId]?.[row.id] ?? row.dateISO}
                                onChange={event => void change(row, event.target.value)}
                                aria-label={`Date du ${title}`}
                                className="h-9 w-32 shrink-0 rounded-lg border bg-background px-2 text-[11px]"
                            />
                        </div>
                        {correctionIndicator !== 'none' && (
                            <div className="flex items-center gap-2 rounded-xl bg-card p-3 shadow-sm">
                                <button
                                    type="button"
                                    onClick={() => onPreview(previewTarget(correctionDocument, correctionTitle, `${row.className} · ${teacherName}`, { heading: `Correction du devoir maison ${row.num}`, classLabel: row.className }))}
                                    className="min-w-0 flex-1 rounded-lg px-1 py-1 text-start transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                    aria-label={`Aperçu du corrigé : ${correctionTitle}`}
                                >
                                    <span className="block truncate text-xs font-bold text-foreground">{row.className}</span>
                                    <span className={`block truncate text-[10px] ${correctionIndicator === 'attached' ? 'text-success' : 'text-muted-foreground'}`}>
                                        Correction du devoir maison {row.num} · {correctionIndicator === 'attached' ? 'corrigé rédigé' : 'sans corrigé'}{manualItem?.correctionDateISO ? ` · le ${manualItem.correctionDateISO.split('-').reverse().join('/')}` : ''}
                                    </span>
                                </button>
                            </div>
                        )}
                        </React.Fragment>
                    );
                })}
            </div>
            {message && <p className="mt-2 text-[11px] font-semibold text-primary">{message}</p>}
        </section>
        <AdminActivities classes={classes} activities={activities} policy={policy} onPreview={onPreview} />
        </>
    );
};

const AdminMessagesHistory: React.FC<{ messages: AdminMessage[] }> = ({ messages }) => {
    if (messages.length === 0) {
        return (
            <section className="rounded-2xl border border-dashed bg-card p-10 text-center">
                <p className="text-sm font-black text-foreground">Aucun message envoyé</p>
                <p className="mt-1 text-xs text-muted-foreground">Les messages de la direction et leurs accusés de lecture apparaîtront ici.</p>
            </section>
        );
    }
    return (
        <section className="mb-5 rounded-2xl border bg-card p-4 shadow-sm">
            <div className="mb-3">
                <h2 className="text-sm font-black text-foreground">Messages de la direction</h2>
                <p className="text-[11px] text-muted-foreground">Accusés de réception du professeur sélectionné.</p>
            </div>
            <div className="space-y-2">
                {messages.slice(0, 12).map(message => (
                    <article key={message.id} className="rounded-xl bg-secondary/55 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                                <h3 className="text-xs font-bold text-foreground">{message.title}</h3>
                                <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground">{message.body}</p>
                            </div>
                            <span className={`inline-flex items-center gap-1 shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${message.acknowledgedAt ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning-strong'}`}>
                                {message.acknowledgedAt ? <Check className="h-3 w-3" aria-hidden="true" /> : <Clock className="h-3 w-3" aria-hidden="true" />}
                                <span>{message.acknowledgedAt ? `Compris le ${formatDateTimeFr(message.acknowledgedAt)}` : 'En attente'}</span>
                            </span>
                        </div>
                        <p className="mt-2 text-[10px] text-muted-foreground">Envoyé le {formatDateTimeFr(message.createdAt)}</p>
                    </article>
                ))}
            </div>
        </section>
    );
};

type TeacherDetailTab = 'classes' | 'assessments' | 'messages';
const TEACHER_DETAIL_TAB_ORDER: TeacherDetailTab[] = ['classes', 'assessments', 'messages'];

export const TeacherDetail: React.FC<{ phone: string; onBack: () => void; onManageTimetable: () => void; onManageEvaluationPolicy: () => void }> = ({ phone, onBack, onManageTimetable, onManageEvaluationPolicy }) => {
    const [data, setData] = useState<TeacherDetailData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [actionMessage, setActionMessage] = useState<string | null>(null);
    const [isBlocked, setIsBlocked] = useState<boolean>(false);
    const [busy, setBusy] = useState(false);
    const [isMessageModalOpen, setMessageModalOpen] = useState(false);
    const [messageTitle, setMessageTitle] = useState('Message de la direction');
    const [messageBody, setMessageBody] = useState('');
    const [isClassModalOpen, setClassModalOpen] = useState(false);
    const activeTeacherRef = useRef(phone);
    activeTeacherRef.current = phone;
    const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);
    const [activeTab, setActiveTab] = useState<TeacherDetailTab>('classes');
    const [importingClass, setImportingClass] = useState<ClassInfo | null>(null);
    const [rosterClass, setRosterClass] = useState<ClassInfo | null>(null);
    const [lessonRevisions, setLessonRevisions] = useState<Record<string, number>>({});
    const [confirmAction, setConfirmAction] = useState<{ kind: 'block' | 'deleteAccount' | 'deleteClass'; classInfo?: ClassInfo } | null>(null);
    /**
     * Cahier chargé pour impression : sa présence ouvre la MÊME modale que
     * celle de l'enseignant (modes, séances choisies, mise en page).
     */
    const [printTarget, setPrintTarget] = useState<{
        classInfo: ClassInfo;
        lessonsData: LessonsData;
        contentDirection: ContentDirection;
        absenceSessions: AbsenceSession[];
        config: AppConfig;
    } | null>(null);
    /**
     * Document figé au lancement : c'est lui, et lui seul, qui est composé en
     * A4 puis envoyé à l'imprimante. Une synchronisation reçue pendant l'aperçu
     * ne peut donc jamais modifier le papier.
     */
    const [printSnapshot, setPrintSnapshot] = useState<{
        classInfo: ClassInfo;
        lessonsData: LessonsData;
        annotationLessons: LessonsData;
        contentDirection: ContentDirection;
        options: PrintOptions;
        absenceSessions: AbsenceSession[];
        config: AppConfig;
    } | null>(null);
    /** Mise en page choisie par la direction pour cet aperçu (jamais réécrite chez l'enseignant). */
    const [printPrefs, setPrintPrefs] = useState<Pick<AppConfig, 'printDescriptionMode' | 'printDescriptionTypes'>>({});
    const [printingClassId, setPrintingClassId] = useState<string | null>(null);
    /** Document du professeur en cours de relecture (lecture seule). */
    const [preview, setPreview] = useState<DocumentPreviewTarget | null>(null);
    const [isPrinting, setIsPrinting] = useState(false);

    const selectTab = (tab: TeacherDetailTab, focus = false) => {
        setActiveTab(tab);
        if (focus) window.requestAnimationFrame(() => document.getElementById(`teacher-tab-${tab}`)?.focus());
    };

    const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, tab: TeacherDetailTab) => {
        const currentIndex = TEACHER_DETAIL_TAB_ORDER.indexOf(tab);
        let nextIndex: number | null = null;
        if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % TEACHER_DETAIL_TAB_ORDER.length;
        if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + TEACHER_DETAIL_TAB_ORDER.length) % TEACHER_DETAIL_TAB_ORDER.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = TEACHER_DETAIL_TAB_ORDER.length - 1;
        if (nextIndex === null) return;
        event.preventDefault();
        selectTab(TEACHER_DETAIL_TAB_ORDER[nextIndex], true);
    };

    const runAction = async (fn: () => Promise<string>, propagateError = false) => {
        setBusy(true);
        setActionMessage(null);
        try {
            setActionMessage(await fn());
        } catch (err) {
            setActionMessage(err instanceof Error ? err.message : 'Action échouée.');
            if (propagateError) throw err;
        } finally {
            setBusy(false);
        }
    };

    const handleSendMessage = () =>
        runAction(async () => {
            if (!messageBody.trim()) throw new Error('Le message ne peut pas être vide.');
            const result = await notifyTeacher(phone, messageBody.trim(), messageTitle.trim());
            setData(current => current
                ? { ...current, adminMessages: [result.message, ...(current.adminMessages ?? [])] }
                : current
            );
            setMessageBody('');
            setMessageModalOpen(false);
            return result.sent > 0
                ? `Message envoyé (${result.sent} appareil(s) notifié(s)).`
                : 'Message enregistré. Il s’affichera à la prochaine ouverture de l’application.';
        });

    const handleBlockConfirmed = () =>
        runAction(async () => {
            const next = !isBlocked;
            await blockTeacher(phone, next);
            setIsBlocked(next);
            return next ? 'Compte bloqué.' : 'Compte débloqué.';
        });

    const handleDeleteConfirmed = () =>
        runAction(async () => {
            const result = await deleteTeacher(phone);
            window.setTimeout(onBack, 900);
            return `Compte supprimé (${result.deletedClasses} classe(s) effacée(s)).`;
        });

    const openClassModal = (classInfo?: ClassInfo) => {
        setEditingClass(classInfo ?? null);
        setClassModalOpen(true);
    };

    const handleSaveClass = (details: Pick<ClassInfo, 'name' | 'subject' | 'cycle' | 'level' | 'branch' | 'group'>, classId?: string) =>
        runAction(async () => {
            const name = details.name.trim();
            const subject = details.subject.trim();
            if (!name || !subject) throw new Error('Le nom de la classe et la matière sont requis.');
            const result = await upsertTeacherClass(phone, {
                id: classId,
                name,
                subject,
                cycle: details.cycle ?? 'college',
                level: details.level ?? '',
                branch: details.branch ?? '',
                group: details.group ?? '',
            });
            if (activeTeacherRef.current !== phone) return '';
            setData(current => {
                if (!current) return current;
                const classes = current.classes.some(item => item.id === result.classInfo.id)
                    ? current.classes.map(item => item.id === result.classInfo.id ? result.classInfo : item)
                    : [...current.classes, result.classInfo];
                const snapshot = current.snapshot
                    ? {
                        ...current.snapshot,
                        classes: current.snapshot.classes.some(item => item.id === result.classInfo.id)
                            ? current.snapshot.classes.map(item => item.id === result.classInfo.id
                                ? { ...item, name: result.classInfo.name, subject: result.classInfo.subject, cycle: result.classInfo.cycle }
                                : item)
                            : [...current.snapshot.classes, {
                                id: result.classInfo.id,
                                name: result.classInfo.name,
                                subject: result.classInfo.subject,
                                cycle: result.classInfo.cycle,
                                totalItems: 0,
                                plannedCount: 0,
                                completionRate: 0,
                                sessionsCount: 0,
                                lastDate: null,
                                weekdays: [],
                                sessionsPerWeek: 0,
                                updatedAt: result.classInfo.createdAt,
                            }],
                    }
                    : current.snapshot;
                return { ...current, classes, snapshot };
            });
            setClassModalOpen(false);
            setEditingClass(null);
            return result.created
                ? 'Classe ajoutée. Elle apparaîtra au prochain rafraîchissement de l’application du professeur.'
                : 'Classe mise à jour. Les informations administratives seront appliquées au prochain rafraîchissement.';
        }, true);

    const handleDeleteClassConfirmed = () => {
        const classInfo = confirmAction?.classInfo;
        if (!classInfo) return;
        runAction(async () => {
            await deleteTeacherClass(phone, classInfo.id);
            setData(current => current
                ? {
                    ...current,
                    classes: current.classes.filter(item => item.id !== classInfo.id),
                    assessmentDates: Object.fromEntries(
                        Object.entries(current.assessmentDates ?? {}).filter(([classId]) => classId !== classInfo.id)
                    ),
                    snapshot: current.snapshot
                        ? { ...current.snapshot, classes: current.snapshot.classes.filter(item => item.id !== classInfo.id) }
                        : null,
                }
                : current
            );
            return `Classe « ${classInfo.name} » supprimée.`;
        });
    };

    const handleClassImported = (result: ClassLessonsImportResult) => {
        const className = importingClass?.name ?? 'la classe';
        setLessonRevisions(current => ({ ...current, [result.classId]: (current[result.classId] ?? 0) + 1 }));
        setActionMessage(
            `${result.importedTopLevel} bloc(s) et ${result.importedItems} élément(s) importés dans « ${className} »`+
            `${result.mode === 'append' ? ' à la suite du cahier.' : ' en remplacement du cahier.'}`
        );
        setImportingClass(null);
        setRosterClass(null);

        // Le serveur recalcule la projection de progression ; on la recharge
        // sans fermer l'onglet courant ni faire patienter toute la fiche.
        void fetchTeacher(phone).then(fresh => {
            setData(fresh);
            setIsBlocked(fresh.user?.blocked === true);
        }).catch(() => undefined);
    };

    const handlePrintClass = async (cls: ClassInfo) => {
        if (printingClassId || isPrinting) return;
        setPrintingClassId(cls.id);
        setActionMessage(null);
        try {
            const blob = await fetchClassLessons(phone, cls.id);
            const lessonsData = migrateLessonsData(Array.isArray(blob.lessonsData) ? blob.lessonsData : []);
            const config = buildPrintConfig(data?.printSettings, cls);
            const absenceSessions = buildAbsenceSessions(config, cls.id, lessonsData);
            if (lessonsData.length === 0 && absenceSessions.length === 0) {
                setActionMessage('Ce cahier ne contient aucune séance à imprimer.');
                return;
            }
            setPrintTarget({ classInfo: cls, lessonsData, contentDirection: blob.contentDirection ?? 'ltr', config, absenceSessions });
        } catch (err) {
            setActionMessage(err instanceof Error ? err.message : 'Impression impossible.');
        } finally {
            setPrintingClassId(null);
        }
    };

    /** Dates de séances du cahier chargé (l'historique d'impression reste chez l'enseignant). */
    const printDates = useMemo(
        () => (printTarget ? collectSessionDates(printTarget.lessonsData, printTarget.absenceSessions) : []),
        [printTarget]
    );

    /** Réglages lus par la modale : ceux de l'enseignant, puis l'aperçu en cours. */
    const printModalConfig: AppConfig | null = printTarget
        ? { ...printTarget.config, ...printPrefs }
        : null;

    /**
     * Impression de la direction : le circuit de l'enseignant, à l'identique -
     * même modale, même composition A4, même moteur. Seule différence, assumée
     * et affichée : l'historique « déjà imprimé » vit sur l'appareil du
     * professeur et n'est donc pas consultable ici.
     */
    const handleExecutePrint = (mode: PrintMode, options: PrintOptions, selectedDates?: string[]) => {
        const target = printTarget;
        if (!target || isPrinting) return;

        let lessonsData = target.lessonsData;
        let absenceSessions = target.absenceSessions;
        if (mode === 'custom') {
            const available = new Set(printDates);
            const chosen = Array.from(new Set((selectedDates ?? []).filter(date => available.has(date)))).sort();
            if (chosen.length === 0) {
                setActionMessage('Aucune séance valide sélectionnée.');
                return;
            }
            // Les numéros visibles sont figés avant le filtrage : un tirage
            // partiel garde la numérotation du cahier complet.
            lessonsData = createPrintSelection(target.lessonsData, chosen, target.config.contentNumbering ?? true);
            absenceSessions = absenceSessions.filter(session => chosen.includes(session.date));
        }

        setIsPrinting(true);
        setActionMessage(null);
        // Le document est figé avant la composition : une synchronisation reçue
        // pendant l'aperçu ne peut pas modifier ce qui part sur le papier.
        flushSync(() => {
            setPrintSnapshot({ classInfo: target.classInfo, lessonsData, annotationLessons: target.lessonsData, contentDirection: target.contentDirection, options, absenceSessions, config: { ...target.config, ...printPrefs } });
            setPrintTarget(null);
        });

        void (async () => {
            try {
                const root = document.querySelector<HTMLElement>('.print-document.print-only');
                if (!root) throw new Error('Print document missing');
                await preparePrintContent(root);
                const outcome = await printDocument('cahier-de-textes');
                if (outcome === 'failed') {
                    setActionMessage('Impression indisponible sur cet appareil.');
                    return;
                }
                // Rien à mémoriser ici : l'historique appartient à l'appareil de
                // l'enseignant. Sur navigateur, le dialogue système ne confirme
                // pas le tirage : on l'annonce sans mentir.
                if (outcome === 'completed') {
                    setActionMessage(`« ${target.classInfo.name} » envoyé à l’imprimante.`);
                } else if (outcome === 'confirmation-required') {
                    setActionMessage('Document prêt : validez l’impression dans la fenêtre du navigateur.');
                }
            } catch (err) {
                setActionMessage(err instanceof Error ? err.message : 'Composition du document impossible.');
            } finally {
                setPrintSnapshot(null);
                setIsPrinting(false);
            }
        })();
    };

    useEffect(() => {
        let cancelled = false;
        setActiveTab('classes');
        setClassModalOpen(false);
        setEditingClass(null);
        setImportingClass(null);
        setRosterClass(null);
        setLessonRevisions({});
        const load = async (showLoading: boolean) => {
            if (showLoading) setIsLoading(true);
            try {
                const result = await fetchTeacher(phone);
                if (!cancelled) {
                    setData(result);
                    setIsBlocked(result.user?.blocked === true);
                    setError(null);
                }
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur de chargement.');
            } finally {
                if (!cancelled && showLoading) setIsLoading(false);
            }
        };
        void load(true);

        // Un accusé est une petite donnée : on ne recharge jamais les classes
        // ni les cahiers pendant ce rafraîchissement limité à la fiche visible.
        let messageController: AbortController | null = null;
        const refreshMessages = async () => {
            const controller = new AbortController();
            messageController = controller;
            try {
                const adminMessages = await fetchTeacherMessages(phone, controller.signal);
                if (!cancelled && !controller.signal.aborted) setData(current => current ? { ...current, adminMessages } : current);
                return true;
            } finally { if (messageController === controller) messageController = null; }
        };
        const stopPolling = startForegroundPolling(refreshMessages, { interval: 30_000, onInactive: () => messageController?.abort() });
        return () => {
            cancelled = true;
            stopPolling();
            messageController?.abort();
        };
    }, [phone]);

    const classes = data?.classes ?? [];
    const snapshotsByClassId = new Map((data?.snapshot?.classes ?? []).map(classSnapshot => [classSnapshot.id, classSnapshot]));

    return (
        <div className="admin-detail mx-auto max-w-5xl p-4 sm:p-8">
            <button
                type="button"
                onClick={onBack}
                title="Retour à la liste des enseignants"
                aria-label="Retour à la liste des enseignants"
                className="group mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/80 bg-card/80 text-muted-foreground shadow-xs backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-card hover:text-foreground active:scale-95"
            >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
            </button>

            {isLoading && <div className="text-muted-foreground">Chargement…</div>}
            {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-destructive">{error}</div>}

            {data && (
                <>
                    <header className="admin-detail__header relative mb-6 overflow-hidden rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm backdrop-blur-md sm:p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                        {data.snapshot?.displayName?.trim()
                                            || `${data.user?.prenom ?? data.snapshot?.prenom ?? ''} ${data.user?.nom ?? data.snapshot?.nom ?? ''}`.trim()}
                                    </h1>
                                    {isBlocked && (
                                        <span className="rounded-full border border-destructive/25 bg-destructive/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
                                            Bloqué
                                        </span>
                                    )}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {data.user?.email || data.user?.phone || 'Compte enseignant'} · dernière synchro {timeAgo(data.user?.lastSyncAt ?? data.snapshot?.lastSyncAt ?? null)}
                                </p>
                                {(data.snapshot?.subjects ?? []).length > 0 && (
                                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                        <span className="text-[11px] font-semibold text-muted-foreground">Matières déclarées :</span>
                                        {(data.snapshot?.subjects ?? []).map(subject => (
                                            <span key={subject} className="rounded-full border border-primary/25 bg-primary/5 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                                                {subject}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Actions d'administration : boutons avec icônes sans labels superflus, accessibles et ergonomiques */}
                            <div className="flex flex-wrap items-center gap-2 self-start rounded-2xl border border-border/70 bg-muted/30 p-1.5 shadow-2xs">
                                <button
                                    type="button"
                                    onClick={onManageTimetable}
                                    disabled={busy}
                                    title="Personnaliser l’horaire"
                                    aria-label="Personnaliser l’horaire"
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/80 bg-background text-foreground/80 shadow-xs transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary active:scale-95 disabled:opacity-50"
                                >
                                    <Clock className="h-4 w-4" aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    onClick={onManageEvaluationPolicy}
                                    disabled={busy}
                                    title="Personnaliser le contrôle continu"
                                    aria-label="Personnaliser le contrôle continu"
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/80 bg-background text-foreground/80 shadow-xs transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary active:scale-95 disabled:opacity-50"
                                >
                                    <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMessageModalOpen(true)}
                                    disabled={busy}
                                    title="Envoyer un message"
                                    aria-label="Envoyer un message"
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs transition-all hover:bg-primary/90 hover:brightness-110 active:scale-95 disabled:opacity-50"
                                >
                                    <Bell className="h-4 w-4" aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setConfirmAction({ kind: 'block' })}
                                    disabled={busy}
                                    title={isBlocked ? 'Débloquer le compte enseignant' : 'Bloquer le compte enseignant'}
                                    aria-label={isBlocked ? 'Débloquer' : 'Bloquer'}
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-warning/35 bg-warning/10 text-warning-strong shadow-xs transition-all hover:bg-warning/20 active:scale-95 disabled:opacity-50"
                                >
                                    {isBlocked ? <Unlock className="h-4 w-4" aria-hidden="true" /> : <Lock className="h-4 w-4" aria-hidden="true" />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setConfirmAction({ kind: 'deleteAccount' })}
                                    disabled={busy}
                                    title="Supprimer le compte"
                                    aria-label="Supprimer le compte"
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-destructive/25 bg-destructive/5 text-destructive shadow-xs transition-all hover:border-destructive/40 hover:bg-destructive/15 active:scale-95 disabled:opacity-50"
                                >
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </div>
                        </div>

                        {actionMessage && (
                            <p role="status" aria-live="polite" className="mt-4 rounded-xl border border-border/60 bg-secondary/80 px-3.5 py-2 text-xs font-semibold text-foreground">{actionMessage}</p>
                        )}
                    </header>

                    <div className="admin-detail__tabs sticky top-0 z-20 mb-6 overflow-x-auto rounded-2xl border border-border/80 bg-background/90 p-1.5 shadow-sm backdrop-blur-md">
                        <div role="tablist" aria-label="Sections de la fiche professeur" aria-orientation="horizontal" className="flex min-w-max gap-1 sm:min-w-0">
                            {([
                                { id: 'classes', label: 'Classes & cahiers', count: classes.length, icon: BookOpen },
                                { id: 'assessments', label: 'Devoirs', count: null, icon: CalendarCheck },
                                { id: 'messages', label: 'Messages', count: (data.adminMessages ?? []).length, icon: Bell },
                            ] as const).map(tab => {
                                const TabIcon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        id={`teacher-tab-${tab.id}`}
                                        type="button"
                                        role="tab"
                                        aria-selected={activeTab === tab.id}
                                        aria-controls={`teacher-panel-${tab.id}`}
                                        tabIndex={activeTab === tab.id ? 0 : -1}
                                        onClick={() => selectTab(tab.id)}
                                        onKeyDown={event => handleTabKeyDown(event, tab.id)}
                                        className={`flex h-11 min-w-[9rem] shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:min-w-0 sm:flex-1 ${
                                            activeTab === tab.id
                                                ? 'bg-card text-primary shadow-xs ring-1 ring-border'
                                                : 'text-muted-foreground hover:bg-card/60 hover:text-foreground'
                                        }`}
                                    >
                                        <TabIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                        <span>{tab.label}</span>
                                        {tab.count !== null && (
                                            <span className={`min-w-5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${activeTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div
                        id="teacher-panel-messages"
                        role="tabpanel"
                        aria-labelledby="teacher-tab-messages"
                        hidden={activeTab !== 'messages'}
                    >
                        <AdminMessagesHistory messages={data.adminMessages ?? []} />
                    </div>

                    <div
                        id="teacher-panel-assessments"
                        role="tabpanel"
                        aria-labelledby="teacher-tab-assessments"
                        hidden={activeTab !== 'assessments'}
                    >
                        <AssessmentDateEditor
                            phone={phone}
                            classes={data.classes}
                            initial={data.assessmentDates ?? {}}
                            assessmentConfig={data.printSettings ?? undefined}
                            schoolYearStart={data.snapshot?.schoolYearStart}
                            documents={data.documents ?? {}}
                            activities={data.activities ?? {}}
                            policy={data.evaluationPolicy}
                            teacherName={data.snapshot?.displayName || `${data.user?.prenom ?? ''} ${data.user?.nom ?? ''}`.trim() || data.user?.phone || 'Enseignant'}
                            onPreview={setPreview}
                        />
                    </div>

                    <Modal
                        isOpen={isMessageModalOpen}
                        onClose={() => !busy && setMessageModalOpen(false)}
                        title="Message à l’enseignant"
                        description="Le professeur le recevra sous la signature « Direction administrative » et devra confirmer sa lecture."
                        maxWidth="lg"
                        className="sm:rounded-2xl"
                        footer={(
                            <div className="flex w-full justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setMessageModalOpen(false)} disabled={busy} className="rounded-xl">Annuler</Button>
                                <Button type="button" onClick={() => void handleSendMessage()} disabled={busy || !messageBody.trim()} className="rounded-xl">
                                    {busy ? 'Envoi…' : 'Envoyer'}
                                </Button>
                            </div>
                        )}
                    >
                        <div className="space-y-4">
                            <label className="block space-y-1.5 text-xs font-bold text-foreground">
                                Objet
                                <input
                                    value={messageTitle}
                                    onChange={event => setMessageTitle(event.target.value)}
                                    maxLength={80}
                                    className="h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-sm font-normal"
                                    placeholder="Message de la direction"
                                />
                            </label>
                            <label className="block space-y-1.5 text-xs font-bold text-foreground">
                                Message
                                <textarea
                                    value={messageBody}
                                    onChange={event => setMessageBody(event.target.value)}
                                    maxLength={1200}
                                    rows={7}
                                    className="w-full resize-y rounded-xl border border-border/80 bg-background px-3 py-2 text-sm font-normal"
                                    placeholder="Rédigez le message destiné à cet enseignant…"
                                    autoFocus
                                />
                            </label>
                        </div>
                    </Modal>

                    <CreateClassModal
                        key={phone}
                        isOpen={isClassModalOpen}
                        onClose={() => !busy && setClassModalOpen(false)}
                        editingClass={editingClass}
                        existingClasses={classes}
                        defaultCycle={editingClass?.cycle ?? classes[0]?.cycle ?? 'college'}
                        teacherCycles={[...new Set(classes.map(item => item.cycle).filter((cycle): cycle is Cycle => Boolean(cycle)))]}
                        teacherSubjects={[...new Set(classes.map(item => item.subject).filter(Boolean))]}
                        onCreate={details => handleSaveClass(details)}
                        onUpdate={(id, updates) => handleSaveClass({
                            ...updates,
                            name: updates.name ?? editingClass!.name,
                            subject: updates.subject ?? editingClass!.subject,
                            cycle: updates.cycle ?? editingClass?.cycle ?? 'college',
                        }, id)}
                    />

                    <div
                        id="teacher-panel-classes"
                        role="tabpanel"
                        aria-labelledby="teacher-tab-classes"
                        hidden={activeTab !== 'classes'}
                    >
                    <section className="mb-6 rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
                        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h2 className="text-sm font-bold text-foreground">Classes attribuées</h2>
                                <p className="mt-1 text-[11px] text-muted-foreground">Ajoutez, modifiez ou retirez une classe pour cet enseignant. La suppression efface aussi son cahier cloud.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => openClassModal()}
                                disabled={busy}
                                title="Ajouter une classe"
                                aria-label="Ajouter une classe"
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50"
                            >
                                <Plus className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </div>

                    {classes.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border bg-card/60 p-10 text-center text-muted-foreground">
                            <BookOpen className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                            <p className="text-xs font-semibold">Aucune classe attribuée pour le moment.</p>
                            <p className="mt-1 text-[11px]">Cliquez sur « Ajouter une classe » pour initialiser son premier cahier.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {classes.map(cls => {
                                const snapshot = snapshotsByClassId.get(cls.id);
                                const lateness = snapshot ? latenessBadge(snapshot, data?.snapshot) : null;
                                return (
                                    <div key={cls.id} className="admin-managed-class rounded-xl border border-border/80 bg-card/70 p-4 shadow-2xs transition-all hover:border-border hover:shadow-sm">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <div className="text-sm font-bold text-foreground">{cls.name}</div>
                                                <div className="mt-0.5 text-xs text-muted-foreground">
                                                    {cls.subject}
                                                    {snapshot && snapshot.sessionsPerWeek > 0 && ` · ${snapshot.sessionsPerWeek} séance(s)/sem.`}
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center justify-end gap-3">
                                                <div className="text-right">
                                                    <div className="text-base font-black tabular-nums text-primary">{snapshot?.completionRate ?? 0}%</div>
                                                    <div className="text-[10px] text-muted-foreground">
                                                        {snapshot ? `${snapshot.plannedCount}/${snapshot.totalItems} éléments` : 'En attente de synchro'}
                                                    </div>
                                                </div>
                                                {/* Barre d'actions compacte icon-only */}
                                                <div className="flex items-center gap-1 rounded-xl border border-border/70 bg-secondary/35 p-1 shadow-2xs">
                                                    <button
                                                        type="button"
                                                        onClick={() => void handlePrintClass(cls)}
                                                        disabled={busy || isPrinting || printingClassId === cls.id}
                                                        title="Imprimer le cahier de textes"
                                                        aria-label={`Imprimer le cahier de ${cls.name}`}
                                                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground/80 transition-all hover:bg-background hover:text-foreground active:scale-95 disabled:opacity-50"
                                                    >
                                                        {printingClassId === cls.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
                                                        ) : (
                                                            <Printer className="h-4 w-4" aria-hidden="true" />
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setImportingClass(cls)}
                                                        disabled={busy}
                                                        title="Importer un cahier JSON"
                                                        aria-label={`Importer un cahier JSON pour ${cls.name}`}
                                                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-primary transition-all hover:bg-primary/10 active:scale-95 disabled:opacity-50"
                                                    >
                                                        <FileCode2 className="h-4 w-4" aria-hidden="true" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setRosterClass(cls)}
                                                        disabled={busy}
                                                        title={`Liste des élèves (${data?.classRosters?.[cls.id]?.names.length ?? 0} élèves)`}
                                                        aria-label={`Gérer la liste des élèves de ${cls.name} (${data?.classRosters?.[cls.id]?.names.length ?? 0} élèves)`}
                                                        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground/80 transition-all hover:bg-background hover:text-foreground active:scale-95 disabled:opacity-50"
                                                    >
                                                        <Users className="h-4 w-4" aria-hidden="true" />
                                                        {(data?.classRosters?.[cls.id]?.names.length ?? 0) > 0 && (
                                                            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground shadow-xs">
                                                                {data?.classRosters?.[cls.id]?.names.length}
                                                            </span>
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openClassModal(cls)}
                                                        disabled={busy}
                                                        title="Modifier la classe"
                                                        aria-label={`Modifier la classe ${cls.name}`}
                                                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground/80 transition-all hover:bg-background hover:text-primary active:scale-95 disabled:opacity-50"
                                                    >
                                                        <Pencil className="h-4 w-4" aria-hidden="true" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmAction({ kind: 'deleteClass', classInfo: cls })}
                                                        disabled={busy}
                                                        title="Supprimer la classe"
                                                        aria-label={`Supprimer la classe ${cls.name}`}
                                                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-destructive/80 transition-all hover:bg-destructive/10 hover:text-destructive active:scale-95 disabled:opacity-50"
                                                    >
                                                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                                            <div
                                                className={`h-full rounded-full ${completionColor(snapshot?.completionRate ?? 0)}`}
                                                style={{ width: `${snapshot?.completionRate ?? 0}%` }}
                                            />
                                        </div>
                                        {(() => {
                                            const scheduleStatus = computeClassSessionSchedule(
                                                data?.printSettings?.timetable,
                                                data?.printSettings?.timetableClock,
                                                cls.id,
                                                { locale: 'fr', absences: data?.printSettings?.absences ?? data?.snapshot?.absences }
                                            );
                                            return (
                                                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span>
                                                            {snapshot ? `${snapshot.sessionsCount} séance(s) · dernière saisie ${snapshot.lastDate ?? 'Non renseignée'}` : 'En attente de la première synchronisation'}
                                                        </span>
                                                        {scheduleStatus && scheduleStatus.state !== 'none' && (
                                                            scheduleStatus.state === 'in_progress' ? (
                                                                <span
                                                                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-600 dark:text-emerald-400"
                                                                    title={scheduleStatus.label}
                                                                >
                                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                                                                    {scheduleStatus.label}
                                                                </span>
                                                            ) : (
                                                                <span
                                                                    className="inline-flex items-center gap-1 font-medium text-muted-foreground/80 hover:text-foreground transition-colors"
                                                                    title={scheduleStatus.label}
                                                                >
                                                                    <Clock className="h-3 w-3 text-primary/70 shrink-0" aria-hidden="true" />
                                                                    <span>{scheduleStatus.label}</span>
                                                                </span>
                                                            )
                                                        )}
                                                    </div>
                                                    {lateness && lateness.severity !== 'ok' && (
                                                        <span
                                                            className={`rounded-full border px-2 py-0.5 font-semibold ${
                                                                lateness.severity === 'critical'
                                                                    ? 'border-destructive/25 bg-destructive/15 text-destructive'
                                                                    : lateness.severity === 'warning'
                                                                      ? 'border-warning/30 bg-warning/20 text-warning-strong'
                                                                      : 'border-warning/20 bg-warning/10 text-warning-strong'
                                                            }`}
                                                        >
                                                            {lateness.gapSessions > 0
                                                                ? `~${lateness.gapSessions} séance(s) de retard`
                                                                : 'À mettre à jour'}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                        <ClassChapters
                                            key={`${cls.id}-${lessonRevisions[cls.id] ?? 0}`}
                                            phone={phone}
                                            classId={cls.id}
                                            timetable={data?.printSettings?.timetable}
                                            timetableClock={data?.printSettings?.timetableClock}
                                            absences={data?.printSettings?.absences ?? data?.snapshot?.absences}
                                        />
                                        <ClassProgression
                                            key={`progression-${cls.id}-${lessonRevisions[cls.id] ?? 0}`}
                                            phone={phone}
                                            classId={cls.id}
                                            snapshot={snapshot}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    </section>
                    </div>
                </>
            )}

            {printSnapshot && createPortal(
                <PrintView
                    lessonsData={printSnapshot.lessonsData}
                    annotationLessons={printSnapshot.annotationLessons}
                    classInfo={printSnapshot.classInfo}
                    config={printSnapshot.config}
                    absenceSessions={printSnapshot.absenceSessions}
                    contentDirection={printSnapshot.contentDirection}
                    newlyAddedIds={[]}
                    {...printSnapshot.options}
                />,
                document.body
            )}

            {printTarget && printModalConfig && (
                <PrintModal
                    classId={printTarget.classInfo.id}
                    isOpen
                    onClose={() => setPrintTarget(null)}
                    totalDates={printDates.length}
                    // Historique d'impression non consultable depuis la direction :
                    // toutes les séances sont proposées, aucune n'est annoncée
                    // comme déjà tirée.
                    newDates={printDates}
                    allDates={printDates}
                    printedDates={[]}
                    lastPrintedAt={null}
                    historyKnown={false}
                    isPrinting={isPrinting}
                    config={printModalConfig}
                    onConfigChange={patch => setPrintPrefs(current => ({ ...current, ...patch }))}
                    onPrint={handleExecutePrint}
                />
            )}

            {rosterClass && <ClassRosterModal key={`${phone}-${rosterClass.id}`} phone={phone} classInfo={rosterClass} roster={data?.classRosters?.[rosterClass.id]} onClose={() => setRosterClass(null)}
                onPublished={roster => {
                    if (activeTeacherRef.current !== phone) return;
                    setData(current => current ? { ...current, classRosters: { ...current.classRosters, [rosterClass.id]: roster } } : current);
                    setActionMessage(`Liste de ${roster.names.length} élève(s) transmise pour « ${rosterClass.name} ».`);
                    setRosterClass(null);
                }}/>}
            <ClassJsonImportModal
                isOpen={importingClass !== null}
                phone={phone}
                classInfo={importingClass}
                onClose={() => setImportingClass(null)}
                onImported={handleClassImported}
            />

            {/* Relecture d'un document du professeur : même moteur de composition
                que sa feuille, aucune modification possible. */}
            <AdminDocumentPreview
                isOpen={preview !== null}
                onClose={() => setPreview(null)}
                title={preview?.title ?? ''}
                subtitle={preview?.subtitle}
                heading={preview?.heading}
                classLabel={preview?.classLabel}
                source={preview?.source}
                updatedLabel={preview?.updatedLabel}
            />

            <ConfirmDialog
                open={confirmAction?.kind === 'block'}
                onOpenChange={open => { if (!open) setConfirmAction(null); }}
                title={isBlocked ? 'Débloquer ce compte ?' : 'Bloquer ce compte ?'}
                description={isBlocked
                    ? 'L’enseignant pourra de nouveau se connecter à l’application.'
                    : 'L’enseignant ne pourra plus se connecter à l’application.'}
                confirmLabel={isBlocked ? 'Débloquer' : 'Bloquer'}
                variant={isBlocked ? 'default' : 'destructive'}
                onConfirm={handleBlockConfirmed}
            />
            <ConfirmDialog
                open={confirmAction?.kind === 'deleteAccount'}
                onOpenChange={open => { if (!open) setConfirmAction(null); }}
                title="Supprimer définitivement ce compte ?"
                description="Cette action est irréversible : le compte et toutes ses données cloud seront effacés."
                confirmLabel="Supprimer le compte"
                onConfirm={handleDeleteConfirmed}
            />
            <ConfirmDialog
                open={confirmAction?.kind === 'deleteClass'}
                onOpenChange={open => { if (!open) setConfirmAction(null); }}
                title={confirmAction?.classInfo
                    ? `Supprimer définitivement la classe « ${confirmAction.classInfo.name} » ?`
                    : 'Supprimer la classe ?'}
                description="Le cahier cloud de cette classe sera effacé."
                confirmLabel="Supprimer la classe"
                onConfirm={handleDeleteClassConfirmed}
            />
        </div>
    );
};
