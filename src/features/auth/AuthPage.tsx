import React, {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { AppLocale } from "@/types";
import { AUTH_COPY, type AuthLocale } from "./authCopy";
import { RegistrationOnboarding } from "./RegistrationOnboarding";
import { AuthHeader } from "./AuthHeader";
import { AUTH_FIELD_IDS, AuthMainForm, type AuthFieldName, type AuthFieldValues } from "./AuthForms";
import { ResetForm } from "./ResetForm";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { CircleCheck, ShieldCheck } from "@/components/ui/icons";
import { ProudTeacherIllustration } from "@/components/ui/DynamicIllustration";
import { prepareGoogleAuth } from "@/platform/googleAuth";
import { apiFetch } from "@/platform/nativeHttp";
import { authErrorMessage } from "./authErrors";
import {
  EMAIL_PATTERN,
  formatMoroccanPhone,
  isCompleteMoroccanPhone,
} from "./authForm";
import { WorkspaceSwitchError } from "@/infrastructure/storage/accountWorkspace";
import type { RegistrationDraft, RegistrationSetup } from "./registrationSetup";
import {
  clearRegistrationDraft,
  readRegistrationDraft,
  saveRegistrationDraft,
} from "./registrationSetup";
import {
  authRouteHash,
  resolveAuthRoute,
  type AuthMode as Mode,
  type AuthView,
} from "./authNavigation";
import "./authMotion.css";
import "./auth-layout.css";

/** La route est dérivée du hash : une seule source de vérité, un seul écouteur. */
const subscribeHash = (onStoreChange: () => void) => {
  window.addEventListener("hashchange", onStoreChange);
  return () => window.removeEventListener("hashchange", onStoreChange);
};

export const AuthPage: React.FC<{
  locale: AppLocale;
  onLocaleChange: (locale: AuthLocale) => void;
  /** Motif d'une session close par la direction : affiché avant le formulaire. */
  notice?: "blocked" | null;
}> = ({ locale, onLocaleChange, notice = null }) => {
  const { login, register, loginGoogle } = useAuth();
  const displayLocale: AuthLocale = locale === "ar" ? "ar" : "fr";
  const copy = AUTH_COPY[displayLocale];

  const hash = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash,
    () => "",
  );
  const [setup, setSetup] = useState<RegistrationSetup | null>(null);
  const { view, mode } = resolveAuthRoute(hash, Boolean(setup));
  const [draft, setDraftState] = useState<RegistrationDraft>(readRegistrationDraft);
  const pageRef = useRef<HTMLDivElement>(null);

  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [googleBusy, setGoogleBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<AuthFieldName, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const id = useId();
  const isRegister = mode === "register";
  const resetMode = mode === "reset";

  const setDraft = useCallback((next: RegistrationDraft) => {
    setDraftState(next);
    saveRegistrationDraft(next);
  }, []);

  const changeField = useCallback((name: AuthFieldName, value: string) => {
    setFieldErrors((previous) => {
      if (!previous[name]) return previous;
      const next = { ...previous };
      delete next[name];
      return next;
    });
    if (name === "nom") setNom(value);
    else if (name === "prenom") setPrenom(value);
    else if (name === "email") setEmail(value);
    else if (name === "phone") setPhone(formatMoroccanPhone(value));
    else if (name === "password") setPassword(value);
    else setConfirmPassword(value);
  }, []);

  const navigateTo = useCallback((nextView: AuthView, nextMode: Mode = "login") => {
    if (submittingRef.current) return;
    const target = authRouteHash(nextView, nextMode);
    if (window.location.hash !== target) window.location.hash = target;
  }, []);

  /* Une navigation réinitialise les saisies transitives — y compris le
   * retour arrière du navigateur, qui déclenche le même hashchange. */
  useEffect(() => {
    setError(null);
    setResetSent(false);
    setPassword("");
    setConfirmPassword("");
    setFieldErrors({});
  }, [view, mode]);

  useEffect(() => {
    pageRef.current
      ?.querySelector<HTMLElement>("h1")
      ?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [view, mode]);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  useEffect(() => {
    if (view === "auth") void prepareGoogleAuth().catch(() => undefined);
  }, [view]);

  const handleGoogle = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true; setIsSubmitting(true); setGoogleBusy(true); setError(null);
    try {
      await loginGoogle(displayLocale, isRegister && setup ? { ...setup, applicationLocale: displayLocale } : undefined);
      clearRegistrationDraft();
    } catch (err) {
      setError(err instanceof WorkspaceSwitchError ? copy.workspaceError : authErrorMessage(err, displayLocale));
    } finally { submittingRef.current = false; setIsSubmitting(false); setGoogleBusy(false); }
  };

  const handleReset = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true; setIsSubmitting(true); setError(null);
    try {
      const response = await apiFetch("/api/auth", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resetPassword", email: email.trim(), locale: displayLocale }), signal: AbortSignal.timeout(15_000) });
      const data: unknown = await response.json().catch(() => null);
      const payload = (data ?? {}) as { error?: unknown; code?: unknown };
      if (!response.ok)
        throw Object.assign(new Error(typeof payload.error === "string" ? payload.error : "reset failed"), {
          code: typeof payload.code === "string" ? payload.code : undefined,
        });
      setResetSent(true);
    } catch (err) { setError(authErrorMessage(err, displayLocale)); }
    finally { submittingRef.current = false; setIsSubmitting(false); }
  };

  const completePreparation = (nextSetup: RegistrationSetup) => {
    setSetup((previous) => ({ ...previous, ...nextSetup }));
    navigateTo("auth", "register");
  };

  const validateFields = (): Partial<Record<AuthFieldName, string>> | null => {
    const errors: Partial<Record<AuthFieldName, string>> = {};
    if (isRegister) {
      if (!nom.trim()) errors.nom = copy.requiredField;
      if (!prenom.trim()) errors.prenom = copy.requiredField;
      if (!email.trim()) errors.email = copy.requiredField;
      else if (!EMAIL_PATTERN.test(email.trim())) errors.email = copy.emailInvalid;
      if (password.length < 8) errors.password = copy.passwordRequired;
      if (!confirmPassword) errors.confirm = copy.requiredField;
      else if (password !== confirmPassword) errors.confirm = copy.passwordMismatch;
    } else if (loginMethod === "email") {
      if (!email.trim()) errors.email = copy.requiredField;
      else if (!EMAIL_PATTERN.test(email.trim())) errors.email = copy.emailInvalid;
      if (!password) errors.password = copy.requiredField;
    } else {
      if (!isCompleteMoroccanPhone(phone)) errors.phone = copy.phoneInvalid;
      if (!password) errors.password = copy.requiredField;
    }
    return Object.keys(errors).length ? errors : null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return;
    setError(null);
    if (isRegister && !setup) {
      navigateTo("onboarding");
      return;
    }
    const errors = validateFields();
    if (errors) {
      setFieldErrors(errors);
      const first = (Object.keys(AUTH_FIELD_IDS) as AuthFieldName[]).find((name) => errors[name]);
      if (first) document.getElementById(`${id}-${AUTH_FIELD_IDS[first]}`)?.focus();
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      if (mode === "login") await login(loginMethod === "phone" ? phone : email.trim(), password);
      else
        await register({
          nom: nom.trim(),
          prenom: prenom.trim(),
          phone,
          email: email.trim(),
          password,
          ...(setup ? { setup: { ...setup, applicationLocale: displayLocale } } : {}),
        });
      clearRegistrationDraft();
    } catch (err) {
      // Le compte bloqué par la direction mérite une explication explicite,
      // quelle que soit la langue de l'interface.
      const blockedByDirection = (err as { code?: unknown } | null)?.code === "ACCOUNT_BLOCKED";
      setError(
        blockedByDirection
          ? copy.accountBlocked
          : err instanceof WorkspaceSwitchError
            ? copy.workspaceError
            : authErrorMessage(err, displayLocale),
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const values: AuthFieldValues = { nom, prenom, email, phone, password, confirmPassword };
  const onLoginPage = view === "auth" && mode === "login";

  return (
    <div
      ref={pageRef}
      data-auth-view={view}
      data-pwa-update-blocked={isSubmitting || Boolean(email || phone || password || confirmPassword || nom || prenom || setup || draft.cycle)}
      dir={displayLocale === "ar" ? "rtl" : "ltr"}
      lang={displayLocale}
      className="auth-page-shell flex min-h-dvh flex-col"
    >
      <AuthHeader
        copy={copy}
        displayLocale={displayLocale}
        onLocaleChange={(value) => { setError(null); onLocaleChange(value); }}
        onBrandClick={() => navigateTo("auth", "login")}
        isSubmitting={isSubmitting}
        onLoginPage={onLoginPage}
      />
      {view === "onboarding" && (
        <RegistrationOnboarding
          locale={displayLocale}
          draft={draft}
          onChange={(next) => {
            setDraft(next);
            setSetup(null);
          }}
          onComplete={completePreparation}
          onLogin={() => navigateTo("auth", "login")}
        />
      )}
      {view === "auth" && (
        <div className="auth-view-enter auth-access-layout">
          {/* Hero mobile compact : le porch desktop est masqué sous 1024px,
              un condensé brand + promesse + illustration maintient la valeur
              perçue sur téléphone sans empiéter sur le formulaire. */}
          <section className="auth-mobile-hero" aria-label={copy.brand}>
            <p className="auth-mobile-hero__eyebrow">{copy.brand}</p>
            <p className="auth-mobile-hero__title">{copy.porchTitle}</p>
            <ProudTeacherIllustration size={128} className="auth-mobile-hero__figure" />
          </section>
          <aside className="auth-porch" aria-hidden="true">
            <p className="auth-porch__eyebrow">{copy.brand}</p>
            <p className="auth-porch__title">{copy.porchTitle}</p>
            <p className="auth-porch__text">{copy.porchText}</p>
            <ul className="auth-porch__points">
              {copy.porchPoints.map((point) => (
                <li key={point}>
                  <CircleCheck size={18} />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <ProudTeacherIllustration size={252} className="auth-porch__figure" />
          </aside>
          <main dir={displayLocale === "ar" ? "rtl" : "ltr"} className="auth-form-main">
            <div className="auth-form-content">
              <h1 tabIndex={-1} id={id + "-title"}>
                {resetMode ? copy.resetTitle : isRegister ? copy.createAccount : copy.login}
              </h1>
              <p className="auth-form-detail">
                {resetMode ? copy.resetDetail : isRegister
                  ? copy.savePreparationDetail
                  : setup
                    ? copy.existingAccountHint
                    : copy.welcomeDetail}
              </p>
              {isRegister && setup && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => navigateTo("onboarding")}
                  className="mt-2 min-h-11 rounded-lg text-sm font-medium underline underline-offset-4 focus-visible:outline-2"
                >
                  {copy.returnToPreparation}
                </button>
              )}
              {!resetMode && <>
                <GoogleSignInButton label={copy.google} busy={googleBusy} disabled={isSubmitting} onClick={() => void handleGoogle()} />
                <div className="auth-divider"><span>{loginMethod === "phone" && !isRegister ? copy.phone : copy.emailDivider}</span></div>
              </>}
              {resetMode ? (
                <ResetForm
                  id={id}
                  copy={copy}
                  email={email}
                  onEmailChange={(value) => { setEmail(value); setResetSent(false); }}
                  isSubmitting={isSubmitting}
                  resetSent={resetSent}
                  error={error}
                  errorRef={errorRef}
                  onSubmit={() => void handleReset()}
                  onBackToLogin={() => navigateTo("auth", "login")}
                />
              ) : (
                <>
                  <AuthMainForm
                    id={id}
                    isRegister={isRegister}
                    copy={copy}
                    notice={notice}
                    error={error}
                    errorRef={errorRef}
                    isSubmitting={isSubmitting}
                    loginMethod={loginMethod}
                    phoneValid={isCompleteMoroccanPhone(phone)}
                    values={values}
                    fieldErrors={fieldErrors}
                    onFieldChange={changeField}
                    onSubmit={handleSubmit}
                    onForgot={() => navigateTo("auth", "reset")}
                  />
                  {!isRegister && (
                    <button type="button" disabled={isSubmitting} className="auth-link auth-legacy"
                      onClick={() => { setLoginMethod((method) => (method === "email" ? "phone" : "email")); setError(null); }}>
                      {loginMethod === "email" ? copy.legacyPhone : copy.useEmail}
                    </button>
                  )}
                </>
              )}
              {!resetMode && (
                <p className="auth-account-switch">
                  <span>{isRegister ? copy.hasAccount : copy.firstVisit}</span>
                  <button type="button" disabled={isSubmitting} className="auth-link"
                    onClick={() => navigateTo("auth", isRegister ? "login" : "register")}>
                    {isRegister ? copy.login : copy.createAccount}
                  </button>
                </p>
              )}
              <footer className="auth-footer">
                <a href="/admin.html" className="auth-link">
                  <ShieldCheck size={15} aria-hidden="true" />
                  {copy.adminSpace}
                </a>
              </footer>
            </div>
          </main>
        </div>
      )}
    </div>
  );
};
