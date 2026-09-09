import { randomUUID } from 'node:crypto';
import { HttpError } from './http.js';
import { KEYS, type RedisClient } from './redis.js';

/** Every account writer must acquire this revision BEFORE reading its inputs.
 * No expiring lock: a delayed request can never commit over a newer revision.
 * The revision survives account deletion to prevent ABA on recreation.
 */
export const beginAccountWrite = async (redis: RedisClient, phone: string) => {
    const revisionKey = `revision:account:${phone}`;
    const revision = await redis.get<string>(revisionKey) ?? '';
    const commands: string[][] = [];
    return {
        set(key: string, value: unknown) { commands.push(['SET', key, JSON.stringify(value)]); },
        del(key: string) { commands.push(['DEL', key]); },
        hset(key: string, fields: Record<string, unknown>) {
            for (const [field, value] of Object.entries(fields)) commands.push(['HSET', key, field, JSON.stringify(value)]);
        },
        hdel(key: string, field: string) { commands.push(['HDEL', key, field]); },
        async exec() {
            const result = await redis.eval<unknown[], number>(`
if (redis.call('GET', KEYS[1]) or '') ~= ARGV[1] then return 0 end
if redis.call('EXISTS', KEYS[2]) == 0 then return -1 end
local commands = cjson.decode(ARGV[3])
-- Validate types before any write: Redis Lua does not roll back runtime errors.
for _, command in ipairs(commands) do
  local kind = redis.call('TYPE', command[2]).ok
  if (command[1] == 'HSET' or command[1] == 'HDEL') and kind ~= 'none' and kind ~= 'hash' then
    return redis.error_reply('Invalid hash type')
  end
end
for _, command in ipairs(commands) do redis.call(unpack(command)) end
redis.call('SET', KEYS[1], ARGV[2])
return 1`, [revisionKey, KEYS.user(phone)], [revision, randomUUID(), JSON.stringify(commands)]);
            if (result === -1) throw new HttpError(404, 'Compte supprimé.');
            if (result !== 1) throw new HttpError(409, 'Données modifiées pendant la sauvegarde. Rechargez puis réessayez.', 'WRITE_CONFLICT');
        },
    };
};

/** Bundled documents have a nonzero initial version even before the first SET. */
export const saveVersionedDocument = async (
    redis: RedisClient, key: string, expectedVersion: number,
    value: { version: number }, initialVersion: number = 0,
): Promise<void> => {
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0 || value.version !== expectedVersion + 1) {
        throw new HttpError(400, 'Version invalide.');
    }
    const result = await redis.eval<unknown[], number>(`
local raw = redis.call('GET', KEYS[1])
local version = tonumber(ARGV[3])
if raw then version = cjson.decode(raw).version end
if version ~= tonumber(ARGV[1]) then return 0 end
redis.call('SET', KEYS[1], ARGV[2])
return 1`, [key], [expectedVersion, JSON.stringify(value), initialVersion]);
    if (result !== 1) throw new HttpError(409, 'Ce document a été modifié par une autre session. Rechargez avant de publier.');
};
