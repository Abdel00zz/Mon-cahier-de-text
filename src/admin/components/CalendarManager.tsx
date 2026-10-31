import React, { useEffect, useState } from 'react';
import type { AnneeScolaire, FerieEntry, HolidayCalendar, VacancePeriode } from '../../domain/calendar/calendar';
import { fetchAdminCalendar, saveAdminCalendar } from '../api';
import { CalendarDays, Plus, Save } from '../../components/ui/icons';
import { AnimatedTrashButton } from '../../components/ui/AnimatedTrashButton';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

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

    /*
     * Un calendrier multi-années ignore le champ historique `anneeScolaire` : les bornes se
     * modifient donc sur la liste des années, et le champ historique suit la première.
     */
    const updateYear = (index: number, patch: Partial<AnneeScolaire>) =>
        setCalendar(current => {
            if (!current) return current;
            const multi = !!current.anneesScolaires?.length;
            const years = (multi ? current.anneesScolaires! : [current.anneeScolaire])
                .map((year, i) => i === index ? { ...year, ...patch } : year);
            return { ...current, anneeScolaire: years[0], ...(multi ? { anneesScolaires: years } : {}) };
        });

    const save = async () => {
        if (!calendar) return;
        setBusy(true);
        setMessage('');
        try {
            const result = await saveAdminCalendar(calendar);
            setCalendar(result.calendar);
            setMessage('Calendrier publié. Les contrôles de dates, les séances attendues et les rappels utilisent maintenant cette version.');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Enregistrement impossible.');
        } finally {
            setBusy(false);
        }
    };

    if (!calendar) return <div className="mx-auto max-w-5xl p-6"><Button variant="ghost" onClick={onBack}>← Retour</Button><p className="mt-6 text-sm text-muted-foreground">{message || 'Chargement…'}</p></div>;

    return (
        <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-8">
            <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-foreground p-4 text-primary-foreground">
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary"><CalendarDays className="h-4 w-4" /></span>
                    <div><h1 className="text-lg font-black">Pilotage du calendrier</h1><p className="text-xs text-primary-foreground/65">Vacances, jours fériés et moteur de notifications</p></div>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={onBack} className="h-10 rounded-xl bg-primary-foreground/10 px-4 text-xs font-bold text-primary-foreground hover:bg-primary-foreground/20">Retour</Button>
                    <Button onClick={save} disabled={busy} className="h-10 rounded-xl px-4 text-xs font-bold"><Save className="h-3.5 w-3.5" />Publier</Button>
                </div>
            </header>

            {message && <p className="rounded-xl bg-accent px-4 py-3 text-xs font-semibold text-accent-foreground">{message}</p>}

            <section className="rounded-2xl bg-secondary/60 p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                    <label className="text-xs font-bold sm:col-span-3">Fuseau<Input value={calendar.fuseau} onChange={e => setCalendar({ ...calendar, fuseau: e.target.value })} className="mt-1 h-10 w-full rounded-xl bg-card px-3 font-normal" /></label>
                    {(calendar.anneesScolaires?.length ? calendar.anneesScolaires : [calendar.anneeScolaire]).map((year, index) => (
                        <React.Fragment key={year.libelle}>
                            <p className="self-end pb-2 text-xs font-black">Année {year.libelle}</p>
                            <label className="text-xs font-bold">Début<Input type="date" value={year.debut} onChange={e => updateYear(index, { debut: e.target.value })} className="mt-1 h-10 w-full rounded-xl bg-card px-3 font-normal" /></label>
                            <label className="text-xs font-bold">Fin<Input type="date" value={year.fin} onChange={e => updateYear(index, { fin: e.target.value })} className="mt-1 h-10 w-full rounded-xl bg-card px-3 font-normal" /></label>
                        </React.Fragment>
                    ))}
                </div>
            </section>

            <CalendarList
                title="Jours fériés"
                onAdd={() => setCalendar({ ...calendar, joursFeries: [...calendar.joursFeries, { date: '', nom: '', type: 'national' }] })}
            >
                {calendar.joursFeries.map((item, index) => (
                    <div key={`${item.date}-${index}`} className="grid gap-2 rounded-xl bg-card p-3 shadow-sm sm:grid-cols-[9rem_1fr_9rem_2.75rem]">
                        <Input type="date" value={item.date} onChange={e => updateHoliday(index, { date: e.target.value })} className="h-10 rounded-lg px-2 text-xs" />
                        <Input value={item.nom} onChange={e => updateHoliday(index, { nom: e.target.value })} placeholder="Nom du jour férié" className="h-10 rounded-lg px-3 text-xs" />
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
                        <Input value={item.nom} onChange={e => updateVacation(index, { nom: e.target.value })} placeholder="Nom des vacances" className="h-10 rounded-lg px-3 text-xs" />
                        <Input type="date" value={item.debut} onChange={e => updateVacation(index, { debut: e.target.value })} className="h-10 rounded-lg px-2 text-xs" />
                        <Input type="date" value={item.fin} onChange={e => updateVacation(index, { fin: e.target.value })} className="h-10 rounded-lg px-2 text-xs" />
                        <DeleteButton onClick={() => setCalendar({ ...calendar, vacances: calendar.vacances.filter((_, i) => i !== index) })} />
                    </div>
                ))}
            </CalendarList>
        </main>
    );
};

const CalendarList: React.FC<{ title: string; onAdd: () => void; children: React.ReactNode }> = ({ title, onAdd, children }) => (
    <section className="space-y-3 rounded-2xl bg-accent/45 p-4">
        <div className="flex items-center justify-between"><h2 className="text-sm font-black">{title}</h2><Button size="sm" onClick={onAdd} className="h-9 rounded-xl px-3 text-xs font-bold"><Plus className="h-3 w-3" />Ajouter</Button></div>
        <div className="space-y-2">{children}</div>
    </section>
);

const DeleteButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <AnimatedTrashButton iconOnly size="md" variant="icon" onAction={onClick} aria-label="Supprimer" title="Supprimer" className="shrink-0" />
);
