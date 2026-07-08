import React, { useEffect, useState } from 'react';
import { blockTeacher, deleteTeacher, fetchTeacher, notifyTeacher, TeacherDetail as TeacherDetailData } from '../api';
import { getBundledCalendar } from '../../utils/calendar';
import { computeLateness } from '../../utils/lateness';
import { completionColor, timeAgo } from '../utils';
import type { ClassSnapshot, TeacherSnapshot } from '../../types';

const calendar = getBundledCalendar();

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
            {error && <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-700">{error}</div>}

            {data && (
                <>
                    <header className="mb-6">
                        <h1 className="text-2xl font-bold text-foreground font-display">
                            {data.user?.prenom ?? data.snapshot?.prenom} {data.user?.nom ?? data.snapshot?.nom}
                            {isBlocked && (
                                <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 align-middle text-[10px] font-bold uppercase text-red-700">
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
                                className="h-9 rounded-md border border-border bg-card px-3 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                            >
                                {isBlocked ? '🔓 Débloquer' : '🔒 Bloquer'}
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={busy}
                                className="h-9 rounded-md border border-red-200 bg-card px-3 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                                🗑 Supprimer le compte
                            </button>
                        </div>
                        {actionMessage && (
                            <p className="mt-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">{actionMessage}</p>
                        )}
                    </header>

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
                                                            ? 'bg-red-500'
                                                            : lateness.severity === 'warning'
                                                              ? 'bg-amber-500'
                                                              : 'bg-amber-400'
                                                    }`}
                                                >
                                                    {lateness.gapSessions > 0
                                                        ? `~${lateness.gapSessions} séance(s) de retard`
                                                        : 'À mettre à jour'}
                                                </span>
                                            )}
                                        </div>
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
