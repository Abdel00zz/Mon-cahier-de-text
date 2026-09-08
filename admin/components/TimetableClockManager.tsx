import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/button';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import type { TimetableClockPolicy } from '../../types';
import {
    DEFAULT_TIMETABLE_CLOCK,
    getHourSlots,
    isValidTimetableClockOffset,
} from '../../utils/timetable';
import { fetchAdminTimetableClock, saveAdminTimetableClock } from '../api';

interface TimetableClockManagerProps {
    onBack: () => void;
}

const BASE_START_MINUTES = 8 * 60;

const timeValue = (minutes: number): string =>
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

const displayTime = (minutes: number): string =>
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}h${String(minutes % 60).padStart(2, '0')}`;

const parseTime = (value: string): number | null => {
    const match = /^(\d{2}):(\d{2})$/.exec(value);
    if (!match) return null;
    const minutes = Number(match[1]) * 60 + Number(match[2]);
    return Number.isFinite(minutes) ? minutes : null;
};

const relativeOffset = (minutes: number): string => {
    if (minutes === 0) return 'horaire de référence';
    return `${minutes > 0 ? '+' : '−'}${Math.abs(minutes)} min`;
};

export const TimetableClockManager: React.FC<TimetableClockManagerProps> = ({ onBack }) => {
    const [policy, setPolicy] = useState<TimetableClockPolicy>(DEFAULT_TIMETABLE_CLOCK);
    const [draftOffset, setDraftOffset] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const load = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await fetchAdminTimetableClock();
            setPolicy(result.timetableClock);
            setDraftOffset(result.timetableClock.offsetMinutes);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Chargement des horaires impossible.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const slots = useMemo(() => getHourSlots(draftOffset), [draftOffset]);
    const firstStart = BASE_START_MINUTES + draftOffset;
    const lastEnd = slots.at(-1)?.endMin ?? 18 * 60;
    const changed = draftOffset !== policy.offsetMinutes;

    const setStartTime = (value: string) => {
        const minutes = parseTime(value);
        if (minutes === null) return;
        const offset = minutes - BASE_START_MINUTES;
        if (!isValidTimetableClockOffset(offset)) {
            setError('Choisissez une heure entre 06h00 et 10h00, par pas de 5 minutes.');
            return;
        }
        setError(null);
        setMessage(null);
        setDraftOffset(offset);
    };

    const publish = async () => {
        setConfirmOpen(false);
        if (!changed || isSaving) return;
        setIsSaving(true);
        setError(null);
        setMessage(null);
        try {
            const result = await saveAdminTimetableClock(draftOffset, policy.version);
            setPolicy(result.timetableClock);
            setDraftOffset(result.timetableClock.offsetMinutes);
            setMessage(`Horaires publiés : ${displayTime(firstStart)} → ${displayTime(lastEnd)}. Les comptes actifs les recevront automatiquement.`);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Publication impossible.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="mx-auto min-h-screen max-w-5xl p-4 sm:p-8">
            <button type="button" onClick={onBack} className="mb-4 inline-flex min-h-11 items-center rounded-xl border border-border bg-card px-4 text-sm font-bold text-foreground hover:bg-muted">
                ← Retour
            </button>

            <header className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">Référentiel global</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Horaires des séances</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                    Modifiez uniquement l’heure de départ. Toute la journée est translatée de la même durée : les cours, les pauses, les doubles séances et les affectations des enseignants restent inchangés.
                </p>
            </header>

            {error && <div role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">{error}</div>}
            {message && <div role="status" className="mt-4 rounded-xl border border-success/25 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{message}</div>}

            <main className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                    <h2 className="text-base font-black text-foreground">Translation de la journée</h2>
                    <label className="mt-5 block text-xs font-bold text-foreground" htmlFor="school-day-start">
                        Début du premier créneau
                    </label>
                    <input
                        id="school-day-start"
                        type="time"
                        min="06:00"
                        max="10:00"
                        step="300"
                        value={timeValue(firstStart)}
                        onChange={event => setStartTime(event.target.value)}
                        disabled={isLoading || isSaving}
                        className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 text-lg font-black text-foreground focus:outline-none focus:ring-2 focus:ring-primary/35"
                    />

                    <div className="mt-3 grid grid-cols-4 gap-2" aria-label="Raccourcis horaires">
                        {[7 * 60 + 30, 8 * 60, 8 * 60 + 30, 9 * 60].map(start => (
                            <button
                                key={start}
                                type="button"
                                onClick={() => setStartTime(timeValue(start))}
                                disabled={isLoading || isSaving}
                                className={`min-h-11 rounded-xl border px-2 text-xs font-bold transition-colors ${firstStart === start ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:text-foreground'}`}
                            >
                                {displayTime(start)}
                            </button>
                        ))}
                    </div>

                    <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-bold text-muted-foreground">Décalage appliqué</span>
                            <span className="rounded-full bg-primary px-3 py-1 text-xs font-black text-primary-foreground">{relativeOffset(draftOffset)}</span>
                        </div>
                        <div className="mt-3 flex items-end justify-between gap-4">
                            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Début</div><div className="text-xl font-black text-foreground">{displayTime(firstStart)}</div></div>
                            <div className="pb-1 text-muted-foreground">→</div>
                            <div className="text-right"><div className="text-[10px] font-bold uppercase text-muted-foreground">Fin</div><div className="text-xl font-black text-foreground">{displayTime(lastEnd)}</div></div>
                        </div>
                    </div>

                    <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                        <Button type="button" onClick={() => setConfirmOpen(true)} disabled={!changed || isLoading || isSaving} className="min-h-11 flex-1 rounded-xl">
                            {isSaving ? 'Publication…' : 'Publier pour tous les comptes'}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => { setDraftOffset(policy.offsetMinutes); setError(null); }} disabled={!changed || isSaving} className="min-h-11 rounded-xl">
                            Annuler
                        </Button>
                    </div>
                    <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                        Version {policy.version}{policy.updatedAt ? ` · publiée le ${new Date(policy.updatedAt).toLocaleString('fr-FR')}` : ' · horaire initial'}
                    </p>
                </section>

                <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-base font-black text-foreground">Aperçu complet</h2>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">Durée de chaque case : 1 heure. Pause déjeuner conservée entre les créneaux 4 et 5.</p>
                        </div>
                        <button type="button" onClick={() => void load()} disabled={isLoading || isSaving} className="min-h-11 rounded-xl border border-border px-3 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground">
                            Actualiser
                        </button>
                    </div>
                    <ol className="mt-4 grid gap-2 sm:grid-cols-2">
                        {slots.map((slot, index) => (
                            <React.Fragment key={slot.index}>
                                {slot.lunchBefore && (
                                    <li className="rounded-xl border border-dashed border-warning/35 bg-warning/5 px-3 py-2 text-center text-[11px] font-bold text-warning sm:col-span-2">
                                        Pause déjeuner inchangée · 2 heures
                                    </li>
                                )}
                                <li className="flex min-h-12 items-center justify-between rounded-xl border border-border bg-background px-4">
                                    <span className="text-xs font-bold text-muted-foreground">Créneau {index + 1}</span>
                                    <span className="font-mono text-sm font-black text-foreground">{displayTime(slot.startMin)}–{displayTime(slot.endMin)}</span>
                                </li>
                            </React.Fragment>
                        ))}
                    </ol>
                </section>
            </main>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Publier ces horaires ?"
                description={`Tous les comptes utiliseront ${displayTime(firstStart)}–${displayTime(lastEnd)} dès leur prochaine synchronisation. Les classes déjà placées dans les grilles ne seront pas déplacées.`}
                confirmLabel="Publier les horaires"
                variant="default"
                onConfirm={() => void publish()}
            />
        </div>
    );
};
