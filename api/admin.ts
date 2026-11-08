import type { ApiRequest, ApiResponse } from './_lib/http.js';
import { HttpError, getQueryParam, parseBody, sendError } from './_lib/http.js';
import { getRedis } from './_lib/redis.js';
import { assertBodySize } from './_lib/validate.js';
import { enforceAdminActionLimit } from './_lib/adminLoginLimit.js';
import { recordAdminAudit } from './_lib/adminAudit.js';
import { ADMIN_COOKIE, clearCookie, requireAdmin } from './_lib/auth.js';
import { handleAdminLogin, handleAudit, handleOverview } from './_admin/overview.js';
import {
    handleGetCalendar,
    handleGetEvaluationPolicy,
    handleGetOfficialEvents,
    handleGetTimetableClock,
    handleSaveCalendar,
    handleSaveEvaluationPolicy,
    handleSaveOfficialEvents,
    handleSaveTimetableClock,
} from './_admin/calendarPolicy.js';
import {
    handleBlockTeacher,
    handleClassLessons,
    handleDeleteTeacher,
    handleDeleteTeacherClass,
    handleImportClassLessons,
    handleNotifyTeacher,
    handleSaveAssessmentDate,
    handleSaveClassRoster,
    handleTeacherDetail,
    handleTeacherMessages,
    handleUpsertTeacherClass,
} from './_admin/teachers.js';
import type { AdminBody } from './_admin/shared.js';

/** Console d'administration : répartiteur unique, modules par domaine. */

const ADMIN_WRITES: Readonly<Record<string, (body: AdminBody, res: ApiResponse) => Promise<unknown>>> = {
    blockTeacher: handleBlockTeacher,
    deleteTeacher: handleDeleteTeacher,
    notifyTeacher: handleNotifyTeacher,
    saveCalendar: handleSaveCalendar,
    saveTimetableClock: handleSaveTimetableClock,
    saveEvaluationPolicy: handleSaveEvaluationPolicy,
    saveOfficialEvents: handleSaveOfficialEvents,
    saveAssessmentDate: handleSaveAssessmentDate,
    saveClassRoster: handleSaveClassRoster,
    upsertTeacherClass: handleUpsertTeacherClass,
    deleteTeacherClass: handleDeleteTeacherClass,
    importClassLessons: handleImportClassLessons,
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
    res.setHeader('Cache-Control', 'no-store');
    try {
        if (req.method === 'POST') {
            const body = parseBody<AdminBody>(req.body);
            if (body.action === 'login') return await handleAdminLogin(body, req, res);
            if (body.action === 'logout') {
                clearCookie(res, ADMIN_COOKIE);
                return res.status(200).json({ ok: true });
            }
            // actions de gestion : session admin requise
            await requireAdmin(req);
            // Une seule garde pour toutes les écritures : aucune action ne dépend de la prudence de son handler.
            assertBodySize(body);
            const write = Object.hasOwn(ADMIN_WRITES, body.action ?? '') ? ADMIN_WRITES[body.action!] : undefined;
            if (!write) throw new HttpError(400, 'Action inconnue.');
            const redis = await getRedis();
            // Débit borné par famille d'action (notifications, suppressions, imports, autres écritures).
            await enforceAdminActionLimit(redis, req, res, body.action);
            await write(body, res);
            // Journal : une ligne par écriture réussie, au mieux, sans jamais bloquer ni annuler l'action.
            await recordAdminAudit(redis, body.action!, body as Record<string, unknown>);
            return;        }

        if (req.method === 'GET') {
            await requireAdmin(req);
            const action = getQueryParam(req, 'action');
            if (action === 'overview') return await handleOverview(req, res);
            if (action === 'audit') return await handleAudit(res);
            if (action === 'teacher') return await handleTeacherDetail(req, res);
            if (action === 'messages') return await handleTeacherMessages(req, res);
            if (action === 'calendar') return await handleGetCalendar(res);
            if (action === 'timetableClock') return await handleGetTimetableClock(req, res);
            if (action === 'evaluationPolicy') return await handleGetEvaluationPolicy(req, res);
            if (action === 'officialEvents') return await handleGetOfficialEvents(res);
            if (action === 'lessons') return await handleClassLessons(req, res);
            throw new HttpError(400, 'Action inconnue.');
        }

        throw new HttpError(405, 'Méthode non autorisée.');
    } catch (error) {
        sendError(res, error);
    }
}
