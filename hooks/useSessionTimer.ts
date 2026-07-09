import { useState, useEffect, useCallback, useRef } from 'react';
import { AppConfig, ClassInfo, LessonsData } from '../types';
import { TOP_LEVEL_TYPE_CONFIG } from '../constants';

const isUndated = (item: any) => !item.date || !item.date.trim();

export const hasUndatedItems = (lessonsData: LessonsData): boolean => {
    const traverse = (item: any, isInsideChapter: boolean): boolean => {
        if (item.type && item.type !== 'chapter' && TOP_LEVEL_TYPE_CONFIG.hasOwnProperty(item.type)) {
            return false;
        }

        const currentIsChapter = item.type === 'chapter';

        if (isInsideChapter && !currentIsChapter && isUndated(item)) {
            return true;
        }

        if (item.sections && Array.isArray(item.sections)) {
            for (const s of item.sections) {
                if (traverse(s, isInsideChapter || currentIsChapter)) return true;
            }
        }

        if (item.subsections && Array.isArray(item.subsections)) {
            for (const s of item.subsections) {
                if (traverse(s, isInsideChapter)) return true;
            }
        }

        if (item.subsubsections && Array.isArray(item.subsubsections)) {
            for (const s of item.subsubsections) {
                if (traverse(s, isInsideChapter)) return true;
            }
        }

        if (item.items && Array.isArray(item.items)) {
            for (const s of item.items) {
                if (traverse(s, isInsideChapter)) return true;
            }
        }

        return false;
    };

    for (const topLevelItem of lessonsData) {
        if (traverse(topLevelItem, false)) {
            return true;
        }
    }

    return false;
};

export const useSessionTimer = (
    classInfo: ClassInfo,
    lessonsData: LessonsData,
    config: AppConfig
) => {
    const [isVisible, setIsVisible] = useState(false);
    const alreadyVibratedRef = useRef(false);

    const checkConditions = useCallback(() => {
        const settings = config.notificationSettings;
        if (!settings || !settings.sessionEndReminderEnabled) {
            alreadyVibratedRef.current = false;
            setIsVisible(false);
            return;
        }

        const today = new Date();
        const currentDayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...

        const hasTimetableSession = config.timetable?.some(
            entry => entry.classId === classInfo.id && entry.day === currentDayOfWeek
        );
        const hasScheduleSession = config.schedules?.some(
            s => s.classId === classInfo.id && s.slots?.some(slot => slot.weekday === currentDayOfWeek)
        );

        if (!hasTimetableSession && !hasScheduleSession) {
            alreadyVibratedRef.current = false;
            setIsVisible(false);
            return;
        }

        const currentHour = today.getHours();
        const currentMinute = today.getMinutes();
        const [reminderHour, reminderMinute] = (settings.sessionEndReminderTime || '17:30')
            .split(':')
            .map(Number);

        const isPastReminderTime =
            currentHour > reminderHour ||
            (currentHour === reminderHour && currentMinute >= reminderMinute);

        if (!isPastReminderTime) {
            alreadyVibratedRef.current = false;
            setIsVisible(false);
            return;
        }

        const hasUndated = hasUndatedItems(lessonsData);
        if (!hasUndated) {
            alreadyVibratedRef.current = false;
            setIsVisible(false);
            return;
        }

        const todayStr = today.toISOString().split('T')[0];
        const isDismissed = sessionStorage.getItem(`sessionEndReminderDismissed_${classInfo.id}_${todayStr}`) === 'true';
        if (isDismissed) {
            setIsVisible(false);
            return;
        }

        setIsVisible(true);

        if (!alreadyVibratedRef.current) {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate([180, 80, 180, 80, 180]);
            }
            alreadyVibratedRef.current = true;
        }
    }, [classInfo.id, lessonsData, config.notificationSettings, config.timetable, config.schedules]);

    useEffect(() => {
        checkConditions();

        const interval = setInterval(() => {
            checkConditions();
        }, 60000);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkConditions();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [checkConditions]);

    const handleDismiss = useCallback(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        sessionStorage.setItem(`sessionEndReminderDismissed_${classInfo.id}_${todayStr}`, 'true');
        setIsVisible(false);
    }, [classInfo.id]);

    return {
        isVisible,
        handleDismiss,
    };
};
