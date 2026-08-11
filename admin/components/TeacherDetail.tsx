import React, { useEffect, useState } from 'react';
import { blockTeacher, deleteTeacher, deleteTeacherClass, fetchClassLessons, fetchTeacher, fetchTeacherMessages, notifyTeacher, saveAssessmentDate, upsertTeacherClass, type ClassLessonsImportResult, TeacherDetail as TeacherDetailData } from '../api';
import { getBundledCalendar, loadHolidayCalendar, todayInMorocco } from '../../utils/calendar';
import { computeLateness } from '../../utils/lateness';
import { applyOverrides, computeAssessmentDates, findPlanFor, loadPlanning, type PlannedAssessment } from '../../utils/assessments';
import { completionColor, timeAgo } from '../utils';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import type { AdminMessage, ClassInfo, ClassSnapshot, Cycle, LessonsData, TeacherSnapshot } from '../../types';
import { ClassJsonImportModal } from './ClassJsonImportModal';

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

/**
 * Chapitres d'une classe : dépliable à la demande (le cahier complet n'est
 * chargé qu'au clic), puis chaque chapitre révèle sa dernière séance -
 * date, contenu exact et horodatage de synchronisation.
 */
const ClassChapters: React.FC<{ phone: string; classId: string }> = ({ phone, classId }) => {
    const [open, setOpen] = useState(false);
    const [chapters, setChapters] = useState<ChapterSummary[] | null>(null);
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState<number | null>(null);
    const contentId = `class-chapters-${classId}`;

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
        <div className="mt-3 border-t border-border pt-2">
            <button
                type="button"
                onClick={toggle}
                aria-expanded={open}
                aria-controls={contentId}
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-primary hover:bg-primary/10"
            >
                {open ? '▾' : '▸'} Inspecter les chapitres
            </button>

            {open && (
                <div id={contentId} className="mt-2 space-y-1.5">
                    {loading && <p className="text-xs text-muted-foreground">Chargement du cahier…</p>}
                    {error && <p className="rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">{error}</p>}

                    {updatedAt && (
                        <p className="text-[11px] text-muted-foreground">
                            Cahier synchronisé le <b>{formatDateTimeFr(updatedAt)}</b>
                        </p>
                    )}

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
                                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">{ch.title}</span>
                                <span className="shrink-0 text-[11px] text-muted-foreground">
                                    {ch.datedCount}/{ch.totalItems} datés
                                    {ch.lastDate && <> · dernière séance {ch.lastDate}</>}
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
                                                            <span className="font-medium text-foreground">{item.title || 'Sans titre'}</span>
                                                            {item.description && (
                                                                <span className="block truncate text-[11px] text-muted-foreground/80">{item.description}</span>
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
        slots: snapshot.weekdays.map(weekday => ({ weekday })),
        calendar,
        sessionsCount: snapshot.sessionsCount,
        lastDate: snapshot.lastDate,
        from: teacher?.schoolYearStart,
        settings: teacher?.notifyPrefs,
        absences: teacher?.absences,
    });

const AssessmentDateEditor: React.FC<{
    phone: string;
    classes: ClassInfo[];
    initial: Record<string, Record<string, string>>;
    schoolYearStart?: string;
}> = ({ phone, classes, initial, schoolYearStart }) => {
    const [dates, setDates] = useState(initial);
    const [rows, setRows] = useState<Array<PlannedAssessment & { classId: string; className: string }>>([]);
    const [message, setMessage] = useState('');
    const [isPlanningLoaded, setPlanningLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setPlanningLoaded(false);
        setRows([]);
        Promise.all([loadPlanning(), loadHolidayCalendar()]).then(([planning, calendar]) => {
            if (!planning || cancelled) return;
            const today = todayInMorocco(new Date(), calendar);
            const next = classes.flatMap(classInfo => {
                const plan = findPlanFor(planning, classInfo);
                if (!plan) return [];
                return applyOverrides(computeAssessmentDates(plan, calendar, today, schoolYearStart), initial[classInfo.id])
                    .map(item => ({ ...item, classId: classInfo.id, className: classInfo.name }));
            });
            setRows(next.sort((a, b) => a.dateISO.localeCompare(b.dateISO)));
        }).catch(() => {
            if (!cancelled) setRows([]);
        }).finally(() => {
            if (!cancelled) setPlanningLoaded(true);
        });
        return () => { cancelled = true; };
    }, [classes, initial, schoolYearStart]);

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
    if (rows.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
                <p className="text-sm font-black text-foreground">Aucun devoir planifié</p>
                <p className="mt-1 text-xs text-muted-foreground">Aucune date ministérielle ne correspond encore aux classes de ce professeur.</p>
            </div>
        );
    }
    return (
        <section className="mb-5 rounded-2xl bg-accent/50 p-4">
            <div className="mb-3"><h2 className="text-sm font-black text-foreground">Dates des devoirs</h2><p className="text-[11px] text-muted-foreground">Les modifications sont appliquées au planning du professeur et synchronisées sur son téléphone.</p></div>
            <div className="grid gap-2 sm:grid-cols-2">
                {rows.map(row => (
                    <label key={`${row.classId}-${row.id}`} className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-sm">
                        <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{row.className}</span><span className="block truncate text-[10px] text-muted-foreground">{row.label}</span></span>
                        <input type="date" value={dates[row.classId]?.[row.id] ?? row.dateISO} onChange={event => void change(row, event.target.value)} className="h-9 w-32 rounded-lg border bg-background px-2 text-[11px]" />
                    </label>
                ))}
            </div>
            {message && <p className="mt-2 text-[11px] font-semibold text-primary">{message}</p>}
        </section>
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
                            <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${message.acknowledgedAt ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                                {message.acknowledgedAt ? `Compris le ${formatDateTimeFr(message.acknowledgedAt)}` : 'En attente'}
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

export const TeacherDetail: React.FC<{ phone: string; onBack: () => void }> = ({ phone, onBack }) => {
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
    const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);
    const [className, setClassName] = useState('');
    const [classSubject, setClassSubject] = useState('');
    const [classCycle, setClassCycle] = useState<Cycle>('college');
    const [activeTab, setActiveTab] = useState<TeacherDetailTab>('classes');
    const [importingClass, setImportingClass] = useState<ClassInfo | null>(null);
    const [lessonRevisions, setLessonRevisions] = useState<Record<string, number>>({});
    const [confirmAction, setConfirmAction] = useState<{ kind: 'block' | 'deleteAccount' | 'deleteClass'; classInfo?: ClassInfo } | null>(null);

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

    const runAction = async (fn: () => Promise<string>) => {
        setBusy(true);
        setActionMessage(null);
        try {
            setActionMessage(await fn());
        } catch (err) {
            setActionMessage(err instanceof Error ? err.message : 'Action échouée.');
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
        setClassName(classInfo?.name ?? '');
        setClassSubject(classInfo?.subject ?? '');
        setClassCycle(classInfo?.cycle ?? 'college');
        setClassModalOpen(true);
    };

    const handleSaveClass = () =>
        runAction(async () => {
            const name = className.trim();
            const subject = classSubject.trim();
            if (!name || !subject) throw new Error('Le nom de la classe et la matière sont requis.');
            const result = await upsertTeacherClass(phone, {
                id: editingClass?.id,
                name,
                subject,
                cycle: classCycle,
            });
            setData(current => {
                if (!current) return current;
                const classes = editingClass
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
        });

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

        // Le serveur recalcule la projection de progression ; on la recharge
        // sans fermer l'onglet courant ni faire patienter toute la fiche.
        void fetchTeacher(phone).then(fresh => {
            setData(fresh);
            setIsBlocked(fresh.user?.blocked === true);
        }).catch(() => undefined);
    };

    useEffect(() => {
        let cancelled = false;
        setActiveTab('classes');
        setImportingClass(null);
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
        const refreshWhenVisible = () => {
            if (document.visibilityState !== 'visible') return;
            void fetchTeacherMessages(phone)
                .then(adminMessages => {
                    if (!cancelled) setData(current => current ? { ...current, adminMessages } : current);
                })
                .catch(() => undefined);
        };
        document.addEventListener('visibilitychange', refreshWhenVisible);
        const interval = window.setInterval(refreshWhenVisible, 30_000);
        return () => {
            cancelled = true;
            document.removeEventListener('visibilitychange', refreshWhenVisible);
            window.clearInterval(interval);
        };
    }, [phone]);

    const classes = data?.classes ?? [];
    const snapshotsByClassId = new Map((data?.snapshot?.classes ?? []).map(classSnapshot => [classSnapshot.id, classSnapshot]));

    return (
        <div className="mx-auto max-w-5xl p-4 sm:p-8">
            <button
                onClick={onBack}
                className="mb-4 inline-flex h-9 items-center gap-1 rounded-md border border-border bg-card px-3 text-sm font-semibold text-foreground hover:bg-muted"
            >
                ← Retour
            </button>

            {isLoading && <div className="text-muted-foreground">Chargement…</div>}
            {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-destructive">{error}</div>}

            {data && (
                <>
                    <header className="mb-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
                        <h1 className="text-2xl font-bold text-foreground tracking-tight">
                            {data.user?.prenom ?? data.snapshot?.prenom} {data.user?.nom ?? data.snapshot?.nom}
                            {isBlocked && (
                                <span className="ml-2 rounded-full bg-destructive/15 px-2 py-0.5 align-middle text-[10px] font-bold uppercase text-destructive">
                                    Bloqué
                                </span>
                            )}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {phone} · dernière synchro {timeAgo(data.user?.lastSyncAt ?? data.snapshot?.lastSyncAt ?? null)}
                        </p>

                        {/* Actions d'administration */}
                        <div className="mt-3 flex flex-wrap gap-2">
                            <button
                                onClick={() => setMessageModalOpen(true)}
                                disabled={busy}
                                className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                            >
                                📣 Envoyer un message
                            </button>
                            <button
                                onClick={() => setConfirmAction({ kind: 'block' })}
                                disabled={busy}
                                className="h-9 rounded-md border border-border bg-card px-3 text-xs font-semibold text-warning hover:bg-warning/10 disabled:opacity-50"
                            >
                                {isBlocked ? '🔓 Débloquer' : '🔒 Bloquer'}
                            </button>
                            <button
                                onClick={() => setConfirmAction({ kind: 'deleteAccount' })}
                                disabled={busy}
                                className="h-9 rounded-md border border-destructive/25 bg-card px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                            >
                                🗑 Supprimer le compte
                            </button>
                        </div>
                        {actionMessage && (
                            <p role="status" aria-live="polite" className="mt-3 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-muted-foreground">{actionMessage}</p>
                        )}
                    </header>

                    <div className="sticky top-0 z-20 mb-5 overflow-x-auto rounded-2xl border bg-background/90 p-1.5 shadow-sm backdrop-blur">
                        <div role="tablist" aria-label="Sections de la fiche professeur" aria-orientation="horizontal" className="flex min-w-max gap-1 sm:min-w-0">
                            {([
                                { id: 'classes', label: 'Classes & cahiers', count: classes.length },
                                { id: 'assessments', label: 'Devoirs', count: null },
                                { id: 'messages', label: 'Messages', count: (data.adminMessages ?? []).length },
                            ] as Array<{ id: TeacherDetailTab; label: string; count: number | null }>).map(tab => (
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
                                    className={`flex h-11 min-w-[9rem] shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-xs font-black transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:min-w-0 sm:flex-1 ${
                                        activeTab === tab.id
                                            ? 'bg-card text-primary shadow-sm ring-1 ring-border'
                                            : 'text-muted-foreground hover:bg-card/60 hover:text-foreground'
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    {tab.count !== null && (
                                        <span className={`min-w-5 rounded-full px-1.5 py-0.5 text-[10px] ${activeTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            ))}
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
                            schoolYearStart={data.snapshot?.schoolYearStart}
                        />
                    </div>

                    <Modal
                        isOpen={isMessageModalOpen}
                        onClose={() => !busy && setMessageModalOpen(false)}
                        title="Message à l’enseignant"
                        description="Le professeur le recevra sous la signature « Direction administrative » et devra confirmer sa lecture."
                        maxWidth="lg"
                        footer={(
                            <div className="flex w-full justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setMessageModalOpen(false)} disabled={busy}>Annuler</Button>
                                <Button type="button" onClick={() => void handleSendMessage()} disabled={busy || !messageBody.trim()}>
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
                                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm font-normal"
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
                                    className="w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm font-normal"
                                    placeholder="Rédigez le message destiné à cet enseignant…"
                                    autoFocus
                                />
                            </label>
                        </div>
                    </Modal>

                    <Modal
                        isOpen={isClassModalOpen}
                        onClose={() => !busy && setClassModalOpen(false)}
                        title={editingClass ? 'Modifier la classe' : 'Ajouter une classe'}
                        description="La classe est affectée au professeur sélectionné. Les informations administratives sont protégées contre les anciennes copies hors ligne."
                        maxWidth="lg"
                        footer={(
                            <div className="flex w-full justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setClassModalOpen(false)} disabled={busy}>Annuler</Button>
                                <Button type="button" onClick={() => void handleSaveClass()} disabled={busy || !className.trim() || !classSubject.trim()}>
                                    {busy ? 'Enregistrement…' : editingClass ? 'Enregistrer' : 'Ajouter la classe'}
                                </Button>
                            </div>
                        )}
                    >
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="block space-y-1.5 text-xs font-bold text-foreground">
                                Classe
                                <input
                                    value={className}
                                    onChange={event => setClassName(event.target.value)}
                                    maxLength={120}
                                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm font-normal"
                                    placeholder="Ex. 1ère année collège"
                                    autoFocus
                                />
                            </label>
                            <label className="block space-y-1.5 text-xs font-bold text-foreground">
                                Matière
                                <input
                                    value={classSubject}
                                    onChange={event => setClassSubject(event.target.value)}
                                    maxLength={120}
                                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm font-normal"
                                    placeholder="Ex. Mathématiques"
                                />
                            </label>
                            <label className="block space-y-1.5 text-xs font-bold text-foreground sm:col-span-2">
                                Cycle
                                <select
                                    value={classCycle}
                                    onChange={event => setClassCycle(event.target.value as Cycle)}
                                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm font-normal"
                                >
                                    <option value="college">Collège</option>
                                    <option value="lycee">Lycée qualifiant</option>
                                    <option value="prepa">Classes préparatoires</option>
                                </select>
                            </label>
                        </div>
                    </Modal>

                    <div
                        id="teacher-panel-classes"
                        role="tabpanel"
                        aria-labelledby="teacher-tab-classes"
                        hidden={activeTab !== 'classes'}
                    >
                    <section className="mb-5 rounded-2xl border bg-card p-4 shadow-sm">
                        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h2 className="text-sm font-black text-foreground">Classes attribuées</h2>
                                <p className="mt-1 text-[11px] text-muted-foreground">Ajoutez, modifiez ou retirez une classe pour cet enseignant. La suppression efface aussi son cahier cloud.</p>
                            </div>
                            <Button type="button" size="sm" onClick={() => openClassModal()} disabled={busy}>+ Ajouter une classe</Button>
                        </div>

                    {classes.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
                            Aucune classe attribuée.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {classes.map(cls => {
                                const snapshot = snapshotsByClassId.get(cls.id);
                                const lateness = snapshot ? latenessBadge(snapshot, data?.snapshot) : null;
                                return (
                                    <div key={cls.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <div className="font-semibold text-foreground">{cls.name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {cls.subject}
                                                    {snapshot && snapshot.sessionsPerWeek > 0 && ` · ${snapshot.sessionsPerWeek} séance(s)/sem.`}
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center justify-end gap-2">
                                                <div className="text-right">
                                                    <div className="text-lg font-black text-primary">{snapshot?.completionRate ?? 0}%</div>
                                                    <div className="text-[10px] text-muted-foreground">
                                                        {snapshot ? `${snapshot.plannedCount}/${snapshot.totalItems} éléments` : 'En attente de synchro'}
                                                    </div>
                                                </div>
                                                <button onClick={() => setImportingClass(cls)} disabled={busy} className="h-8 rounded-md border border-primary/25 bg-primary/5 px-2.5 text-[11px] font-bold text-primary hover:bg-primary/10 disabled:opacity-50">Importer JSON</button>
                                                <button onClick={() => openClassModal(cls)} disabled={busy} className="h-8 rounded-md border border-border px-2 text-[11px] font-semibold text-primary hover:bg-primary/10 disabled:opacity-50">Modifier</button>
                                                <button onClick={() => setConfirmAction({ kind: 'deleteClass', classInfo: cls })} disabled={busy} className="h-8 rounded-md border border-destructive/25 px-2 text-[11px] font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50">Supprimer</button>
                                            </div>
                                        </div>
                                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                                            <div
                                                className={`h-full rounded-full ${completionColor(snapshot?.completionRate ?? 0)}`}
                                                style={{ width: `${snapshot?.completionRate ?? 0}%` }}
                                            />
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                                            <span>
                                                {snapshot ? `${snapshot.sessionsCount} séance(s) · dernière saisie ${snapshot.lastDate ?? 'Non renseignée'}` : 'En attente de la première synchronisation'}
                                            </span>
                                            {lateness && lateness.severity !== 'ok' && (
                                                <span
                                                    className={`rounded-full px-2 py-0.5 font-semibold text-white ${
                                                        lateness.severity === 'critical'
                                                            ? 'bg-destructive'
                                                            : lateness.severity === 'warning'
                                                              ? 'bg-warning'
                                                              : 'bg-warning/70'
                                                    }`}
                                                >
                                                    {lateness.gapSessions > 0
                                                        ? `~${lateness.gapSessions} séance(s) de retard`
                                                        : 'À mettre à jour'}
                                                </span>
                                            )}
                                        </div>
                                        <ClassChapters key={`${cls.id}-${lessonRevisions[cls.id] ?? 0}`} phone={phone} classId={cls.id} />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    </section>
                    </div>
                </>
            )}

            <ClassJsonImportModal
                isOpen={importingClass !== null}
                phone={phone}
                classInfo={importingClass}
                onClose={() => setImportingClass(null)}
                onImported={handleClassImported}
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
