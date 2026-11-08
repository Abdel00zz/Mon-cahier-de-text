import type { ApiRequest, ApiResponse } from '../_lib/http.js';
import { HttpError, getQueryParam } from '../_lib/http.js';
import { getRedis, KEYS } from '../_lib/redis.js';
import { saveVersionedDocument } from '../_lib/atomicWrite.js';
import { assertBodySize } from '../_lib/validate.js';
import { getBundledCalendar, validateHolidayCalendar, type HolidayCalendar } from '../../src/domain/calendar/calendar.js';
import {
    getOfficialStudentEventsFile,
    validateOfficialStudentEventsFile,
    type OfficialStudentEventsFile,
} from '../../src/domain/evaluations/officialStudentEvents.js';
import { EMPTY_EVALUATION_POLICY, normalizeEvaluationAssignment, normalizeEvaluationPolicy, resolveEvaluationPolicy, validateEvaluationKindOverrides } from '../../src/domain/evaluations/evaluationPolicy.js';
import { DEFAULT_TIMETABLE_CLOCK, DEFAULT_TIMETABLE_CLOCK_ASSIGNMENT, isValidTimetableClockOffset, normalizeTimetableClock, normalizeTimetableClockAssignment, resolveTimetableClock } from '../../src/domain/calendar/timetable.js';
import type { EvaluationPolicy, EvaluationPolicyAssignment, TimetableClockAssignment, TimetableClockPolicy } from '../../src/types.js';
import type { AdminBody, StoredUser } from './shared.js';

/** Calendrier, horloge des séances, politique du contrôle continu et bulletin officiel. */

const validateCalendar = (value: unknown): HolidayCalendar => {
    try {
        return validateHolidayCalendar(value);
    } catch (error) {
        throw new HttpError(400, error instanceof Error ? error.message : 'Calendrier invalide.');
    }
};
export const handleGetCalendar = async (res: ApiResponse) => {
    const redis = await getRedis();
    const calendar = (await redis.get<HolidayCalendar>(KEYS.adminCalendar)) ?? getBundledCalendar();
    res.status(200).json({ calendar });
};

export const handleSaveCalendar = async (body: AdminBody, res: ApiResponse) => {
    const calendar = validateCalendar(body.calendar);
    const redis = await getRedis();
    const saved = { ...calendar, version: calendar.version + 1 };
    await saveVersionedDocument(redis, KEYS.adminCalendar, calendar.version, saved, getBundledCalendar().version);
    res.status(200).json({ ok: true, calendar: saved });
};

const readTimetableClockState = async (phone?: string) => {
    const redis = await getRedis();
    const globalTimetableClock = normalizeTimetableClock(
        (await redis.get<TimetableClockPolicy>(KEYS.adminTimetableClock)) ?? DEFAULT_TIMETABLE_CLOCK,
    );
    if (!phone) {
        return { timetableClock: globalTimetableClock, globalTimetableClock, assignment: null };
    }
    const [user, storedAssignment] = await Promise.all([
        redis.get<StoredUser>(KEYS.user(phone)),
        redis.get<TimetableClockAssignment>(KEYS.adminTimetableClockForUser(phone)),
    ]);
    if (!user) throw new HttpError(404, 'Enseignant introuvable.');
    const assignment = normalizeTimetableClockAssignment(storedAssignment);
    return {
        timetableClock: resolveTimetableClock(globalTimetableClock, assignment),
        globalTimetableClock,
        assignment,
    };
};

export const handleGetTimetableClock = async (req: ApiRequest, res: ApiResponse) => {
    res.status(200).json(await readTimetableClockState(getQueryParam(req, 'phone')));
};

const saveVersionedClock = async (
    key: string,
    expectedVersion: number,
    value: TimetableClockPolicy | TimetableClockAssignment,
): Promise<void> => {
    const redis = await getRedis();
    await saveVersionedDocument(redis, key, expectedVersion, value);
};

/** Message unique pour un décalage horaire hors bornes (pas de 5 min, ±120 min). */
const INVALID_TIMETABLE_CLOCK_OFFSET = 'Décalage horaire invalide (pas de 5 min, entre -120 et +120 min).';

/**
 * Renvoie le décalage validé ou lève une 400. Le contrôle est idempotent :
 * l'appelant peut l'utiliser après un premier garde-fou pour obtenir la valeur
 * affinée (`number`) sans assertion non nulle.
 */
const requireTimetableClockOffset = (value: unknown): number => {
    if (!isValidTimetableClockOffset(value)) {
        throw new HttpError(400, INVALID_TIMETABLE_CLOCK_OFFSET);
    }
    return value;
};

/**
 * Publie une translation unique de toute la grille. Les cases des professeurs
 * ne sont jamais réécrites : seul le référentiel horaire global est versionné.
 */
export const handleSaveTimetableClock = async (body: AdminBody, res: ApiResponse) => {
    const isPersonal = typeof body.phone === 'string' && body.phone.length > 0;
    const inheritsGlobal = isPersonal && body.inheritGlobalTimetableClock === true;
    const requestedOffset = body.timetableClockOffsetMinutes;
    if (!inheritsGlobal && !isValidTimetableClockOffset(requestedOffset)) {
        throw new HttpError(400, INVALID_TIMETABLE_CLOCK_OFFSET);
    }
    if (typeof body.expectedTimetableClockVersion !== 'number'
        || !Number.isInteger(body.expectedTimetableClockVersion)
        || body.expectedTimetableClockVersion < 0) {
        throw new HttpError(400, 'Version horaire invalide. Rechargez puis réessayez.');
    }

    const redis = await getRedis();
    if (isPersonal) {
        const user = await redis.get<StoredUser>(KEYS.user(body.phone!));
        if (!user) throw new HttpError(404, 'Enseignant introuvable.');
        const current = normalizeTimetableClockAssignment(
            (await redis.get<TimetableClockAssignment>(KEYS.adminTimetableClockForUser(body.phone!)))
            ?? DEFAULT_TIMETABLE_CLOCK_ASSIGNMENT,
        );
        if (current.version !== body.expectedTimetableClockVersion) {
            throw new HttpError(409, 'Les horaires ont été modifiés par une autre session. Rechargez avant de publier.');
        }
        const assignment: TimetableClockAssignment = {
            offsetMinutes: inheritsGlobal ? null : requireTimetableClockOffset(requestedOffset),
            version: current.version + 1,
            updatedAt: new Date().toISOString(),
        };
        await saveVersionedClock(
            KEYS.adminTimetableClockForUser(body.phone!),
            body.expectedTimetableClockVersion,
            assignment,
        );
        return res.status(200).json({ ok: true, ...(await readTimetableClockState(body.phone!)) });
    }

    const current = normalizeTimetableClock(
        (await redis.get<TimetableClockPolicy>(KEYS.adminTimetableClock)) ?? DEFAULT_TIMETABLE_CLOCK,
    );
    if (current.version !== body.expectedTimetableClockVersion) {
        throw new HttpError(409, 'Les horaires ont été modifiés par une autre session. Rechargez avant de publier.');
    }

    const timetableClock: TimetableClockPolicy = {
        offsetMinutes: requireTimetableClockOffset(requestedOffset),
        version: current.version + 1,
        updatedAt: new Date().toISOString(),
    };
    await saveVersionedClock(KEYS.adminTimetableClock, body.expectedTimetableClockVersion, timetableClock);
    res.status(200).json({ ok: true, timetableClock, globalTimetableClock: timetableClock, assignment: null });
};

/**
 * POLITIQUE DU CONTRÔLE CONTINU — même circuit que l'horloge des séances :
 * un document général versionné, des écarts par compte, résolus à la lecture.
 * Elle ne passe jamais par les réglages de l'enseignant (un appareil ancien
 * les remplacerait en bloc) : elle est livrée au pull et ne repart pas.
 */
const readEvaluationPolicyState = async (phone?: string) => {
    const redis = await getRedis();
    const globalEvaluationPolicy = normalizeEvaluationPolicy(
        (await redis.get<EvaluationPolicy>(KEYS.adminEvaluationPolicy)) ?? EMPTY_EVALUATION_POLICY,
    );
    if (!phone) {
        return { evaluationPolicy: globalEvaluationPolicy, globalEvaluationPolicy, assignment: null };
    }
    const [user, storedAssignment] = await Promise.all([
        redis.get<StoredUser>(KEYS.user(phone)),
        redis.get<EvaluationPolicyAssignment>(KEYS.adminEvaluationPolicyForUser(phone)),
    ]);
    if (!user) throw new HttpError(404, 'Enseignant introuvable.');
    const assignment = normalizeEvaluationAssignment(storedAssignment);
    return {
        evaluationPolicy: resolveEvaluationPolicy(globalEvaluationPolicy, assignment),
        globalEvaluationPolicy,
        assignment,
    };
};

export const handleGetEvaluationPolicy = async (req: ApiRequest, res: ApiResponse) => {
    res.status(200).json(await readEvaluationPolicyState(getQueryParam(req, 'phone')));
};

export const handleSaveEvaluationPolicy = async (body: AdminBody, res: ApiResponse) => {
    assertBodySize(body);
    const isPersonal = typeof body.phone === 'string' && body.phone.length > 0;
    if (typeof body.expectedEvaluationPolicyVersion !== 'number'
        || !Number.isInteger(body.expectedEvaluationPolicyVersion)
        || body.expectedEvaluationPolicyVersion < 0) {
        throw new HttpError(400, 'Version de la politique invalide. Rechargez puis réessayez.');
    }
    const checked = validateEvaluationKindOverrides(body.evaluationPolicyKinds ?? {});
    if (!checked.ok) throw new HttpError(400, checked.error);

    const redis = await getRedis();
    const key = isPersonal ? KEYS.adminEvaluationPolicyForUser(body.phone!) : KEYS.adminEvaluationPolicy;
    if (isPersonal) {
        const user = await redis.get<StoredUser>(KEYS.user(body.phone!));
        if (!user) throw new HttpError(404, 'Enseignant introuvable.');
    }
    const current = normalizeEvaluationPolicy((await redis.get<EvaluationPolicy>(key)) ?? EMPTY_EVALUATION_POLICY);
    if (current.version !== body.expectedEvaluationPolicyVersion) {
        throw new HttpError(409, 'La politique a été modifiée par une autre session. Rechargez avant de publier.');
    }
    const next: EvaluationPolicy = { kinds: checked.kinds, version: current.version + 1, updatedAt: new Date().toISOString() };
    await saveVersionedDocument(redis, key, body.expectedEvaluationPolicyVersion, next);
    res.status(200).json({ ok: true, ...(await readEvaluationPolicyState(isPersonal ? body.phone : undefined)) });
};

export const handleGetOfficialEvents = async (res: ApiResponse) => {
    const redis = await getRedis();
    const officialEvents = (await redis.get<OfficialStudentEventsFile>(KEYS.adminOfficialEvents))
        ?? getOfficialStudentEventsFile();
    res.status(200).json({ officialEvents });
};

export const handleSaveOfficialEvents = async (body: AdminBody, res: ApiResponse) => {
    let validated: OfficialStudentEventsFile;
    try {
        validated = validateOfficialStudentEventsFile(body.officialEvents);
    } catch (error) {
        throw new HttpError(400, error instanceof Error ? error.message : 'Bulletin officiel JSON invalide.');
    }
    const redis = await getRedis();
    const saved = { ...validated, version: validated.version + 1 };
    await saveVersionedDocument(redis, KEYS.adminOfficialEvents, validated.version, saved, getOfficialStudentEventsFile().version);
    res.status(200).json({ ok: true, officialEvents: saved });
};
