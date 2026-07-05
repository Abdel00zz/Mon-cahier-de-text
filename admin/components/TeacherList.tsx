import React, { useMemo, useState } from 'react';
import type { TeacherSnapshot } from '../../types';
import { completionColor, globalCompletion, timeAgo } from '../utils';

interface TeacherListProps {
    teachers: TeacherSnapshot[];
    isLoading: boolean;
    onRefresh: () => void;
    onSelect: (phone: string) => void;
    onLogout: () => void;
}

const CYCLE_LABEL: Record<string, string> = { college: 'Collège', lycee: 'Lycée', prepa: 'Prépa' };

export const TeacherList: React.FC<TeacherListProps> = ({ teachers, isLoading, onRefresh, onSelect, onLogout }) => {
    const [query, setQuery] = useState('');
    const [cycleFilter, setCycleFilter] = useState<string>('all');

    const subjects = useMemo(() => {
        const set = new Set<string>();
        teachers.forEach(t => t.classes.forEach(c => c.subject && set.add(c.subject)));
        return Array.from(set).sort();
    }, [teachers]);
    const [subjectFilter, setSubjectFilter] = useState<string>('all');

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return teachers.filter(t => {
            const matchesQuery =
                !q ||
                `${t.prenom} ${t.nom}`.toLowerCase().includes(q) ||
                t.phone.includes(q);
            const matchesCycle = cycleFilter === 'all' || t.classes.some(c => c.cycle === cycleFilter);
            const matchesSubject = subjectFilter === 'all' || t.classes.some(c => c.subject === subjectFilter);
            return matchesQuery && matchesCycle && matchesSubject;
        });
    }, [teachers, query, cycleFilter, subjectFilter]);

    return (
        <div className="mx-auto max-w-5xl p-4 sm:p-8">
            <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
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
            </div>

            {filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
                    {isLoading ? 'Chargement…' : 'Aucun enseignant à afficher.'}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {filtered.map(teacher => {
                        const rate = globalCompletion(teacher);
                        return (
                            <button
                                key={teacher.phone}
                                onClick={() => onSelect(teacher.phone)}
                                className="rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-shadow hover:shadow-md"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <div className="font-semibold text-foreground">
                                            {teacher.prenom} {teacher.nom}
                                        </div>
                                        <div className="text-xs text-muted-foreground">{teacher.phone}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-black text-primary">{rate}%</div>
                                        <div className="text-[10px] text-muted-foreground">{teacher.classes.length} classe(s)</div>
                                    </div>
                                </div>
                                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                                    <div className={`h-full rounded-full ${completionColor(rate)}`} style={{ width: `${rate}%` }} />
                                </div>
                                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                                    <span>
                                        {Array.from(new Set(teacher.classes.map(c => c.cycle).filter(Boolean)))
                                            .map(c => CYCLE_LABEL[c as string] ?? c)
                                            .join(' · ') || '—'}
                                    </span>
                                    <span>{timeAgo(teacher.lastSyncAt)}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
