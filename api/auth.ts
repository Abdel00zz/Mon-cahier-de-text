import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

interface ApiRequest {
  method?: string;
  url?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[]>;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string | string[]) => void;
}

class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

type Cycle = 'college' | 'lycee' | 'prepa';

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

interface SessionPayload {
  phone?: string;
  role?: 'teacher' | 'admin';
}

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number }
) => Promise<Buffer>;

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };
const KEY_LENGTH = 64;
const SESSION_COOKIE = 'cdt_session';
const SESSION_MAX_AGE = 30 * 24 * 3600;
const VALID_CYCLES: Cycle[] = ['college', 'lycee', 'prepa'];
const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_WINDOW_SECONDS = 300;
const INVALID_CREDENTIALS = 'Téléphone ou mot de passe incorrect.';

const KEYS = {
  user: (phone: string) => `user:${phone}`,
  adminSnapshots: 'admin:snapshots',
  loginRateLimit: (phone: string) => `rl:login:${phone}`,
} as const;

const parseBody = <T>(body: unknown): T => {
  if (!body) return {} as T;
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as T;
    } catch {
      return {} as T;
    }
  }
  if (typeof body === 'object') return body as T;
  return {} as T;
};

const sendError = (res: ApiResponse, error: unknown): void => {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }
  console.error('[api/auth] erreur inattendue', error);
  res.status(500).json({ error: 'Erreur interne du serveur.' });
};

const getQueryParam = (req: ApiRequest, name: string): string | undefined => {
  const fromQuery = req.query?.[name];
  if (typeof fromQuery === 'string') return fromQuery;
  if (Array.isArray(fromQuery)) return fromQuery[0];
  if (!req.url) return undefined;
  try {
    const url = new URL(req.url, 'http://localhost');
    return url.searchParams.get(name) ?? undefined;
  } catch {
    return undefined;
  }
};

const normalizePhone = (value: unknown): string => {
  if (typeof value !== 'string') throw new HttpError(400, 'Numéro de téléphone manquant.');
  const digits = value.replace(/[^\d]/g, '').replace(/^00/, '');
  if (digits.length < 8 || digits.length > 15) {
    throw new HttpError(400, 'Numéro de téléphone invalide (8 à 15 chiffres attendus).');
  }
  return digits;
};

const assertName = (value: unknown, label: string): string => {
  if (typeof value !== 'string') throw new HttpError(400, `${label} manquant.`);
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > 60) {
    throw new HttpError(400, `${label} invalide (1 à 60 caractères).`);
  }
  return trimmed;
};

const assertPassword = (value: unknown): string => {
  if (typeof value !== 'string' || value.length < 8) {
    throw new HttpError(400, 'Le mot de passe doit contenir au moins 8 caractères.');
  }
  if (value.length > 128) throw new HttpError(400, 'Mot de passe trop long (128 caractères max).');
  return value;
};

const normalizeCycles = (value: unknown): Cycle[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((c): c is Cycle => VALID_CYCLES.includes(c as Cycle));
};

const normalizeSubjects = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((s): s is string => typeof s === 'string')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 20);
};

const redisCommand = async <T = unknown>(command: Array<string | number>): Promise<T> => {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new HttpError(500, 'Base de données non configurée. Ajoutez KV_REST_API_URL et KV_REST_API_TOKEN sur Vercel.');
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.error) {
    throw new HttpError(500, `Erreur Redis: ${data?.error ?? response.statusText}`);
  }
  return data.result as T;
};

const parseRedisJson = <T,>(value: unknown): T | null => {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const redisGetJson = async <T,>(key: string): Promise<T | null> =>
  parseRedisJson<T>(await redisCommand<string | null>(['GET', key]));

const redisSetJson = async (key: string, value: unknown, nx = false): Promise<unknown> => {
  const command: Array<string | number> = ['SET', key, JSON.stringify(value)];
  if (nx) command.push('NX');
  return redisCommand(command);
};

const redisHsetJson = async (key: string, field: string, value: unknown): Promise<unknown> =>
  redisCommand(['HSET', key, field, JSON.stringify(value)]);

const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH, SCRYPT_PARAMS);
  return `scrypt$N=${SCRYPT_PARAMS.N},r=${SCRYPT_PARAMS.r},p=${SCRYPT_PARAMS.p}$${salt.toString('base64')}$${hash.toString('base64')}`;
};

const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'scrypt') return false;
  const params: Record<string, number> = {};
  for (const pair of parts[1].split(',')) {
    const [key, value] = pair.split('=');
    params[key] = Number(value);
  }
  const salt = Buffer.from(parts[2], 'base64');
  const expected = Buffer.from(parts[3], 'base64');
  const actual = await scrypt(password, salt, expected.length, {
    N: params.N || SCRYPT_PARAMS.N,
    r: params.r || SCRYPT_PARAMS.r,
    p: params.p || SCRYPT_PARAMS.p,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

const getAuthSecret = (): string => {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new HttpError(500, 'AUTH_SECRET non configuré (32 caractères minimum requis).');
  }
  return secret;
};

const base64url = (value: Buffer | string): string => Buffer.from(value).toString('base64url');
const signJwtPart = (value: string): string =>
  createHmac('sha256', getAuthSecret()).update(value).digest('base64url');

const signSession = async (payload: SessionPayload, maxAgeSeconds: number): Promise<string> => {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify({ ...payload, iat: now, exp: now + maxAgeSeconds }));
  const unsigned = `${header}.${body}`;
  return `${unsigned}.${signJwtPart(unsigned)}`;
};

const verifySession = async (token: string): Promise<SessionPayload | null> => {
  try {
    const [header, body, signature] = token.split('.');
    if (!header || !body || !signature) return null;
    const unsigned = `${header}.${body}`;
    const expected = signJwtPart(unsigned);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload & { exp?: number };
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { phone: payload.phone, role: payload.role };
  } catch {
    return null;
  }
};

const readCookie = (req: ApiRequest, name: string): string | undefined => {
  const header = req.headers.cookie;
  const raw = Array.isArray(header) ? header.join('; ') : header;
  if (!raw) return undefined;
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
};

const setCookie = (res: ApiResponse, name: string, token: string, maxAgeSeconds: number): void => {
  res.setHeader('Set-Cookie', `${name}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`);
};

const clearCookie = (res: ApiResponse, name: string): void => {
  res.setHeader('Set-Cookie', `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
};

const requireUser = async (req: ApiRequest): Promise<{ phone: string }> => {
  const token = readCookie(req, SESSION_COOKIE);
  const payload = token ? await verifySession(token) : null;
  if (!payload?.phone) throw new HttpError(401, 'Session expirée. Veuillez vous reconnecter.');
  return { phone: payload.phone };
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

  const user: StoredUser = {
    phone,
    nom,
    prenom,
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
    cycles,
    subjects,
  };

  const created = await redisSetJson(KEYS.user(phone), user, true);
  if (created === null) throw new HttpError(409, 'Un compte existe déjà avec ce numéro de téléphone.');

  await redisHsetJson(KEYS.adminSnapshots, phone, { phone, nom, prenom, cycles, subjects, lastSyncAt: null, classes: [] });

  const token = await signSession({ phone, role: 'teacher' }, SESSION_MAX_AGE);
  setCookie(res, SESSION_COOKIE, token, SESSION_MAX_AGE);
  res.status(201).json({ user: publicUser(user) });
};

const handleLogin = async (body: AuthBody, res: ApiResponse) => {
  const phone = normalizePhone(body.phone);
  if (typeof body.password !== 'string' || !body.password) throw new HttpError(400, 'Mot de passe manquant.');

  const rateKey = KEYS.loginRateLimit(phone);
  const attempts = Number(await redisCommand<number>(['INCR', rateKey]));
  if (attempts === 1) await redisCommand(['EXPIRE', rateKey, LOGIN_WINDOW_SECONDS]);
  if (attempts > LOGIN_MAX_ATTEMPTS) throw new HttpError(429, 'Trop de tentatives. Réessayez dans quelques minutes.');

  const user = await redisGetJson<StoredUser>(KEYS.user(phone));
  if (!user || !(await verifyPassword(body.password, user.passwordHash))) throw new HttpError(401, INVALID_CREDENTIALS);
  if (user.blocked) throw new HttpError(403, "Ce compte a été bloqué par l'administration. Contactez votre établissement.");

  const token = await signSession({ phone, role: 'teacher' }, SESSION_MAX_AGE);
  setCookie(res, SESSION_COOKIE, token, SESSION_MAX_AGE);
  res.status(200).json({ user: publicUser(user) });
};

const handleMe = async (req: ApiRequest, res: ApiResponse) => {
  const { phone } = await requireUser(req);
  const user = await redisGetJson<StoredUser>(KEYS.user(phone));
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

    if (req.method !== 'POST') throw new HttpError(405, 'Méthode non autorisée.');

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
