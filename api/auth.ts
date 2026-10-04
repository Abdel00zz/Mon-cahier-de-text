import { ApiRequest, ApiResponse, HttpError, getQueryParam, parseBody, sendError } from './_lib/http.js';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  clearCookie,
  hashPassword,
  requireUser,
  setCookie,
  signSession,
  verifyPassword,
} from './_lib/auth.js';
import { getRedis, KEYS, isFirestoreStore } from './_lib/redis.js';
import { importFirebaseTeacher, verifyFirebasePassword } from './_lib/firebaseIdentity.js';
import { beginAccountWrite } from './_lib/atomicWrite.js';
import { firebaseAuth, teacherUid } from './_lib/firebaseAdmin.js';
import { assertBodySize, assertName, assertPassword, normalizePhone } from './_lib/validate.js';
import { accountKey, firebaseAccountId, normalizeEmail, type StoredAccount as StoredUser } from './_lib/authAccounts.js';
import { firebaseIdentityRequest, verifyGoogleSession } from './_lib/firebaseSignIn.js';

interface AuthBody {
  action?: string;
  nom?: string;
  prenom?: string;
  phone?: string;
  password?: string;
  email?: string;
  idToken?: string;
  locale?: string;
}

const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_WINDOW_SECONDS = 300;
const INVALID_CREDENTIALS = 'Téléphone ou mot de passe incorrect.';

const publicUser = (user: StoredUser) => ({
  id: accountKey(user),
  phone: user.phone,
  ...(user.email ? { email: user.email } : {}),
  provider: user.provider ?? 'password',
  nom: user.nom,
  prenom: user.prenom,
  hasCompletedWelcome: user.hasCompletedWelcome === true,
});

// `lastSyncAt` n'appartient qu'à cette projection : il est réécrit à chaque push
// par /api/sync. Le compte lui-même ne le porte pas, pour éviter deux sources
// de vérité dont une seule serait tenue à jour.
const initialAdminSnapshot = (user: StoredUser) => ({
  phone: accountKey(user), // Historical snapshot key, independent of contact information.
  nom: user.nom,
  prenom: user.prenom,
  lastSyncAt: null,
  classes: [],
});

/** Répare sans écraser les données pédagogiques un éventuel index admin manquant. */
const ensureAdminSnapshot = async (
  redis: Awaited<ReturnType<typeof getRedis>>,
  user: StoredUser,
): Promise<void> => {
  await redis.hsetnx(KEYS.adminSnapshots, accountKey(user), initialAdminSnapshot(user));
};

const openSession = async (user: StoredUser, res: ApiResponse, status = 200, isNewAccount = false) => {
  if (user.blocked) throw new HttpError(403, 'Compte suspendu. Contactez votre établissement.', 'ACCOUNT_BLOCKED');
  const token = await signSession({ accountId: accountKey(user), role: 'teacher' }, SESSION_MAX_AGE);
  setCookie(res, SESSION_COOKIE, token, SESSION_MAX_AGE);
  res.status(status).json({ user: publicUser(user), isNewAccount });
};

const limitAttempts = async (identity: string) => {
  const redis = await getRedis();
  const rateKey = KEYS.loginRateLimit(identity);
  const attempts = isFirestoreStore(redis) ? await redis.atomic(async view => {
    const count = await view.incr(rateKey);
    if (count === 1) await view.expire(rateKey, LOGIN_WINDOW_SECONDS);
    return count;
  }) : Number(await redis.incr(rateKey));
  if (!isFirestoreStore(redis) && attempts === 1) await redis.expire(rateKey, LOGIN_WINDOW_SECONDS);
  if (attempts > LOGIN_MAX_ATTEMPTS) throw new HttpError(429, 'Trop de tentatives. Réessayez dans quelques minutes.', 'TOO_MANY_ATTEMPTS');
  return { redis, rateKey };
};

const firebaseStore = async () => {
  const redis = await getRedis();
  if (!isFirestoreStore(redis)) throw new HttpError(503, 'Connexion Firebase indisponible.', 'AUTH_UNAVAILABLE');
  return redis;
};

const createFirebaseAccount = async (user: StoredUser) => {
  const redis = await firebaseStore();
  return redis.atomic(async view => {
    const existing = await view.get<StoredUser>(KEYS.user(accountKey(user)));
    if (existing) return { user: existing, created: false };
    await view.set(KEYS.user(accountKey(user)), user);
    await view.hset(KEYS.adminSnapshots, { [accountKey(user)]: initialAdminSnapshot(user) });
    return { user, created: true };
  });
};

const handleEmailRegister = async (body: AuthBody, res: ApiResponse) => {
  const email = normalizeEmail(body.email);
  const nom = assertName(body.nom, 'Nom');
  const prenom = assertName(body.prenom, 'Prénom');
  const phone = body.phone?.trim() ? normalizePhone(body.phone) : '';
  const password = assertPassword(body.password);
  await limitAttempts(`register:${email}`);
  await firebaseStore();
  let uid: string | undefined;
  let createdUser: StoredUser | undefined;
  try {
    const identity = await firebaseAuth().createUser({ email, password, displayName: `${prenom} ${nom}` });
    uid = identity.uid;
    const user: StoredUser = { id: firebaseAccountId(identity), firebaseUid: uid, email, phone, nom, prenom,
      provider: 'password', createdAt: new Date().toISOString(), hasCompletedWelcome: false };
    await firebaseAuth().setCustomUserClaims(uid, { role: 'teacher' });
    await createFirebaseAccount(user);
    createdUser = user;
  } catch (error) {
    if (uid) await firebaseAuth().deleteUser(uid).catch(() => undefined);
    if ((error as { code?: string }).code === 'auth/email-already-exists') {
      throw new HttpError(409, 'Un compte existe déjà avec cette adresse e-mail.', 'ACCOUNT_EXISTS');
    }
    throw error;
  }
  return await openSession(createdUser!, res, 201, true);
};

/**
 * Vrai quand l'adresse existe déjà, mais uniquement via Google : le compte n'a
 * donc aucun mot de passe Firebase. Sans ce message, le professeur croit à une
 * faute de frappe et réessaie indéfiniment.
 */
const googleOnlyAccount = async (email: string): Promise<boolean> => {
  try {
    const record = await firebaseAuth().getUserByEmail(email);
    const providers = record.providerData.map(provider => provider.providerId);
    return providers.includes('google.com') && !providers.includes('password');
  } catch {
    return false; // Adresse inconnue : la réponse générique reste la bonne.
  }
};

const handleEmailLogin = async (body: AuthBody, res: ApiResponse) => {
  const email = normalizeEmail(body.email);
  if (typeof body.password !== 'string' || !body.password || body.password.length > 128) throw new HttpError(400, 'Mot de passe manquant.');
  const { redis, rateKey } = await limitAttempts(email);
  await firebaseStore();
  const identity = await firebaseIdentityRequest('signInWithPassword', { email, password: body.password, returnSecureToken: true })
    .catch(async (error: unknown) => {
      if (error instanceof HttpError && error.code === 'INVALID_CREDENTIALS' && await googleOnlyAccount(email)) {
        throw new HttpError(409, 'Ce compte se connecte avec Google.', 'PROVIDER_GOOGLE');
      }
      throw error;
    });
  if (!identity.localId) throw new HttpError(401, 'Identifiants incorrects.', 'INVALID_CREDENTIALS');
  const record = await firebaseAuth().getUser(identity.localId);
  const user = await redis.get<StoredUser>(KEYS.user(firebaseAccountId(record)));
  if (!user || user.firebaseUid !== identity.localId) throw new HttpError(401, 'Compte introuvable. Reconnectez-vous avec Google.', 'INVALID_CREDENTIALS');
  await openSession(user, res);
  await redis.del(rateKey).catch(() => undefined);
};

const handleGoogle = async (body: AuthBody, res: ApiResponse, native: boolean) => {
  const redis = await firebaseStore();
  let token = body.idToken;
  if (native) {
    if (typeof token !== 'string' || !token || token.length > 12_000) throw new HttpError(400, 'Connexion Google invalide.');
    const result = await firebaseIdentityRequest('signInWithIdp', {
      postBody: new URLSearchParams({ id_token: token, providerId: 'google.com' }).toString(),
      requestUri: 'https://mon-cahier-de-text.vercel.app', returnSecureToken: true, returnIdpCredential: true,
    });
    token = result.idToken;
  }
  const decoded = await verifyGoogleSession(token);
  const record = await firebaseAuth().getUser(decoded.uid);
  const id = firebaseAccountId(record);
  await limitAttempts(`google:${id}`);
  let user = await redis.get<StoredUser>(KEYS.user(id));
  let isNewAccount = false;
  if (!user) {
    // Un professeur ne doit jamais obtenir deux espaces : si Firebase a créé une
    // seconde identité pour la même adresse (liaison des comptes désactivée),
    // on refuse au lieu de provisionner un espace vide qui ferait disparaître
    // les cahiers aux yeux de l'enseignant.
    const owner = await firebaseAuth().getUserByEmail(decoded.email!).catch(() => null);
    if (owner && owner.uid !== record.uid) {
      throw new HttpError(409, 'Un compte existe déjà avec cette adresse e-mail. Connectez-vous avec votre méthode habituelle.', 'ACCOUNT_EXISTS');
    }
    const parts = (record.displayName ?? '').trim().split(/\s+/);
    const provisioned = await createFirebaseAccount({ id, firebaseUid: record.uid, email: normalizeEmail(record.email), phone: '',
      prenom: parts.shift()?.slice(0, 60) || 'Enseignant', nom: parts.join(' ').slice(0, 60), provider: 'google.com',
      createdAt: new Date().toISOString(), hasCompletedWelcome: false });
    user = provisioned.user; isNewAccount = provisioned.created;
  }
  // A provider never replaces an existing profile, notebook or local workspace.
  if (user.firebaseUid !== record.uid) throw new HttpError(409, 'Identité de compte incompatible.');
  await openSession(user, res, 200, isNewAccount);
};

const handleResetPassword = async (body: AuthBody, res: ApiResponse) => {
  const email = normalizeEmail(body.email);
  await limitAttempts(`reset:${email}`);
  try {
    await firebaseIdentityRequest('sendOobCode', { requestType: 'PASSWORD_RESET', email }, body.locale);
  } catch (error) {
    // Keep the same response for unknown addresses: avoid account enumeration.
    if (!(error instanceof HttpError) || error.statusCode !== 401) throw error;
  }
  res.status(200).json({ ok: true });
};

const handleRegister = async (body: AuthBody, res: ApiResponse) => {
  if (body.email !== undefined) return handleEmailRegister(body, res);
  const nom = assertName(body.nom, 'Nom');
  const prenom = assertName(body.prenom, 'Prénom');
  const phone = normalizePhone(body.phone);
  const password = assertPassword(body.password);
  const redis = await getRedis();

  const user: StoredUser = {
    phone,
    nom,
    prenom,
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
    hasCompletedWelcome: false,
  };

  const created = await redis.set(KEYS.user(phone), user, { nx: true });
  if (created === null) {
    throw new HttpError(409, 'Un compte existe déjà avec ce numéro de téléphone.');
  }

  let firebaseCreated = false;
  try {
    if (isFirestoreStore(redis)) firebaseCreated = await importFirebaseTeacher({ ...user, passwordHash: user.passwordHash! }, false);
    await redis.hset(KEYS.adminSnapshots, { [phone]: initialAdminSnapshot(user) });
  } catch (error) {
    // Évite un compte créé mais invisible dans l'administration si la seconde
    // écriture Redis échoue. Le numéro reste ainsi disponible pour un nouvel essai.
    await redis.del(KEYS.user(phone)).catch(() => undefined);
    if (firebaseCreated) await firebaseAuth().deleteUser(teacherUid(phone)).catch(() => undefined);
    throw error;
  }

  const token = await signSession({ phone, role: 'teacher' }, SESSION_MAX_AGE);
  setCookie(res, SESSION_COOKIE, token, SESSION_MAX_AGE);
  res.status(201).json({ user: publicUser(user) });
};

const handleLogin = async (body: AuthBody, res: ApiResponse) => {
  if (body.email !== undefined) return handleEmailLogin(body, res);
  const phone = normalizePhone(body.phone);
  if (typeof body.password !== 'string' || !body.password) {
    throw new HttpError(400, 'Mot de passe manquant.');
  }

  const redis = await getRedis();
  const rateKey = KEYS.loginRateLimit(phone);
  const attempts = isFirestoreStore(redis) ? await redis.atomic(async view => {
    const count = await view.incr(rateKey);
    if (count === 1) await view.expire(rateKey, LOGIN_WINDOW_SECONDS);
    return count;
  }) : Number(await redis.incr(rateKey));
  if (!isFirestoreStore(redis) && attempts === 1) await redis.expire(rateKey, LOGIN_WINDOW_SECONDS);
  if (attempts > LOGIN_MAX_ATTEMPTS) {
    throw new HttpError(429, 'Trop de tentatives. Réessayez dans quelques minutes.');
  }

  const user = await redis.get<StoredUser>(KEYS.user(phone));
  if (!user || !(isFirestoreStore(redis)
    ? await verifyFirebasePassword(phone, body.password)
    : await verifyPassword(body.password, user.passwordHash ?? ''))) {
    throw new HttpError(401, INVALID_CREDENTIALS);
  }

  // Le quota protège contre le forçage du mot de passe, pas contre l'usage
  // légitime : une identification réussie libère le budget de la fenêtre.
  // Sans cela, dix connexions valides (multi-appareils, réinstallation de la
  // PWA) suffisaient à verrouiller le compte pendant cinq minutes.
  await redis.del(rateKey).catch(() => undefined);

  if (user.blocked) {
    throw new HttpError(403, "Ce compte a été bloqué par l'administration. Contactez votre établissement.", 'ACCOUNT_BLOCKED');
  }
  await ensureAdminSnapshot(redis, user);

  const token = await signSession({ phone, role: 'teacher' }, SESSION_MAX_AGE);
  setCookie(res, SESSION_COOKIE, token, SESSION_MAX_AGE);
  res.status(200).json({ user: publicUser(user) });
};

const handleMe = async (req: ApiRequest, res: ApiResponse) => {
  const { phone } = await requireUser(req);
  const redis = await getRedis();
  const user = await redis.get<StoredUser>(KEYS.user(phone));
  if (!user) {
    clearCookie(res, SESSION_COOKIE);
    throw new HttpError(401, 'Compte introuvable. Veuillez vous reconnecter.');
  }
  if (user.blocked) {
    clearCookie(res, SESSION_COOKIE);
    throw new HttpError(403, "Ce compte a été bloqué par l'administration.", 'ACCOUNT_BLOCKED');
  }
  await ensureAdminSnapshot(redis, user);
  res.status(200).json({ user: publicUser(user) });
};

/** Le marqueur d'accueil appartient au compte, pas à un appareil donné. */
const handleCompleteWelcome = async (req: ApiRequest, res: ApiResponse) => {
  const { phone } = await requireUser(req);
  const redis = await getRedis();
  const write = await beginAccountWrite(redis, phone);
  const user = await redis.get<StoredUser>(KEYS.user(phone));
  if (!user) throw new HttpError(404, 'Compte introuvable.');

  const updatedUser: StoredUser = { ...user, hasCompletedWelcome: true };
  write.set(KEYS.user(phone), updatedUser);
  await write.exec();
  res.status(200).json({ user: publicUser(updatedUser) });
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') {
      const action = getQueryParam(req, 'action');
      if (action === 'me') return await handleMe(req, res);
      if (action === 'config') {
        const projectId = process.env.FCM_PROJECT_ID;
        const apiKey = process.env.FIREBASE_WEB_API_KEY;
        if (!projectId || !apiKey) throw new HttpError(503, 'Connexion Firebase indisponible.', 'AUTH_UNAVAILABLE');
        return res.status(200).json({ apiKey, projectId, authDomain: `${projectId}.firebaseapp.com` });
      }
      throw new HttpError(400, 'Action inconnue.');
    }

    if (req.method !== 'POST') {
      throw new HttpError(405, 'Méthode non autorisée.');
    }

    assertBodySize(req.body);
    const body = parseBody<AuthBody>(req.body);
    switch (body.action) {
      case 'register':
        return await handleRegister(body, res);
      case 'login':
        return await handleLogin(body, res);
      case 'google':
        return await handleGoogle(body, res, false);
      case 'googleNative':
        return await handleGoogle(body, res, true);
      case 'resetPassword':
        return await handleResetPassword(body, res);
      case 'logout':
        clearCookie(res, SESSION_COOKIE);
        return res.status(200).json({ ok: true });
      case 'completeWelcome':
        return await handleCompleteWelcome(req, res);
      default:
        throw new HttpError(400, 'Action inconnue.');
    }
  } catch (error) {
    sendError(res, error);
  }
}
