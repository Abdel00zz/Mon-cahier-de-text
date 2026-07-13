import { ApiRequest, ApiResponse, sendError } from './_lib/http.js';
import { getRedis, KEYS } from './_lib/redis.js';
import { getBundledCalendar, type HolidayCalendar } from '../utils/calendar.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    try {
        if (req.method !== 'GET') return res.status(405).json({ error: 'Méthode non autorisée.' });
        const redis = await getRedis();
        const calendar = (await redis.get<HolidayCalendar>(KEYS.adminCalendar)) ?? getBundledCalendar();
        return res.status(200).json(calendar);
    } catch (error) {
        sendError(res, error);
    }
}
