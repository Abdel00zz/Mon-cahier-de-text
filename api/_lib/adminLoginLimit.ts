import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { HttpError, type ApiRequest, type ApiResponse } from './http.js';
import type { RedisClient } from './redis.js';

export const enforceAdminLoginLimit = async (redis: RedisClient, req: ApiRequest, res: ApiResponse) => {
    // Vercel overwrites this header. Never trust client-supplied X-Forwarded-For.
    const forwarded = process.env.VERCEL === '1' ? req.headers['x-vercel-forwarded-for'] : undefined;
    const candidate = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '';
    const identity = isIP(candidate) ? candidate : 'unknown';
    const digest = createHash('sha256').update(identity).digest('hex');
    // INCR + expiry are indivisible; successful logins also consume the budget.
    const retryAfter = await redis.eval<unknown[], number>(`
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[2]) end
if count > tonumber(ARGV[1]) then return math.max(1, redis.call('TTL', KEYS[1])) end
return 0`, [`rl:admin-login:${digest}`], [8, 900]);
    if (retryAfter > 0) {
        res.setHeader('Retry-After', String(retryAfter));
        throw new HttpError(429, 'Trop de tentatives. Réessayez dans quelques minutes.');
    }
};
