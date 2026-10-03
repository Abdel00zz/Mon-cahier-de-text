import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { initializeFirestore } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';

/** Same protected server credentials as FCM. Never imported by the Web bundle. */
function firebaseAdminApp() {
  if (getApps().length) return getApp();
  const projectId = process.env.FCM_PROJECT_ID;
  const clientEmail = process.env.FCM_CLIENT_EMAIL;
  const privateKey = process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    return initializeApp({ projectId: projectId ?? 'demo-cahier-text' });
  }
  if (!projectId || !clientEmail || !privateKey) throw new Error('Firebase server credentials missing');
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
}

export const firebaseDb = () => initializeFirestore(firebaseAdminApp(), { preferRest: !process.env.FIRESTORE_EMULATOR_HOST });
export const firebaseAuth = () => getAuth(firebaseAdminApp());
export const teacherUid = (phone: string) => `teacher-${createHash('sha256').update(phone).digest('hex')}`;
export const teacherEmail = (phone: string) => `${phone}@cahier.internal`;
