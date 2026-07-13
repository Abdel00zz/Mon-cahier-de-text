import React, { useEffect, useState } from 'react';
import type { FerieEntry, HolidayCalendar, VacancePeriode } from '../../utils/calendar';
import { fetchAdminCalendar, saveAdminCalendar } from '../api';
import { CalendarDays, Plus, Save, Trash2 } from '../../components/ui/icons';

export const CalendarManager: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [calendar, setCalendar] = useState<HolidayCalendar | null>(null);
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        fetchAdminCalendar()
            .then(result => setCalendar(result.calendar))
            .catch(error => setMessage(error instanceof Error ? error.message : 'Chargement impossible.'));
    }, []);

    const updateHoliday = (index: number, patch: Partial<FerieEntry>) =>
        setCalendar(current => current ? { ...current, joursFeries: current.joursFeries.map((item, i) => i === index ? { ...item, ...patch } : item) } : current);
    const updateVacation = (index: number, patch: Partial<VacancePeriode>) =>
        setCalendar(current => current ? { ...current, vacances: current.vacances.map((item, i) => i === index ? { ...item, ...patch } : item) } : current);

    const save = async () => {
        if (!calendar) return;
        setBusy(true);
        setMessage('');
        try {
            const result = await saveAdminCalendar(calendar);
            setCalendar(result.calendar);
            setMessage('Calendrier publié. Les contrôles de dates et le cron utilisent maintenant cette version.');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Enregistrement impossible.');
        } finally {
            setBusy(false);
        }
    };

    if (!calendar) return <div className="mx-auto max-w-5xl p-6"><button onClick={onBack}>← Retour</button><p className="mt-6 text-sm text-muted-foreground">{message || 'Chargement…'}</p></div>;

    return (
        <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-8">
            <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-foreground p-4 text-primary-foreground">
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary"><CalendarDays className="h-4 w-4" /></span>
                    <div><h1 className="text-lg font-black">Pilotage du calendrier</h1><p className="text-xs text-primary-foreground/65">Vacances, jours fériés et moteur de notifications</p></div>
                </div>
                <div className="flex gap-2">
                    <button onClick={onBack} className="h-10 rounded-xl bg-primary-foreground/10 px-4 text-xs font-bold">Retour</button>
                    <button onClick={save} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold disabled:opacity-50"><Save className="h-3.5 w-3.5" />Publier</button>
                </div>
            </header>

            {message && <p className="rounded-xl bg-accent px-4 py-3 text-xs font-semibold text-accent-foreground">{message}</p>}

            <section className="rounded-2xl bg-secondary/60 p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                    <label className="text-xs font-bold">Fuseau<input value={calendar.fuseau} onChange={e => setCalendar({ ...calendar, fuseau: e.target.value })} className="mt-1 h-10 w-full rounded-xl border bg-card px-3 font-normal" /></label>
                    <label className="text-xs font-bold">Début de l'année<input type="date" value={calendar.anneeScolaire.debut} onChange={e => setCalendar({ ...calendar, anneeScolaire: { ...calendar.anneeScolaire, debut: e.target.value } })} className="mt-1 h-10 w-full rounded-xl border bg-card px-3 font-normal" /></label>
                    <label className="text-xs font-bold">Fin de l'année<input type="date" value={calendar.anneeScolaire.fin} onChange={e => setCalendar({ ...calendar, anneeScolaire: { ...calendar.anneeScolaire, fin: e.target.value } })} className="mt-1 h-10 w-full rounded-xl border bg-card px-3 font-normal" /></label>
                </div>
            </section>

            <CalendarList
                title="Jours fériés"
                onAdd={() => setCalendar({ ...calendar, joursFeries: [...calendar.joursFeries, { date: '', nom: '', type: 'national' }] })}
            >
                {calendar.joursFeries.map((item, index) => (
                    <div key={`${item.date}-${index}`} className="grid gap-2 rounded-xl bg-card p-3 shadow-sm sm:grid-cols-[9rem_1fr_9rem_2.75rem]">
                        <input type="date" value={item.date} onChange={e => updateHoliday(index, { date: e.target.value })} className="h-10 rounded-lg border px-2 text-xs" />
                        <input value={item.nom} onChange={e => updateHoliday(index, { nom: e.target.value })} placeholder="Nom du jour férié" className="h-10 rounded-lg border px-3 text-xs" />
                        <select value={item.type} onChange={e => updateHoliday(index, { type: e.target.value as FerieEntry['type'] })} className="h-10 rounded-lg border px-2 text-xs"><option value="national">National</option><option value="religieux">Religieux</option></select>
                        <DeleteButton onClick={() => setCalendar({ ...calendar, joursFeries: calendar.joursFeries.filter((_, i) => i !== index) })} />
                    </div>
                ))}
            </CalendarList>

            <CalendarList
                title="Vacances scolaires"
                onAdd={() => setCalendar({ ...calendar, vacances: [...calendar.vacances, { nom: '', debut: '', fin: '' }] })}
            >
                {calendar.vacances.map((item, index) => (
                    <div key={`${item.debut}-${index}`} className="grid gap-2 rounded-xl bg-card p-3 shadow-sm sm:grid-cols-[1fr_9rem_9rem_2.75rem]">
                        <input value={item.nom} onChange={e => updateVacation(index, { nom: e.target.value })} placeholder="Nom des vacances" className="h-10 rounded-lg border px-3 text-xs" />
                        <input type="date" value={item.debut} onChange={e => updateVacation(index, { debut: e.target.value })} className="h-10 rounded-lg border px-2 text-xs" />
                        <input type="date" value={item.fin} onChange={e => updateVacation(index, { fin: e.target.value })} className="h-10 rounded-lg border px-2 text-xs" />
                        <DeleteButton onClick={() => setCalendar({ ...calendar, vacances: calendar.vacances.filter((_, i) => i !== index) })} />
                    </div>
                ))}
            </CalendarList>
        </main>
    );
};

const CalendarList: React.FC<{ title: string; onAdd: () => void; children: React.ReactNode }> = ({ title, onAdd, children }) => (
    <section className="space-y-3 rounded-2xl bg-accent/45 p-4">
        <div className="flex items-center justify-between"><h2 className="text-sm font-black">{title}</h2><button onClick={onAdd} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground"><Plus className="h-3 w-3" />Ajouter</button></div>
        <div className="space-y-2">{children}</div>
    </section>
);

const DeleteButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button onClick={onClick} aria-label="Supprimer" className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"><Trash2 className="h-3.5 w-3.5" /></button>
);
