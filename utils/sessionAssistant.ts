import { TOP_LEVEL_TYPE_CONFIG } from '../constants';
import { AppConfig, ClassInfo, Indices, LessonsData } from '../types';
import { flattenLessons } from './dataUtils';
import { isHoliday, isVacation, loadHolidayCalendar, toISODate } from './calendar';
import { withAbsences } from './lateness';
import { getDaySessionBlocks, SessionBlock } from './timetable';

const CLASS_STORAGE_KEY = 'classManager_v1';
const LESSON_STORAGE_PREFIX = 'classData_v1_';
export const SESSION_ASSISTANT_FOCUS_KEY = 'sessionAssistantFocus_v1';
export const SESSION_ASSISTANT_AUTO_OPEN_PREFIX = 'sessionAssistantAutoOpen_v1_';

type SessionPhase = 'upcoming' | 'active' | 'recently-ended';
type TargetStatus = 'missing-date' | 'already-dated' | 'no-content';

export interface SessionAssistantTarget {
    indices: Indices;
    title: string;
    date?: string;
    status: TargetStatus;
}

export interface SessionAssistantSuggestion {
    classInfo: ClassInfo;
    todayISO: string;
    startMin: number;
    endMin: number;
    phase: SessionPhase;
    priority: number;
    storageKey: string;
    title: string;
    body: string;
    target: SessionAssistantTarget | null;
}

export interface SessionAssistantFocusPayload {
    classId: string;
    todayISO: string;
    targetIndices: Indices;
    targetTitle: string;
    status: TargetStatus;
    message: string;
    expiresAt: number;
}

const readClasses = (): ClassInfo[] => {
    try {
        return JSON.parse(localStorage.getItem(CLASS_STORAGE_KEY) || '[]') as ClassInfo[];
    } catch {
        return [];
    }
};

const readLessons = (classId: string): LessonsData => {
    try {
        const raw = localStorage.getItem(`${LESSON_STORAGE_PREFIX}${classId}`);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : (parsed.lessonsData ?? []);
    } catch {
        return [];
    }
};

const formatHour = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}h${m ? String(m).padStart(2, '0') : ''}`;
};

const titleOf = (entry: { data: any; elementType: string }): string => {
    const value = entry.data?.title ?? entry.data?.name ?? entry.data?.type;
    if (typeof value === 'string' && value.trim()) return value.trim();
    return entry.elementType === 'chapter' ? 'Chapitre sans titre' : 'Element sans titre';
};

const isDateable = (entry: { data: any; elementType: string }): boolean =>
    entry.elementType !== 'separator' && !!entry.data;

const isContentLike = (entry: { data: any; elementType: string }): boolean => {
    if (entry.elementType === 'item') return true;
    const type = entry.data?.type;
    return typeof type === 'string' && type in TOP_LEVEL_TYPE_CONFIG && type !== 'chapter';
};

const isBlankDate = (value: unknown): boolean =>
    typeof value !== 'string' || value.trim().length === 0;

const pickTarget = (lessons: LessonsData, todayISO: string): SessionAssistantTarget | null => {
    const entries = flattenLessons(lessons)
        .filter(isDateable)
        .map((entry, order) => ({
            ...entry,
            order,
            title: titleOf(entry),
            date: typeof entry.data?.date === 'string' ? entry.data.date.trim() : '',
            score: isContentLike(entry) ? 2 : 1,
        }));

    if (entries.length === 0) return null;

    const datedToday = entries.filter(entry => entry.date === todayISO);
    if (datedToday.length > 0) {
        const entry = datedToday[datedToday.length - 1];
        return {
            indices: entry.indices,
            title: entry.title,
            date: entry.date,
            status: 'already-dated',
        };
    }

    const blankEntries = entries.filter(entry => isBlankDate(entry.date));
    if (blankEntries.length === 0) {
        const entry = entries[entries.length - 1];
        return {
            indices: entry.indices,
            title: entry.title,
            date: entry.date,
            status: 'no-content',
        };
    }

    const lastDated = entries
        .filter(entry => !isBlankDate(entry.date))
        .sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order)
        .at(-1);

    const afterLastDated = lastDated
        ? blankEntries.filter(entry => entry.order > lastDated.order)
        : blankEntries;
    const pool = afterLastDated.length > 0 ? afterLastDated : blankEntries;
    const bestScore = Math.max(...pool.map(entry => entry.score));
    const entry = pool.find(item => item.score === bestScore) ?? pool[0];

    return {
        indices: entry.indices,
        title: entry.title,
        status: 'missing-date',
    };
};

const phaseFor = (
    block: SessionBlock,
    nowMin: number,
    upcomingWindowMin = 5
): { phase: SessionPhase; distance: number } | null => {
    if (nowMin >= block.startMin - upcomingWindowMin && nowMin < block.startMin) {
        return { phase: 'upcoming', distance: block.startMin - nowMin };
    }
    if (nowMin >= block.startMin && nowMin <= block.endMin) {
        return { phase: 'active', distance: 0 };
    }
    if (nowMin > block.endMin && nowMin <= block.endMin + 180) {
        return { phase: 'recently-ended', distance: nowMin - block.endMin };
    }
    return null;
};

const priorityFor = (phase: SessionPhase, target: SessionAssistantTarget | null, distance: number): number => {
    const targetBoost = target?.status === 'missing-date' ? 50 : target?.status === 'already-dated' ? 10 : 0;
    if (phase === 'active') return 100 + targetBoost;
    if (phase === 'recently-ended') return 85 + targetBoost - Math.min(distance, 120) / 4;
    return 65 + targetBoost - distance;
};

const buildMessage = (
    className: string,
    block: SessionBlock,
    phase: SessionPhase,
    target: SessionAssistantTarget | null
): { title: string; body: string } => {
    const period = `${formatHour(block.startMin)}–${formatHour(block.endMin)}`;
    if (target?.status === 'missing-date') {
        const action =
            phase === 'recently-ended'
                ? 'La séance vient de se terminer'
                : phase === 'upcoming'
                    ? `Séance à ${formatHour(block.startMin)}`
                    : 'Séance en cours';
        return {
            title: `${className} — ${period}`,
            body: `${action}. Contenu proposé : ${target.title}.`,
        };
    }
    if (target?.status === 'already-dated') {
        return {
            title: `${className} — déjà datée`,
            body: `La séance ${period} est déjà rattachée à « ${target.title} ».`,
        };
    }
    return {
        title: `${className} — ${period}`,
        body: 'Aucun contenu à dater automatiquement pour cette séance.',
    };
};

export const buildSessionFocusPayload = (suggestion: SessionAssistantSuggestion): SessionAssistantFocusPayload | null => {
    if (!suggestion.target?.indices) return null;
    return {
        classId: suggestion.classInfo.id,
        todayISO: suggestion.todayISO,
        targetIndices: suggestion.target.indices,
        targetTitle: suggestion.target.title,
        status: suggestion.target.status,
        message: suggestion.body,
        expiresAt: Date.now() + 20 * 60_000,
    };
};

export const writeSessionFocusPayload = (payload: SessionAssistantFocusPayload): void => {
    try {
        sessionStorage.setItem(SESSION_ASSISTANT_FOCUS_KEY, JSON.stringify(payload));
    } catch {
        // stockage indisponible : l'ouverture de classe reste utile
    }
};

export const findSessionAssistantSuggestion = async (
    config: AppConfig,
    now: Date = new Date(),
    classes: ClassInfo[] = readClasses(),
    options?: {
        /** minutes avant le début où la séance est déjà « à venir » (5 par défaut,
         *  élargi par le tableau de bord pour préparer sa séance en avance) */
        upcomingWindowMin?: number;
    }
): Promise<SessionAssistantSuggestion | null> => {
    const timetable = config.timetable ?? [];
    if (timetable.length === 0 || classes.length === 0) return null;

    const calendar = withAbsences(await loadHolidayCalendar(), config.absences);
    const todayISO = toISODate(now);
    if (isHoliday(todayISO, calendar) || isVacation(todayISO, calendar)) return null;

    const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    const blocks = getDaySessionBlocks(timetable, now.getDay());
    if (blocks.length === 0) return null;

    const classesById = new Map(classes.map(classInfo => [classInfo.id, classInfo]));
    const suggestions: SessionAssistantSuggestion[] = [];

    for (const block of blocks) {
        const classInfo = classesById.get(block.classId);
        if (!classInfo) continue;
        const phase = phaseFor(block, nowMin, options?.upcomingWindowMin);
        if (!phase) continue;

        const target = pickTarget(readLessons(block.classId), todayISO);
        const { title, body } = buildMessage(classInfo.name, block, phase.phase, target);

        suggestions.push({
            classInfo,
            todayISO,
            startMin: block.startMin,
            endMin: block.endMin,
            phase: phase.phase,
            priority: priorityFor(phase.phase, target, phase.distance),
            storageKey: `${todayISO}-${block.classId}-${block.startMin}-${block.endMin}`,
            title,
            body,
            target,
        });
    }

    return suggestions.sort((a, b) => b.priority - a.priority)[0] ?? null;
};
