import { createHash, randomUUID } from 'node:crypto';
import { HttpError } from './http.js';
import { getRedis, KEYS, isFirestoreStore, type RedisClient } from './redis.js';
import { fcmConfigured, sendNativePush, type NativeInboxPush, type NativePushDevice } from './fcm.js';

const fieldFor = (token: string): string => createHash('sha256').update(token).digest('hex');
export const validateNativeToken = (raw: unknown): string => {
    if (typeof raw !== 'string' || !/^[a-zA-Z0-9_:\-]{40,4096}$/.test(raw)) throw new HttpError(400, 'Identifiant d’appareil invalide.');
    return raw;
};
const bindingValid = (raw: unknown): raw is string => typeof raw === 'string' && /^[a-zA-Z0-9-]{16,100}$/.test(raw);
const isDevice = (raw: unknown): raw is NativePushDevice => !!raw && typeof raw === 'object'
    && typeof (raw as NativePushDevice).token === 'string' && bindingValid((raw as NativePushDevice).binding);

export async function subscribeNativeDevice(phone: string, raw: unknown, locale: unknown, installationId: unknown) {
    if (!fcmConfigured()) return { ok: true, configured: false, registered: false };
    const token = validateNativeToken(raw);
    if (typeof installationId !== 'string' || !/^[a-zA-Z0-9-]{16,100}$/.test(installationId)) throw new HttpError(400, 'Installation invalide.');
    const redis = await getRedis();
    const field = fieldFor(token);
    const device: NativePushDevice = { token, binding: randomUUID(), locale: locale === 'fr' || locale === 'en' ? locale : 'ar', installationId };
    // Atomic ownership transfer: a late unsubscribe cannot remove a newer binding.
    const [result, binding] = isFirestoreStore(redis) ? await redis.atomic(async view => {
        if (!await view.get(KEYS.user(phone))) return [-1, ''] as [number, string];
        const oldOwner = await view.hget<string>(KEYS.nativePushOwners, field);
        const devicesKey = KEYS.nativePushDevices(phone);
        const devices = await view.hgetall<Record<string, NativePushDevice>>(devicesKey) ?? {};
        const existing = devices[field];
        const replaced = Object.keys(devices).filter(key => key !== field && devices[key].installationId === installationId);
        if (!existing && Object.keys(devices).length - replaced.length >= 5) return [0, ''] as [number, string];
        if (existing && oldOwner === phone) device.binding = existing.binding;
        for (const replacedField of replaced) {
            await view.hdel(devicesKey, replacedField);
            if (await view.hget(KEYS.nativePushOwners, replacedField) === phone) await view.hdel(KEYS.nativePushOwners, replacedField);
        }
        if (oldOwner && oldOwner !== phone) await view.hdel(KEYS.nativePushDevices(oldOwner), field);
        await view.hset(KEYS.nativePushOwners, { [field]: phone });
        await view.hset(devicesKey, { [field]: device });
        return [1, device.binding] as [number, string];
    }) : await redis.eval<unknown[], [number, string]>(`
if redis.call('EXISTS', KEYS[3]) == 0 then return {-1, ''} end
local oldRaw = redis.call('HGET', KEYS[1], ARGV[1])
local oldOwner = oldRaw and cjson.decode(oldRaw) or nil
local existing = redis.call('HGET', KEYS[2], ARGV[1])
local device = cjson.decode(ARGV[3])
local replaced = {}
local entries = redis.call('HGETALL', KEYS[2])
for i = 1, #entries, 2 do
  if entries[i] ~= ARGV[1] and cjson.decode(entries[i+1]).installationId == device.installationId then
    table.insert(replaced, entries[i])
  end
end
if not existing and redis.call('HLEN', KEYS[2]) - #replaced >= 5 then return {0, ''} end
if existing and oldOwner == ARGV[2] then device.binding = cjson.decode(existing).binding end
for _, field in ipairs(replaced) do
  redis.call('HDEL', KEYS[2], field)
  local owner = redis.call('HGET', KEYS[1], field)
  if owner and cjson.decode(owner) == ARGV[2] then redis.call('HDEL', KEYS[1], field) end
end
if oldOwner and oldOwner ~= ARGV[2] then redis.call('HDEL', ARGV[4] .. oldOwner, ARGV[1]) end
redis.call('HSET', KEYS[1], ARGV[1], cjson.encode(ARGV[2]))
redis.call('HSET', KEYS[2], ARGV[1], cjson.encode(device))
return {1, device.binding}`, [KEYS.nativePushOwners, KEYS.nativePushDevices(phone), KEYS.user(phone)],
        [field, phone, JSON.stringify(device), 'push:native:']);
    if (result === -1) throw new HttpError(404, 'Compte supprimé.');
    if (result !== 1) throw new HttpError(429, 'Limite de 5 appareils atteinte.');
    return { ok: true, configured: true, registered: true, binding };
}

async function removeDevice(redis: RedisClient, phone: string, token: string, binding: string): Promise<void> {
    if (isFirestoreStore(redis)) {
        return redis.atomic(async view => {
            const field = fieldFor(token);
            const device = await view.hget<NativePushDevice>(KEYS.nativePushDevices(phone), field);
            const owner = await view.hget<string>(KEYS.nativePushOwners, field);
            if (device?.binding !== binding || owner !== phone) return;
            await view.hdel(KEYS.nativePushDevices(phone), field);
            await view.hdel(KEYS.nativePushOwners, field);
        });
    }
    await redis.eval(`
local raw = redis.call('HGET', KEYS[2], ARGV[1])
if not raw or cjson.decode(raw).binding ~= ARGV[3] then return 0 end
local ownerRaw = redis.call('HGET', KEYS[1], ARGV[1])
if not ownerRaw or cjson.decode(ownerRaw) ~= ARGV[2] then return 0 end
redis.call('HDEL', KEYS[2], ARGV[1])
redis.call('HDEL', KEYS[1], ARGV[1])
return 1`, [KEYS.nativePushOwners, KEYS.nativePushDevices(phone)], [fieldFor(token), phone, binding]);
}

export async function unsubscribeNativeDevice(phone: string, raw: unknown, binding: unknown) {
    const token = validateNativeToken(raw);
    if (!bindingValid(binding)) throw new HttpError(400, 'Association d’appareil invalide.');
    await removeDevice(await getRedis(), phone, token, binding);
    return { ok: true };
}

export async function nativeDeviceStatus(phone: string, raw: unknown, binding: unknown) {
    if (!fcmConfigured()) return { ok: true, configured: false, registered: false };
    const token = validateNativeToken(raw);
    const device = await (await getRedis()).hget<NativePushDevice>(KEYS.nativePushDevices(phone), fieldFor(token));
    return { ok: true, configured: true, registered: isDevice(device) && device.binding === binding };
}

export async function sendNativeToOwner(phone: string, payload: NativeInboxPush, onlyToken?: string): Promise<number> {
    if (!fcmConfigured()) return 0;
    const redis = await getRedis();
    const devices = Object.values(await redis.hgetall<Record<string, NativePushDevice>>(KEYS.nativePushDevices(phone)) ?? {})
        .filter(isDevice).filter(device => !onlyToken || device.token === onlyToken).slice(0, 5);
    const results = await Promise.all(devices.map(async device => {
        const result = await sendNativePush(device, payload);
        if (result.expired) await removeDevice(redis, phone, device.token, device.binding);
        return result.sent ? 1 : 0;
    }));
    return results.reduce<number>((total, value) => total + value, 0);
}

export async function deleteNativeDevices(redis: RedisClient, phone: string): Promise<void> {
    const devices = await redis.hgetall<Record<string, NativePushDevice>>(KEYS.nativePushDevices(phone));
    await Promise.all(Object.values(devices ?? {}).filter(isDevice).map(device => removeDevice(redis, phone, device.token, device.binding)));
}
