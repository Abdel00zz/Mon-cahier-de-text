import React from 'react';
import { AppConfig, ClassInfo, Cycle } from '@/types';
import { CreateClassModal } from '@/features/dashboard/modals/CreateClassModal';
import { getBundledCalendar, getEffectiveSchoolYear, todayInMorocco } from '@/utils/calendar';
import { SUBJECT_ABBREV_MAP, formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
import {
    TIMETABLE_DAYS,
    deriveSchedules,
    getHourSlots,
    getDaySlotRuns,
    getTimetableEntry,
    setTimetableEntry,
} from '@/utils/timetable';
import { useLocale } from '@/i18n/LocaleProvider';
import { keepToneForClass, KEEP_TONES } from '@/utils/keepTheme';
import { FluidTabRail, FluidTabItem } from '@/components/ui/FluidTabRail';

export interface ModernClassColor {
    key: string;
    bg: string;
    border: string;
    text: string;
    subtext: string;
    dot: string;
}

/** Palette synchronisée avec les cartes de classes (Google Keep tones) - teintes chic et éditoriales */
export const KEEP_SCHEDULE_PALETTE: Record<typeof KEEP_TONES[number], ModernClassColor> = {
    sand: {
        key: 'sand',
        bg: 'bg-[#faf6ed] dark:bg-[#383329]',
        border: 'border-[#e5dac5] dark:border-[#524b3c]',
        text: 'text-[#383023] dark:text-[#f8f5ee]',
        subtext: 'text-[#70614a] dark:text-[#ded7cb]',
        dot: 'bg-[#8b7355]',
    },
    mint: {
        key: 'mint',
        bg: 'bg-[#eff6f1] dark:bg-[#26382b]',
        border: 'border-[#c6dfcd] dark:border-[#38533e]',
        text: 'text-[#1c3825] dark:text-[#ebf7eb]',
        subtext: 'text-[#446b4e] dark:text-[#c4e6c8]',
        dot: 'bg-[#2e7d4f]',
    },
    sky: {
        key: 'sky',
        bg: 'bg-[#f0f5f9] dark:bg-[#243540]',
        border: 'border-[#c9deed] dark:border-[#364e5d]',
        text: 'text-[#1b3240] dark:text-[#e8f1f5]',
        subtext: 'text-[#476a7d] dark:text-[#bad7e7]',
        dot: 'bg-[#3b82f6]',
    },
    lavender: {
        key: 'lavender',
        bg: 'bg-[#f5f1f9] dark:bg-[#32283b]',
        border: 'border-[#ded2ee] dark:border-[#4b3c59]',
        text: 'text-[#30203f] dark:text-[#f1edf7]',
        subtext: 'text-[#664e7c] dark:text-[#d3c8e7]',
        dot: 'bg-[#8e52c7]',
    },
    coral: {
        key: 'coral',
        bg: 'bg-[#faf1ef] dark:bg-[#3d2a27]',
        border: 'border-[#edd4cf] dark:border-[#5a3e39]',
        text: 'text-[#3f231f] dark:text-[#f8ece9]',
        subtext: 'text-[#7a4c46] dark:text-[#e4c8c2]',
        dot: 'bg-[#d95c43]',
    },
};

export const MODERN_SCHEDULE_PALETTE: ModernClassColor[] = Object.values(KEEP_SCHEDULE_PALETTE);

interface ScheduleTabProps {
    classes: ClassInfo[];
    config: AppConfig;
    onChange: (patch: Partial<AppConfig>) => void;
    /**
     * Création AUTOMATIQUE depuis la grille : chaque cellule propose
     * « + Créer une classe… », la classe créée est aussitôt posée sur le
     * créneau. Le prof peut ainsi composer tout son emploi du temps d'abord,
     * les classes naissent au fil de la saisie.
     */
    onCreateClass?: (details: { name: string; subject: string; cycle?: Cycle }) => ClassInfo;
}

/*
 * Couleur DISTINCTE par classe (palette papier harmonieuse) : la grille se lit
 * d'un coup d'œil, chaque classe garde sa teinte dans les cellules ET dans le
 * récapitulatif. Attribution stable par ordre des classes.
 */
/**
 * Abréviation du nom de classe pour la CELLULE (le menu déroulant garde
 * l'intitulé complet). Le niveau et le numéro/groupe restent toujours
 * visibles : « 2 Bac SM-A » → « 2B·SM-A », « 1ère Bac SE » → « 1B·SE »,
 * « 3AC 2 » → « 3AC·2 ». Les noms arabes sont conservés tels quels
 * (tronqués par la cellule si besoin).
 */
const abbreviateClassName = (name: string): string => {
    if (/[؀-ۿ]/.test(name)) {
        const cleaned = name.replace(/^قسم\s+/, '').trim();
        const group = cleaned.match(/\d+\s*$/)?.[0].trim();
        const compactArabicLevels: Array<[RegExp, string]> = [
            [/الجذع المشترك العلمي/, 'ج.م.ع'],
            [/الجذع المشترك الأدبي/, 'ج.م.أ'],
            [/الأولى إعدادي/, '1إ'],
            [/الثانية إعدادي/, '2إ'],
            [/الثالثة إعدادي/, '3إ'],
            [/(الأولى باك|الأولى بكالوريا)/, '1ب'],
            [/(الثانية باك|الثانية بكالوريا)/, '2ب'],
        ];
        const match = compactArabicLevels.find(([pattern]) => pattern.test(cleaned));
        if (match) return `${match[1]}${group ?? ''}`;
        return cleaned;
    }
    const words = name.trim().split(/\s+/);
    const parts = words.map(word => {
        if (/\d/.test(word)) return word.replace(/(ère|ere|ème|eme|er)$/i, ''); // 1ère → 1, 3AC → 3AC
        if (word === word.toUpperCase() || word.includes('-')) return word;      // SM-A, SE, TC…
        return word.charAt(0).toUpperCase();                                     // Bac → B
    });
    // groupe/numéro final séparé par un point médian pour rester lisible
    if (parts.length > 1) {
        const last = parts[parts.length - 1];
        return parts.slice(0, -1).join('') + '·' + last;
    }
    return parts.join('');
};

type SchedulePeriod = 'all' | 'morning' | 'afternoon';

export const ScheduleTab: React.FC<ScheduleTabProps> = ({ classes, config, onChange, onCreateClass }) => {
    const { locale, t } = useLocale();
    const hourNumber = React.useMemo(
        () => new Intl.NumberFormat(locale, { minimumIntegerDigits: 2, numberingSystem: 'latn', useGrouping: false }),
        [locale],
    );
    const hourSlots = React.useMemo(
        () => getHourSlots(config.timetableClock),
        [config.timetableClock?.offsetMinutes],
    );
    const clockPart = (minutes: number) => {
        const hour = hourNumber.format(Math.floor(minutes / 60));
        const minute = String(minutes % 60).padStart(2, '0');
        return locale === 'fr' ? `${hour}h${minute === '00' ? '' : minute}` : `${hour}:${minute}`;
    };
    const hourLabel = (startMin: number, endMin: number) => `${clockPart(startMin)}–${clockPart(endMin)}`;
    const classLabel = (name: string) => formatLocalizedClassDisplayName(name, locale);
    const subjectLabel = (subject: string) => locale === 'ar'
        ? formatLocalizedSubjectDisplayName(subject, locale)
        : (SUBJECT_ABBREV_MAP[subject] || subject);
    const calendar = getBundledCalendar();
    const effectiveSchoolYear = getEffectiveSchoolYear(
        calendar,
        config.schoolYearStart,
        todayInMorocco(new Date(), calendar),
    );
    const schoolYearStart = config.schoolYearStart ?? effectiveSchoolYear.debut;
    const displaySchoolYearStart = React.useMemo(() => {
        const [year, month, day] = schoolYearStart.split('-');
        return `${day}/${month}/${year}`;
    }, [schoolYearStart]);
    const timetable = config.timetable ?? [];
    // créneau en attente d'une NOUVELLE classe (option « + Créer une classe… »)
    const [pendingCreate, setPendingCreate] = React.useState<{ day: number; slot: number; span: number } | null>(null);
    // Le matin est la vue initiale la plus rapide à lire, quel que soit
    // l'écran. L'enseignant peut basculer instantanément vers l'après-midi
    // ou la journée complète sans recharger la grille.
    const [visiblePeriod, setVisiblePeriod] = React.useState<SchedulePeriod>('morning');

    const classById = React.useMemo(() => {
        const map = new Map<string, ClassInfo>();
        classes.forEach(c => map.set(c.id, c));
        return map;
    }, [classes]);

    /**
     * Attribution de la couleur synchronisée avec la carte de classe (Google Keep tone).
     */
    const colorFor = React.useCallback((classId: string): ModernClassColor => {
        const tone = keepToneForClass(classId);
        return KEEP_SCHEDULE_PALETTE[tone] || KEEP_SCHEDULE_PALETTE.sand;
    }, []);

    // Les avis sont recalculés dans le bloc unique au-dessus de la grille.
    // L'affectation reste immédiate et ne déclenche pas de toast en doublon.
    const assign = (day: number, slot: number, classId: string | null) => {
        const nextTimetable = setTimetableEntry(timetable, day, slot, classId);
        onChange({ timetable: nextTimetable, schedules: deriveSchedules(nextTimetable) });
    };

    // séance fusionnée (2 h+) : la cellule unique pilote TOUTES ses heures d'un coup
    const assignRun = (day: number, startSlot: number, hours: number, classId: string | null) => {
        let next = timetable;
        for (let slot = startSlot; slot < startSlot + hours; slot++) {
            next = setTimetableEntry(next, day, slot, classId);
        }
        onChange({ timetable: next, schedules: deriveSchedules(next) });
    };

    // séances continues par jour : deux créneaux consécutifs de la même classe
    // s'affichent soudés (badge « 2 h ») et comptent pour UNE séance
    const runsByDay = React.useMemo(() => {
        const map = new Map<number, ReturnType<typeof getDaySlotRuns>>();
        TIMETABLE_DAYS.forEach(day => map.set(day.value, getDaySlotRuns(timetable, day.value)));
        return map;
    }, [timetable]);

    const visibleHourSlots = React.useMemo(() => {
        if (visiblePeriod === 'morning') return hourSlots.filter(slot => slot.index < 4);
        if (visiblePeriod === 'afternoon') return hourSlots.filter(slot => slot.index >= 4);
        return hourSlots;
    }, [visiblePeriod, hourSlots]);

    const setSchoolYearStart = (value: string) => onChange({ schoolYearStart: value || undefined });

    // ZÉRO classe ≠ blocage : la grille reste affichée, les classes se créent
    // directement depuis les cases (« + Créer une classe… »). On encourage.
    const noClassesYet = classes.length === 0;
    // Dès qu'une classe existe, la grille sert à FINIR sa configuration : on
    // évite de répéter « créer une classe » dans chacune des 48 cases.
    const canCreateFromSchedule = !!onCreateClass && noClassesYet;
    if (noClassesYet && !onCreateClass) {
        return (
            <p className="px-1 py-2 text-center text-sm text-muted-foreground">
                {t('schedule.empty')}
            </p>
        );
    }

    // heures = cases cochées ; séances = blocs continus (ce que compte le
    // moteur de retard : une séance de 2 h = une seule date attendue)
    const weeklyStats = (classId: string) => {
        const hours = timetable.filter(e => e.classId === classId).length;
        let sessions = 0;
        for (const runs of runsByDay.values()) {
            for (const run of runs.values()) {
                if (run.classId === classId && run.isStart) sessions += 1;
            }
        }
        return { hours, sessions };
    };

    const periodTabItems: FluidTabItem<SchedulePeriod>[] = React.useMemo(() => [
        { id: 'morning', label: t('schedule.viewMorning') },
        { id: 'afternoon', label: t('schedule.viewAfternoon') },
        { id: 'all', label: t('schedule.viewAll') },
    ], [t]);

    return (
        <div className="space-y-5">
            <section className="rounded-xl border border-border/70 bg-card/60 p-4 sm:p-5 shadow-2xs space-y-4" aria-label={t('schedule.gridTitle')}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex shrink-0 items-center gap-2.5" aria-label={t('schedule.startYear')}>
                        <label className="text-xs font-bold text-foreground/80">{t('schedule.startYear')}</label>
                        <div className="relative">
                            <input
                                type="date"
                                value={schoolYearStart}
                                onChange={e => setSchoolYearStart(e.target.value)}
                                lang={locale === 'ar' ? 'ar-MA-u-nu-latn' : locale === 'en' ? 'en-GB' : 'fr-MA'}
                                dir="ltr"
                                className={`h-9 rounded-md border border-border/70 bg-background/80 px-3 text-xs font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/25 ${locale === 'ar' ? 'text-transparent' : 'text-foreground'}`}
                            />
                            {locale === 'ar' && (
                                <span
                                    aria-hidden
                                    dir="ltr"
                                    className="pointer-events-none absolute inset-y-0 left-3 right-10 flex items-center text-xs font-bold text-foreground"
                                >
                                    {displaySchoolYearStart}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="w-full sm:w-auto">
                        <FluidTabRail<SchedulePeriod>
                            items={periodTabItems}
                            activeId={visiblePeriod}
                            onChange={setVisiblePeriod}
                            layoutId="schedule-period-subpill"
                            size="sm"
                            ariaLabel={t('schedule.viewLabel')}
                        />
                    </div>
                </div>

                {noClassesYet && (
                    <p className="-mt-1 text-xs font-semibold text-primary">{t('schedule.emptyHint')}</p>
                )}

                {/* Une seule zone d'avis, toujours avant la grille. */}

                {/* Grille jours × créneaux : la vue demi-journée s'adapte à la largeur d'un téléphone. */}
                <div className="settings-surface overflow-hidden">
                    <div className="overflow-x-auto overscroll-x-contain">
                    <table className={`rtl-table w-full border-separate border-spacing-0 text-xs sm:text-sm ${visiblePeriod === 'all' ? 'min-w-[34rem] sm:min-w-[42rem]' : 'min-w-full table-fixed'}`}>
                    <thead>
                        <tr>
                            <th className={`sticky ${locale === 'ar' ? 'right-0 border-l' : 'left-0 border-r'} z-20 w-14 sm:w-20 border-b border-[#e6e1d9] bg-[#f7f5f2] px-1 sm:px-2 py-1.5 sm:py-2 text-start text-[10px] sm:text-xs font-bold tracking-wide text-[#6b6560] dark:border-[#38332c] dark:bg-[#1a1815] dark:text-[#a8a199]`}>
                                {t('schedule.day')}
                            </th>
                            {visibleHourSlots.map(hour => (
                                <th
                                    key={hour.index}
                                    className={`border-b border-[#e6e1d9] bg-[#f7f5f2] px-0.5 sm:px-1 py-1 sm:py-1.5 text-center text-[8px] sm:text-[9.5px] font-semibold text-[#6b6560] dark:border-[#38332c] dark:bg-[#1a1815] dark:text-[#a8a199] ${
                                        hour.lunchBefore ? 'border-l border-l-[#8b7355]/25' : ''
                                    }`}
                                >
                                    <span dir="ltr" className="inline-block leading-tight tracking-tight">{hourLabel(hour.startMin, hour.endMin)}</span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {TIMETABLE_DAYS.map((day, dayIndex) => (
                            <tr key={day.value} className="group transition-colors hover:bg-[#faf8f5]/60 dark:hover:bg-[#1e1c19]/40">
                                <td className={`sticky ${locale === 'ar' ? 'right-0 border-l' : 'left-0 border-r'} z-10 border-[#e6e1d9] bg-[#fbfaf8] px-1.5 sm:px-2.5 py-1 sm:py-1.5 text-[10.5px] sm:text-xs font-semibold text-[#2c2a26] transition-colors group-hover:bg-[#f5f1eb] dark:border-[#38332c] dark:bg-[#1a1815] dark:text-[#f3efe8] dark:group-hover:bg-[#24211c] ${dayIndex < TIMETABLE_DAYS.length - 1 ? 'border-b border-[#e6e1d9]/60 dark:border-[#38332c]/60' : ''}`}>
                                    {t(`schedule.day.${day.value}`)}
                                </td>
                                {visibleHourSlots.map(hour => {
                                    const run = runsByDay.get(day.value)?.get(hour.index);
                                    if (run && !run.isStart) return null;
                                    const merged = !!run && run.hours > 1;
                                    const span = run ? run.hours : 1;
                                    const entry = getTimetableEntry(timetable, day.value, hour.index);
                                    const classInfo = entry ? classById.get(entry.classId) : undefined;
                                    const color = entry ? colorFor(entry.classId) : null;
                                    return (
                                        <td
                                            key={hour.index}
                                            colSpan={span}
                                            className={`relative p-0.5 sm:p-1 align-top ${dayIndex < TIMETABLE_DAYS.length - 1 ? 'border-b border-[#e6e1d9]/50 dark:border-[#38332c]/50' : ''} ${hour.lunchBefore ? 'border-l border-l-[#8b7355]/20' : ''}`}
                                        >
                                            <select
                                                value={entry?.classId ?? ''}
                                                onChange={e => {
                                                    if (e.target.value === '__create__') {
                                                        setPendingCreate({ day: day.value, slot: hour.index, span });
                                                        e.target.value = entry?.classId ?? '';
                                                        return;
                                                    }
                                                    if (merged) assignRun(day.value, hour.index, span, e.target.value || null);
                                                    else assign(day.value, hour.index, e.target.value || null);
                                                }}
                                                title={classInfo ? `${subjectLabel(classInfo.subject)} · ${classLabel(classInfo.name)}` : undefined}
                                                className={`h-9 sm:h-11 w-full cursor-pointer rounded-lg border px-1 text-center text-[10px] sm:text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b7355]/30 ${
                                                    classInfo && color
                                                    ? `${color.border} ${color.bg} text-transparent shadow-xs hover:-translate-y-0.5 hover:shadow-sm hover:brightness-105 active:scale-[0.99]`
                                                    : 'border-[#e6e1d9] bg-white text-[#8c827a] shadow-[0_1px_2px_rgba(44,42,38,0.04)] hover:border-[#8b7355]/50 hover:bg-[#faf8f5] dark:border-[#38332c] dark:bg-[#1f1d1a] dark:text-[#a8a199] dark:hover:bg-[#27231e]'
                                                }`}
                                                aria-label={`${t(`schedule.day.${day.value}`)} ${hourLabel(hour.startMin, hour.endMin)}${classInfo ? `, ${classLabel(classInfo.name)}` : ''}${merged ? ` (${t('schedule.mergedSession', { count: span })})` : ''}`}
                                            >
                                                <option value="" className="text-[#8c827a] dark:text-[#a8a199] dark:bg-[#1f1d1a]">{t('schedule.noClass')}</option>
                                                {classes.map(c => (
                                                    <option key={c.id} value={c.id} className="text-[#2c2a26] dark:text-[#f3efe8] dark:bg-[#1f1d1a]">
                                                        {subjectLabel(c.subject)} · {classLabel(c.name)}
                                                    </option>
                                                ))}
                                                {canCreateFromSchedule && (
                                                    <option value="__create__" className="text-[#8b7355] font-bold dark:bg-[#1f1d1a]">
                                                        ＋ {t('schedule.createClass')}
                                                    </option>
                                                )}
                                            </select>
                                            {classInfo && color && (
                                                <span
                                                    className={`pointer-events-none absolute inset-0.5 sm:inset-1 flex min-w-0 flex-col items-center justify-center px-0.5 text-center ${color.text}`}
                                                >
                                                    <span className="max-w-full truncate text-[10px] font-bold tracking-tight sm:text-[11.5px]">
                                                        {abbreviateClassName(formatLocalizedClassDisplayName(classInfo.name, locale, { includeClassPrefix: false }))}
                                                    </span>
                                                    <span className={`mt-0.5 max-w-full truncate text-[7.5px] sm:text-[8.5px] font-semibold uppercase tracking-wider ${color.subtext}`}>
                                                        {subjectLabel(classInfo.subject)}
                                                    </span>
                                                </span>
                                            )}
                                            {merged && (
                                                <span className="pointer-events-none absolute start-1 sm:start-1.5 top-0.5 sm:top-1 rounded-full border border-white/40 bg-black/35 px-1 py-0.2 text-[7px] sm:text-[8px] font-bold leading-none text-white shadow-2xs">
                                                    {t('schedule.hoursShort', { count: span })}
                                                </span>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>

                {/* Récapitulatif neutre : les avertissements restent uniquement en haut. */}
                <div className="flex flex-wrap gap-2 pt-1">
                {classes.map(c => {
                    const { hours, sessions } = weeklyStats(c.id);
                    return (
                        <span
                            key={c.id}
                            className="settings-surface inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-foreground"
                        >
                            <span className={`h-2.5 w-2.5 rounded-full ${colorFor(c.id).dot}`} />
                            {classLabel(c.name)}
                            <span className="text-muted-foreground font-medium">
                                · {t('schedule.sessionsPerWeek', { count: sessions, plural: sessions > 1 && locale !== 'ar' ? 's' : ''})}
                                {hours !== sessions ? ` (${t('schedule.hoursShort', { count: hours })})` : ''}
                            </span>
                        </span>
                    );
                })}
                </div>
            </section>
            {/* Création de classe DEPUIS la grille : la classe naît et se pose
                aussitôt sur le créneau qui l'a demandée. */}
            {onCreateClass && (
                <CreateClassModal
                    isOpen={pendingCreate !== null}
                    onClose={() => setPendingCreate(null)}
                    onCreate={details => {
                        if (!pendingCreate) return;
                        const created = onCreateClass(details);
                        if (pendingCreate.span > 1) assignRun(pendingCreate.day, pendingCreate.slot, pendingCreate.span, created.id);
                        else assign(pendingCreate.day, pendingCreate.slot, created.id);
                        setPendingCreate(null);
                    }}
                    defaultCycle={config.selectedCycles?.[0] ?? 'lycee'}
                    teacherSubjects={config.selectedSubjects}
                    teacherCycles={config.selectedCycles}
                    existingClasses={classes}
                />
            )}
        </div>
    );
};

