import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import assert from 'node:assert/strict';
import { hashPassword } from '../../api/_lib/auth.js';
import { firebaseAuth, teacherUid } from '../../api/_lib/firebaseAdmin.js';
import { importFirebaseTeacher, verifyFirebasePassword } from '../../api/_lib/firebaseIdentity.js';
import { FirestoreStore } from '../../api/_lib/firestoreStore.js';

const { values } = parseArgs({ options: { credentials: { type: 'string' }, 'android-config': { type: 'string' } } });
if (!values.credentials || !values['android-config']) throw new Error('Use --credentials <protected JSON> --android-config <google-services.json>');
const account = JSON.parse(await readFile(values.credentials, 'utf8'));
const android = JSON.parse(await readFile(values['android-config'], 'utf8'));
if (account.project_id !== 'cahier-text' || android.project_info?.project_id !== 'cahier-text') throw new Error('Unexpected Firebase project');
process.env.FCM_PROJECT_ID = account.project_id;
process.env.FCM_CLIENT_EMAIL = account.client_email;
process.env.FCM_PRIVATE_KEY = account.private_key;
process.env.FIREBASE_WEB_API_KEY = android.client?.[0]?.api_key?.[0]?.current_key;
const phone = `migration-qa-${randomUUID()}`;
const password = `QA-${randomUUID()}`;
let created = false;
try {
  created = await importFirebaseTeacher({ phone, nom: 'Migration QA', prenom: 'Temporary', passwordHash: await hashPassword(password) }, false);
  assert.equal(await verifyFirebasePassword(phone, password), true);
  assert.equal(await verifyFirebasePassword(phone, `${password}-invalid`), false);
  const store = new FirestoreStore(); const qaKey = `migration:qa:${randomUUID()}`;
  const notebook = { text: 'رياضيات 🧮'.repeat(80_000) };
  try {
    await store.set(qaKey, notebook, { nx: true });
    assert.deepEqual(await store.get(qaKey), notebook);
  } finally { await store.del(qaKey); }
  await firebaseAuth().updateUser(teacherUid(phone), { disabled: true });
  await assert.rejects(verifyFirebasePassword(phone, password), (error: { statusCode?: number }) => error.statusCode === 403);
  console.log(JSON.stringify({ project: 'cahier-text', originalScryptPasswordVerified: true, wrongPasswordRejected: true, blockedAccountRejected: true, firestoreChunkRoundTripVerified: true }));
} finally {
  if (created) {
    await firebaseAuth().deleteUser(teacherUid(phone));
    console.log(JSON.stringify({ temporaryQaAccountRemoved: true }));
  }
}
