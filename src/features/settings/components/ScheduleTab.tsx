import React from 'react';
import { toast } from 'sonner';
import { AppConfig, ClassInfo, Cycle } from '@/types';
import { CreateClassModal } from '@/features/dashboard/modals/CreateClassModal';
import { getBundledCalendar, getEffectiveSchoolYear, todayInMorocco } from '@/domain/calendar/calendar';
import { SUBJECT_ABBREV_MAP, formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
import { scheduleClassLabel } from '@/domain/classes/classAbbreviation';
import { classIdentityFor } from '@/domain/classes/classIdentity';
import { classColorAttributes } from '@/domain/classes/classColors';
import { useShowsSubjectLabels } from '@/contexts/SubjectScopeContext';
import {
    TIMETABLE_DAYS,
    deriveSchedules,
    getHourSlots,
    getDaySlotRuns,
    getTimetableEntry,
    setTimetableEntry,
} from '@/domain/calendar/timetable';
import { useLocale } from '@/i18n/LocaleProvider';
import { KEEP_TONES } from '@/platform/keepTheme';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ChevronDown, Plus } from '@/components/ui/icons';
import './schedule.css';

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
    const yearStartId = React.useId();
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
    const hasSchedule = timetable.length > 0 || Boolean(config.schoolYearStart);
    // Keep the date visible while the first timetable is being prepared.
    const [startDateOpen, setStartDateOpen] = React.useState(() => !hasSchedule);
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

    const colorFor = (classId: string): ModernClassColor => {
        const item = classById.get(classId);
        const tone = item ? classColorAttributes(item)['data-keep-tone'] : 'sand';
        return KEEP_SCHEDULE_PALETTE[tone as typeof KEEP_TONES[number]];
    };
    /**
     * Libellé de matière : affiché **seulement** si l'enseignant couvre
     * plusieurs matières (règle partagée, calculée dans `App`). Avec une seule,
     * il répéterait la même ligne dans toutes les cases et volerait la hauteur
     * du nom de classe — l'information reste disponible dans l'info-bulle et le
     * libellé accessible du créneau.
     */
    const showSubjectLabels = useShowsSubjectLabels();
    const assign = (day: number, slot: number, classId: string | null) => {
        const nextTimetable = setTimetableEntry(timetable, day, slot, classId);
        onChange({ timetable: nextTimetable, schedules: deriveSchedules(nextTimetable) });
        if (classId) {
            const target = classes.find(c => c.id === classId);
            const name = target ? classLabel(target.name) : '';
            toast.success(
                t('schedule.toast.slotSaved', { name }),
                { id: 'schedule-slot-update', duration: 2200 }
            );
        } else {
            toast.info(
                t('schedule.toast.slotCleared'),
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
                t('schedule.toast.sessionSaved', { hours, name }),
                { id: 'schedule-slot-update', duration: 2200 }
            );
        } else {
            toast.info(
                t('schedule.toast.sessionCleared'),
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
            t('schedule.toast.startDateUpdated'),
            { id: 'schedule-year-start', duration: 2200 }
        );
    };

    // ZÉRO classe ≠ blocage : la grille reste affichée, les classes se créent
    // directement depuis les cases (« + Créer une classe… »). On encourage.
    const noClassesYet = classes.length === 0;
    // Dès qu'une classe existe, la grille sert à FINIR sa configuration : on
    // évite de répéter « créer une classe » dans chacune des 48 cases.
    const canCreateFromSchedule = !!onCreateClass && noClassesYet;
    const periodTabItems: { id: SchedulePeriod; label: string }[] = React.useMemo(() => [
        { id: 'morning', label: t('schedule.viewMorning') },
        { id: 'afternoon', label: t('schedule.viewAfternoon') },
        { id: 'all', label: t('schedule.viewAll') },
    ], [t]);

    if (noClassesYet && !onCreateClass) {
        return (
            <p className="px-1 py-2 text-center text-sm text-muted-foreground">
                {t('schedule.empty')}
            </p>
        );
    }

    return (
        <Tabs value={visiblePeriod} onValueChange={value => setVisiblePeriod(value as SchedulePeriod)} className="schedule-tab space-y-3 pb-1 sm:pb-2">
            <div className="schedule-controls">
              <div className="schedule-controls__row">
                <div className="schedule-periods">
                    <span className="schedule-periods__label">{t('schedule.periodLabel')} :</span>
                    <TabsList aria-label={t('schedule.viewLabel')} className="w-full sm:w-auto h-auto p-1 bg-muted/60 border border-border/40">
                        {periodTabItems.map(item => (
                            <TabsTrigger key={item.id} value={item.id} className="text-xs min-h-11 px-2.5 sm:px-3">
                                {item.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>
                <button type="button" className="schedule-date-toggle" aria-expanded={startDateOpen}
                  aria-controls={`${yearStartId}-date-settings`} onClick={() => setStartDateOpen(value => !value)}>
                    <span>{t(hasSchedule ? 'schedule.startYearChange' : 'schedule.startYearSet')}</span>
                    <ChevronDown size={13} strokeWidth={1.5} className="schedule-date-settings__chevron" aria-hidden="true" />
                </button>
              </div>
                {startDateOpen && <div id={`${yearStartId}-date-settings`} className="schedule-start-field flex min-w-0 items-center gap-2">
                    <label htmlFor={yearStartId}>{t('schedule.startYear')}</label>
                    <div className="schedule-start-field__input relative">
                        <Input
                            id={yearStartId}
                            type="date"
                            value={schoolYearStart}
                            onChange={e => setSchoolYearStart(e.target.value)}
                            lang={locale === 'ar' ? 'ar-MA-u-nu-latn' : locale === 'en' ? 'en-GB' : 'fr-MA'}
                            dir="ltr"
                            className={`h-11 w-full min-w-0 rounded-lg border border-border bg-card px-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/25 ${locale === 'ar' ? 'text-transparent' : 'text-foreground'}`}
                        />
                        {locale === 'ar' && (
                            <span
                                aria-hidden
                                dir="ltr"
                                className="pointer-events-none absolute inset-y-0 left-2.5 right-9 flex items-center text-sm font-medium text-foreground"
                            >
                                {displaySchoolYearStart}
                            </span>
                        )}
                    </div>
                </div>}
            </div>

            {noClassesYet && (
                <p className="-mt-1 text-xs font-semibold text-primary">{t('schedule.emptyHint')}</p>
            )}

            {/* Grille jours × créneaux : tuiles séparées, arrondies, détachées du fond */}
            <TabsContent value={visiblePeriod} className="mt-0">
                <div className="overflow-x-auto overscroll-x-contain">
                    <table aria-label={t('settings.item.schedule')} className={`schedule-grid rtl-table w-full border-separate border-spacing-1 sm:border-spacing-1.5 lg:border-spacing-2 text-xs sm:text-sm ${visiblePeriod === 'all' ? 'min-w-[34rem] sm:min-w-[42rem] lg:min-w-full lg:table-fixed' : 'min-w-full table-fixed'}`}>
                    <thead>
                        <tr>
                            <th scope="col" className={`schedule-grid__day-heading sticky ${locale === 'ar' ? 'right-0' : 'left-0'} z-20 w-16 sm:w-20 lg:w-28 xl:w-32 rounded-xl px-2 sm:px-3 py-2.5 sm:py-3 text-center text-muted-foreground`}>
                                {t('schedule.day')}
                            </th>
                            {visibleHourSlots.map(hour => (
                                <th
                                    key={hour.index}
                                    scope="col"
                                    aria-label={hourLabel(hour.startMin, hour.endMin)}
                                    className={`schedule-grid__hour rounded-xl px-1 sm:px-2 py-2 sm:py-3 text-center text-muted-foreground ${
                                        hour.lunchBefore ? 'border-s-2 border-s-primary/30' : ''
                                    }`}
                                >
                                        <span dir="ltr" aria-hidden="true" className="schedule-hour-label"><span>{clockPart(hour.startMin)}</span><span className="schedule-hour-separator">–</span><span>{clockPart(hour.endMin)}</span></span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {TIMETABLE_DAYS.map(day => {
                            return (
                                <tr key={day.value} className="group transition-colors">
                                    <th scope="row" className={`schedule-grid__day sticky ${locale === 'ar' ? 'right-0' : 'left-0'} z-10 rounded-xl border border-border/70 bg-card px-1.5 sm:px-3 py-2 text-center whitespace-nowrap text-foreground`}>
                                        {t(`schedule.day.${day.value}`)}
                                    </th>
                                    {visibleHourSlots.map(hour => {
                                        const run = runsByDay.get(day.value)?.get(hour.index);
                                        if (run && !run.isStart) return null;
                                        const merged = !!run && run.hours > 1;
                                        const span = run ? run.hours : 1;
                                        const entry = getTimetableEntry(timetable, day.value, hour.index);
                                        const classInfo = entry ? classById.get(entry.classId) : undefined;
                                        const color = entry ? colorFor(entry.classId) : null;
                                        const appearance = classInfo ? classColorAttributes(classInfo) : {};

                                        return (
                                            <td
                                                key={hour.index}
                                                colSpan={span}
                                                {...appearance}
                                                className={`schedule-cell ${classInfo ? 'schedule-cell--assigned' : 'schedule-cell--empty'} relative overflow-hidden rounded-xl border p-0 align-middle transition-shadow ${
                                                    classInfo
                                                        ? 'border-black/5 shadow-xs dark:border-white/5'
                                                        : 'border-dashed border-border/80'
                                                } ${
                                                    hour.lunchBefore ? 'border-s-2 border-s-primary/30' : ''
                                                }`}
                                            >
                                                <div className="schedule-cell__content relative h-14 lg:h-16 xl:h-[4.25rem] w-full">
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
                                                        className={`h-full w-full cursor-pointer appearance-none border-0 text-center text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 ${
                                                            classInfo && color
                                                                ? `${color.bg} text-transparent hover:brightness-95 active:brightness-90`
                                                                : 'bg-transparent text-transparent'
                                                        }`}
                                                        aria-label={`${t(`schedule.day.${day.value}`)} ${hourLabel(hour.startMin, hour.endMin)}, ${classInfo ? classLabel(classInfo.name) : t('schedule.noClass')}${merged ? ` (${t('schedule.mergedSession', { count: span })})` : ''}`}
                                                    >
                                                        <option value="" className="text-muted-foreground bg-card">{t('schedule.noClass')}</option>
                                                        {classes.map(c => (
                                                            <option key={c.id} value={c.id} className="text-foreground bg-card">
                                                                {subjectLabel(c.subject)} · {classLabel(c.name)}
                                                            </option>
                                                        ))}
                                                        {canCreateFromSchedule && (
                                                            <option value="__create__" className="text-primary font-bold bg-card">
                                                                ＋ {t('schedule.createClass')}
                                                            </option>
                                                        )}
                                                    </select>

                                                    {/* État vide : une pastille discrète, sans bruit textuel */}
                                                    {!classInfo && (
                                                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center select-none">
                                                            <Plus size={15} className="schedule-cell__add" aria-hidden="true" />
                                                        </div>
                                                    )}

                                                    {/* État assigné : carte pleine sans bords arrondis excessifs, sans badge, typographie nette */}
                                                    {classInfo && color && (
                                                        <div
                                                            className={`pointer-events-none absolute inset-0 flex min-w-0 flex-col items-center justify-center px-1 text-center ${color.text}`}
                                                        >
                                                            <span className="schedule-cell__label max-w-full break-words whitespace-normal text-balance font-semibold leading-tight">
                                                                {scheduleClassLabel(classIdentityFor(classInfo.name, locale), locale, true)}
                                                            </span>
                                                            {showSubjectLabels && (
                                                                <span className={`mt-0.5 max-w-full truncate text-[10px] xl:text-[11px] font-semibold uppercase tracking-wider ${color.subtext}`}>
                                                                    {subjectLabel(classInfo.subject)}
                                                                </span>
                                                            )}
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
            </TabsContent>
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
        </Tabs>
    );
};
