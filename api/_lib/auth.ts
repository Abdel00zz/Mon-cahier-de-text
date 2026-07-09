import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { ApiRequest, ApiResponse, HttpError } from './http.js';

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number }
) => Promise<Buffer>;

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };
const KEY_LENGTH = 64;

export const SESSION_COOKIE = 'cdt_session';
export const ADMIN_COOKIE = 'cdt_admin';
export const SESSION_MAX_AGE = 30 * 24 * 3600; // 30 jours
export const ADMIN_MAX_AGE = 12 * 3600; // 12 heures

export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH, SCRYPT_PARAMS);
  return `scrypt$N=${SCRYPT_PARAMS.N},r=${SCRYPT_PARAMS.r},p=${SCRYPT_PARAMS.p}$${salt.toString('base64')}$${hash.toString('base64')}`;
};

export const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
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

export interface SessionPayload {
  phone?: string;
  role?: 'teacher' | 'admin';
}

const base64url = (value: Buffer | string): string =>
  Buffer.from(value).toString('base64url');

const signJwtPart = (value: string): string =>
  createHmac('sha256', getAuthSecret()).update(value).digest('base64url');

export const signSession = async (payload: SessionPayload, maxAgeSeconds: number): Promise<string> => {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify({ ...payload, iat: now, exp: now + maxAgeSeconds }));
  const unsigned = `${header}.${body}`;
  return `${unsigned}.${signJwtPart(unsigned)}`;
};

export const verifySession = async (token: string): Promise<SessionPayload | null> => {
  try {
    const [header, body, signature] = token.split('.');
    if (!header || !body || !signature) return null;
    const unsigned = `${header}.${body}`;
    const expected = signJwtPart(unsigned);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload & { exp?: number };
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { phone: payload.phone, role: payload.role };
  } catch {
    return null;
  }
};

export const readCookie = (req: ApiRequest, name: string): string | undefined => {
  const header = req.headers.cookie;
  const raw = Array.isArray(header) ? header.join('; ') : header;
  if (!raw) return undefined;
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
};

const appendSetCookie = (res: ApiResponse, value: string): void => {
  res.setHeader('Set-Cookie', value);
};

export const setCookie = (res: ApiResponse, name: string, token: string, maxAgeSeconds: number): void => {
  appendSetCookie(res, `${name}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`);
};

export const clearCookie = (res: ApiResponse, name: string): void => {
  appendSetCookie(res, `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
};

export const requireUser = async (req: ApiRequest): Promise<{ phone: string }> => {
  const token = readCookie(req, SESSION_COOKIE);
  const payload = token ? await verifySession(token) : null;
  if (!payload?.phone) {
    throw new HttpError(401, 'Session expirée. Veuillez vous reconnecter.');
  }
  return { phone: payload.phone };
};

export const requireAdmin = async (req: ApiRequest): Promise<void> => {
  const token = readCookie(req, ADMIN_COOKIE);
  const payload = token ? await verifySession(token) : null;
  if (payload?.role !== 'admin') {
    throw new HttpError(401, "Accès administrateur requis.");
  }
};

export const safeEqualStrings = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // comparaison factice pour garder un temps constant
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
};
