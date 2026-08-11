import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { notifyConfigChanged } from '../utils/syncBus';
import { clearLocalWorkspace } from '../utils/workspace';

export interface AuthUser {
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

const AuthContext = createContext<AuthContextValue | null>(null);

const readCachedUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(AUTH_CACHE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
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
  return data.user as AuthUser;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/auth?action=me', { credentials: 'same-origin' });
        if (cancelled) return;
        if (response.ok) {
          const data = await response.json();
          setUser(data.user as AuthUser);
          setStatus('authenticated');
          cacheUser(data.user as AuthUser);
          applyProfileToConfig(data.user as AuthUser);
        } else {
          setUser(null);
          setStatus('anonymous');
          cacheUser(null);
        }
      } catch {
        // Erreur réseau (pas un 401) : on laisse travailler hors ligne si une session a déjà existé.
        if (cancelled) return;
        const cached = readCachedUser();
        if (cached) {
          setUser(cached);
          setStatus('offline');
        } else {
          setStatus('anonymous');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (phone: string, password: string) => {
    const loggedUser = await postAuth({ action: 'login', phone, password });
    setUser(loggedUser);
    setStatus('authenticated');
    cacheUser(loggedUser);
    applyProfileToConfig(loggedUser);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const createdUser = await postAuth({ action: 'register', ...input });
    // Un nouveau compte ne doit jamais hériter des classes, paramètres ou
    // marqueurs de synchronisation du précédent utilisateur de cet appareil.
    // Le reset émet les événements nécessaires pour rafraîchir les hooks déjà
    // montés, puis le profil ci-dessous initialise son espace vierge.
    clearLocalWorkspace();
    setUser(createdUser);
    setStatus('authenticated');
    cacheUser(createdUser);
    applyProfileToConfig(createdUser);
  }, []);

  const completeWelcome = useCallback(async () => {
    const completedUser = await postAuth({ action: 'completeWelcome' });
    setUser(completedUser);
    setStatus('authenticated');
    cacheUser(completedUser);
    applyProfileToConfig(completedUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch {
      // même hors ligne, on déconnecte localement
    }
    setUser(null);
    setStatus('anonymous');
    cacheUser(null);
    clearLocalWorkspace();
  }, []);

  const value = useMemo(
    () => ({ user, status, login, register, completeWelcome, logout }),
    [user, status, login, register, completeWelcome, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
};
