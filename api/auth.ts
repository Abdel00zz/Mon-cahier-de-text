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
import { getRedis, KEYS } from './_lib/redis.js';
import { assertName, assertPassword, normalizePhone } from './_lib/validate.js';
interface StoredUser {
  phone: string;
  nom: string;
  prenom: string;
  passwordHash: string;
  createdAt: string;
  hasCompletedWelcome?: boolean;
  blocked?: boolean;
}

interface AuthBody {
  action?: string;
  nom?: string;
  prenom?: string;
  phone?: string;
  password?: string;
}

const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_WINDOW_SECONDS = 300;
const INVALID_CREDENTIALS = 'Téléphone ou mot de passe incorrect.';

const publicUser = (user: StoredUser) => ({
  phone: user.phone,
  nom: user.nom,
  prenom: user.prenom,
  hasCompletedWelcome: user.hasCompletedWelcome === true,
});

// `lastSyncAt` n'appartient qu'à cette projection : il est réécrit à chaque push
// par /api/sync. Le compte lui-même ne le porte pas, pour éviter deux sources
// de vérité dont une seule serait tenue à jour.
const initialAdminSnapshot = (user: StoredUser) => ({
  phone: user.phone,
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
  await redis.hsetnx(KEYS.adminSnapshots, user.phone, initialAdminSnapshot(user));
};

const handleRegister = async (body: AuthBody, res: ApiResponse) => {
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

  try {
    await redis.hset(KEYS.adminSnapshots, { [phone]: initialAdminSnapshot(user) });
  } catch (error) {
    // Évite un compte créé mais invisible dans l'administration si la seconde
    // écriture Redis échoue. Le numéro reste ainsi disponible pour un nouvel essai.
    await redis.del(KEYS.user(phone)).catch(() => undefined);
    throw error;
  }

  const token = await signSession({ phone, role: 'teacher' }, SESSION_MAX_AGE);
  setCookie(res, SESSION_COOKIE, token, SESSION_MAX_AGE);
  res.status(201).json({ user: publicUser(user) });
};

const handleLogin = async (body: AuthBody, res: ApiResponse) => {
  const phone = normalizePhone(body.phone);
  if (typeof body.password !== 'string' || !body.password) {
    throw new HttpError(400, 'Mot de passe manquant.');
  }

  const redis = await getRedis();
  const rateKey = KEYS.loginRateLimit(phone);
  const attempts = Number(await redis.incr(rateKey));
  if (attempts === 1) await redis.expire(rateKey, LOGIN_WINDOW_SECONDS);
  if (attempts > LOGIN_MAX_ATTEMPTS) {
    throw new HttpError(429, 'Trop de tentatives. Réessayez dans quelques minutes.');
  }

  const user = await redis.get<StoredUser>(KEYS.user(phone));
  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    throw new HttpError(401, INVALID_CREDENTIALS);
  }

  // Le quota protège contre le forçage du mot de passe, pas contre l'usage
  // légitime : une identification réussie libère le budget de la fenêtre.
  // Sans cela, dix connexions valides (multi-appareils, réinstallation de la
  // PWA) suffisaient à verrouiller le compte pendant cinq minutes.
  await redis.del(rateKey).catch(() => undefined);

  if (user.blocked) {
    throw new HttpError(403, "Ce compte a été bloqué par l'administration. Contactez votre établissement.");
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
    throw new HttpError(403, "Ce compte a été bloqué par l'administration.");
  }
  await ensureAdminSnapshot(redis, user);
  res.status(200).json({ user: publicUser(user) });
};

/** Le marqueur d'accueil appartient au compte, pas à un appareil donné. */
const handleCompleteWelcome = async (req: ApiRequest, res: ApiResponse) => {
  const { phone } = await requireUser(req);
  const redis = await getRedis();
  const user = await redis.get<StoredUser>(KEYS.user(phone));
  if (!user) throw new HttpError(404, 'Compte introuvable.');

  const updatedUser: StoredUser = { ...user, hasCompletedWelcome: true };
  await redis.set(KEYS.user(phone), updatedUser);
  res.status(200).json({ user: publicUser(updatedUser) });
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') {
      const action = getQueryParam(req, 'action');
      if (action === 'me') return await handleMe(req, res);
      throw new HttpError(400, 'Action inconnue.');
    }

    if (req.method !== 'POST') {
      throw new HttpError(405, 'Méthode non autorisée.');
    }

    const body = parseBody<AuthBody>(req.body);
    switch (body.action) {
      case 'register':
        return await handleRegister(body, res);
      case 'login':
        return await handleLogin(body, res);
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
