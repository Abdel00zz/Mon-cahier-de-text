import { useEffect, useMemo, useState } from 'react';
import { ClassInfo } from '../types';
import { getBundledCalendar, todayInMorocco } from '../utils/calendar';
import { daysBetweenISO } from '../utils/assessments';
import {
    getOfficialEventEffectiveEnd,
    getOfficialStudentEventsFile,
    getOfficialStudentEventsForClass,
    loadOfficialStudentEvents,
    type OfficialStudentEvent,
    type OfficialStudentEventsFile,
} from '../utils/officialStudentEvents';

export interface UpcomingOfficialStudentEvent {
    event: OfficialStudentEvent;
    classNames: string[];
    inDays: number;
}

/** Une seule source asynchrone, puis déduplication des jalons communs à plusieurs classes. */
export const useUpcomingOfficialStudentEvents = (
    classes: ClassInfo[],
    horizonDays = 30,
): UpcomingOfficialStudentEvent[] => {
    const [file, setFile] = useState<OfficialStudentEventsFile>(() => getOfficialStudentEventsFile());

    useEffect(() => {
        let active = true;
        loadOfficialStudentEvents().then(value => { if (active) setFile(value); });
        return () => { active = false; };
    }, []);

    return useMemo(() => {
        const today = todayInMorocco(new Date(), getBundledCalendar());
        const grouped = new Map<string, { event: OfficialStudentEvent; classNames: Set<string> }>();
        for (const classInfo of classes) {
            for (const event of getOfficialStudentEventsForClass(classInfo, undefined, file)) {
                const end = getOfficialEventEffectiveEnd(event);
                const untilStart = daysBetweenISO(today, event.start);
                if (end < today || untilStart > horizonDays) continue;
                const current = grouped.get(event.id) ?? { event, classNames: new Set<string>() };
                current.classNames.add(classInfo.name);
                grouped.set(event.id, current);
            }
        }
        return [...grouped.values()]
            .map(item => ({
                event: item.event,
                classNames: [...item.classNames].sort(),
                inDays: Math.max(0, daysBetweenISO(today, item.event.start)),
            }))
            .sort((a, b) => a.inDays - b.inDays || a.event.title.localeCompare(b.event.title));
    }, [classes, file, horizonDays]);
};

