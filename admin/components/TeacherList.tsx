import React, { useMemo, useState } from 'react';
import type { TeacherSnapshot } from '../../types';
import { getBundledCalendar } from '../../utils/calendar';
import { LatenessSeverity, computeLateness, worstSeverity } from '../../utils/lateness';
import { completionColor, globalCompletion, timeAgo } from '../utils';

interface TeacherListProps {
    teachers: TeacherSnapshot[];
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
    ok: { label: 'À jour', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    notice: { label: 'À surveiller', chip: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
    warning: { label: 'En retard', chip: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
    critical: { label: 'Critique', chip: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
};

const SEVERITY_RANK: Record<LatenessSeverity, number> = { ok: 0, notice: 1, warning: 2, critical: 3 };

/**
 * Sévérité de retard globale d'un enseignant — mêmes modules purs que le
 * client et le cron (aucune règle dupliquée), en tenant compte de ses
 * absences justifiées et de ses seuils personnels.
 */
const teacherSeverity = (teacher: TeacherSnapshot): LatenessSeverity =>
    worstSeverity(
        teacher.classes.map(cls => ({
            classId: cls.id,
            className: cls.name,
            ...computeLateness({
                slots: cls.weekdays.map(weekday => ({ weekday })),
                calendar,
                sessionsCount: cls.sessionsCount,
                lastDate: cls.lastDate,
                settings: teacher.notifyPrefs,
                absences: teacher.absences,
            }),
        }))
    );

const isInactive = (teacher: TeacherSnapshot): boolean => {
    if (!teacher.lastSyncAt) return true;
    const then = new Date(teacher.lastSyncAt).getTime();
    return Number.isNaN(then) || Date.now() - then > INACTIVE_DAYS * 24 * 3600 * 1000;
};

type SortKey = 'severity' | 'completion' | 'activity' | 'name';

export const TeacherList: React.FC<TeacherListProps> = ({ teachers, isLoading, onRefresh, onSelect, onLogout }) => {
    const [query, setQuery] = useState('');
    const [cycleFilter, setCycleFilter] = useState<string>('all');
    const [severityFilter, setSeverityFilter] = useState<LatenessSeverity | 'all' | 'inactive'>('all');
    const [sortKey, setSortKey] = useState<SortKey>('severity');

    const subjects = useMemo(() => {
        const set = new Set<string>();
        teachers.forEach(t => t.classes.forEach(c => c.subject && set.add(c.subject)));
        return Array.from(set).sort();
    }, [teachers]);
    const [subjectFilter, setSubjectFilter] = useState<string>('all');

    // sévérité + inactivité calculées une fois par rafraîchissement
    const enriched = useMemo(
        () =>
            teachers.map(teacher => ({
                teacher,
                severity: teacherSeverity(teacher),
                inactive: isInactive(teacher),
                completion: globalCompletion(teacher),
            })),
        [teachers]
    );

    // distribution globale : le coup d'œil de l'administrateur
    const distribution = useMemo(() => {
        const counts: Record<LatenessSeverity, number> = { ok: 0, notice: 0, warning: 0, critical: 0 };
        let inactive = 0;
        for (const e of enriched) {
            counts[e.severity] += 1;
            if (e.inactive) inactive += 1;
        }
        return { counts, inactive };
    }, [enriched]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = enriched.filter(({ teacher, severity, inactive }) => {
            const matchesQuery =
                !q ||
                `${teacher.prenom} ${teacher.nom}`.toLowerCase().includes(q) ||
                teacher.phone.includes(q);
            const matchesCycle = cycleFilter === 'all' || teacher.classes.some(c => c.cycle === cycleFilter);
            const matchesSubject = subjectFilter === 'all' || teacher.classes.some(c => c.subject === subjectFilter);
            const matchesSeverity =
                severityFilter === 'all' || (severityFilter === 'inactive' ? inactive : severity === severityFilter);
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

    const toggleSeverityFilter = (value: LatenessSeverity | 'inactive') =>
        setSeverityFilter(current => (current === value ? 'all' : value));

    return (
        <div className="mx-auto max-w-5xl p-4 sm:p-8">
            <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Roboto Slab', serif" }}>
                        Tableau de bord — Enseignants
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {teachers.length} enseignant(s) · progression synchronisée
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

            {/* Vue d'ensemble agrégée : distribution des sévérités (cliquable = filtre) */}
            <div className="mb-4 flex flex-wrap gap-2">
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
                    className={`inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all ${
                        severityFilter === 'inactive' ? 'ring-2 ring-offset-1 ring-primary/40' : 'opacity-90 hover:opacity-100'
                    }`}
                    title={`Aucune synchronisation depuis ${INACTIVE_DAYS} jours`}
                >
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    Inactifs <span className="font-black">{distribution.inactive}</span>
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
                            className="rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-shadow hover:shadow-md"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                                        <span className={`h-2 w-2 shrink-0 rounded-full ${SEVERITY_META[severity].dot}`} title={SEVERITY_META[severity].label} />
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
                                    {Array.from(new Set(teacher.classes.map(c => c.cycle).filter(Boolean)))
                                        .map(c => CYCLE_LABEL[c as string] ?? c)
                                        .join(' · ') || '—'}
                                </span>
                                <span className={inactive ? 'font-bold text-red-500' : ''}>{timeAgo(teacher.lastSyncAt)}</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
