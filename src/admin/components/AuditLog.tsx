import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Skeleton } from '../../components/ui/skeleton';
import { SereneStudyIllustration } from '../../components/ui/DynamicIllustration';
import { AUDIT_LABELS, type AdminAuditEntry } from '../../domain/admin/auditLog';
import { AdminApiError, fetchAdminAudit } from '../api';

/*
 * JOURNAL — ce que la console a changé, jour par jour.
 *
 * Une ligne par écriture réussie (compte bloqué, message envoyé, politique publiée…), la plus récente
 * d'abord, sans aucun contenu. Un filtre par type d'action, et un clic sur l'enseignant concerné ouvre
 * sa fiche.
 */
interface AuditLogProps {
    onBack: () => void;
    onOpenTeacher: (phone: string) => void;
}

const dayLabel = (iso: string): string => {
    const label = new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    return label.charAt(0).toUpperCase() + label.slice(1);
};
const timeLabel = (iso: string): string =>
    new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const dayKey = (iso: string): string => new Date(iso).toLocaleDateString('sv-SE');

export const AuditLog: React.FC<AuditLogProps> = ({ onBack, onOpenTeacher }) => {
    const [entries, setEntries] = useState<AdminAuditEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>('all');

    const load = useCallback(async (signal?: AbortSignal) => {
        setIsLoading(true);
        setError(null);
        try {
            setEntries(await fetchAdminAudit(signal));
        } catch (cause) {
            if (signal?.aborted) return;
            setError(cause instanceof AdminApiError ? cause.message : 'Le journal est momentanément indisponible. Réessayez dans un instant.');
        } finally {
            if (!signal?.aborted) setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        void load(controller.signal);
        return () => controller.abort();
    }, [load]);

    const kinds = useMemo(() => [...new Set(entries.map(entry => entry.action))], [entries]);
    const visible = useMemo(() => entries.filter(entry => filter === 'all' || entry.action === filter), [entries, filter]);
    const days = useMemo(() => {
        const groups = new Map<string, AdminAuditEntry[]>();
        for (const entry of visible) {
            const key = dayKey(entry.at);
            groups.set(key, [...(groups.get(key) ?? []), entry]);
        }
        return [...groups.values()];
    }, [visible]);

    return (
        <div className="admin-shell mx-auto min-h-dvh max-w-4xl space-y-5 p-4 sm:p-8" style={{ backgroundColor: 'var(--clr-bg)' }}>
            <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center rounded-xl border border-border bg-card px-4 text-sm font-bold text-foreground hover:bg-muted">
                ← Retour
            </button>
            <header className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">Traçabilité</p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Journal de la console</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Les 300 dernières écritures de la direction : qui est concerné, quoi, et quand. Le journal ne garde jamais le contenu des messages, des cahiers ou des listes.
                </p>
            </header>

            {kinds.length > 1 && (
                <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par action">
                    {['all', ...kinds].map(kind => (
                        <button
                            key={kind}
                            type="button"
                            aria-pressed={filter === kind}
                            onClick={() => setFilter(kind)}
                            className={`min-h-11 rounded-full border px-4 text-xs font-bold transition-colors ${filter === kind ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:bg-muted'}`}
                        >
                            {kind === 'all' ? 'Tout' : AUDIT_LABELS[kind] ?? kind}
                        </button>
                    ))}
                </div>
            )}

            {error && (
                <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
                    <span>{error}</span>
                    <button type="button" onClick={() => void load()} className="min-h-11 rounded-lg border border-destructive/30 bg-card px-4 text-xs font-bold">Réessayer</button>
                </div>
            )}

            {isLoading && entries.length === 0 ? (
                <div className="space-y-3" role="status" aria-busy="true" aria-label="Chargement du journal">
                    {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-16 w-full rounded-2xl" />)}
                </div>
            ) : visible.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
                    <SereneStudyIllustration size={120} />
                    <p className="text-base font-extrabold text-foreground">{entries.length === 0 ? 'Rien à signaler pour le moment' : 'Aucune ligne pour ce filtre'}</p>
                    <p className="max-w-md text-sm text-muted-foreground">
                        {entries.length === 0
                            ? 'Dès qu’une action sera enregistrée depuis la console (blocage, message, politique…), elle apparaîtra ici.'
                            : 'Choisissez « Tout » pour revoir l’ensemble du journal.'}
                    </p>
                    {entries.length > 0 && (
                        <button type="button" onClick={() => setFilter('all')} className="min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm transition-[filter,transform] hover:brightness-110 active:scale-[0.98] active:brightness-90">
                            Tout afficher
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {days.map(group => (
                        <section key={dayKey(group[0].at)} aria-label={dayLabel(group[0].at)}>
                            <h2 className="mb-2 text-sm font-black text-foreground">{dayLabel(group[0].at)}</h2>
                            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                                {group.map(entry => (
                                    <li key={entry.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                                        <span className="w-12 shrink-0 text-xs font-bold tabular-nums text-muted-foreground">{timeLabel(entry.at)}</span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-bold text-foreground">{AUDIT_LABELS[entry.action] ?? entry.action}</span>
                                            {entry.detail && <span className="block text-xs text-muted-foreground">{entry.detail}</span>}
                                        </span>
                                        {entry.phone && (
                                            <button
                                                type="button"
                                                onClick={() => onOpenTeacher(entry.phone!)}
                                                className="min-h-11 max-w-full truncate rounded-lg px-3 text-xs font-bold text-primary hover:bg-primary/10"
                                                dir="ltr"
                                            >
                                                {entry.phone.startsWith('acct_') ? 'Compte Google' : entry.phone}
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
};
