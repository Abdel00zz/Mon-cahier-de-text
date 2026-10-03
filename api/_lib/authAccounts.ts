import { createHash } from 'node:crypto';
import type { UserRecord } from 'firebase-admin/auth';
import { teacherUid } from './firebaseAdmin.js';
import { HttpError } from './http.js';

export interface StoredAccount {
  id?: string;
  phone: string;
  email?: string;
  provider?: 'password' | 'google.com';
  firebaseUid?: string;
  nom: string;
  prenom: string;
  passwordHash?: string;
  createdAt: string;
  hasCompletedWelcome?: boolean;
  blocked?: boolean;
}
export const accountKey = (user: StoredAccount) => user.id ?? user.phone;
export const accountFirebaseUid = (user: StoredAccount) => user.firebaseUid ?? teacherUid(accountKey(user));

/** Imported phone accounts retain their original paths; new identities have opaque keys. */
export function firebaseAccountId(identity: Pick<UserRecord, 'uid' | 'email' | 'customClaims'>): string {
  const legacy = /^(\d{8,15})@cahier\.internal$/.exec(identity.email ?? '');
  if (legacy && identity.uid === teacherUid(legacy[1])) return legacy[1];
  return `acct_${createHash('sha256').update(identity.uid).digest('hex').slice(0, 32)}`;
}

export function normalizeEmail(value: unknown): string {
  if (typeof value !== 'string') throw new HttpError(400, 'Adresse e-mail manquante.');
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.endsWith('@cahier.internal')) {
    throw new HttpError(400, 'Renseignez une adresse e-mail valide.');
  }
  return email;
}
