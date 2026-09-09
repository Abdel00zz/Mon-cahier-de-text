import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { beginAccountWrite, saveVersionedDocument } from '../api/_lib/atomicWrite.js';
import { enforceAdminLoginLimit } from '../api/_lib/adminLoginLimit.js';
import { HttpError, type ApiResponse } from '../api/_lib/http.js';
import { KEYS, type RedisClient } from '../api/_lib/redis.js';
import { composeAdminLessonImport, prepareImportedLessons } from '../utils/importPipeline.js';

// Redis protocol model, not a Lua interpreter or a production integration test.
// It checks the revisions, commands, serialization and error contracts supplied
// by the actual helpers. Production EVAL must also be smoke-tested after deploy.
class RedisModel {
    values = new Map<string, string>();
    hashes = new Map<string, Map<string, string>>();
    expiries = new Map<string, number>();
    now = 0;
    client = this as unknown as RedisClient;
    async get(key: string) {
        const raw = this.values.get(key);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch { return raw; }
    }
    async eval(script: string, keys: string[], args: unknown[]) {
        if (script.includes("redis.call('INCR'")) {
            const key = keys[0];
            if ((this.expiries.get(key) ?? Infinity) <= this.now) this.values.delete(key);
            const count = Number(this.values.get(key) ?? 0) + 1;
            this.values.set(key, String(count));
            if (count === 1) this.expiries.set(key, this.now + Number(args[1]));
            return count > Number(args[0]) ? Math.max(1, this.expiries.get(key)! - this.now) : 0;
        }
        if (keys.length === 2) {
            assert.ok(script.indexOf('~= ARGV[1]') < script.indexOf('redis.call(unpack(command))'));
            if ((this.values.get(keys[0]) ?? '') !== args[0]) return 0;
            if (!this.values.has(keys[1])) return -1;
            const commands = JSON.parse(String(args[2])) as string[][];
            for (const [command, key, field, value] of commands) {
                if (command === 'SET') this.values.set(key, field);
                else if (command === 'DEL') this.values.delete(key);
                else if (command === 'HSET') {
                    if (!this.hashes.has(key)) this.hashes.set(key, new Map());
                    this.hashes.get(key)!.set(field, value);
                } else if (command === 'HDEL') this.hashes.get(key)?.delete(field);
                else assert.fail(`Unexpected command ${command}`);
            }
            this.values.set(keys[0], String(args[1]));
            return 1;
        }
        const current = await this.get(keys[0]);
        if ((current?.version ?? Number(args[2])) !== Number(args[0])) return 0;
        this.values.set(keys[0], String(args[1]));
        return 1;
    }
}

const account = () => {
    const redis = new RedisModel();
    redis.values.set(KEYS.user('teacher'), JSON.stringify({ phone: 'teacher' }));
    return redis;
};
const conflict = (error: unknown) => error instanceof HttpError && error.statusCode === 409;

test('competing admin/user batches: stale batch cannot write any key', async () => {
    const redis = account();
    const [admin, user] = await Promise.all([beginAccountWrite(redis.client, 'teacher'), beginAccountWrite(redis.client, 'teacher')]);
    admin.set(KEYS.classes('teacher'), { name: 'Admin' });
    admin.set(KEYS.lessons('teacher', 'a'), { lessonsData: ['new'] });
    admin.hset(KEYS.adminSnapshots, { teacher: { totalItems: 1 } });
    user.set(KEYS.classes('teacher'), { name: 'Stale' });
    user.del(KEYS.lessons('teacher', 'a'));
    await admin.exec();
    await assert.rejects(user.exec(), conflict);
    assert.deepEqual(await redis.get(KEYS.classes('teacher')), { name: 'Admin' });
    assert.deepEqual(await redis.get(KEYS.lessons('teacher', 'a')), { lessonsData: ['new'] });
    assert.equal(redis.hashes.get(KEYS.adminSnapshots)?.get('teacher'), '{"totalItems":1}');
});

test('fresh retry reads the new revision; repeated commit is refused', async () => {
    const redis = account();
    const first = await beginAccountWrite(redis.client, 'teacher');
    first.set('document', { version: 1 });
    await first.exec();
    const retry = await beginAccountWrite(redis.client, 'teacher');
    retry.set('document', { version: 2 });
    await retry.exec();
    await assert.rejects(retry.exec(), conflict);
    assert.deepEqual(await redis.get('document'), { version: 2 });
});

test('account deletion fences old requests, including after recreation', async () => {
    const redis = account();
    const stale = await beginAccountWrite(redis.client, 'teacher');
    stale.set(KEYS.classes('teacher'), { stale: true });
    const deletion = await beginAccountWrite(redis.client, 'teacher');
    deletion.del(KEYS.user('teacher'));
    await deletion.exec();
    await assert.rejects(stale.exec(), conflict);
    redis.values.set(KEYS.user('teacher'), '{}');
    await assert.rejects(stale.exec(), conflict);
    assert.equal(await redis.get(KEYS.classes('teacher')), null);
});

test('absent accounts cannot receive writes', async () => {
    const redis = new RedisModel();
    const write = await beginAccountWrite(redis.client, 'missing');
    write.set('document', {});
    await assert.rejects(write.exec(), (error: unknown) => error instanceof HttpError && error.statusCode === 404);
    assert.equal(await redis.get('document'), null);
});

test('bundled calendar version is respected on first publication', async () => {
    const redis = new RedisModel();
    await assert.rejects(saveVersionedDocument(redis.client, 'calendar', 1, { version: 2 }, 5), conflict);
    await saveVersionedDocument(redis.client, 'calendar', 5, { version: 6 }, 5);
    await assert.rejects(saveVersionedDocument(redis.client, 'calendar', 5, { version: 6 }, 5), conflict);
    assert.deepEqual(await redis.get('calendar'), { version: 6 });
});

test('version validation refuses fractions and arbitrary jumps before Redis', async () => {
    const redis = new RedisModel();
    for (const [expected, next] of [[1.5, 2.5], [1, 4], [-1, 0]]) {
        await assert.rejects(saveVersionedDocument(redis.client, 'calendar', expected, { version: next }),
            (error: unknown) => error instanceof HttpError && error.statusCode === 400);
    }
    assert.equal(redis.values.size, 0);
});

test('clock starts at zero; official bulletin keeps its own version', async () => {
    const redis = new RedisModel();
    await saveVersionedDocument(redis.client, 'clock', 0, { version: 1 });
    await saveVersionedDocument(redis.client, 'bulletin', 3, { version: 4 }, 3);
    await assert.rejects(saveVersionedDocument(redis.client, 'bulletin', 3, { version: 4 }, 3), conflict);
    assert.deepEqual(await redis.get('clock'), { version: 1 });
});

test('admin replacement adds the dedicated diagnostic, without mutating input', () => {
    const prepared = prepareImportedLessons([{ type: 'chapter', title: 'Nombres' }]);
    const result = composeAdminLessonImport(prepared, null, 'replace');
    assert.equal(result.lessonsData[0].type, 'evaluation_diagnostic');
    assert.equal(result.lessonsData[0].title, 'Évaluation diagnostique 1');
    assert.equal(prepared.lessonsData.length, 1);
    assert.equal(result.lessonsData.length, 2);
});

test('admin append preserves the existing diagnostic and its date', () => {
    const prepared = prepareImportedLessons([{ type: 'chapter', title: 'Fractions' }]);
    const result = composeAdminLessonImport(prepared, { lessonsData: [
        { type: 'chapter', title: 'Ancien' },
        { type: 'evaluation_diagnostic', title: 'Bilan', date: '2026-09-09' },
    ], contentDirection: 'ltr' }, 'append');
    assert.equal(result.lessonsData[0].date, '2026-09-09');
    assert.equal(result.lessonsData.filter(item => item.type === 'evaluation_diagnostic').length, 1);
    assert.equal(result.lessonsData[2].title, 'Fractions');
});

test('Arabic notebook keeps RTL and receives the localized starter', () => {
    const prepared = prepareImportedLessons([{ type: 'chapter', title: 'Fractions' }]);
    const result = composeAdminLessonImport(prepared, {
        lessonsData: [{ type: 'chapter', title: 'الأعداد' }], contentDirection: 'rtl',
    }, 'append');
    assert.equal(result.contentDirection, 'rtl');
    assert.equal(result.lessonsData[0].title, 'التقويم التشخيصي 1');
});

test('admin rate limit: eight attempts, Retry-After, fixed expiry and spoof-resistant fallback', async () => {
    const previous = process.env.VERCEL;
    delete process.env.VERCEL;
    try {
        const redis = new RedisModel();
        const headers = new Map();
        const res = { setHeader: (key: string, value: string) => headers.set(key, value) } as unknown as ApiResponse;
        for (let i = 0; i < 8; i++) {
            await enforceAdminLoginLimit(redis.client, { headers: { 'x-vercel-forwarded-for': `192.0.2.${i}` } }, res);
        }
        redis.now = 30;
        await assert.rejects(enforceAdminLoginLimit(redis.client, { headers: {} }, res),
            (error: unknown) => error instanceof HttpError && error.statusCode === 429);
        assert.equal(headers.get('Retry-After'), '870');
        assert.equal(redis.values.size, 1);
        redis.now = 901;
        await enforceAdminLoginLimit(redis.client, { headers: {} }, res);
    } finally {
        if (previous === undefined) delete process.env.VERCEL; else process.env.VERCEL = previous;
    }
});

test('wiring: staged pull commits follow all downloads and active scope validation', () => {
    const source = readFileSync(new URL('../contexts/SyncContext.tsx', import.meta.url), 'utf8');
    assert.match(source, /subscribe\('dirty', \(\) => pullAbortRef.current\?\.abort\(\)\)/);
    assert.match(source, /if \(!isCurrent\(\)\) return;\s*\/\/ No await below[^\n]*\n\s*for \(const commit of commits\) commit\(\);/);
    assert.match(source, /window.setInterval\(\(\) => \{ void refresh\(\); \}, 15_000\)/);
    assert.doesNotMatch(source, /const refreshClock/);
});
