import { ApiRequest, ApiResponse, sendError } from './_lib/http.js';
import { getRedis, KEYS } from './_lib/redis.js';
import {
    getOfficialStudentEventsFile,
    type OfficialStudentEventsFile,
} from '../utils/officialStudentEvents.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    try {
        if (req.method !== 'GET') return res.status(405).json({ error: 'Méthode non autorisée.' });
        const redis = await getRedis();
        const bulletin = (await redis.get<OfficialStudentEventsFile>(KEYS.adminOfficialEvents))
            ?? getOfficialStudentEventsFile();
        return res.status(200).json(bulletin);
    } catch (error) {
        sendError(res, error);
    }
}
