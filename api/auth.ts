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
import type { Cycle } from '../types.js';

interface StoredUser {
  phone: string;
  nom: string;
  prenom: string;
  passwordHash: string;
  createdAt: string;
  cycles?: Cycle[];
  subjects?: string[];
  lastSyncAt?: string;
  blocked?: boolean;
}

interface AuthBody {
  action?: string;
  nom?: string;
  prenom?: string;
  phone?: string;
  password?: string;
  cycles?: unknown;
  subjects?: unknown;
}

const VALID_CYCLES: Cycle[] = ['college', 'lycee', 'prepa'];
const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_WINDOW_SECONDS = 300;
const INVALID_CREDENTIALS = 'Téléphone ou mot de passe incorrect.';

const normalizeCycles = (value: unknown): Cycle[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((cycle): cycle is Cycle => VALID_CYCLES.includes(cycle as Cycle));
};

const normalizeSubjects = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((subject): subject is string => typeof subject === 'string')
    .map(subject => subject.trim())
    .filter(Boolean)
    .slice(0, 20);
};

const publicUser = (user: StoredUser) => ({
  phone: user.phone,
  nom: user.nom,
  prenom: user.prenom,
  cycles: user.cycles ?? [],
  subjects: user.subjects ?? [],
});

const handleRegister = async (body: AuthBody, res: ApiResponse) => {
  const nom = assertName(body.nom, 'Nom');
  const prenom = assertName(body.prenom, 'Prénom');
  const phone = normalizePhone(body.phone);
  const password = assertPassword(body.password);
  const cycles = normalizeCycles(body.cycles);
  const subjects = normalizeSubjects(body.subjects);
  const redis = await getRedis();

  const user: StoredUser = {
    phone,
    nom,
    prenom,
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
    cycles,
    subjects,
  };

  const created = await redis.set(KEYS.user(phone), user, { nx: true });
  if (created === null) {
    throw new HttpError(409, 'Un compte existe déjà avec ce numéro de téléphone.');
  }

  await redis.hset(KEYS.adminSnapshots, { [phone]: { phone, nom, prenom, cycles, subjects, lastSyncAt: null, classes: [] } });

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
  if (user.blocked) {
    throw new HttpError(403, "Ce compte a été bloqué par l'administration. Contactez votre établissement.");
  }

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
  res.status(200).json({ user: publicUser(user) });
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
      default:
        throw new HttpError(400, 'Action inconnue.');
    }
  } catch (error) {
    sendError(res, error);
  }
}
