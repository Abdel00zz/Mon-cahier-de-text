import React, { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Skeleton } from '../../components/ui/skeleton';
import { ClassroomWelcomeIllustration } from '../../components/ui/DynamicIllustration';
import { DEFAULT_OVERVIEW_FILTERS, freshnessLabel, hasActiveFilters, readOverviewFilters, teachersToCsv, writeOverviewFilters, type CsvTeacherRow } from '../overviewTools';
import type { AdminTeacherSummary } from '../api';
import { getBundledCalendar } from '../../domain/calendar/calendar';
import { LatenessSeverity, computeLateness, worstSeverity } from '../../domain/calendar/lateness';
import { getClassTeachingEndForYear } from '../../domain/evaluations/officialStudentEvents';
import { completionColor, globalCompletion, timeAgo } from '../utils';
import { establishmentKey, establishmentLabel, listEstablishments } from '../establishments';

interface TeacherListProps {
    teachers: AdminTeacherSummary[];
    isLoading: boolean;
    /** Dernière actualisation réussie (ms) : la direction sait si elle lit des données vivantes. */
    lastUpdatedAt?: number | null;
    /** Le dernier rafraîchissement automatique a échoué : les données affichées peuvent être anciennes. */
    refreshFailed?: boolean;
    onRefresh: () => void;
    onSelect: (phone: string) => void;
    onLogout: () => void;
}

const CYCLE_LABEL: Record<string, string> = { college: 'Collège', lycee: 'Lycée', prepa: 'Prépa' };

const calendar = getBundledCalendar();

/** Jours sans synchro au-delà desquels un compte est considéré inactif. */
const INACTIVE_DAYS = 14;

const SEVERITY_META: Record<LatenessSeverity, { label: string; chip: string; dot: string }> = {
    ok: { label: 'À jour', chip: 'bg-success/10 text-success border-success/25', dot: 'bg-success' },
    notice: { label: 'À surveiller', chip: 'bg-warning/10 text-warning border-warning/30', dot: 'bg-warning/70' },
    warning: { label: 'En retard', chip: 'bg-warning/10 text-warning border-warning/30', dot: 'bg-warning' },
    critical: { label: 'Critique', chip: 'bg-destructive/10 text-destructive border-destructive/25', dot: 'bg-destructive' },
};

const SEVERITY_RANK: Record<LatenessSeverity, number> = { ok: 0, notice: 1, warning: 2, critical: 3 };

/**
 * Nom affiché d'un enseignant : le nom d'usage de son profil (celui qu'il a
 * choisi dans les paramètres) prime sur l'identité de l'inscription, pour que
 * la direction voie le même nom que lui partout ailleurs.
 */
const teacherNameOf = (teacher: AdminTeacherSummary): string =>
    teacher.displayName?.trim() || `${teacher.prenom ?? ''} ${teacher.nom ?? ''}`.trim();

/**
 * Sévérité de retard globale d'un enseignant, mêmes modules purs que le
 * client et le cron (aucune règle dupliquée), en tenant compte de ses
 * absences justifiées et de ses seuils personnels.
 */
const teacherSeverity = (teacher: AdminTeacherSummary): LatenessSeverity =>
    worstSeverity(
        (teacher.classes ?? []).map(cls => ({
            classId: cls.id,
            className: cls.name,
            ...computeLateness({
                slots: (cls.weekdays ?? []).map(weekday => ({ weekday })),
                calendar,
                sessionsCount: cls.sessionsCount ?? 0,
                lastDate: cls.lastDate,
                from: teacher.schoolYearStart,
                settings: teacher.notifyPrefs,
                absences: teacher.absences,
                teachingEnd: getClassTeachingEndForYear(cls, calendar, teacher.schoolYearStart),
            }),
        }))
    );

/** `localStorage` peut lever (navigation privée, politique du navigateur) : jamais d'écran blanc pour autant. */
const browserStorage = (): Storage | undefined => {
    try { return typeof window === 'undefined' ? undefined : window.localStorage; } catch { return undefined; }
};
const isInactive = (teacher: AdminTeacherSummary): boolean => {
    if (!teacher.lastSyncAt) return true;
    const then = new Date(teacher.lastSyncAt).getTime();
    return Number.isNaN(then) || Date.now() - then > INACTIVE_DAYS * 24 * 3600 * 1000;
};

type SortKey = 'severity' | 'completion' | 'activity' | 'name' | 'establishment';
type PriorityFilter = LatenessSeverity | 'all' | 'inactive' | 'messages' | 'blocked';

interface TeacherCardProps {
    teacher: AdminTeacherSummary;
    severity: LatenessSeverity;
    inactive: boolean;
    completion: number;
    /** Minute courante (ms) : « il y a 3 min » se corrige sans redessiner les cartes à chaque frappe. */
    minute: number;
    onSelect: (phone: string) => void;
}

/**
 * Une carte d'enseignant. Mémorisée : taper dans la recherche ou changer de tri ne redessine que les
 * cartes dont les données ont réellement changé (et non toute la grille à chaque frappe).
 */
const TeacherCard = memo(function TeacherCard({ teacher, severity, inactive, completion, minute, onSelect }: TeacherCardProps) {
    return (
        <button
            type="button"
            onClick={() => onSelect(teacher.phone)}
            className="admin-teacher-card rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md active:scale-[0.99] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 190px' }}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${teacher.blocked ? 'bg-foreground' : SEVERITY_META[severity].dot}`} title={teacher.blocked ? 'Compte bloqué' : SEVERITY_META[severity].label} />
                        <span className="truncate">{teacherNameOf(teacher)}</span>
                    </div>
                    <div dir="auto" className="text-xs text-muted-foreground truncate">{teacher.email || teacher.contactPhone || (!teacher.phone.startsWith('acct_') ? teacher.phone : 'Compte Google')}</div>
                    <div dir="auto" className="mt-1 text-xs text-muted-foreground break-words">{establishmentLabel(teacher.establishmentName)}</div>
                </div>
                <div className="text-right">
                    <div className="text-lg font-black text-primary">{completion}%</div>
                    <div className="text-[10px] text-muted-foreground">{teacher.classes.length} classe(s)</div>
                </div>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full ${completionColor(completion)}`} style={{ width: `${completion}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                    {Array.from(new Set((teacher.classes ?? []).map(c => c.cycle).filter(Boolean)))
                        .map(c => CYCLE_LABEL[c as string] ?? c)
                        .join(' · ') || 'Non renseigné'}
                </span>
                <span className={inactive ? 'font-bold text-destructive' : ''}>{timeAgo(teacher.lastSyncAt, minute)}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {teacher.blocked && (
                    <span className="rounded-full bg-foreground/10 px-2 py-1 text-[10px] font-bold text-foreground">Accès bloqué</span>
                )}
                {teacher.pendingMessages > 0 && (
                    <span className="rounded-full bg-warning/10 px-2 py-1 text-[10px] font-bold text-warning">
                        {teacher.pendingMessages} lecture{teacher.pendingMessages > 1 ? 's' : ''} attendue{teacher.pendingMessages > 1 ? 's' : ''}
                    </span>
                )}
                {teacher.pendingMessages === 0 && teacher.lastMessageAt && (
                    <span className="rounded-full bg-success/10 px-2 py-1 text-[10px] font-bold text-success">Messages confirmés</span>
                )}
                <span className="ms-auto text-[10px] font-bold text-primary">Ouvrir la fiche →</span>
            </div>
        </button>
    );
});

/** Heure courante, rafraîchie à intervalle régulier : « il y a 3 min » et « actualisé il y a 12 s » restent justes sans nouvelle requête. */
const useNow = (intervalMs: number): number => {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
        return () => window.clearInterval(timer);
    }, [intervalMs]);
    return now;
};

export const TeacherList: React.FC<TeacherListProps> = ({ teachers: teachersProp, isLoading, lastUpdatedAt = null, refreshFailed = false, onRefresh, onSelect, onLogout }) => {
    // tolère une liste absente/mal formée : la console ne doit jamais écran-blanchir
    const teachers = Array.isArray(teachersProp) ? teachersProp : [];
    // Les filtres du dernier passage sont repris : la direction reprend là où elle s'était arrêtée.
    const remembered = useMemo(() => readOverviewFilters(browserStorage()), []);
    const [query, setQuery] = useState('');
    // La recherche reste instantanée à la frappe ; la liste, elle, suit sans bloquer la saisie.
    const deferredQuery = useDeferredValue(query);
    const [schoolFilter, setSchoolFilter] = useState<string | null>(remembered.school);
    const schools = useMemo(() => listEstablishments(teachers), [teachers]);
    const [cycleFilter, setCycleFilter] = useState<string>(remembered.cycle);
    const [severityFilter, setSeverityFilter] = useState<PriorityFilter>(remembered.severity);
    const [sortKey, setSortKey] = useState<SortKey>(remembered.sort);
    const searchRef = useRef<HTMLInputElement>(null);
    const now = useNow(30_000);
    const minute = Math.floor(now / 60_000) * 60_000;

    const subjects = useMemo(() => {
        const set = new Set<string>();
        teachers.forEach(t => (t.classes ?? []).forEach(c => c.subject && set.add(c.subject)));
        return Array.from(set).sort();
    }, [teachers]);
    const [subjectFilter, setSubjectFilter] = useState<string>(remembered.subject);

    useEffect(() => {
        writeOverviewFilters(browserStorage(), { school: schoolFilter, cycle: cycleFilter, subject: subjectFilter, severity: severityFilter, sort: sortKey });
    }, [schoolFilter, cycleFilter, subjectFilter, severityFilter, sortKey]);

    // « / » ouvre la recherche (comme partout où l'on pilote beaucoup de comptes), Échap la vide.
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable;
            if (event.key === '/' && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
                event.preventDefault();
                searchRef.current?.focus();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // sévérité + inactivité calculées une fois par rafraîchissement
    const enriched = useMemo(
        () =>
            teachers.map(teacher => {
                const severity = teacherSeverity(teacher);
                const inactive = isInactive(teacher);
                return {
                    teacher,
                    severity,
                    inactive,
                    completion: globalCompletion(teacher),
                    needsFollowUp: teacher.blocked || teacher.pendingMessages > 0 || inactive || severity === 'critical',
                };
            }),
        [teachers]
    );

    // distribution globale : le coup d'œil de l'administrateur
    const distribution = useMemo(() => {
        const counts: Record<LatenessSeverity, number> = { ok: 0, notice: 0, warning: 0, critical: 0 };
        let inactive = 0;
        let pendingMessages = 0;
        let blocked = 0;
        let needsFollowUp = 0;
        for (const e of enriched) {
            counts[e.severity] += 1;
            if (e.inactive) inactive += 1;
            pendingMessages += e.teacher.pendingMessages;
            if (e.teacher.blocked) blocked += 1;
            if (e.needsFollowUp) needsFollowUp += 1;
        }
        return { counts, inactive, pendingMessages, blocked, needsFollowUp };
    }, [enriched]);

    const priorities = useMemo(
        () => enriched
            .filter(item => item.needsFollowUp)
            .sort((a, b) =>
                Number(b.teacher.blocked) - Number(a.teacher.blocked) ||
                Number(b.teacher.pendingMessages > 0) - Number(a.teacher.pendingMessages > 0) ||
                Number(b.inactive) - Number(a.inactive) ||
                SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]
            )
            .slice(0, 5),
        [enriched]
    );

    const filtered = useMemo(() => {
        const q = deferredQuery.trim().toLowerCase();
        const list = enriched.filter(({ teacher, severity, inactive }) => {
            const matchesQuery =
                !q ||
                establishmentKey(teacher.establishmentName).includes(establishmentKey(q)) ||
                teacherNameOf(teacher).toLowerCase().includes(q) ||
                `${teacher.prenom} ${teacher.nom}`.toLowerCase().includes(q) ||
                (teacher.email ?? '').toLowerCase().includes(q) || (teacher.contactPhone ?? teacher.phone).includes(q);
            const matchesCycle = cycleFilter === 'all' || (teacher.classes ?? []).some(c => c.cycle === cycleFilter);
            const matchesSubject = subjectFilter === 'all' || (teacher.classes ?? []).some(c => c.subject === subjectFilter);
            const matchesSeverity =
                severityFilter === 'all' ||
                (severityFilter === 'inactive' ? inactive :
                    severityFilter === 'messages' ? teacher.pendingMessages > 0 :
                        severityFilter === 'blocked' ? teacher.blocked :
                            severity === severityFilter);
            return matchesQuery && matchesCycle && matchesSubject && matchesSeverity
                && (schoolFilter === null || establishmentKey(teacher.establishmentName) === schoolFilter);
        });
        const sorted = [...list];
        switch (sortKey) {
            case 'establishment':
                sorted.sort((a, b) => establishmentKey(a.teacher.establishmentName).localeCompare(establishmentKey(b.teacher.establishmentName), 'fr')
                    || teacherNameOf(a.teacher).localeCompare(teacherNameOf(b.teacher), 'fr'));
                break;
            case 'severity':
                sorted.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || a.completion - b.completion);
                break;
            case 'completion':
                sorted.sort((a, b) => a.completion - b.completion);
                break;
            case 'activity':
                sorted.sort(
                    (a, b) =>
                        new Date(b.teacher.lastSyncAt ?? 0).getTime() - new Date(a.teacher.lastSyncAt ?? 0).getTime()
                );
                break;
            case 'name':
                sorted.sort((a, b) => teacherNameOf(a.teacher).localeCompare(teacherNameOf(b.teacher), 'fr'));
                break;
        }
        return sorted;
    }, [enriched, deferredQuery, schoolFilter, cycleFilter, subjectFilter, severityFilter, sortKey]);

    const filtersActive = hasActiveFilters({ school: schoolFilter, cycle: cycleFilter, subject: subjectFilter, severity: severityFilter, sort: sortKey }) || query.trim() !== '';
    const resetFilters = () => {
        setQuery('');
        setSchoolFilter(DEFAULT_OVERVIEW_FILTERS.school);
        setCycleFilter(DEFAULT_OVERVIEW_FILTERS.cycle);
        setSubjectFilter(DEFAULT_OVERVIEW_FILTERS.subject);
        setSeverityFilter(DEFAULT_OVERVIEW_FILTERS.severity);
    };

    // Vue d'ensemble chiffrée de ce qui est affiché : la moyenne de complétion et la part des comptes vivants.
    const summary = useMemo(() => {
        if (enriched.length === 0) return null;
        const average = Math.round(enriched.reduce((sum, item) => sum + item.completion, 0) / enriched.length);
        const syncedToday = enriched.filter(item => item.teacher.lastSyncAt && now - new Date(item.teacher.lastSyncAt).getTime() < 24 * 3600 * 1000).length;
        return { average, syncedToday };
    }, [enriched, now]);

    const exportCsv = () => {
        const rows: CsvTeacherRow[] = filtered.map(({ teacher, severity, inactive, completion }) => ({
            name: teacherNameOf(teacher),
            school: establishmentLabel(teacher.establishmentName),
            email: teacher.email ?? '',
            phone: teacher.contactPhone ?? (teacher.phone.startsWith('acct_') ? '' : teacher.phone),
            classes: teacher.classes?.length ?? 0,
            cycles: Array.from(new Set((teacher.classes ?? []).map(c => CYCLE_LABEL[c.cycle as string] ?? c.cycle).filter(Boolean))).join(' / '),
            completion,
            status: teacher.blocked ? 'Compte bloqué' : inactive ? 'Inactif' : SEVERITY_META[severity].label,
            lastSyncAt: teacher.lastSyncAt ?? '',
            pendingMessages: teacher.pendingMessages,
            blocked: teacher.blocked === true,
        }));
        const url = URL.createObjectURL(new Blob([teachersToCsv(rows)], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `enseignants-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    };

    const toggleSeverityFilter = (value: Exclude<PriorityFilter, 'all'>) =>
        setSeverityFilter(current => (current === value ? 'all' : value));

    return (
        <div className="admin-overview mx-auto max-w-6xl p-4 sm:p-8">
            <header className="admin-overview__header mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">
                        Direction administrative
                    </p>
                    <h1 className="mt-1 text-2xl font-bold text-foreground tracking-tight sm:text-3xl">
                        Centre de pilotage
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {teachers.length} enseignant(s)
                        {summary && <> · {summary.average} % de complétion moyenne · {summary.syncedToday} synchronisé(s) sur 24 h</>}
                    </p>
                    <p
                        role="status"
                        className={`mt-0.5 flex items-center gap-1.5 text-[11px] ${refreshFailed ? 'font-bold text-warning' : 'text-muted-foreground'}`}
                    >
                        <span className={`h-1.5 w-1.5 rounded-full ${refreshFailed ? 'bg-warning' : isLoading ? 'animate-pulse bg-primary' : 'bg-success'}`} aria-hidden />
                        {refreshFailed ? 'Actualisation interrompue : les données affichées peuvent être anciennes' : isLoading ? 'Actualisation…' : freshnessLabel(lastUpdatedAt, now)}
                    </p>
                </div>
                <div className="admin-overview__header-actions flex gap-2">
                    <button
                        type="button"
                        onClick={exportCsv}
                        disabled={filtered.length === 0}
                        title="Exporter la liste affichée (CSV, ouvrable dans un tableur)"
                        className="h-10 rounded-md border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                    >
                        Exporter
                    </button>
                    <button
                        onClick={onRefresh}
                        disabled={isLoading}
                        className="h-10 rounded-md border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                    >
                        {isLoading ? 'Actualisation…' : 'Actualiser'}
                    </button>
                    <button
                        onClick={onLogout}
                        className="h-10 rounded-md border border-border bg-card px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
                    >
                        Se déconnecter
                    </button>
                </div>
            </header>

            <section aria-label="Indicateurs de pilotage" className="admin-metric-grid mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <button
                    type="button"
                    onClick={() => setSeverityFilter('all')}
                    className={`admin-metric-card rounded-2xl border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${severityFilter === 'all' ? 'border-primary bg-primary/5 ring-2 ring-primary/15' : 'border-border bg-card'}`}
                >
                    <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Enseignants suivis</span>
                    <span className="mt-1 block text-3xl font-black text-foreground">{teachers.length}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{distribution.counts.ok} à jour</span>
                </button>
                <button
                    type="button"
                    onClick={() => setSeverityFilter('critical')}
                    className={`admin-metric-card rounded-2xl border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${severityFilter === 'critical' ? 'border-destructive bg-destructive/5 ring-2 ring-destructive/15' : 'border-border bg-card'}`}
                >
                    <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">À traiter</span>
                    <span className="mt-1 block text-3xl font-black text-destructive">{distribution.needsFollowUp}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">retard critique, inactivité ou relance</span>
                </button>
                <button
                    type="button"
                    onClick={() => setSeverityFilter('messages')}
                    className={`admin-metric-card rounded-2xl border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${severityFilter === 'messages' ? 'border-warning bg-warning/5 ring-2 ring-warning/15' : 'border-border bg-card'}`}
                >
                    <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Lectures attendues</span>
                    <span className="mt-1 block text-3xl font-black text-warning">{distribution.pendingMessages}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">message(s) direction non confirmé(s)</span>
                </button>
                <button
                    type="button"
                    onClick={() => setSeverityFilter('blocked')}
                    className={`admin-metric-card rounded-2xl border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${severityFilter === 'blocked' ? 'border-foreground bg-foreground/5 ring-2 ring-foreground/10' : 'border-border bg-card'}`}
                >
                    <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Comptes bloqués</span>
                    <span className="mt-1 block text-3xl font-black text-foreground">{distribution.blocked}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">accès immédiatement suspendu</span>
                </button>
            </section>

            {priorities.length > 0 && (
                <section className="admin-priority-panel mb-5 rounded-2xl border border-warning/25 bg-warning/5 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h2 className="text-sm font-black text-foreground">File de priorités</h2>
                            <p className="text-[11px] text-muted-foreground">Ouvrez une fiche pour relancer, envoyer un message ou ajuster les classes.</p>
                        </div>
                        <button type="button" onClick={() => setSeverityFilter('all')} className="text-xs font-bold text-primary hover:underline">Voir tous les enseignants</button>
                    </div>
                    <div className="grid gap-2 lg:grid-cols-2">
                        {priorities.map(({ teacher, severity, inactive }) => (
                            <button
                                key={teacher.phone}
                                type="button"
                                onClick={() => onSelect(teacher.phone)}
                                className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-3 py-2.5 text-left transition-colors hover:border-primary/35 hover:bg-primary/5"
                            >
                                <span className="min-w-0">
                                    <span className="block truncate text-xs font-bold text-foreground">{teacherNameOf(teacher)}</span>
                                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                                        {teacher.blocked ? 'Compte bloqué' : teacher.pendingMessages > 0 ? `${teacher.pendingMessages} accusé(s) attendu(s)` : inactive ? 'Aucune synchronisation récente' : SEVERITY_META[severity].label}
                                    </span>
                                </span>
                                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${teacher.blocked ? 'bg-foreground' : teacher.pendingMessages > 0 || inactive ? 'bg-warning' : SEVERITY_META[severity].dot}`} aria-hidden />
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* Vue d'ensemble agrégée : distribution des sévérités (cliquable = filtre) */}
            <div className="admin-filter-chips mb-4 flex flex-wrap gap-2" aria-label="Filtres de suivi">
                {(Object.keys(SEVERITY_META) as LatenessSeverity[]).map(sev => (
                    <button
                        key={sev}
                        onClick={() => toggleSeverityFilter(sev)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${SEVERITY_META[sev].chip} ${
                            severityFilter === sev ? 'ring-2 ring-offset-1 ring-primary/40' : 'opacity-90 hover:opacity-100'
                        }`}
                        title={`Filtrer : ${SEVERITY_META[sev].label}`}
                    >
                        <span className={`h-2 w-2 rounded-full ${SEVERITY_META[sev].dot}`} />
                        {SEVERITY_META[sev].label}
                        <span className="font-black">{distribution.counts[sev]}</span>
                    </button>
                ))}
                <button
                    onClick={() => toggleSeverityFilter('inactive')}
                    className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-all ${
                        severityFilter === 'inactive' ? 'ring-2 ring-offset-1 ring-primary/40' : 'opacity-90 hover:opacity-100'
                    }`}
                    title={`Aucune synchronisation depuis ${INACTIVE_DAYS} jours`}
                >
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
                    Inactifs <span className="font-black">{distribution.inactive}</span>
                </button>
                <button
                    onClick={() => toggleSeverityFilter('messages')}
                    className={`inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning transition-all ${
                        severityFilter === 'messages' ? 'ring-2 ring-offset-1 ring-warning/40' : 'opacity-90 hover:opacity-100'
                    }`}
                    title="Messages direction en attente de confirmation"
                >
                    <span className="h-2 w-2 rounded-full bg-warning" />
                    Lectures attendues <span className="font-black">{distribution.pendingMessages}</span>
                </button>
                <button
                    onClick={() => toggleSeverityFilter('blocked')}
                    className={`inline-flex items-center gap-1.5 rounded-full border border-foreground/20 bg-foreground/5 px-3 py-1.5 text-xs font-semibold text-foreground transition-all ${
                        severityFilter === 'blocked' ? 'ring-2 ring-offset-1 ring-foreground/25' : 'opacity-90 hover:opacity-100'
                    }`}
                    title="Comptes dont l'accès est suspendu"
                >
                    <span className="h-2 w-2 rounded-full bg-foreground" />
                    Bloqués <span className="font-black">{distribution.blocked}</span>
                </button>
            </div>

            <div className="admin-filter-bar mb-5 flex flex-wrap gap-2">
                <input
                    ref={searchRef}
                    type="search"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Escape') { setQuery(''); e.currentTarget.blur(); } }}
                    aria-label="Rechercher un enseignant ou un établissement"
                    aria-keyshortcuts="/"
                    placeholder="Nom, établissement, téléphone…   ( / )"
                    className="h-10 min-w-[12rem] flex-1 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
                <select
                    aria-label="Établissement"
                    value={schoolFilter === null ? 'all' : `school:${schoolFilter}`}
                    onChange={e => setSchoolFilter(e.target.value === 'all' ? null : e.target.value.slice(6))}
                    className="h-11 min-w-0 max-w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                    <option value="all">Tous les établissements</option>
                    {schools.map(([key, label]) => <option key={key} value={`school:${key}`}>{label}</option>)}
                </select>
                <select
                    value={cycleFilter}
                    onChange={e => setCycleFilter(e.target.value)}
                    className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                >
                    <option value="all">Tous les cycles</option>
                    <option value="college">Collège</option>
                    <option value="lycee">Lycée</option>
                    <option value="prepa">Prépa</option>
                </select>
                <select
                    value={subjectFilter}
                    onChange={e => setSubjectFilter(e.target.value)}
                    className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                >
                    <option value="all">Toutes les matières</option>
                    {subjects.map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
                <select
                    value={sortKey}
                    onChange={e => setSortKey(e.target.value as SortKey)}
                    className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                    title="Ordre d'affichage"
                >
                    <option value="severity">Tri : retard d'abord</option>
                    <option value="completion">Tri : complétion croissante</option>
                    <option value="activity">Tri : activité récente</option>
                    <option value="name">Tri : nom A→Z</option>
                    <option value="establishment">Regrouper par établissement</option>
                </select>
            </div>

            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h2 className="text-base font-black text-foreground">Enseignants</h2>
                    <p className="text-[11px] text-muted-foreground">{filtered.length} résultat(s) selon les filtres actifs.</p>
                </div>
                {severityFilter !== 'all' && (
                    <button type="button" onClick={() => setSeverityFilter('all')} className="text-xs font-bold text-primary hover:underline">Réinitialiser le suivi</button>
                )}
            </div>

            {isLoading && teachers.length === 0 ? (
                <div className="admin-teacher-grid grid grid-cols-1 gap-3 sm:grid-cols-2" role="status" aria-busy="true" aria-label="Chargement des enseignants">
                    {Array.from({ length: 6 }, (_, index) => (
                        <Skeleton key={index} className="h-[11.5rem] w-full rounded-2xl" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="admin-empty-state flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
                    <ClassroomWelcomeIllustration size={120} />
                    <p className="text-base font-extrabold text-foreground">
                        {teachers.length === 0 ? 'Aucun enseignant inscrit pour le moment' : 'Aucun enseignant ne correspond à ces filtres'}
                    </p>
                    <p className="max-w-md text-sm text-muted-foreground">
                        {teachers.length === 0
                            ? 'Dès qu’un enseignant se connecte et synchronise son cahier, il apparaît ici avec son avancement.'
                            : 'Élargissez la recherche ou retirez un filtre pour retrouver la liste complète.'}
                    </p>
                    <button
                        type="button"
                        onClick={teachers.length === 0 ? onRefresh : resetFilters}
                        className="min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm transition-[filter,transform] hover:brightness-110 active:scale-[0.98] active:brightness-90"
                    >
                        {teachers.length === 0 ? 'Actualiser' : filtersActive ? 'Réinitialiser les filtres' : 'Actualiser'}
                    </button>
                </div>
            ) : (
                <div className="admin-teacher-grid grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {filtered.map(({ teacher, severity, inactive, completion }, index) => (
                        <React.Fragment key={teacher.phone}>
                            {sortKey === 'establishment' && (index === 0 || establishmentKey(filtered[index - 1].teacher.establishmentName) !== establishmentKey(teacher.establishmentName)) &&
                                <h3 dir="auto" className="col-span-full mt-3 text-sm font-semibold text-muted-foreground">{establishmentLabel(teacher.establishmentName)}</h3>}
                            <TeacherCard teacher={teacher} severity={severity} inactive={inactive} completion={completion} minute={minute} onSelect={onSelect} />
                        </React.Fragment>
                    ))}
                </div>
            )}        </div>
    );
};
