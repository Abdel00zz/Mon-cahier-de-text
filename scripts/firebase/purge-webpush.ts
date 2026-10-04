import { parseArgs } from 'node:util';
import { getRedis, isFirestoreStore } from '../../api/_lib/redis.js';

/*
 * Purge des clés Web Push héritées.
 *
 * Le Web Push a été retiré : plus aucun code ne lit `push:subs` (abonnements
 * navigateur) ni `push:endpoint-owners` (index endpoint → téléphone). Ces deux
 * hachages restent néanmoins en base jusqu'à leur suppression explicite.
 *
 * Simulation par défaut : le script annonce ce qu'il ferait et ne supprime
 * rien. `--apply` exécute la suppression. Le push natif (`push:native-owners`,
 * `push:native:<téléphone>`) n'est JAMAIS touché.
 */
const LEGACY_KEYS = ['push:subs', 'push:endpoint-owners'] as const;
const NATIVE_KEYS_NOTE = 'push:native-owners / push:native:<téléphone> (conservés)';

const { values } = parseArgs({ options: { apply: { type: 'boolean', default: false } } });
const apply = values.apply === true;

const hasCloudAccess = Boolean(
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
    || (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
    || (process.env.FCM_PROJECT_ID && process.env.FCM_CLIENT_EMAIL && process.env.FCM_PRIVATE_KEY)
    || (process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST),
);

if (!hasCloudAccess) {
    console.log('Web Push hérité :', LEGACY_KEYS.join(', '));
    console.log('Aucun accès cloud configuré (UPSTASH_REDIS_REST_* / KV_REST_API_* / FCM_* / émulateur).');
    console.log(`Simulation seule — rien n'a été supprimé. ${NATIVE_KEYS_NOTE}.`);
    process.exit(apply ? 1 : 0);
}

const redis = await getRedis();
const backend = isFirestoreStore(redis) ? 'Firestore' : 'Redis';
console.log(`Purge Web Push héritée sur ${backend}${apply ? ' (application)' : ' (simulation)'}`);

let planned = 0;
for (const key of LEGACY_KEYS) {
    const entries = await redis.hgetall<Record<string, unknown>>(key);
    const count = Object.keys(entries ?? {}).length;
    planned += count;
    console.log(`  ${key} : ${count} entrée(s)`);
    if (apply && count > 0) {
        await redis.del(key);
        console.log(`  ${key} : supprimée`);
    }
}

console.log(apply
    ? `Terminé : ${planned} entrée(s) Web Push supprimée(s). ${NATIVE_KEYS_NOTE}.`
    : `Simulation : ${planned} entrée(s) seraient supprimées. Relancer avec --apply. ${NATIVE_KEYS_NOTE}.`);
