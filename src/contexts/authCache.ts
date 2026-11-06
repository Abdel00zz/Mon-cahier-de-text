import { isAccountId } from '../domain/auth/accountIdentity';

export interface AuthUser {
  id?: string;
  phone: string;
  email?: string;
  provider?: 'password' | 'google.com';
  nom: string;
  prenom: string;
  /** Marqueur serveur : l'accueil a été terminé ou ignoré par ce compte. */
  hasCompletedWelcome?: boolean;
}

const AUTH_CACHE_KEY = 'authUser_v1';

export const readCachedUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(AUTH_CACHE_KEY);
    const value = raw ? JSON.parse(raw) : null;
    return isAuthUser(value) ? value : null;
  } catch {
    return null;
  }
};

export const cacheUser = (user: AuthUser | null): void => {
  try {
    if (user) {
      localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_CACHE_KEY);
    }
  } catch {
    // stockage indisponible : le mode hors ligne sera simplement moins persistant
  }
};

export const isAuthUser = (value: unknown): value is AuthUser => {
  if (!value || typeof value !== 'object') return false;
  const user = value as Partial<AuthUser>;
  return typeof user.phone === 'string' && isAccountId(user.id ?? user.phone) && typeof user.nom === 'string' && typeof user.prenom === 'string';
};
