import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { markClassDirty, markClassesListDirty, notifyClassesChanged, notifyConfigChanged, reloadSyncState, touchClassSyncMeta, touchSettingsSyncMeta } from '../utils/syncBus';
import { applyRegistrationSetup, type RegistrationSetup } from '../features/auth/registrationSetup';
import { toast } from 'sonner';
import { readWorkspaceScope, switchAccountWorkspace, workspaceIsCurrent, WORKSPACE_SCOPE_KEY } from '../utils/accountWorkspace';

interface AuthUser {
  phone: string;
  nom: string;
  prenom: string;
  /** Marqueur serveur : l'accueil a été terminé ou ignoré par ce compte. */
  hasCompletedWelcome?: boolean;
}

type AuthStatus = 'loading' | 'authenticated' | 'anonymous' | 'offline';

interface RegisterInput {
  nom: string;
  prenom: string;
  phone: string;
  password: string;
  setup?: RegistrationSetup;
}

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  login: (phone: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  completeWelcome: () => Promise<void>;
  logout: () => Promise<void>;
}

const AUTH_CACHE_KEY = 'authUser_v1';
const SIGNED_OUT_KEY = 'authSignedOut_v1';

const AuthContext = createContext<AuthContextValue | null>(null);

const readCachedUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(AUTH_CACHE_KEY);
    const value = raw ? JSON.parse(raw) : null;
    return isAuthUser(value) ? value : null;
  } catch {
    return null;
  }
};

const cacheUser = (user: AuthUser | null): void => {
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

const isAuthUser = (value: unknown): value is AuthUser => {
  if (!value || typeof value !== 'object') return false;
  const user = value as Partial<AuthUser>;
  return typeof user.phone === 'string' && /^\d{8,15}$/.test(user.phone) && typeof user.nom === 'string' && typeof user.prenom === 'string';
};

const activateUserWorkspace = (user: AuthUser): void => {
  switchAccountWorkspace(user.phone, { legacyOwner: readCachedUser()?.phone });
  reloadSyncState();
  applyProfileToConfig(user);
  cacheUser(user);
  localStorage.removeItem(SIGNED_OUT_KEY);
  notifyClassesChanged();
  notifyConfigChanged();
};

/**
 * L'authentification ne hydrate que l'identité du professeur. Les paramètres
 * pédagogiques (cycle, matière, classes) appartiennent exclusivement à
 * l'onboarding et à la configuration synchronisée de l'espace de travail.
 */
const applyProfileToConfig = (user: AuthUser): void => {
  try {
    const raw = localStorage.getItem('appConfig_v1');
    const config = raw ? JSON.parse(raw) : {};
    const hasLocalProfile = typeof config.defaultTeacherName === 'string' && config.defaultTeacherName.trim().length > 0;
    let changed = false;

    if (!hasLocalProfile && (user.nom || user.prenom)) {
      const fullName = `${user.prenom ?? ''} ${user.nom ?? ''}`.trim();
      if (fullName !== 'Prof Dev' && fullName !== 'Dev Prof') {
        config.defaultTeacherName = fullName;
        changed = true;
      }
    }

    if (user.hasCompletedWelcome === true && config.hasCompletedWelcome !== true) {
      config.hasCompletedWelcome = true;
      changed = true;
    }

    if (changed) {
      localStorage.setItem('appConfig_v1', JSON.stringify(config));
      notifyConfigChanged();
    }
  } catch {
    // stockage indisponible : la config restera par défaut
  }
};

const postAuth = async (payload: Record<string, unknown>): Promise<AuthUser> => {
  const response = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : 'Une erreur est survenue.');
  }
  if (!isAuthUser(data.user)) throw new Error('Réponse de connexion invalide. Réessayez.');
  return data.user;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const requestVersion = useRef(0);
  const initialRequest = useRef<AbortController | null>(null);
  const logoutRequest = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    initialRequest.current = controller;
    const version = ++requestVersion.current;
    const current = () => !cancelled && version === requestVersion.current;
    (async () => {
      // Persist the legacy owner before a 401 removes the cached session.
      const cached = readCachedUser();
      try {
        if (localStorage.getItem(SIGNED_OUT_KEY) === 'true') {
          setStatus('anonymous');
          return;
        }
        if (!readWorkspaceScope() && cached) switchAccountWorkspace(cached.phone, { legacyOwner: cached.phone });
        const response = await fetch('/api/auth?action=me', { credentials: 'same-origin', signal: controller.signal });
        if (!current()) return;
        if (response.ok) {
          const data = await response.json();
          if (!current()) return;
          if (!isAuthUser(data.user)) throw new Error('Invalid session response');
          activateUserWorkspace(data.user);
          setUser(data.user);
          setStatus('authenticated');
        } else {
          if (response.status >= 500) throw new TypeError('Session service unavailable');
          setUser(null);
          setStatus('anonymous');
          cacheUser(null);
        }
      } catch (error) {
        // Erreur réseau (pas un 401) : on laisse travailler hors ligne si une session a déjà existé.
        if (!current()) return;
        // Never reinterpret a failed account switch as an offline login.
        if (error instanceof TypeError && cached && readWorkspaceScope()?.owner === cached.phone) {
          reloadSyncState();
          setUser(cached);
          setStatus('offline');
        } else {
          setStatus('anonymous');
        }
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const login = useCallback(async (phone: string, password: string) => {
    const version = ++requestVersion.current;
    initialRequest.current?.abort();
    await logoutRequest.current;
    const loggedUser = await postAuth({ action: 'login', phone, password });
    if (version !== requestVersion.current) return;
    activateUserWorkspace(loggedUser);
    setUser(loggedUser);
    setStatus('authenticated');
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const version = ++requestVersion.current;
    initialRequest.current?.abort();
    await logoutRequest.current;
    const {setup, ...credentials} = input;
    const createdUser = await postAuth({ action: 'register', ...credentials });
    if (version !== requestVersion.current) return;
    activateUserWorkspace(createdUser);
    if (setup) {
      try {
        const classId = applyRegistrationSetup(setup, createdUser.phone);
        if (classId) {
          touchClassSyncMeta(classId); touchSettingsSyncMeta();
          markClassDirty(classId); markClassesListDirty();
          notifyClassesChanged(); notifyConfigChanged();
        }
      } catch {
        toast.error(setup.applicationLocale === 'ar' ? 'أُنشئ حسابك، لكن تعذّر حفظ القسم محلياً. وفّر مساحة تخزين ثم أضفه من لوحة التحكم.' : 'Compte créé, mais la classe n’a pas pu être conservée localement. Libérez de l’espace puis ajoutez-la depuis le tableau de bord.');
      }
    }
    setUser(createdUser);
    setStatus('authenticated');
  }, []);

  const completeWelcome = useCallback(async () => {
    const scope = readWorkspaceScope();
    const version = requestVersion.current;
    const completedUser = await postAuth({ action: 'completeWelcome' });
    if (version !== requestVersion.current || !workspaceIsCurrent(scope) || completedUser.phone !== scope?.owner) return;
    setUser(completedUser);
    setStatus('authenticated');
    cacheUser(completedUser);
    applyProfileToConfig(completedUser);
  }, []);

  const logout = useCallback(async () => {
    ++requestVersion.current;
    initialRequest.current?.abort();
    // Keep unsynced work for the next login of its owner, even when offline.
    const previousSignedOut = localStorage.getItem(SIGNED_OUT_KEY);
    localStorage.setItem(SIGNED_OUT_KEY, 'true');
    try {
      switchAccountWorkspace(null, { legacyOwner: readCachedUser()?.phone });
    } catch (error) {
      if (previousSignedOut === null) localStorage.removeItem(SIGNED_OUT_KEY);
      else localStorage.setItem(SIGNED_OUT_KEY, previousSignedOut);
      throw error;
    }
    cacheUser(null);
    reloadSyncState();
    notifyClassesChanged();
    notifyConfigChanged();
    setUser(null);
    setStatus('anonymous');
    logoutRequest.current = fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action: 'logout' }),
        signal: AbortSignal.timeout(8000),
      }).then(() => undefined, () => undefined);
    // A following login waits for this cookie-clearing response (bounded offline).
    await logoutRequest.current;
  }, []);

  useEffect(() => {
    const revision = readWorkspaceScope()?.revision;
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== WORKSPACE_SCOPE_KEY && event.key !== SIGNED_OUT_KEY && event.key !== null) return;
      // Another tab switched the active workspace. Drop stale component state
      // before accepting further input; the next boot verifies the current session.
      if (readWorkspaceScope()?.revision !== revision || (user && readWorkspaceScope()?.owner !== user.phone)) {
        initialRequest.current?.abort();
        document.getElementById('root')?.setAttribute('inert', '');
        window.location.reload();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [user]);

  const value = useMemo(
    () => ({ user, status, login, register, completeWelcome, logout }),
    [user, status, login, register, completeWelcome, logout]
  );

  const workspaceKey = `${user?.phone ?? 'anonymous'}:${readWorkspaceScope()?.revision ?? 'legacy'}`;
  return <AuthContext.Provider value={value}><React.Fragment key={workspaceKey}>{children}</React.Fragment></AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
};
