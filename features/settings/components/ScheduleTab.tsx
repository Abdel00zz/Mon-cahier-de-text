import React from 'react';
import { toast } from 'sonner';
import { AppConfig, ClassInfo, Cycle } from '@/types';
import { CreateClassModal } from '@/features/dashboard/modals/CreateClassModal';
import { getBundledCalendar, getEffectiveSchoolYear, todayInMorocco } from '@/utils/calendar';
import { SUBJECT_ABBREV_MAP, formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
import { scheduleClassLabel } from '@/utils/classAbbreviation';
import { classIdentityFor } from '@/utils/classIdentity';
import { classBranchToneFor } from '@/utils/classBranchTone';
import {
    TIMETABLE_DAYS,
    deriveSchedules,
    getHourSlots,
    getDaySlotRuns,
    getTimetableEntry,
    setTimetableEntry,
} from '@/utils/timetable';
import { useLocale } from '@/i18n/LocaleProvider';
import { KEEP_TONES } from '@/utils/keepTheme';
import { FluidTabRail, FluidTabItem } from '@/components/ui/FluidTabRail';

export interface ModernClassColor {
    key: string;
    bg: string;
    border: string;
    text: string;
    subtext: string;
    dot: string;
}

/**
 * Cellules d'emploi du temps : la **même teinte que la carte de classe**, un
 * cran plus soutenue. Les couleurs viennent des jetons du ton (`index.css` :
 * `--keep-cell`, `--keep-cell-ink`, `--keep-accent`), donc une carte et sa case
 * d'emploi du temps ne peuvent plus diverger — et le mode sombre suit seul.
 * Le contraste des libellés est celui de l'accent AA du ton.
 */
const SCHEDULE_CELL_CLASSES: Omit<ModernClassColor, 'key'> = {
    bg: 'bg-[var(--keep-cell)]',
    border: 'border-[var(--keep-accent)]',
    text: 'text-[var(--keep-cell-ink)]',
    subtext: 'text-[var(--keep-cell-ink)]',
    dot: 'bg-[var(--keep-accent)]',
};

export const KEEP_SCHEDULE_PALETTE: Record<typeof KEEP_TONES[number], ModernClassColor> = Object.fromEntries(
    KEEP_TONES.map(tone => [tone, { ...SCHEDULE_CELL_CLASSES, key: tone }]),
) as Record<typeof KEEP_TONES[number], ModernClassColor>;

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
     * Teinte du ton : **la même que la carte de classe** (`classBranchToneFor`),
     * pour qu'une classe ne change jamais de couleur d'une vue à l'autre.
     */
    const toneFor = React.useCallback((classId: string): typeof KEEP_TONES[number] => {
        const classInfo = classById.get(classId);
        return classBranchToneFor(classIdentityFor(classInfo?.name ?? classId, locale));
    }, [classById, locale]);

    const colorFor = React.useCallback((classId: string): ModernClassColor => {
        const tone = toneFor(classId);
        return KEEP_SCHEDULE_PALETTE[tone] || KEEP_SCHEDULE_PALETTE.sand;
    }, [toneFor]);

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
                            className={`h-9 lg:h-10 rounded-md border border-border bg-card px-3 text-xs lg:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/25 ${locale === 'ar' ? 'text-transparent' : 'text-foreground'}`}
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
                                        const tone = entry ? toneFor(entry.classId) : null;
                                        const isLastCol = idx + span - 1 >= visibleHourSlots.length - 1;

                                        return (
                                            <td
                                                key={hour.index}
                                                colSpan={span}
                                                data-keep-tone={tone ?? undefined}
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
                                                                : 'bg-white text-transparent hover:bg-[#faf7f2] dark:bg-[#181614] dark:hover:bg-[#201e1a]'
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

                                                    {/* État vide : centré, sobre, sans chevron encombrant ni bruit textuel */}
                                                    {!classInfo && (
                                                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs sm:text-sm font-light text-stone-300 dark:text-stone-600 select-none group-hover:text-stone-400">
                                                            —
                                                        </div>
                                                    )}

                                                    {/* État assigné : carte pleine sans bords arrondis excessifs, sans badge, typographie nette */}
                                                    {classInfo && color && (
                                                        <div
                                                            className={`pointer-events-none absolute inset-0 flex min-w-0 flex-col items-center justify-center px-1 text-center ${color.text}`}
                                                        >
                                                            <span className="max-w-full truncate text-[11px] sm:text-xs lg:text-sm xl:text-[15px] font-bold tracking-tight leading-snug">
                                                                {scheduleClassLabel(classIdentityFor(classInfo.name, locale), locale)}
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

