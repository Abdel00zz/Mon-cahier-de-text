import React from 'react';
import { AppConfig, ClassInfo, Cycle } from '@/types';
import { HOUR_SLOTS, TIMETABLE_DAYS, deriveSchedules, getTimetableEntry, setTimetableEntry } from '@/utils/timetable';
import { classColor } from '@/utils/classColor';
import { SUBJECT_ABBREV_MAP, formatClassDisplayName } from '@/constants';
import { useLocale } from '@/i18n/LocaleProvider';

interface TimetableMobileProps {
    classes: ClassInfo[];
    config: AppConfig;
    onChange: (patch: Partial<AppConfig>) => void;
    onCreateClass?: (details: { name: string; subject: string; cycle?: Cycle }) => ClassInfo;
    onRequestCreate?: (slot: { day: number; slot: number; span: number }) => void;
}

export function TimetableMobile({ classes, config, onChange, onCreateClass, onRequestCreate }: TimetableMobileProps) {
    const { t } = useLocale();
    const timetable = config.timetable ?? [];
    const [day, setDay] = React.useState(TIMETABLE_DAYS[0].value);
    const selectedDay = TIMETABLE_DAYS.find(item => item.value === day) ?? TIMETABLE_DAYS[0];

    const assign = (slot: number, classId: string | null) => {
        const nextTimetable = setTimetableEntry(timetable, day, slot, classId);
        onChange({ timetable: nextTimetable, schedules: deriveSchedules(nextTimetable) });
    };

    return (
        <section className="space-y-3 md:hidden" aria-label="Emploi du temps mobile">
            <div className="m-dayscroll" role="tablist" aria-label={t('schedule.day')}>
                {TIMETABLE_DAYS.map(item => (
                    <button
                        key={item.value}
                        type="button"
                        role="tab"
                        aria-selected={item.value === day}
                        className={`m-daychip m-pressable ${item.value === day ? 'is-on' : ''}`}
                        onClick={() => setDay(item.value)}
                    >
                        {t(`schedule.day.${item.value}`).slice(0, 3)}
                    </button>
                ))}
            </div>

            <div className="space-y-2">
                {HOUR_SLOTS.map(hour => {
                    const entry = getTimetableEntry(timetable, day, hour.index);
                    const classInfo = entry ? classes.find(item => item.id === entry.classId) : undefined;
                    return (
                        <div key={hour.index} className="rounded-2xl border border-border bg-card p-3 shadow-sm">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <div>
                                    <p className="font-mono text-xs font-extrabold text-foreground">{hour.label}</p>
                                    <p className="text-[11px] font-semibold text-muted-foreground">{t(`schedule.day.${selectedDay.value}`)}</p>
                                </div>
                                {classInfo && (
                                    <span
                                        className="h-3 w-3 rounded-full"
                                        style={{ backgroundColor: classColor(classInfo.id) }}
                                        aria-hidden
                                    />
                                )}
                            </div>
                            <select
                                value={entry?.classId ?? ''}
                                onChange={event => {
                                    if (event.target.value === '__create__') {
                                        onRequestCreate?.({ day, slot: hour.index, span: 1 });
                                        event.target.value = entry?.classId ?? '';
                                        return;
                                    }
                                    assign(hour.index, event.target.value || null);
                                }}
                                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                aria-label={`${t(`schedule.day.${selectedDay.value}`)} ${hour.label}`}
                            >
                                <option value="">—</option>
                                {classes.map(item => (
                                    <option key={item.id} value={item.id}>
                                        {SUBJECT_ABBREV_MAP[item.subject] || item.subject} · {formatClassDisplayName(item.name)}
                                    </option>
                                ))}
                                {onCreateClass && <option value="__create__">＋ {t('schedule.createClass')}</option>}
                            </select>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
