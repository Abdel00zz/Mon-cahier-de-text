import React, { useMemo, useState } from 'react';
import type { AdminTeacherSummary } from '../api';
import { getBundledCalendar } from '../../utils/calendar';
import { LatenessSeverity, computeLateness, worstSeverity } from '../../utils/lateness';
import { completionColor, globalCompletion, timeAgo } from '../utils';

interface TeacherListProps {
    teachers: AdminTeacherSummary[];
    isLoading: boolean;
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
            }),
        }))
    );

const isInactive = (teacher: AdminTeacherSummary): boolean => {
    if (!teacher.lastSyncAt) return true;
    const then = new Date(teacher.lastSyncAt).getTime();
    return Number.isNaN(then) || Date.now() - then > INACTIVE_DAYS * 24 * 3600 * 1000;
};

type SortKey = 'severity' | 'completion' | 'activity' | 'name';
type PriorityFilter = LatenessSeverity | 'all' | 'inactive' | 'messages' | 'blocked';

export const TeacherList: React.FC<TeacherListProps> = ({ teachers: teachersProp, isLoading, onRefresh, onSelect, onLogout }) => {
    // tolère une liste absente/mal formée : la console ne doit jamais écran-blanchir
    const teachers = Array.isArray(teachersProp) ? teachersProp : [];
    const [query, setQuery] = useState('');
    const [cycleFilter, setCycleFilter] = useState<string>('all');
    const [severityFilter, setSeverityFilter] = useState<PriorityFilter>('all');
    const [sortKey, setSortKey] = useState<SortKey>('severity');

    const subjects = useMemo(() => {
        const set = new Set<string>();
        teachers.forEach(t => (t.classes ?? []).forEach(c => c.subject && set.add(c.subject)));
        return Array.from(set).sort();
    }, [teachers]);
    const [subjectFilter, setSubjectFilter] = useState<string>('all');

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
        const q = query.trim().toLowerCase();
        const list = enriched.filter(({ teacher, severity, inactive }) => {
            const matchesQuery =
                !q ||
                `${teacher.prenom} ${teacher.nom}`.toLowerCase().includes(q) ||
                teacher.phone.includes(q);
            const matchesCycle = cycleFilter === 'all' || (teacher.classes ?? []).some(c => c.cycle === cycleFilter);
            const matchesSubject = subjectFilter === 'all' || (teacher.classes ?? []).some(c => c.subject === subjectFilter);
            const matchesSeverity =
                severityFilter === 'all' ||
                (severityFilter === 'inactive' ? inactive :
                    severityFilter === 'messages' ? teacher.pendingMessages > 0 :
                        severityFilter === 'blocked' ? teacher.blocked :
                            severity === severityFilter);
            return matchesQuery && matchesCycle && matchesSubject && matchesSeverity;
        });
        const sorted = [...list];
        switch (sortKey) {
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
                sorted.sort((a, b) => `${a.teacher.nom} ${a.teacher.prenom}`.localeCompare(`${b.teacher.nom} ${b.teacher.prenom}`, 'fr'));
                break;
        }
        return sorted;
    }, [enriched, query, cycleFilter, subjectFilter, severityFilter, sortKey]);

    const toggleSeverityFilter = (value: Exclude<PriorityFilter, 'all'>) =>
        setSeverityFilter(current => (current === value ? 'all' : value));

    return (
        <div className="mx-auto max-w-6xl p-4 sm:p-8">
            <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">
                        Direction administrative
                    </p>
                    <h1 className="mt-1 text-2xl font-bold text-foreground font-display sm:text-3xl">
                        Centre de pilotage
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {teachers.length} enseignant(s) · données issues de la dernière synchronisation
                    </p>
                </div>
                <div className="flex gap-2">
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

            <section aria-label="Indicateurs de pilotage" className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <button
                    type="button"
                    onClick={() => setSeverityFilter('all')}
                    className={`rounded-2xl border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${severityFilter === 'all' ? 'border-primary bg-primary/5 ring-2 ring-primary/15' : 'border-border bg-card'}`}
                >
                    <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Enseignants suivis</span>
                    <span className="mt-1 block text-3xl font-black text-foreground">{teachers.length}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{distribution.counts.ok} à jour</span>
                </button>
                <button
                    type="button"
                    onClick={() => setSeverityFilter('critical')}
                    className={`rounded-2xl border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${severityFilter === 'critical' ? 'border-destructive bg-destructive/5 ring-2 ring-destructive/15' : 'border-border bg-card'}`}
                >
                    <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">À traiter</span>
                    <span className="mt-1 block text-3xl font-black text-destructive">{distribution.needsFollowUp}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">retard critique, inactivité ou relance</span>
                </button>
                <button
                    type="button"
                    onClick={() => setSeverityFilter('messages')}
                    className={`rounded-2xl border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${severityFilter === 'messages' ? 'border-warning bg-warning/5 ring-2 ring-warning/15' : 'border-border bg-card'}`}
                >
                    <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Lectures attendues</span>
                    <span className="mt-1 block text-3xl font-black text-warning">{distribution.pendingMessages}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">message(s) direction non confirmé(s)</span>
                </button>
                <button
                    type="button"
                    onClick={() => setSeverityFilter('blocked')}
                    className={`rounded-2xl border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${severityFilter === 'blocked' ? 'border-foreground bg-foreground/5 ring-2 ring-foreground/10' : 'border-border bg-card'}`}
                >
                    <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Comptes bloqués</span>
                    <span className="mt-1 block text-3xl font-black text-foreground">{distribution.blocked}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">accès immédiatement suspendu</span>
                </button>
            </section>

            {priorities.length > 0 && (
                <section className="mb-5 rounded-2xl border border-warning/25 bg-warning/5 p-4">
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
                                    <span className="block truncate text-xs font-bold text-foreground">{teacher.prenom} {teacher.nom}</span>
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
            <div className="mb-4 flex flex-wrap gap-2" aria-label="Filtres de suivi">
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

            <div className="mb-5 flex flex-wrap gap-2">
                <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Rechercher par nom ou téléphone…"
                    className="h-10 min-w-[12rem] flex-1 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
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

            {filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
                    {isLoading ? 'Chargement…' : 'Aucun enseignant à afficher.'}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {filtered.map(({ teacher, severity, inactive, completion }) => (
                        <button
                            key={teacher.phone}
                            onClick={() => onSelect(teacher.phone)}
                            className="rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                                        <span className={`h-2 w-2 shrink-0 rounded-full ${teacher.blocked ? 'bg-foreground' : SEVERITY_META[severity].dot}`} title={teacher.blocked ? 'Compte bloqué' : SEVERITY_META[severity].label} />
                                        <span className="truncate">{teacher.prenom} {teacher.nom}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">{teacher.phone}</div>
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
                                <span className={inactive ? 'font-bold text-destructive' : ''}>{timeAgo(teacher.lastSyncAt)}</span>
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
                                <span className="ml-auto text-[10px] font-bold text-primary">Ouvrir la fiche →</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
