import React, {
  lazy,
  Suspense,
  useEffect,
  useId,
  useRef,
  useState,
  useCallback,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  CircleCheck,
  Eye,
  EyeOff,
  Loader2,
  TriangleAlert,
  LockKeyhole,
  ArrowLeft,
  ArrowRight,
} from "@/components/ui/icons";
import type { AppLocale } from "@/types";
import { AuthShowcase } from "./AuthShowcase";
import { LandingPage } from "./LandingPage";
import "./authMotion.css";
import "./auth-layout.css";
import {
  formatMoroccanPhone,
  isCompleteMoroccanPhone,
  passwordScore,
} from "./authForm";
import {
  readWorkspaceScope,
  WorkspaceSwitchError,
} from "@/infrastructure/storage/accountWorkspace";
import type { RegistrationSetup, RegistrationDraft } from "./registrationSetup";
import {
  authRouteHash,
  resolveAuthRoute,
  type AuthMode as Mode,
  type AuthView,
} from "./authNavigation";

const RegistrationOnboarding = lazy(() =>
  import("./RegistrationOnboarding").then((module) => ({
    default: module.RegistrationOnboarding,
  })),
);
type AuthLocale = Extract<AppLocale, "ar" | "fr">;
const AUTH_COPY = {
  fr: {
    brand: "Mon cahier de textes",
    teacherAccess: "Espace enseignant",
    backToHome: "Retour à l’accueil",
    returnToPreparation: "Modifier ma classe",
    savePreparation: "Conservez votre premier cahier.",
    savePreparationDetail:
      "Dernière étape : créez votre compte pour conserver votre classe et ouvrir votre cahier.",
    existingAccountHint:
      "La connexion retrouve vos cahiers existants, sans les remplacer par cette préparation.",
    workspaceError:
      "Changement de compte interrompu pour protéger vos données locales. Libérez de l’espace puis réessayez.",
    accountBlocked:
      "Votre accès a été suspendu par votre établissement. Contactez la direction pour le rétablir.",
    welcomeTitle: "Heureux de vous retrouver.",
    welcomeDetail: "Connectez-vous pour retrouver vos classes et vos séances.",
    login: "Se connecter",
    createAccount: "Créer un compte",
    modeLabel: "Accès au compte",
    name: "Nom",
    firstName: "Prénom",
    phone: "Numéro de téléphone",
    phoneComplete: "Format du numéro valide",
    password: "Mot de passe",
    confirmPassword: "Confirmer le mot de passe",
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
    capsLock: "Verr. maj. activée",
    passwordMin: "8 caractères minimum",
    samePassword: "Mots de passe identiques",
    wait: "Traitement en cours…",
    createMyAccount: "Créer mon compte",
    secure: "Vos identifiants restent personnels.",
    languageLabel: "Choisir la langue",
    nameRequired: "Renseignez votre nom et votre prénom.",
    passwordRequired: "Le mot de passe doit contenir au moins 8 caractères.",
    passwordMismatch: "Les deux mots de passe ne correspondent pas.",
    unknownError:
      "Connexion impossible. Vérifiez vos identifiants et votre connexion Internet.",
    strengthLabel: "Robustesse indicative",
    strength: ["Faible", "Moyenne", "Bonne", "Forte"],
  },
  ar: {
    brand: "دفتر نصوصي",
    teacherAccess: "فضاء الأستاذ",
    backToHome: "العودة إلى الرئيسية",
    returnToPreparation: "تعديل قسمي",
    savePreparation: "احفظ دفترك الأول.",
    savePreparationDetail:
      "الخطوة الأخيرة: أنشئ حسابك لحفظ قسمك وفتح دفتر نصوصك.",
    existingAccountHint:
      "يفتح تسجيل الدخول دفاترك الحالية دون استبدالها بهذه الإعدادات.",
    workspaceError:
      "أُوقف تغيير الحساب لحماية بياناتك المحلية. وفّر مساحة تخزين ثم أعد المحاولة.",
    accountBlocked:
      "تم إيقاف ولوجك من طرف إدارتك. تواصل مع الإدارة لاستعادة الدخول.",
    welcomeTitle: "سعداء بعودتك.",
    welcomeDetail: "سجّل دخولك للعودة إلى أقسامك وحصصك.",
    login: "تسجيل الدخول",
    createAccount: "إنشاء حساب جديد",
    modeLabel: "الولوج إلى الحساب",
    name: "الاسم العائلي",
    firstName: "الاسم الشخصي",
    phone: "رقم الهاتف",
    phoneComplete: "صيغة الرقم صحيحة",
    password: "كلمة المرور",
    confirmPassword: "تأكيد كلمة المرور",
    showPassword: "إظهار كلمة المرور",
    hidePassword: "إخفاء كلمة المرور",
    capsLock: "مفتاح الأحرف الكبيرة مفعّل",
    passwordMin: "8 أحرف على الأقل",
    samePassword: "كلمتا المرور متطابقتان",
    wait: "جارٍ المعالجة…",
    createMyAccount: "إنشاء حسابي",
    secure: "بيانات الدخول خاصة بك، لا تشاركها.",
    languageLabel: "اختيار اللغة",
    nameRequired: "أدخل الاسم الشخصي والعائلي.",
    passwordRequired: "يجب أن تتضمن كلمة المرور 8 أحرف على الأقل.",
    passwordMismatch: "كلمتا المرور غير متطابقتين.",
    unknownError: "تعذّر الاتصال. تحقق من بيانات الدخول ومن اتصالك بالإنترنت.",
    strengthLabel: "مؤشر قوة كلمة المرور",
    strength: ["ضعيفة", "متوسطة", "جيدة", "قوية"],
  },
} as const;
const FIELD_CLASS =
  "auth-field placeholder:text-muted-foreground";
const LABEL_CLASS = "mb-2 block text-sm font-medium";

const PasswordInput = ({
  id,
  value,
  onChange,
  autoComplete,
  required,
  minLength,
  copy,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  required?: boolean;
  minLength?: number;
  copy: (typeof AUTH_COPY)[AuthLocale];
}) => {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const detectCaps = (event: React.KeyboardEvent<HTMLInputElement>) =>
    setCapsLock(event.getModifierState("CapsLock"));
  return (
    <div>
      <div className="relative">
        <Input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={detectCaps}
          onKeyUp={detectCaps}
          onBlur={() => setCapsLock(false)}
          autoComplete={autoComplete}
          enterKeyHint={autoComplete === 'current-password' ? 'go' : 'next'}
          required={required}
          minLength={minLength}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-describedby={capsLock ? id + "-caps" : undefined}
          className={FIELD_CLASS + " auth-password"}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? copy.hidePassword : copy.showPassword}
          aria-pressed={visible}
          aria-controls={id}
          className="auth-password-toggle focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {visible ? (
            <EyeOff className="h-4.5 w-4.5" aria-hidden="true" />
          ) : (
            <Eye className="h-4.5 w-4.5" aria-hidden="true" />
          )}
        </button>
      </div>
      {capsLock && (
        <p
          id={id + "-caps"}
          role="status"
          className="mt-2 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300"
        >
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          {copy.capsLock}
        </p>
      )}
    </div>
  );
};

export const AuthPage: React.FC<{
  locale: AppLocale;
  onLocaleChange: (locale: AuthLocale) => void;
  /** Motif d'une session close par la direction : affiché avant le formulaire. */
  notice?: "blocked" | null;
}> = ({ locale, onLocaleChange, notice = null }) => {
  const { login, register } = useAuth();
  const displayLocale: AuthLocale = locale === "ar" ? "ar" : "fr";
  const copy = AUTH_COPY[displayLocale];
  const reducedMotion = useReducedMotion();

  const getInitialState = () => {
    let returning = false;
    try {
      returning =
        Boolean(readWorkspaceScope()?.owner) ||
        localStorage.getItem("authSignedOut_v1") === "true";
    } catch {
      /* storage unavailable */
    }
    return resolveAuthRoute(window.location.hash, false, returning);
  };

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

  const switchMode = (next: Mode) => navigateTo("auth", next);

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
      // Preserve the backend contract, including legacy accounts with shorter local numbers.
      if (mode === "login") await login(phone, password);
      else
        await register({
          nom: nom.trim(),
          prenom: prenom.trim(),
          phone,
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
            : displayLocale === "fr" && err instanceof Error
              ? err.message
              : copy.unknownError,
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div
      ref={pageRef}
      dir={displayLocale === "ar" ? "rtl" : "ltr"}
      lang={displayLocale}
      className="auth-page-shell flex min-h-dvh flex-col"
    >
      <header className="auth-header">
        <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={() => {
              if (view !== "landing") {
                navigateTo("landing");
              }
            }}
            disabled={isSubmitting}
            className="auth-brand focus-visible:outline-2 focus-visible:outline-offset-2"
            title={copy.backToHome}
            aria-label={copy.backToHome}
          >
            <img
              src="/icone.png"
              width="36"
              height="36"
              alt=""
              className="object-contain"
            />
            <div className="min-w-0">
              <p className="auth-brand__name">
                {copy.brand}
              </p>
              <p className="auth-brand__detail">
                {copy.teacherAccess}
              </p>
            </div>
          </button>
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
      {view === "landing" && (
        <LandingPage
          locale={displayLocale}
          onLogin={() => navigateTo("auth", "login")}
          onRegister={() => navigateTo("onboarding")}
        />
      )}
      {view === "onboarding" && (
        <Suspense
          fallback={
            <main className="mx-auto w-full max-w-3xl p-6" aria-busy="true">
              <div className="mb-6 h-8 w-2/3 rounded-lg skeleton-shimmer" />
              <div className="keep-surface h-64 skeleton-shimmer" />
            </main>
          }
        >
          <RegistrationOnboarding
            locale={displayLocale}
            draft={draft}
            onChange={(next) => {
              setDraft(next);
              setSetup(null);
              setupRef.current = null;
            }}
            onComplete={completePreparation}
          />
        </Suspense>
      )}
      {view === "auth" && (
        <div className="auth-view-enter auth-access-layout">
          <AuthShowcase locale={displayLocale} />
          <main dir={displayLocale === 'ar' ? 'rtl' : 'ltr'} className="auth-form-main">
            <div className="auth-form-content">
              <button type="button" disabled={isSubmitting} onClick={() => navigateTo('landing')} className="auth-back auth-action focus-visible:outline-2 focus-visible:outline-offset-2">
                {displayLocale === 'ar' ? <ArrowRight aria-hidden="true" /> : <ArrowLeft aria-hidden="true" />}{copy.backToHome}
              </button>
              <h1
                tabIndex={-1}
                id={id + "-title"}
              >
                {isRegister ? copy.savePreparation : copy.welcomeTitle}
              </h1>
              <p className="auth-form-detail">
                {isRegister
                  ? copy.savePreparationDetail
                  : setup
                    ? copy.existingAccountHint
                    : copy.welcomeDetail}
              </p>
              {setup && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => navigateTo("onboarding")}
                  className="mt-2 min-h-11 rounded-lg text-sm font-medium underline underline-offset-4 focus-visible:outline-2"
                >
                  {copy.returnToPreparation}
                </button>
              )}
              <div
                role="group"
                aria-label={copy.modeLabel}
                className="auth-modes"
              >
                {(["login", "register"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    disabled={isSubmitting}
                    aria-pressed={mode === value}
                    aria-controls={id + "-form"}
                    onClick={() => switchMode(value)}
                    className="auth-choice focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    {mode === value && (
                      <motion.span
                        layoutId={id + "-active-mode"}
                        aria-hidden="true"
                        className="auth-mode-active"
                        transition={
                          reducedMotion
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 450, damping: 36 }
                        }
                      />
                    )}
                    <span className="relative">
                      {value === "login" ? copy.login : copy.createAccount}
                    </span>
                  </button>
                ))}
              </div>
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
                  <div>
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
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-emerald-700 dark:text-emerald-300"
                        >
                          <CircleCheck className="h-5 w-5" aria-hidden="true" />
                          <span className="sr-only">{copy.phoneComplete}</span>
                        </span>
                      )}
                    </div>
                  </div>
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
              <p className="auth-secure">
                <LockKeyhole
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                {copy.secure}
              </p>
            </div>
          </main>
        </div>
      )}
    </div>
  );
};
