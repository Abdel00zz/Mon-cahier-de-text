import React, {
  useEffect,
  useId,
  useRef,
  useState,
  useCallback,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  CircleCheck,
  Eye,
  EyeOff,
  Loader2,
  TriangleAlert,
  ShieldCheck,
} from "@/components/ui/icons";
import type { AppLocale } from "@/types";
import { AUTH_COPY, type AuthLocale } from "./authCopy";
import { FIELD_CLASS, LABEL_CLASS, PasswordInput } from "./authFields";
import { RegistrationOnboarding } from "./RegistrationOnboarding";
import { GoogleSignInButton } from './GoogleSignInButton';
import { prepareGoogleAuth } from '@/platform/googleAuth';
import { apiFetch } from '@/platform/nativeHttp';
import { authErrorMessage } from './authErrors';
import "./authMotion.css";
import "./auth-layout.css";
import {
  formatMoroccanPhone,
  isCompleteMoroccanPhone,
  passwordScore,
} from "./authForm";
import {
  WorkspaceSwitchError,
} from "@/infrastructure/storage/accountWorkspace";
import type { RegistrationSetup, RegistrationDraft } from "./registrationSetup";
import {
  authRouteHash,
  resolveAuthRoute,
  type AuthMode as Mode,
  type AuthView,
} from "./authNavigation";

export const AuthPage: React.FC<{
  locale: AppLocale;
  onLocaleChange: (locale: AuthLocale) => void;
  /** Motif d'une session close par la direction : affiché avant le formulaire. */
  notice?: "blocked" | null;
}> = ({ locale, onLocaleChange, notice = null }) => {
  const { login, register, loginGoogle } = useAuth();
  const displayLocale: AuthLocale = locale === "ar" ? "ar" : "fr";
  const copy = AUTH_COPY[displayLocale];
  const getInitialState = () => resolveAuthRoute(window.location.hash, false);

  const [initial] = useState(getInitialState);
  const [mode, setMode] = useState<Mode>(initial.mode);
  const [setup, setSetup] = useState<RegistrationSetup | null>(null);
  const [view, setView] = useState<AuthView>(initial.view);
  const [draft, setDraft] = useState<RegistrationDraft>({
    cycle: "",
    levelGroup: "",
    level: "",
    subject: "",
    group: "1",
  });
  const setupRef = useRef(setup);
  setupRef.current = setup;
  const pageRef = useRef<HTMLDivElement>(null);

  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState('');
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [googleBusy, setGoogleBusy] = useState(false);
  const resetMode = mode === "reset";
  const [resetSent, setResetSent] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const id = useId();
  const isRegister = mode === "register";
  const score = passwordScore(password);
  const phoneValid = isCompleteMoroccanPhone(phone);
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;

  const navigateTo = useCallback(
    (nextView: AuthView, nextMode: Mode = "login") => {
      if (submittingRef.current) return;
      const route = resolveAuthRoute(
        authRouteHash(nextView, nextMode),
        Boolean(setupRef.current),
      );
      setError(null);
      setResetSent(false);
      setPassword(""); setConfirmPassword("");
      setMode(route.mode);
      setView(route.view);
      const hash = authRouteHash(route.view, route.mode);
      if (window.location.hash !== hash)
        window.history.pushState(null, "", hash);
    },
    [],
  );

  const completePreparation = (nextSetup: RegistrationSetup) => {
    const next = { ...setupRef.current, ...nextSetup };
    setupRef.current = next;
    setSetup(next);
    navigateTo("auth", "register");
  };

  useEffect(() => {
    window.history.replaceState(
      null,
      "",
      authRouteHash(initial.view, initial.mode),
    );
    const onLocationChange = () => {
      const route = resolveAuthRoute(
        window.location.hash,
        Boolean(setupRef.current),
      );
      setView(route.view);
      setMode(route.mode);
      setError(null);
      setResetSent(false);
      setPassword(""); setConfirmPassword("");
      const hash = authRouteHash(route.view, route.mode);
      if (window.location.hash !== hash)
        window.history.replaceState(null, "", hash);
    };
    window.addEventListener("popstate", onLocationChange);
    window.addEventListener("hashchange", onLocationChange);
    return () => {
      window.removeEventListener("popstate", onLocationChange);
      window.removeEventListener("hashchange", onLocationChange);
    };
  }, [initial]);

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
    if (view === 'auth') void prepareGoogleAuth().catch(() => undefined);
  }, [view]);

  const handleGoogle = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true; setIsSubmitting(true); setGoogleBusy(true); setError(null);
    try { await loginGoogle(displayLocale, isRegister && setup ? { ...setup, applicationLocale: displayLocale } : undefined); }
    catch (error) { setError(error instanceof WorkspaceSwitchError ? copy.workspaceError : authErrorMessage(error, displayLocale)); }
    finally { submittingRef.current = false; setIsSubmitting(false); setGoogleBusy(false); }
  };

  const handleReset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true; setIsSubmitting(true); setError(null);
    try {
      const response = await apiFetch('/api/auth', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resetPassword', email, locale: displayLocale }), signal: AbortSignal.timeout(15_000) });
      const data = await response.json();
      if (!response.ok) throw Object.assign(new Error(data.error), { code: data.code });
      setResetSent(true);
    } catch (error) { setError(authErrorMessage(error, displayLocale)); }
    finally { submittingRef.current = false; setIsSubmitting(false); }
  };

  const switchMode = (next: Mode) => navigateTo("auth", next);
  const onLoginPage = view === "auth" && mode === "login";
  const Brand = onLoginPage ? "span" : "button";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return;
    setError(null);
    if (isRegister) {
      if (!setupRef.current) {
        navigateTo("onboarding");
        return;
      }
      if (!nom.trim() || !prenom.trim()) return setError(copy.nameRequired);
      if (password.length < 8) return setError(copy.passwordRequired);
      if (password !== confirmPassword) return setError(copy.passwordMismatch);
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      if (mode === "login") await login(loginMethod === 'phone' ? phone : email, password);
      else
        await register({
          nom: nom.trim(),
          prenom: prenom.trim(),
          phone,
          email: email.trim(),
          password,
          ...(setup
            ? { setup: { ...setup, applicationLocale: displayLocale } }
            : {}),
        });
    } catch (err) {
      // Le compte bloqué par la direction mérite une explication explicite,
      // quelle que soit la langue de l'interface.
      const blockedByDirection = (err as { code?: string } | null)?.code === "ACCOUNT_BLOCKED";
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

  return (
    <div
      ref={pageRef}
      data-auth-view={view}
      data-pwa-update-blocked={isSubmitting || Boolean(email || phone || password || confirmPassword || nom || prenom || setup || draft.cycle)}
      dir={displayLocale === "ar" ? "rtl" : "ltr"}
      lang={displayLocale}
      className="auth-page-shell flex min-h-dvh flex-col"
    >
      <header className="auth-header">
        <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <Brand
            {...(!onLoginPage && {
              type: "button" as const,
              onClick: () => navigateTo("auth", "login"),
              disabled: isSubmitting,
              title: copy.backToHome,
              "aria-label": copy.backToHome,
            })}
            className="auth-brand focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <img
              src="/icons/icon-192.png"
              width="36"
              height="36"
              alt=""
              className="object-contain"
            />
            <span className="auth-brand__name">{copy.brand}</span>
          </Brand>
        </div>
        <div
          dir="ltr"
          role="group"
          aria-label={copy.languageLabel}
          className="auth-languages"
        >
          {(["ar", "fr"] as const).map((value) => (
            <button
              key={value}
              type="button"
              lang={value}
              disabled={isSubmitting}
              onClick={() => {
                setError(null);
                onLocaleChange(value);
              }}
              aria-pressed={displayLocale === value}
              className="auth-choice focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <span>{value === "ar" ? "العربية" : "FR"}</span>
            </button>
          ))}
        </div>
      </header>
      {view === "onboarding" && (
        <RegistrationOnboarding
          locale={displayLocale}
          draft={draft}
          onChange={(next) => {
            setDraft(next);
            setSetup(null);
            setupRef.current = null;
          }}
          onComplete={completePreparation}
          onLogin={() => navigateTo("auth", "login")}
        />
      )}
      {view === "auth" && (
        <div className="auth-view-enter auth-access-layout">
          <main dir={displayLocale === 'ar' ? 'rtl' : 'ltr'} className="auth-form-main">
            <div className="auth-form-content">
                  <h1
                    tabIndex={-1}
                    id={id + "-title"}
                  >
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
                <div className="auth-divider"><span>{loginMethod === 'phone' && !isRegister ? copy.phone : copy.emailDivider}</span></div>
              </>}
              {resetMode ? <form onSubmit={handleReset} aria-busy={isSubmitting} className="mt-6 space-y-4">
                <label htmlFor={id + '-reset-email'} className={LABEL_CLASS}>{copy.email}</label>
                <Input id={id + '-reset-email'} type="email" inputMode="email" dir="ltr" autoComplete="email" required
                  value={email} onChange={event => { setEmail(event.target.value); setResetSent(false); }} disabled={isSubmitting} className={FIELD_CLASS} />
                {resetSent && <p role="status" className="auth-reset-success">{copy.resetSent}</p>}
                {error && <p ref={errorRef} tabIndex={-1} role="alert" className="auth-error">{error}</p>}
                <Button type="submit" disabled={isSubmitting || resetSent} className="auth-submit">{isSubmitting ? copy.wait : copy.resetSubmit}</Button>
                <button type="button" disabled={isSubmitting} className="auth-link" onClick={() => switchMode("login")}>{copy.backToLogin}</button>
              </form> : <>
              <form
                key={mode}
                className="auth-reveal"
                id={id + "-form"}
                onSubmit={handleSubmit}
                aria-labelledby={id + "-title"}
                aria-busy={isSubmitting}
              >
                <fieldset disabled={isSubmitting} className="min-w-0 space-y-4">
                  {notice === "blocked" && (
                    <p
                      role="status"
                      className="rounded-[8px] border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                    >
                      {copy.accountBlocked}
                    </p>
                  )}
                  {isRegister && (
                    <div className="grid grid-cols-1 gap-4 min-[390px]:grid-cols-2">
                      <div>
                        <label htmlFor={id + "-name"} className={LABEL_CLASS}>
                          {copy.name}
                        </label>
                        <Input
                          id={id + "-name"}
                          name="family-name"
                          value={nom}
                          onChange={(event) => setNom(event.target.value)}
                          autoComplete="family-name"
                          required
                          className={FIELD_CLASS}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={id + "-first-name"}
                          className={LABEL_CLASS}
                        >
                          {copy.firstName}
                        </label>
                        <Input
                          id={id + "-first-name"}
                          name="given-name"
                          value={prenom}
                          onChange={(event) => setPrenom(event.target.value)}
                          autoComplete="given-name"
                          required
                          className={FIELD_CLASS}
                        />
                      </div>
                    </div>
                  )}
                  {(isRegister || loginMethod === 'email') && <div>
                    <label htmlFor={id + '-email'} className={LABEL_CLASS}>{copy.email}</label>
                    <Input id={id + '-email'} name="email" type="email" inputMode="email" enterKeyHint="next" dir="ltr"
                      value={email} onChange={event => setEmail(event.target.value)} autoComplete={isRegister ? 'email' : 'username'}
                      autoCapitalize="none" autoCorrect="off" spellCheck={false} required maxLength={254} placeholder="vous@exemple.com" className={FIELD_CLASS} />
                  </div>}
                  {!isRegister && loginMethod === 'phone' && <div>
                    <label htmlFor={id + "-phone"} className={LABEL_CLASS}>
                      {copy.phone}
                    </label>
                    <div className="relative" dir="ltr">
                      <Input
                        id={id + "-phone"}
                        name="phone"
                        type="tel"
                        inputMode="tel"
                        enterKeyHint="next"
                        dir="ltr"
                        value={phone}
                        onChange={(event) =>
                          setPhone(formatMoroccanPhone(event.target.value))
                        }
                        autoComplete="tel"
                        placeholder="06 12 34 56 78"
                        required
                        aria-describedby={
                          phoneValid ? id + "-phone-valid" : undefined
                        }
                        className={
                          FIELD_CLASS + " auth-phone text-left tabular-nums"
                        }
                      />
                      {phoneValid && (
                        <span
                          id={id + "-phone-valid"}
                          role="status"
                          className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-emerald-700 dark:text-emerald-300"
                        >
                          <CircleCheck className="h-5 w-5" aria-hidden="true" />
                          <span className="sr-only">{copy.phoneComplete}</span>
                        </span>
                      )}
                    </div>
                  </div>}
                  <div>
                    <label htmlFor={id + "-password"} className={LABEL_CLASS}>
                      {copy.password}
                    </label>
                    <PasswordInput
                      id={id + "-password"}
                      value={password}
                      onChange={setPassword}
                      autoComplete={
                        isRegister ? "new-password" : "current-password"
                      }
                      required
                      minLength={isRegister ? 8 : undefined}
                      copy={copy}
                    />
                    {isRegister && (
                      <div
                        className="mt-3"
                        role="meter"
                        aria-label={copy.strengthLabel}
                        aria-valuemin={0}
                        aria-valuemax={4}
                        aria-valuenow={score}
                        aria-valuetext={
                          score ? copy.strength[score - 1] : copy.passwordMin
                        }
                      >
                        <div className="flex gap-1.5" aria-hidden="true">
                          {[1, 2, 3, 4].map((level) => (
                            <span
                              key={level}
                              className={
                                "h-1 flex-1 rounded-full transition-colors motion-reduce:transition-none " +
                                (level > score
                                  ? "bg-stone-200 dark:bg-stone-700"
                                  : score === 1
                                    ? "bg-red-600"
                                    : score === 2
                                      ? "bg-amber-600"
                                      : "bg-emerald-600")
                              }
                            />
                          ))}
                        </div>
                        <p className="mt-2 text-xs text-stone-600 dark:text-stone-400">
                          {score
                            ? copy.strengthLabel +
                              " : " +
                              copy.strength[score - 1]
                            : copy.passwordMin}
                        </p>
                      </div>
                    )}
                  </div>
                  {isRegister && (
                    <div>
                      <label htmlFor={id + "-confirm"} className={LABEL_CLASS}>
                        {copy.confirmPassword}
                      </label>
                      <PasswordInput
                        id={id + "-confirm"}
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        autoComplete="new-password"
                        required
                        copy={copy}
                      />
                      {passwordsMatch && (
                        <p
                          role="status"
                          className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300"
                        >
                          <CircleCheck className="h-4 w-4" aria-hidden="true" />
                          {copy.samePassword}
                        </p>
                      )}
                    </div>
                  )}
                  {isRegister && <details className="auth-optional">
                    <summary>{copy.contactOptional}</summary>
                    <label htmlFor={id + '-contact'} className={LABEL_CLASS}>{copy.phoneOptional}</label>
                    <Input id={id + '-contact'} name="tel" type="tel" inputMode="tel" autoComplete="tel" dir="ltr"
                      value={phone} onChange={event => setPhone(formatMoroccanPhone(event.target.value))} className={FIELD_CLASS} placeholder="06 12 34 56 78" />
                    <p>{copy.contactHelp}</p>
                  </details>}
                  {!isRegister && loginMethod === 'email' && <button type="button" className="auth-link auth-forgot" onClick={() => switchMode("reset")}>{copy.forgotPassword}</button>}
                  {error && (
                    <p
                      ref={errorRef}
                      tabIndex={-1}
                      role="alert"
                      className="rounded-[8px] border border-red-200 bg-red-50 p-3 text-sm text-red-800 focus-visible:outline-2 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
                    >
                      {error}
                    </p>
                  )}
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="auth-submit auth-action disabled:cursor-wait"
                  >
                    {isSubmitting && (
                      <Loader2
                        className="h-4 w-4 animate-spin motion-reduce:animate-none"
                        aria-hidden="true"
                      />
                    )}
                    {isSubmitting
                      ? copy.wait
                      : isRegister
                        ? copy.createMyAccount
                        : copy.login}
                  </Button>
                </fieldset>
              </form>
              {!isRegister && <button type="button" disabled={isSubmitting} className="auth-link auth-legacy" onClick={() => { setLoginMethod(method => method === 'email' ? 'phone' : 'email'); setError(null); }}>
                {loginMethod === 'email' ? copy.legacyPhone : copy.useEmail}
              </button>}
              </>}
              {!resetMode && <p className="auth-account-switch">
                <span>{displayLocale === 'ar' ? (isRegister ? 'لديك حساب؟' : 'أول زيارة لك؟') : (isRegister ? 'Déjà un compte ?' : 'Vous débutez ?')}</span>
                <button type="button" disabled={isSubmitting} className="auth-link" onClick={() => switchMode(isRegister ? 'login' : 'register')}>
                  {isRegister ? copy.login : copy.createAccount}
                </button>
              </p>}
              <footer className="auth-footer">
                <a href="/admin.html" className="auth-link"><ShieldCheck size={15} aria-hidden="true" />{displayLocale === 'ar' ? 'فضاء الإدارة' : 'Espace administration'}</a>
              </footer>
            </div>
          </main>
        </div>
      )}
    </div>
  );
};
