import { randomUUID } from 'node:crypto';
import { FirestoreStore } from './firestoreStore.js';
import { HttpError } from './http.js';
import { KEYS } from './redis.js';
import { pushEndpointField, type PushEntry } from './webpush.js';

type Subscription = PushEntry['subs'][number];
type NormalizeEntry = (value: unknown) => PushEntry;
const entryValue = (value: unknown): PushEntry => {
  if (!value || typeof value !== 'object' || !Array.isArray((value as PushEntry).subs)) return {subs: []};
  const entry = value as PushEntry;
  return {...entry, subs: entry.subs.filter(sub => sub && typeof sub.endpoint === 'string'
    && typeof sub.keys?.p256dh === 'string' && typeof sub.keys?.auth === 'string')};
};
const sameBinding = (a: Subscription, b: Subscription) => a.endpoint === b.endpoint && a.binding === b.binding
  && a.keys.p256dh === b.keys.p256dh && a.keys.auth === b.keys.auth;

/** Reserve the endpoint and update the device list in one Firestore transaction. */
export async function subscribeFirestoreWebPush(store: FirestoreStore, phone: string, subscription: Subscription, normalize: NormalizeEntry) {
  const subscribed = { ...subscription, binding: randomUUID() };
  await store.atomic(async view => {
    const user = await view.get<{blocked?: boolean}>(KEYS.user(phone));
    if (!user) throw new HttpError(404, 'Compte supprimé.');
    if (user.blocked) throw new HttpError(403, 'Ce compte a été bloqué.', 'ACCOUNT_BLOCKED');
    const field = pushEndpointField(subscription.endpoint);
    let owner = await view.hget<string>(KEYS.pushEndpointOwners, field);
    if (!owner) {
      const legacy = await view.hgetall<Record<string, unknown>>(KEYS.pushSubs) ?? {};
      owner = Object.keys(legacy).find(candidate => candidate !== phone && normalize(legacy[candidate]).subs.some(sub => sub.endpoint === subscription.endpoint)) ?? null;
    }
    if (owner && owner !== phone && normalize(await view.hget(KEYS.pushSubs, owner)).subs.some(sub => sub.endpoint === subscription.endpoint)) {
      throw new HttpError(409, 'Cet appareil est déjà associé à un autre compte.');
    }
    const current = normalize(await view.hget(KEYS.pushSubs, phone));
    const others = current.subs.filter(sub => sub.endpoint !== subscription.endpoint);
    if (others.length >= 5) throw new HttpError(429, 'Limite de 5 appareils atteinte.');
    await view.hset(KEYS.pushEndpointOwners, { [field]: phone });
    await view.hset(KEYS.pushSubs, { [phone]: { ...current, subs: [...others, subscribed] } });
  });
}

export async function unsubscribeFirestoreWebPush(store: FirestoreStore, phone: string, endpoint: string, normalize: NormalizeEntry) {
  return store.atomic(async view => {
    const current = normalize(await view.hget(KEYS.pushSubs, phone));
    const subs = current.subs.filter(sub => sub.endpoint !== endpoint);
    const removed = subs.length !== current.subs.length;
    if (removed) {
      if (subs.length) await view.hset(KEYS.pushSubs, { [phone]: { ...current, subs } });
      else await view.hdel(KEYS.pushSubs, phone);
    }
    const field = pushEndpointField(endpoint);
    if (await view.hget(KEYS.pushEndpointOwners, field) === phone) await view.hdel(KEYS.pushEndpointOwners, field);
    return removed;
  });
}

/** A late delivery result cannot remove or overwrite a newly registered device. */
export async function reconcileFirestoreWebPush(store: FirestoreStore, phone: string, attempted: Subscription[], surviving: Subscription[], notified?: {lastNotifiedAt: string; lastSeverity: string}) {
  const expired = attempted.filter(sub => !surviving.some(next => sameBinding(sub, next)));
  await store.atomic(async view => {
    const current = entryValue(await view.hget(KEYS.pushSubs, phone));
    const removed = current.subs.filter(sub => expired.some(old => sameBinding(sub, old)));
    const subs = current.subs.filter(sub => !removed.includes(sub));
    if (subs.length) {
      const freshNotification = notified && (!current.lastNotifiedAt || notified.lastNotifiedAt > current.lastNotifiedAt) ? notified : {};
      await view.hset(KEYS.pushSubs, { [phone]: { ...current, ...freshNotification, subs } });
    } else await view.hdel(KEYS.pushSubs, phone);
    for (const sub of removed) {
      const field = pushEndpointField(sub.endpoint);
      if (await view.hget(KEYS.pushEndpointOwners, field) === phone) await view.hdel(KEYS.pushEndpointOwners, field);
    }
  });
}
