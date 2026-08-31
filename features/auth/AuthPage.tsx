import React, { useEffect, useId, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { CircleCheck, Eye, EyeOff, Loader2, TriangleAlert, LockKeyhole } from '@/components/ui/icons';
import { CountryFlag } from '@/components/ui/CountryFlags';
import type { AppLocale } from '@/types';
import { AuthShowcase } from './AuthShowcase';
import { formatMoroccanPhone, isCompleteMoroccanPhone, passwordScore } from './authForm';
import { WorkspaceSwitchError } from '@/utils/accountWorkspace';

type Mode = 'login' | 'register';
type AuthLocale = Extract<AppLocale, 'ar' | 'fr'>;
const AUTH_COPY = {
  fr: {
    brand: 'Mon cahier de textes', teacherAccess: 'Espace enseignant',
    workspaceError: 'Changement de compte interrompu pour protéger vos données locales. Libérez de l’espace puis réessayez.',
    welcomeTitle: 'Retrouvez votre cahier.', createTitle: 'Votre espace commence ici.',
    welcomeDetail: 'Connectez-vous pour préparer et suivre vos séances.',
    createDetail: 'Créez votre compte, puis configurez vos classes à votre rythme.',
    login: 'Se connecter', createAccount: 'S’inscrire', modeLabel: 'Accès au compte',
    name: 'Nom', firstName: 'Prénom', phone: 'Numéro de téléphone', phoneComplete: 'Format du numéro valide',
    password: 'Mot de passe', confirmPassword: 'Confirmer le mot de passe',
    showPassword: 'Afficher le mot de passe', hidePassword: 'Masquer le mot de passe', capsLock: 'Verr. maj. activée',
    passwordMin: '8 caractères minimum', samePassword: 'Mots de passe identiques',
    wait: 'Traitement en cours…', createMyAccount: 'Créer mon compte',
    secure: 'Vos identifiants restent personnels.', languageLabel: 'Choisir la langue',
    nameRequired: 'Renseignez votre nom et votre prénom.', passwordRequired: 'Le mot de passe doit contenir au moins 8 caractères.',
    passwordMismatch: 'Les deux mots de passe ne correspondent pas.', unknownError: 'Connexion impossible. Vérifiez vos identifiants et votre connexion Internet.',
    strengthLabel: 'Robustesse indicative', strength: ['Faible', 'Moyenne', 'Bonne', 'Forte'],
  },
  ar: {
    brand: 'دفتر نصوصي', teacherAccess: 'فضاء الأستاذ',
    workspaceError: 'أُوقف تغيير الحساب لحماية بياناتك المحلية. وفّر مساحة تخزين ثم أعد المحاولة.',
    welcomeTitle: 'دفترك في انتظارك.', createTitle: 'فضاؤك يبدأ من هنا.',
    welcomeDetail: 'سجّل الدخول لتحضير حصصك وتتبعها.', createDetail: 'أنشئ حسابك، ثم أضف أقسامك حسب حاجتك.',
    login: 'تسجيل الدخول', createAccount: 'إنشاء حساب', modeLabel: 'الولوج إلى الحساب',
    name: 'الاسم العائلي', firstName: 'الاسم الشخصي', phone: 'رقم الهاتف', phoneComplete: 'صيغة الرقم صحيحة',
    password: 'كلمة المرور', confirmPassword: 'تأكيد كلمة المرور',
    showPassword: 'إظهار كلمة المرور', hidePassword: 'إخفاء كلمة المرور', capsLock: 'مفتاح الأحرف الكبيرة مفعّل',
    passwordMin: '8 أحرف على الأقل', samePassword: 'كلمتا المرور متطابقتان',
    wait: 'جارٍ المعالجة…', createMyAccount: 'إنشاء حسابي',
    secure: 'بيانات الدخول خاصة بك، لا تشاركها.', languageLabel: 'اختيار اللغة',
    nameRequired: 'أدخل الاسم الشخصي والعائلي.', passwordRequired: 'يجب أن تتضمن كلمة المرور 8 أحرف على الأقل.',
    passwordMismatch: 'كلمتا المرور غير متطابقتين.', unknownError: 'تعذّر الاتصال. تحقق من بيانات الدخول ومن اتصالك بالإنترنت.',
    strengthLabel: 'مؤشر قوة كلمة المرور', strength: ['ضعيفة', 'متوسطة', 'جيدة', 'قوية'],
  },
} as const;
const FIELD_CLASS = 'h-12 rounded-[8px] border border-stone-300 bg-white px-3 text-base font-normal text-stone-900 shadow-none placeholder:text-stone-400 focus-visible:border-stone-600 focus-visible:ring-2 focus-visible:ring-stone-500/20 dark:border-[#5f6368] dark:bg-[#202124] dark:text-stone-100';
const LABEL_CLASS = 'mb-2 block text-sm font-medium';

const PasswordInput = ({ id, value, onChange, autoComplete, required, minLength, copy }: {
  id: string; value: string; onChange: (value: string) => void;
  autoComplete: string; required?: boolean; minLength?: number; copy: typeof AUTH_COPY[AuthLocale];
}) => {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const detectCaps = (event: React.KeyboardEvent<HTMLInputElement>) => setCapsLock(event.getModifierState('CapsLock'));
  return <div>
    <div className="relative">
      <Input id={id} name={id} type={visible ? 'text' : 'password'} value={value} onChange={event => onChange(event.target.value)}
        onKeyDown={detectCaps} onKeyUp={detectCaps} onBlur={() => setCapsLock(false)} autoComplete={autoComplete}
        required={required} minLength={minLength} autoCapitalize="none" autoCorrect="off" spellCheck={false}
        aria-describedby={capsLock ? id + '-caps' : undefined} className={FIELD_CLASS + ' pe-12'} />
      <button type="button" onClick={() => setVisible(value => !value)} aria-label={visible ? copy.hidePassword : copy.showPassword}
        aria-pressed={visible} aria-controls={id} className="absolute inset-y-0 end-0 flex w-12 items-center justify-center rounded-[8px] text-stone-500 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-stone-400 dark:hover:text-white">
        {visible ? <EyeOff className="h-4.5 w-4.5" aria-hidden="true" /> : <Eye className="h-4.5 w-4.5" aria-hidden="true" />}
      </button>
    </div>
    {capsLock && <p id={id + '-caps'} role="status" className="mt-2 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300"><TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />{copy.capsLock}</p>}
  </div>;
};

export const AuthPage: React.FC<{ locale: AppLocale; onLocaleChange: (locale: AuthLocale) => void }> = ({ locale, onLocaleChange }) => {
  const { login, register } = useAuth();
  const displayLocale: AuthLocale = locale === 'ar' ? 'ar' : 'fr';
  const copy = AUTH_COPY[displayLocale];
  const reducedMotion = useReducedMotion();
  const [mode, setMode] = useState<Mode>('login');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const id = useId();
  const isRegister = mode === 'register';
  const score = passwordScore(password);
  const phoneValid = isCompleteMoroccanPhone(phone);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  const switchMode = (next: Mode) => {
    if (submittingRef.current) return;
    setMode(next);
    setError(null);
  };
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return;
    setError(null);
    if (isRegister) {
      if (!nom.trim() || !prenom.trim()) return setError(copy.nameRequired);
      if (password.length < 8) return setError(copy.passwordRequired);
      if (password !== confirmPassword) return setError(copy.passwordMismatch);
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      // Preserve the backend contract, including legacy accounts with shorter local numbers.
      if (mode === 'login') await login(phone, password);
      else await register({ nom: nom.trim(), prenom: prenom.trim(), phone, password });
    } catch (err) {
      setError(err instanceof WorkspaceSwitchError ? copy.workspaceError : displayLocale === 'fr' && err instanceof Error ? err.message : copy.unknownError);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return <div dir={displayLocale === 'ar' ? 'rtl' : 'ltr'} lang={displayLocale} className="auth-page-shell flex min-h-dvh flex-col text-stone-900 dark:text-stone-100">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e0e0e0] px-4 py-3 dark:border-[#5f6368] sm:px-8 lg:px-10">
      <div className="flex min-w-0 items-center gap-2.5">
        <img src="/icone.png" width="40" height="40" alt="" className="h-10 w-10 shrink-0 rounded-[8px] object-contain" />
        <div className="min-w-0"><p className="text-sm font-semibold sm:text-base">{copy.brand}</p><p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{copy.teacherAccess}</p></div>
      </div>
      <div dir="ltr" role="group" aria-label={copy.languageLabel} className="flex shrink-0 gap-1 rounded-[12px] border border-[#e0e0e0] p-1 dark:border-[#5f6368]">
        {(['ar', 'fr'] as const).map(value => <button key={value} type="button" lang={value} disabled={isSubmitting} onClick={() => { setError(null); onLocaleChange(value); }} aria-pressed={displayLocale === value}
          className={'flex min-h-11 items-center justify-center gap-1.5 rounded-[8px] px-2.5 text-sm font-medium transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 ' + (displayLocale === value ? 'bg-stone-100 text-stone-950 dark:bg-[#3c4043] dark:text-white' : 'text-stone-500 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-white/5')}>
          <CountryFlag code={value} className="h-3 w-4.5" /><span>{value === 'ar' ? 'العربية' : 'FR'}</span>
        </button>)}
      </div>
    </header>
    <div className="grid flex-1 lg:grid-cols-2">
      <AuthShowcase locale={displayLocale} />
      <main className="flex min-w-0 flex-col justify-center px-5 py-8 sm:px-10 lg:py-10">
        <div className="mx-auto w-full max-w-[400px]">
          <h1 id={id + '-title'} className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{isRegister ? copy.createTitle : copy.welcomeTitle}</h1>
          <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{isRegister ? copy.createDetail : copy.welcomeDetail}</p>
          <div role="group" aria-label={copy.modeLabel} className="my-6 grid grid-cols-2 gap-1 rounded-[12px] bg-stone-100 p-1 dark:bg-[#303134]">
            {(['login', 'register'] as const).map(value => <button key={value} type="button" disabled={isSubmitting} aria-pressed={mode === value} aria-controls={id + '-form'} onClick={() => switchMode(value)}
              className="relative min-h-11 rounded-[8px] px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60">
              {mode === value && <motion.span layoutId={id + '-active-mode'} aria-hidden="true" className="absolute inset-0 rounded-[8px] border border-[#e0e0e0] bg-white shadow-sm dark:border-[#5f6368] dark:bg-[#202124]" transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 450, damping: 36 }} />}
              <span className="relative">{value === 'login' ? copy.login : copy.createAccount}</span>
            </button>)}
          </div>
          <form id={id + '-form'} onSubmit={handleSubmit} aria-labelledby={id + '-title'} aria-busy={isSubmitting}>
            <fieldset disabled={isSubmitting} className="min-w-0 space-y-4">
              {isRegister && <div className="grid grid-cols-1 gap-4 min-[390px]:grid-cols-2">
                <div><label htmlFor={id + '-name'} className={LABEL_CLASS}>{copy.name}</label><Input id={id + '-name'} name="family-name" value={nom} onChange={event => setNom(event.target.value)} autoComplete="family-name" required className={FIELD_CLASS} /></div>
                <div><label htmlFor={id + '-first-name'} className={LABEL_CLASS}>{copy.firstName}</label><Input id={id + '-first-name'} name="given-name" value={prenom} onChange={event => setPrenom(event.target.value)} autoComplete="given-name" required className={FIELD_CLASS} /></div>
              </div>}
              <div>
                <label htmlFor={id + '-phone'} className={LABEL_CLASS}>{copy.phone}</label>
                <div className="relative" dir="ltr">
                  <Input id={id + '-phone'} name="phone" type="tel" inputMode="tel" dir="ltr" value={phone} onChange={event => setPhone(formatMoroccanPhone(event.target.value))} autoComplete="tel" placeholder="06 12 34 56 78" required
                    aria-describedby={phoneValid ? id + '-phone-valid' : undefined} className={FIELD_CLASS + ' pr-11 text-left tabular-nums'} />
                  {phoneValid && <span id={id + '-phone-valid'} role="status" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-emerald-700 dark:text-emerald-300"><CircleCheck className="h-5 w-5" aria-hidden="true" /><span className="sr-only">{copy.phoneComplete}</span></span>}
                </div>
              </div>
              <div>
                <label htmlFor={id + '-password'} className={LABEL_CLASS}>{copy.password}</label>
                <PasswordInput id={id + '-password'} value={password} onChange={setPassword} autoComplete={isRegister ? 'new-password' : 'current-password'} required minLength={isRegister ? 8 : undefined} copy={copy} />
                {isRegister && <div className="mt-3" role="meter" aria-label={copy.strengthLabel} aria-valuemin={0} aria-valuemax={4} aria-valuenow={score} aria-valuetext={score ? copy.strength[score - 1] : copy.passwordMin}>
                  <div className="flex gap-1.5" aria-hidden="true">{[1, 2, 3, 4].map(level => <span key={level} className={'h-1 flex-1 rounded-full transition-colors motion-reduce:transition-none ' + (level > score ? 'bg-stone-200 dark:bg-stone-700' : score === 1 ? 'bg-red-600' : score === 2 ? 'bg-amber-600' : 'bg-emerald-600')} />)}</div>
                  <p className="mt-2 text-xs text-stone-600 dark:text-stone-400">{score ? copy.strengthLabel + ' : ' + copy.strength[score - 1] : copy.passwordMin}</p>
                </div>}
              </div>
              {isRegister && <div>
                <label htmlFor={id + '-confirm'} className={LABEL_CLASS}>{copy.confirmPassword}</label>
                <PasswordInput id={id + '-confirm'} value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" required copy={copy} />
                {passwordsMatch && <p role="status" className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300"><CircleCheck className="h-4 w-4" aria-hidden="true" />{copy.samePassword}</p>}
              </div>}
              {error && <p ref={errorRef} tabIndex={-1} role="alert" className="rounded-[8px] border border-red-200 bg-red-50 p-3 text-sm text-red-800 focus-visible:outline-2 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{error}</p>}
              <button type="submit" disabled={isSubmitting} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition-[background-color,transform] hover:bg-stone-700 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-wait disabled:opacity-60 dark:bg-stone-100 dark:text-stone-950 dark:hover:bg-white">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}{isSubmitting ? copy.wait : isRegister ? copy.createMyAccount : copy.login}
              </button>
            </fieldset>
          </form>
          <p className="mt-6 flex items-center justify-center gap-2 text-xs text-stone-500 dark:text-stone-400"><LockKeyhole className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{copy.secure}</p>
        </div>
      </main>
    </div>
  </div>;
};
