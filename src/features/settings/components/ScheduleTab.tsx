import React from 'react';
import { toast } from 'sonner';
import { AppConfig, ClassInfo, Cycle } from '@/types';
import { CreateClassModal } from '@/features/dashboard/modals/CreateClassModal';
import { SUBJECT_ABBREV_MAP, formatLocalizedSubjectDisplayName } from '@/constants';
import { scheduleClassLabel } from '@/domain/classes/classAbbreviation';
import { classIdentityFor } from '@/domain/classes/classIdentity';
import { resolveDashboardClassOrder } from '@/domain/classes/classOrder';
import { teachesSeveralSubjects } from '@/domain/classes/subjectScope';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus } from '@/components/ui/icons';
import { buildUnifiedClassPaletteMap } from '@/features/dashboard/departmentPalette';
import './schedule.css';

interface ScheduleTabProps {
    classes: ClassInfo[];
    suggestedClassId?: string;
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

export const ScheduleTab: React.FC<ScheduleTabProps> = ({ classes, config, onChange, onCreateClass, suggestedClassId }) => {
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
        return `${hour}:${minute}`;
    };
    const hourLabel = (startMin: number, endMin: number) => `${clockPart(startMin)}–${clockPart(endMin)}`;
    const classLabel = (name: string) => scheduleClassLabel(classIdentityFor(name, locale), locale);
    const subjectLabel = (subject: string) => locale === 'ar'
        ? formatLocalizedSubjectDisplayName(subject, locale)
        : (SUBJECT_ABBREV_MAP[subject] || subject);
    const timetable = config.timetable ?? [];
    const suggestedClass = classes.find(item => item.id === suggestedClassId);
    const pickerClasses = React.useMemo(() => suggestedClass
        ? [suggestedClass, ...classes.filter(item => item.id !== suggestedClass.id)] : classes, [classes, suggestedClass]);
    // créneau en attente d'une NOUVELLE classe (option « + Créer une classe… »)
    const [pendingCreate, setPendingCreate] = React.useState<{ day: number; slot: number } | null>(null);
    // Le matin est la vue initiale la plus rapide à lire, quel que soit
    // l'écran. L'enseignant peut basculer instantanément vers l'après-midi
    // ou la journée complète sans recharger la grille.
    const [visiblePeriod, setVisiblePeriod] = React.useState<SchedulePeriod>(() => {
        if (!suggestedClassId) return 'morning';
        const slots = timetable.filter(slot => slot.classId === suggestedClassId);
        if (!slots.some(slot => slot.slot >= 4)) return 'morning';
        return slots.some(slot => slot.slot < 4) ? 'all' : 'afternoon';
    });

    const classById = React.useMemo(() => {
        const map = new Map<string, ClassInfo>();
        classes.forEach(c => map.set(c.id, c));
        return map;
    }, [classes]);

    const paletteByClassId = React.useMemo(() => {
        return buildUnifiedClassPaletteMap(classes, resolveDashboardClassOrder(classes, config.dashboardClassOrder));
    }, [classes, config.dashboardClassOrder]);
    /**
     * Libellé de matière : affiché **seulement** si l'enseignant couvre
     * au moins deux matières (`>= 2`). Avec une seule matière, on n'affiche
     * pas le nom de la matière dans la cellule ni dans le sélecteur pour ne
     * pas répéter la même information dans toutes les cases.
     */
    const contextShowsSubjectLabels = useShowsSubjectLabels();
    const hasMultipleSubjects = React.useMemo(
        () => teachesSeveralSubjects(classes, config.defaultTeacherName, config.selectedSubjects),
        [classes, config.defaultTeacherName, config.selectedSubjects],
    );
    const showSubjectLabels = contextShowsSubjectLabels && hasMultipleSubjects;
    const assign = (day: number, slot: number, classId: string | null, createdName?: string) => {
        const nextTimetable = setTimetableEntry(timetable, day, slot, classId);
        onChange({ timetable: nextTimetable, schedules: deriveSchedules(nextTimetable) });
        if (classId) {
            const target = classes.find(c => c.id === classId);
            const name = classLabel(createdName ?? target?.name ?? '');
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
        <Tabs dir={locale === 'ar' ? 'rtl' : 'ltr'} value={visiblePeriod} onValueChange={value => setVisiblePeriod(value as SchedulePeriod)} className="schedule-tab">
            <div className="schedule-periods">
                <span className="sr-only">{t('schedule.periodLabel')}</span>
                <TabsList aria-label={t('schedule.viewLabel')}>
                    {periodTabItems.map(item => (
                        <TabsTrigger key={item.id} value={item.id}>{item.label}</TabsTrigger>
                    ))}
                </TabsList>
            </div>

            {suggestedClass && !timetable.some(slot => slot.classId === suggestedClass.id) && (
                <p className="text-sm text-foreground" role="status"><strong><bdi>{classLabel(suggestedClass.name)}</bdi></strong>
                    {locale === 'ar' ? ' — اختر خانة فارغة ثم اختر القسم.' : locale === 'en' ? ' — Choose an empty slot, then select this class.' : ' — Choisissez une case libre, puis cette classe.'}</p>
            )}
            {noClassesYet && (
                <p className="-mt-1 text-xs font-semibold text-primary">{t('schedule.emptyHint')}</p>
            )}

            <TabsContent value={visiblePeriod} className="schedule-grid-frame mt-0">
                <table dir={locale === 'ar' ? 'rtl' : 'ltr'} aria-label={t('settings.item.schedule')} className="schedule-grid" data-period={visiblePeriod}>
                    <thead>
                        <tr>
                            <th scope="col" className="schedule-grid__day-heading">
                                {t('schedule.day')}
                            </th>
                            {visibleHourSlots.map(hour => (
                                <th
                                    key={hour.index}
                                    scope="col"
                                    aria-label={hourLabel(hour.displayStartMin, hour.displayEndMin)}
                                    className="schedule-grid__hour"
                                    data-lunch={hour.lunchBefore || undefined}
                                >
                                    <span dir="ltr" aria-hidden="true" className="schedule-hour-label"><span>{clockPart(hour.displayStartMin)}</span><span className="schedule-hour-separator">–</span><span>{clockPart(hour.displayEndMin)}</span></span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {TIMETABLE_DAYS.map(day => {
                            return (
                                <tr key={day.value}>
                                    <th scope="row" className="schedule-grid__day">
                                        {t(`schedule.day.${day.value}`)}
                                    </th>
                                    {visibleHourSlots.map(hour => {
                                        const run = runsByDay.get(day.value)?.get(hour.index);
                                        if (run && !run.isStart) return null;
                                        const merged = !!run && run.hours > 1;
                                        const span = run ? run.hours : 1;
                                        const endHour = hourSlots.find(slot => slot.index === hour.index + span - 1) ?? hour;
                                        const entry = getTimetableEntry(timetable, day.value, hour.index);
                                        const classInfo = entry ? classById.get(entry.classId) : undefined;
                                        const palette = classInfo ? paletteByClassId.get(classInfo.id) : undefined;

                                        return (
                                            <td
                                                key={hour.index}
                                                colSpan={span}
                                                style={palette ? {
                                                    '--card-bg': palette.bg,
                                                    '--card-bg2': palette.bg2 ?? palette.bg,
                                                    '--card-border': palette.border,
                                                    '--card-title': palette.title,
                                                } as React.CSSProperties : undefined}
                                                className={`schedule-cell ${classInfo ? 'schedule-cell--assigned' : 'schedule-cell--empty'}`}
                                                data-class-target={classInfo && classInfo.id === suggestedClassId || undefined}
                                                data-lunch={hour.lunchBefore || undefined}
                                            >
                                                <div className="schedule-cell__content">
                                                    <div className="schedule-cell__pickers">
                                                        {hourSlots.slice(hour.index, hour.index + span).map(slot => {
                                                            const range = hourLabel(slot.displayStartMin, slot.displayEndMin);
                                                            const name = classInfo ? classLabel(classInfo.name) : t('schedule.noClass');
                                                            const options = (whole: boolean) => <>
                                                                <option value={whole ? 'whole:' : ''}>{t('schedule.noClass')}</option>
                                                                {pickerClasses.map(c => (
                                                                    <option key={c.id} value={whole ? `whole:${c.id}` : c.id}>
                                                                        {showSubjectLabels ? `${subjectLabel(c.subject)} · ${classLabel(c.name)}` : classLabel(c.name)}
                                                                    </option>
                                                                ))}
                                                            </>;
                                                            return <select key={slot.index}
                                                                value={entry?.classId ?? ''}
                                                                className="schedule-cell__select"
                                                                title={`${range} · ${name}`}
                                                                aria-label={`${t(`schedule.day.${day.value}`)} ${range}, ${name}`}
                                                                onChange={event => {
                                                                    const value = event.currentTarget.value;
                                                                    const group = event.currentTarget.selectedOptions[0]?.parentElement;
                                                                    if (group?.hasAttribute('data-whole-session')) {
                                                                        assignRun(day.value, hour.index, span, value.slice('whole:'.length) || null);
                                                                    } else if (value === '__create__' && canCreateFromSchedule) {
                                                                        setPendingCreate({ day: day.value, slot: slot.index });
                                                                        event.currentTarget.value = '';
                                                                    } else {
                                                                        assign(day.value, slot.index, value || null);
                                                                    }
                                                                }}>
                                                                {merged ? <>
                                                                    <optgroup label={range}>{options(false)}</optgroup>
                                                                    <optgroup data-whole-session label={`${t('schedule.mergedSession', { count: span })} · ${hourLabel(hour.displayStartMin, endHour.displayEndMin)}`}>
                                                                        {options(true)}
                                                                    </optgroup>
                                                                </> : options(false)}
                                                                {canCreateFromSchedule && <option value="__create__">＋ {t('schedule.createClass')}</option>}
                                                            </select>;
                                                        })}
                                                    </div>

                                                    {!classInfo && (
                                                        <Plus size={14} className="schedule-cell__add" aria-hidden="true" />
                                                    )}

                                                    {classInfo && (
                                                        <div className="schedule-cell__details" aria-hidden="true">
                                                            <span className="schedule-cell__label">
                                                                {scheduleClassLabel(classIdentityFor(classInfo.name, locale), locale, true)}
                                                            </span>
                                                            <span className="schedule-cell__meta">
                                                                <span dir="auto">{span} {locale === 'ar' ? 'س' : 'h'}</span>
                                                                {showSubjectLabels && (
                                                                    <span className="schedule-cell__subject">{subjectLabel(classInfo.subject)}</span>
                                                                )}
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
                        assign(pendingCreate.day, pendingCreate.slot, created.id, created.name);
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
