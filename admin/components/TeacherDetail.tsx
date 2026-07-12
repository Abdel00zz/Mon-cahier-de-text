import React, { useEffect, useState } from 'react';
import { blockTeacher, deleteTeacher, fetchClassLessons, fetchTeacher, notifyTeacher, saveAssessmentDate, TeacherDetail as TeacherDetailData } from '../api';
import { getBundledCalendar, loadHolidayCalendar, todayInMorocco } from '../../utils/calendar';
import { computeLateness } from '../../utils/lateness';
import { applyOverrides, computeAssessmentDates, findPlanFor, loadPlanning, type PlannedAssessment } from '../../utils/assessments';
import { completionColor, timeAgo } from '../utils';
import type { ClassInfo, ClassSnapshot, LessonsData, TeacherSnapshot } from '../../types';

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
    if (!iso) return '—';
    try {
        const [y, m, d] = iso.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
        return iso;
    }
};

const formatDateTimeFr = (iso: string | null | undefined): string => {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
        return iso;
    }
};

/**
 * Chapitres d'une classe : dépliable à la demande (le cahier complet n'est
 * chargé qu'au clic), puis chaque chapitre révèle sa dernière séance —
 * date, contenu exact et horodatage de synchronisation.
 */
const ClassChapters: React.FC<{ phone: string; classId: string }> = ({ phone, classId }) => {
    const [open, setOpen] = useState(false);
    const [chapters, setChapters] = useState<ChapterSummary[] | null>(null);
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState<number | null>(null);

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
                onClick={toggle}
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-primary hover:bg-primary/10"
            >
                {open ? '▾' : '▸'} Inspecter les chapitres
            </button>

            {open && (
                <div className="mt-2 space-y-1.5">
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
                                onClick={() => setExpanded(current => (current === index ? null : index))}
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
        settings: teacher?.notifyPrefs,
        absences: teacher?.absences,
    });

const AssessmentDateEditor: React.FC<{
    phone: string;
    classes: ClassInfo[];
    initial: Record<string, Record<string, string>>;
}> = ({ phone, classes, initial }) => {
    const [dates, setDates] = useState(initial);
    const [rows, setRows] = useState<Array<PlannedAssessment & { classId: string; className: string }>>([]);
    const [message, setMessage] = useState('');

    useEffect(() => {
        Promise.all([loadPlanning(), loadHolidayCalendar()]).then(([planning, calendar]) => {
            if (!planning) return;
            const today = todayInMorocco(new Date(), calendar);
            const next = classes.flatMap(classInfo => {
                const plan = findPlanFor(planning, classInfo);
                if (!plan) return [];
                return applyOverrides(computeAssessmentDates(plan, calendar, today), initial[classInfo.id])
                    .map(item => ({ ...item, classId: classInfo.id, className: classInfo.name }));
            });
            setRows(next.sort((a, b) => a.dateISO.localeCompare(b.dateISO)));
        });
    }, [classes, initial]);

    const change = async (row: PlannedAssessment & { classId: string }, date: string) => {
        setDates(current => ({ ...current, [row.classId]: { ...(current[row.classId] ?? {}), [row.id]: date } }));
        setRows(current => current.map(item => item.classId === row.classId && item.id === row.id ? { ...item, dateISO: date } : item));
        try {
            await saveAssessmentDate(phone, row.classId, row.id, date);
            setMessage('Date du devoir synchronisÃ©e avec le compte enseignant.');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Modification impossible.');
        }
    };

    if (rows.length === 0) return null;
    return (
        <section className="mb-5 rounded-2xl bg-accent/50 p-4">
            <div className="mb-3"><h2 className="text-sm font-black text-foreground">Dates des devoirs</h2><p className="text-[11px] text-muted-foreground">Les modifications sont appliquÃ©es au planning du professeur et synchronisÃ©es sur son tÃ©lÃ©phone.</p></div>
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

export const TeacherDetail: React.FC<{ phone: string; onBack: () => void }> = ({ phone, onBack }) => {
    const [data, setData] = useState<TeacherDetailData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [actionMessage, setActionMessage] = useState<string | null>(null);
    const [isBlocked, setIsBlocked] = useState<boolean>(false);
    const [busy, setBusy] = useState(false);

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

    const handleNotify = () =>
        runAction(async () => {
            const message = window.prompt('Message à envoyer sur le téléphone de cet enseignant :');
            if (!message?.trim()) return 'Envoi annulé.';
            const result = await notifyTeacher(phone, message.trim());
            return result.ok ? `Notification envoyée (${result.sent} appareil(s)).` : "Aucun appareil n'a reçu la notification.";
        });

    const handleBlock = () =>
        runAction(async () => {
            const next = !isBlocked;
            if (!window.confirm(next
                ? 'Bloquer ce compte ? L’enseignant ne pourra plus se connecter.'
                : 'Débloquer ce compte ?')) return 'Action annulée.';
            await blockTeacher(phone, next);
            setIsBlocked(next);
            return next ? 'Compte bloqué.' : 'Compte débloqué.';
        });

    const handleDelete = () =>
        runAction(async () => {
            if (!window.confirm('SUPPRIMER DÉFINITIVEMENT ce compte et toutes ses données cloud ?\nCette action est irréversible.')) {
                return 'Suppression annulée.';
            }
            const result = await deleteTeacher(phone);
            window.setTimeout(onBack, 900);
            return `Compte supprimé (${result.deletedClasses} classe(s) effacée(s)).`;
        });

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        fetchTeacher(phone)
            .then(result => {
                if (!cancelled) setData(result);
            })
            .catch(err => {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur de chargement.');
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [phone]);

    const snapshotClasses = data?.snapshot?.classes ?? [];

    return (
        <div className="mx-auto max-w-4xl p-4 sm:p-8">
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
                    <header className="mb-6">
                        <h1 className="text-2xl font-bold text-foreground font-display">
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
                                onClick={handleNotify}
                                disabled={busy}
                                className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                            >
                                📣 Notifier le téléphone
                            </button>
                            <button
                                onClick={handleBlock}
                                disabled={busy}
                                className="h-9 rounded-md border border-border bg-card px-3 text-xs font-semibold text-warning hover:bg-warning/10 disabled:opacity-50"
                            >
                                {isBlocked ? '🔓 Débloquer' : '🔒 Bloquer'}
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={busy}
                                className="h-9 rounded-md border border-destructive/25 bg-card px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                            >
                                🗑 Supprimer le compte
                            </button>
                        </div>
                        {actionMessage && (
                            <p className="mt-2 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground">{actionMessage}</p>
                        )}
                    </header>

                    <AssessmentDateEditor phone={phone} classes={data.classes} initial={data.assessmentDates ?? {}} />

                    {snapshotClasses.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
                            Aucune classe synchronisée.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {snapshotClasses.map(cls => {
                                const lateness = latenessBadge(cls, data?.snapshot);
                                return (
                                    <div key={cls.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <div className="font-semibold text-foreground">{cls.name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {cls.subject}
                                                    {cls.sessionsPerWeek > 0 && ` · ${cls.sessionsPerWeek} séance(s)/sem.`}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-black text-primary">{cls.completionRate}%</div>
                                                <div className="text-[10px] text-muted-foreground">
                                                    {cls.plannedCount}/{cls.totalItems} éléments
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                                            <div
                                                className={`h-full rounded-full ${completionColor(cls.completionRate)}`}
                                                style={{ width: `${cls.completionRate}%` }}
                                            />
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                                            <span>
                                                {cls.sessionsCount} séance(s) · dernière saisie {cls.lastDate ?? '—'}
                                            </span>
                                            {lateness.severity !== 'ok' && (
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
                                        <ClassChapters phone={phone} classId={cls.id} />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
