export type AuthMode = 'login' | 'register';
export type AuthView = 'landing' | 'preview' | 'auth';
export interface AuthRoute {
  view: AuthView;
  mode: AuthMode;
}

/** A bare registration link starts preparation; only a prepared space reaches the final form. */
export function resolveAuthRoute(
  hash: string,
  hasPreparation: boolean,
  returning = false,
): AuthRoute {
  if (hash === '#login') return { view: 'auth', mode: 'login' };
  if (hash === '#register')
    return { view: hasPreparation ? 'auth' : 'preview', mode: 'register' };
  if (hash === '#start' || hash === '#preview')
    return { view: 'preview', mode: 'register' };
  if (hash === '#landing') return { view: 'landing', mode: 'login' };
  return { view: returning ? 'auth' : 'landing', mode: 'login' };
}
export function authRouteHash(view: AuthView, mode: AuthMode) {
  return view === 'landing'
    ? '#landing'
    : view === 'preview'
      ? '#start'
      : `#${mode}`;
}
