import React, { useMemo, useState } from 'react';
import { fetchClassLessons } from '../api';
import { MathText } from '../../components/ui/math-text';
import { textDirectionAttribute } from '../../lib/text/textDirection';
import { getBundledCalendar, todayInMorocco } from '../../domain/calendar/calendar';
import { analyseSessionProgression, snapshotSlots } from '../../domain/notebook/sessionProgression';
import type { ClassSnapshot, LessonsData, ScheduleSlot } from '../../types';

/**
 * Progression d'une classe, séance par séance : ce que l'emploi du temps
 * laissait attendre depuis la rentrée, ce qui a réellement été saisi et quand,
 * et - surtout - les journées de classe restées sans trace.
 *
 * Le cahier n'est chargé qu'à l'ouverture du panneau : la fiche du professeur
 * reste légère même avec plusieurs classes.
 */

const calendar = getBundledCalendar();

const shortDate = (iso: string): string => {
    const [year, month, day] = iso.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
};

const longDate = (iso: string | null): string => {
    if (!iso) return 'aucune';
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};

const formatDateTimeFr = (iso: string | null): string => {
    if (!iso) return 'date inconnue';
    try {
        return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
        return iso;
    }
};

const Stat: React.FC<{ label: string; value: string; hint?: string; tone?: 'default' | 'success' | 'warning' }> = ({ label, value, hint, tone = 'default' }) => (
    <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
        <div
            className={`text-lg font-black leading-none tabular-nums ${
                tone === 'success'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : tone === 'warning'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-foreground'
            }`}
        >
            {value}
        </div>
        <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
        {hint && <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>}
    </div>
);

export const ClassProgression: React.FC<{ phone: string; classId: string; snapshot?: ClassSnapshot }> = ({ phone, classId, snapshot }) => {
    const [open, setOpen] = useState(false);
    const [lessons, setLessons] = useState<LessonsData | null>(null);
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const contentId = `class-progression-${classId}`;

    const today = useMemo(() => todayInMorocco(), []);
    const slots = useMemo<ScheduleSlot[]>(() => snapshotSlots(snapshot), [snapshot]);
    const report = useMemo(
        () => (lessons ? analyseSessionProgression(lessons, slots, today, calendar) : null),
        [lessons, slots, today]
    );

    const toggle = async () => {
        const next = !open;
        setOpen(next);
        if (!next || lessons !== null || loading) return;
        setLoading(true);
        setError(null);
        try {
            const blob = await fetchClassLessons(phone, classId);
            setLessons((Array.isArray(blob.lessonsData) ? blob.lessonsData : []) as LessonsData);
            setUpdatedAt(blob.updatedAt ?? null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Analyse impossible.');
        } finally {
            setLoading(false);
        }
    };

    const recent = report ? [...report.sessions].reverse().slice(0, 8) : [];
    const missingList = report ? [...report.missing].reverse() : [];

    return (
        <div className="mt-2 border-t border-border pt-2">
            <button
                type="button"
                onClick={toggle}
                aria-expanded={open}
                aria-controls={contentId}
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-primary hover:bg-primary/10"
            >
                {open ? '▾' : '▸'} Progression des séances
            </button>

            {open && (
                <div id={contentId} className="mt-1.5 space-y-3">
                    {loading && <p className="text-xs text-muted-foreground">Analyse du cahier…</p>}
                    {error && <p className="rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">{error}</p>}

                    {report && (
                        <>
                            <p className="text-[11px] leading-relaxed text-muted-foreground">
                                {slots.length === 0
                                    ? 'Emploi du temps non renseigné : les séances attendues ne peuvent pas être calculées.'
                                    : `${slots.length} créneau(x) hebdomadaire(s) · ${snapshot?.sessionsPerWeek ?? 0} séance(s)/semaine attendue(s).`}
                                {updatedAt && <> · cahier synchronisé le <b>{formatDateTimeFr(updatedAt)}</b></>}
                            </p>

                            {report.sessions.length === 0 ? (
                                <p className="rounded-lg bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
                                    Aucune séance datée : le cahier n’a pas encore été rempli.
                                </p>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                        <Stat label="Séances attendues" value={String(report.expectedSessions)} hint="depuis la rentrée" />
                                        <Stat label="Séances saisies" value={String(report.actualSessions)} hint={`depuis le ${longDate(report.firstDate)}`} />
                                        <Stat
                                            label="Écart"
                                            value={report.gap === 0 ? 'à jour' : `−${report.gap}`}
                                            hint={report.gap === 0 ? 'aucun retard' : 'séance(s) à renseigner'}
                                            tone={report.gap === 0 ? 'success' : 'warning'}
                                        />
                                        <Stat label="Contenus / séance" value={String(report.averageItems)} hint="moyenne du cahier" />
                                    </div>

                                    <div>
                                        <div className="flex items-baseline justify-between text-[11px] font-semibold text-muted-foreground">
                                            <span>Couverture depuis la rentrée</span>
                                            <span className="tabular-nums text-foreground">{report.coverage} %</span>
                                        </div>
                                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                                            <div
                                                className={`h-full rounded-full ${report.gap === 0 ? 'bg-emerald-500' : report.gap <= 2 ? 'bg-amber-500' : 'bg-destructive'}`}
                                                style={{ width: `${report.coverage}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Dernières séances</p>
                                        <ul className="mt-1.5 space-y-1">
                                            {recent.map(session => {
                                                // Les intitulés peuvent porter des formules ($…$) :
                                                // on les compose en KaTeX comme dans l'application.
                                                const titles = session.titles.join(' · ');
                                                return (
                                                <li key={session.date} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border bg-background/60 px-3 py-1.5">
                                                    <span className="w-32 shrink-0 text-xs font-bold capitalize text-foreground">{shortDate(session.date)}</span>
                                                    <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                                                        {session.items} contenu{session.items > 1 ? 's' : ''}
                                                    </span>
                                                    {session.titles.length > 0 && (
                                                        <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground" dir={textDirectionAttribute(titles)}>
                                                            <MathText source={titles}>{titles}</MathText>
                                                            {session.items > session.titles.length && ' …'}
                                                        </span>
                                                    )}
                                                </li>
                                                );
                                            })}
                                        </ul>
                                    </div>

                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                            Journées de classe sans trace {missingList.length > 0 && `(${missingList.length})`}
                                        </p>
                                        {missingList.length === 0 ? (
                                            <p className="mt-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                                {slots.length === 0
                                                    ? 'Aucun créneau à surveiller.'
                                                    : 'Toutes les journées prévues portent une séance. Sérénité pédagogique.'}
                                            </p>
                                        ) : (
                                            <ul className="mt-1.5 flex flex-wrap gap-1.5">
                                                {missingList.slice(0, 12).map(date => (
                                                    <li key={date} className="rounded-md border border-amber-500/25 bg-amber-500/[0.08] px-2 py-0.5 text-[11px] font-semibold capitalize text-amber-700 dark:text-amber-300">
                                                        {shortDate(date)}
                                                    </li>
                                                ))}
                                                {missingList.length > 12 && (
                                                    <li className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                                        +{missingList.length - 12} autre(s)
                                                    </li>
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
