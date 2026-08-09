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
    classIds: string[];
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
        const grouped = new Map<string, { event: OfficialStudentEvent; classIds: Set<string>; classNames: Set<string> }>();
        for (const classInfo of classes) {
            for (const event of getOfficialStudentEventsForClass(classInfo, undefined, file)) {
                const end = getOfficialEventEffectiveEnd(event);
                const untilStart = daysBetweenISO(today, event.start);
                if (end < today || untilStart > horizonDays) continue;
                const current = grouped.get(event.id) ?? { event, classIds: new Set<string>(), classNames: new Set<string>() };
                current.classIds.add(classInfo.id);
                current.classNames.add(classInfo.name);
                grouped.set(event.id, current);
            }
        }
        return [...grouped.values()]
            .map(item => ({
                event: item.event,
                classIds: [...item.classIds].sort(),
                classNames: [...item.classNames].sort(),
                inDays: Math.max(0, daysBetweenISO(today, item.event.start)),
            }))
            .sort((a, b) => a.inDays - b.inDays || a.event.title.localeCompare(b.event.title));
    }, [classes, file, horizonDays]);
};
