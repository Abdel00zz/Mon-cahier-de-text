import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { notifyConfigChanged } from '../utils/syncBus';
import { clearLocalWorkspace } from '../utils/workspace';

export type Cycle = 'college' | 'lycee' | 'prepa';

export interface AuthUser {
  phone: string;
  nom: string;
  prenom: string;
  cycles?: Cycle[];
  subjects?: string[];
}

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous' | 'offline';

export interface RegisterInput {
  nom: string;
  prenom: string;
  phone: string;
  password: string;
  cycles: Cycle[];
  subjects: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  login: (phone: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
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
 * Applique le profil du compte à la configuration locale : le nom devient
 * l'enseignant par défaut, cycles et matières pilotent les filtres. L'étape
 * « Profil » de l'accueil (OnboardingModal) est ainsi déjà remplie — on marque
 * `hasCompletedWelcome` ; l'accueil ne se rouvrira de lui-même que s'il
 * n'existe encore AUCUNE classe (création par lot + emploi du temps).
 * Ne remplace jamais des valeurs déjà présentes.
 */
const applyProfileToConfig = (user: AuthUser): void => {
  try {
    const raw = localStorage.getItem('appConfig_v1');
    const config = raw ? JSON.parse(raw) : {};
    if (!config.defaultTeacherName && (user.nom || user.prenom)) {
      config.defaultTeacherName = `${user.prenom ?? ''} ${user.nom ?? ''}`.trim();
    }
    if (user.cycles?.length && !(config.selectedCycles?.length)) {
      config.selectedCycles = user.cycles;
      config.showAllCycles = false;
    }
    if (user.subjects?.length && !(config.selectedSubjects?.length)) {
      config.selectedSubjects = user.subjects;
      config.showAllSubjects = false;
    }
    config.hasCompletedWelcome = true; // le compte fournit déjà l'essentiel
    localStorage.setItem('appConfig_v1', JSON.stringify(config));
    notifyConfigChanged();
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
    setUser(createdUser);
    setStatus('authenticated');
    cacheUser(createdUser);
    // Cycles + matières choisis à l'inscription → configuration prête sans écran d'accueil.
    applyProfileToConfig({ ...createdUser, cycles: input.cycles, subjects: input.subjects });
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
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout]
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
