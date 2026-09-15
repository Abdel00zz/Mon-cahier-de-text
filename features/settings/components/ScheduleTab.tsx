import React from 'react';
import { toast } from 'sonner';
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

/** Palette synchronisée avec les cartes de classes - teintes foncées, riches et attractives */
export const KEEP_SCHEDULE_PALETTE: Record<typeof KEEP_TONES[number], ModernClassColor> = {
    sand: {
        key: 'sand',
        bg: 'bg-[#fde68a] dark:bg-[#451a03]/90',
        border: 'border-[#d97706] dark:border-[#b45309]',
        text: 'text-[#78350f] dark:text-[#fef3c7]',
        subtext: 'text-[#92400e] dark:text-[#fde68a]',
        dot: 'bg-[#d97706]',
    },
    mint: {
        key: 'mint',
        bg: 'bg-[#a7f3d0] dark:bg-[#064e3b]/90',
        border: 'border-[#059669] dark:border-[#10b981]',
        text: 'text-[#064e3b] dark:text-[#ecfdf5]',
        subtext: 'text-[#047857] dark:text-[#a7f3d0]',
        dot: 'bg-[#059669]',
    },
    sky: {
        key: 'sky',
        bg: 'bg-[#bae6fd] dark:bg-[#0c4a6e]/90',
        border: 'border-[#0284c7] dark:border-[#38bdf8]',
        text: 'text-[#082f49] dark:text-[#f0f9ff]',
        subtext: 'text-[#0369a1] dark:text-[#bae6fd]',
        dot: 'bg-[#0284c7]',
    },
    lavender: {
        key: 'lavender',
        bg: 'bg-[#ddd6fe] dark:bg-[#3b0764]/90',
        border: 'border-[#7c3aed] dark:border-[#a78bfa]',
        text: 'text-[#3b0764] dark:text-[#f5f3ff]',
        subtext: 'text-[#6d28d9] dark:text-[#ddd6fe]',
        dot: 'bg-[#7c3aed]',
    },
    coral: {
        key: 'coral',
        bg: 'bg-[#fecdd3] dark:bg-[#4c0519]/90',
        border: 'border-[#e11d48] dark:border-[#fb7185]',
        text: 'text-[#4c0519] dark:text-[#fff1f2]',
        subtext: 'text-[#be123c] dark:text-[#fecdd3]',
        dot: 'bg-[#e11d48]',
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

    const assign = (day: number, slot: number, classId: string | null) => {
        const nextTimetable = setTimetableEntry(timetable, day, slot, classId);
        onChange({ timetable: nextTimetable, schedules: deriveSchedules(nextTimetable) });
        if (classId) {
            const target = classes.find(c => c.id === classId);
            const name = target ? classLabel(target.name) : '';
            toast.success(
                locale === 'ar' ? `تم تسجيل الحصة : ${name}` : `Créneau enregistré : ${name}`,
                { id: 'schedule-slot-update', duration: 2200 }
            );
        } else {
            toast.info(
                locale === 'ar' ? 'تم تفريغ الحصة' : 'Créneau libéré',
                { id: 'schedule-slot-update', duration: 2000 }
            );
        }
    };

    // séance fusionnée (2 h+) : la cellule unique pilote TOUTES ses heures d'un coup
    const assignRun = (day: number, startSlot: number, hours: number, classId: string | null) => {
        let next = timetable;
        for (let slot = startSlot; slot < startSlot + hours; slot++) {
            next = setTimetableEntry(next, day, slot, classId);
        }
        onChange({ timetable: next, schedules: deriveSchedules(next) });
        if (classId) {
            const target = classes.find(c => c.id === classId);
            const name = target ? classLabel(target.name) : '';
            toast.success(
                locale === 'ar' ? `تم تسجيل الحصة (${hours} س) : ${name}` : `Séance de ${hours}h enregistrée : ${name}`,
                { id: 'schedule-slot-update', duration: 2200 }
            );
        } else {
            toast.info(
                locale === 'ar' ? 'تم تفريغ الحصص' : 'Créneaux libérés',
                { id: 'schedule-slot-update', duration: 2000 }
            );
        }
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

    const setSchoolYearStart = (value: string) => {
        onChange({ schoolYearStart: value || undefined });
        toast.success(
            locale === 'ar' ? 'تم تحديث تاريخ بداية السنة' : 'Date de rentrée mise à jour',
            { id: 'schedule-year-start', duration: 2200 }
        );
    };

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

    const periodTabItems: FluidTabItem<SchedulePeriod>[] = React.useMemo(() => [
        { id: 'morning', label: t('schedule.viewMorning') },
        { id: 'afternoon', label: t('schedule.viewAfternoon') },
        { id: 'all', label: t('schedule.viewAll') },
    ], [t]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex shrink-0 items-center gap-2.5" aria-label={t('schedule.startYear')}>
                    <label className="text-xs lg:text-sm font-bold text-foreground/80">{t('schedule.startYear')}</label>
                    <div className="relative">
                        <input
                            type="date"
                            value={schoolYearStart}
                            onChange={e => setSchoolYearStart(e.target.value)}
                            lang={locale === 'ar' ? 'ar-MA-u-nu-latn' : locale === 'en' ? 'en-GB' : 'fr-MA'}
                            dir="ltr"
                            className={`h-9 lg:h-10 rounded-md border border-border/70 bg-background/80 px-3 text-xs lg:text-sm font-semibold shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary/25 ${locale === 'ar' ? 'text-transparent' : 'text-foreground'}`}
                        />
                        {locale === 'ar' && (
                            <span
                                aria-hidden
                                dir="ltr"
                                className="pointer-events-none absolute inset-y-0 left-3 right-10 flex items-center text-xs lg:text-sm font-bold text-foreground"
                            >
                                {displaySchoolYearStart}
                            </span>
                        )}
                    </div>
                </div>
                <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                    <FluidTabRail<SchedulePeriod>
                        items={periodTabItems}
                        activeId={visiblePeriod}
                        onChange={setVisiblePeriod}
                        layoutId="schedule-period-subpill"
                        size="sm"
                        ariaLabel={t('schedule.viewLabel')}
                        className="w-max mx-auto sm:mx-0"
                        tabClassName="text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-2.5"
                    />
                </div>
            </div>

            {noClassesYet && (
                <p className="-mt-1 text-xs font-semibold text-primary">{t('schedule.emptyHint')}</p>
            )}

            {/* Grille jours × créneaux : tracé direct du tableau, sans boîte englobante */}
            <div className="overflow-x-auto overscroll-x-contain">
                <table className={`rtl-table w-full border-separate border-spacing-0 border border-[#c4bcaf] bg-white text-xs sm:text-sm dark:border-[#38332c] dark:bg-[#181614] ${visiblePeriod === 'all' ? 'min-w-[34rem] sm:min-w-[42rem] lg:min-w-full lg:table-fixed' : 'min-w-full table-fixed'}`}>
                    <thead>
                        <tr>
                            <th className={`sticky ${locale === 'ar' ? 'right-0 border-l' : 'left-0 border-r'} z-20 w-16 sm:w-20 lg:w-28 xl:w-32 border-b border-[#c4bcaf] bg-[#eeeae3] px-2 sm:px-3 py-2.5 sm:py-3 text-center text-[11px] sm:text-xs lg:text-sm font-bold tracking-wide text-[#2e2a25] dark:border-[#38332c] dark:bg-[#1e1b18] dark:text-[#ede6dc]`}>
                                {t('schedule.day')}
                            </th>
                            {visibleHourSlots.map((hour, idx) => {
                                const isLast = idx === visibleHourSlots.length - 1;
                                return (
                                    <th
                                        key={hour.index}
                                        className={`border-b border-[#c4bcaf] bg-[#eeeae3] px-1 sm:px-2 py-2 sm:py-3 text-center text-[9px] sm:text-xs lg:text-[13px] font-bold text-[#2e2a25] dark:border-[#38332c] dark:bg-[#1e1b18] dark:text-[#ede6dc] ${
                                            locale === 'ar'
                                                ? (isLast ? '' : 'border-l border-[#c4bcaf] dark:border-[#38332c]')
                                                : (isLast ? '' : 'border-r border-[#c4bcaf] dark:border-[#38332c]')
                                        } ${
                                            hour.lunchBefore
                                                ? (locale === 'ar' ? '!border-r-2 !border-r-[#8b7355]/60' : '!border-l-2 !border-l-[#8b7355]/60')
                                                : ''
                                        }`}
                                    >
                                        <span dir="ltr" className="inline-block leading-tight font-semibold tracking-tight">{hourLabel(hour.startMin, hour.endMin)}</span>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {TIMETABLE_DAYS.map((day, dayIndex) => {
                            const isLastRow = dayIndex === TIMETABLE_DAYS.length - 1;
                            return (
                                <tr key={day.value} className="group transition-colors">
                                    <td className={`sticky ${locale === 'ar' ? 'right-0 border-l' : 'left-0 border-r'} z-10 ${
                                        isLastRow ? '' : 'border-b border-[#c4bcaf] dark:border-[#38332c]'
                                    } border-[#c4bcaf] bg-[#f7f4ee] px-2 sm:px-3 py-2 text-center text-[11px] sm:text-xs lg:text-sm font-bold text-[#262420] transition-colors group-hover:bg-[#eee9df] dark:border-[#38332c] dark:bg-[#1b1916] dark:text-[#f3eee7] dark:group-hover:bg-[#23201c]`}>
                                        {t(`schedule.day.${day.value}`)}
                                    </td>
                                    {visibleHourSlots.map((hour, idx) => {
                                        const run = runsByDay.get(day.value)?.get(hour.index);
                                        if (run && !run.isStart) return null;
                                        const merged = !!run && run.hours > 1;
                                        const span = run ? run.hours : 1;
                                        const entry = getTimetableEntry(timetable, day.value, hour.index);
                                        const classInfo = entry ? classById.get(entry.classId) : undefined;
                                        const color = entry ? colorFor(entry.classId) : null;
                                        const isLastCol = idx + span - 1 >= visibleHourSlots.length - 1;

                                        return (
                                            <td
                                                key={hour.index}
                                                colSpan={span}
                                                className={`relative p-0 align-middle ${
                                                    isLastRow ? '' : 'border-b border-[#c4bcaf] dark:border-[#38332c]'
                                                } ${
                                                    locale === 'ar'
                                                        ? (isLastCol ? '' : 'border-l border-[#c4bcaf] dark:border-[#38332c]')
                                                        : (isLastCol ? '' : 'border-r border-[#c4bcaf] dark:border-[#38332c]')
                                                } ${
                                                    hour.lunchBefore
                                                        ? (locale === 'ar' ? '!border-r-2 !border-r-[#8b7355]/60' : '!border-l-2 !border-l-[#8b7355]/60')
                                                        : ''
                                                }`}
                                            >
                                                <div className="relative h-12 sm:h-14 lg:h-16 xl:h-[4.25rem] w-full">
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
                                                        className={`h-full w-full cursor-pointer appearance-none rounded-none border-0 text-center text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#8b7355]/40 ${
                                                            classInfo && color
                                                                ? `${color.bg} text-transparent hover:brightness-95 active:brightness-90`
                                                                : 'bg-white text-[#9c9389] hover:bg-[#faf7f2] dark:bg-[#181614] dark:text-[#787169] dark:hover:bg-[#201e1a]'
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

                                                    {/* État vide : centré, sobre, sans chevron encombrant */}
                                                    {!classInfo && (
                                                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10.5px] sm:text-xs lg:text-[13px] font-normal text-[#9c9389] dark:text-[#787169] tracking-wide">
                                                            {t('schedule.noClass')}
                                                        </div>
                                                    )}

                                                    {/* État assigné : carte pleine sans bords arrondis excessifs, sans badge, typographie nette */}
                                                    {classInfo && color && (
                                                        <div
                                                            className={`pointer-events-none absolute inset-0 flex min-w-0 flex-col items-center justify-center px-1 text-center ${color.text}`}
                                                        >
                                                            <span className="max-w-full truncate text-[11px] sm:text-xs lg:text-sm xl:text-[15px] font-bold tracking-tight leading-snug">
                                                                {abbreviateClassName(formatLocalizedClassDisplayName(classInfo.name, locale, { includeClassPrefix: false }))}
                                                            </span>
                                                            <span className={`mt-0.5 max-w-full truncate text-[8px] sm:text-[9px] lg:text-[10px] xl:text-[11px] font-semibold uppercase tracking-wider ${color.subtext}`}>
                                                                {subjectLabel(classInfo.subject)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
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

