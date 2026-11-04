export type AuthMode = "login" | "register" | "reset";
export type AuthView = "onboarding" | "auth";
export interface AuthRoute {
  view: AuthView;
  mode: AuthMode;
}

/** A bare registration link starts preparation; only a prepared space reaches the final form. */
export function resolveAuthRoute(
  hash: string,
  hasPreparation: boolean,
): AuthRoute {
  if (hash === "#login") return { view: "auth", mode: "login" };
  if (hash === "#reset") return { view: "auth", mode: "reset" };
  if (hash === "#register")
    return { view: hasPreparation ? "auth" : "onboarding", mode: "register" };
  if (hash === "#start" || hash === "#onboarding" || hash === "#preview")
    return { view: "onboarding", mode: "register" };
  // The first screen and legacy landing links always open the login form.
  return { view: "auth", mode: "login" };
}
export function authRouteHash(view: AuthView, mode: AuthMode) {
  return view === "onboarding"
      ? "#start"
      : `#${mode}`;
}
