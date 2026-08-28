import React, { useEffect, useId, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { BookOpen, CircleCheck, Eye, EyeOff, Loader2, TriangleAlert, ShieldCheck } from '@/components/ui/icons';
import { AppLocale } from '@/types';

type Mode = 'login' | 'register';
type AuthLocale = Extract<AppLocale, 'ar' | 'fr'>;

const AUTH_COPY = {
  fr: {
    brand: 'Cahier de Textes Numérique', online: 'Plateforme Officielle', teacherAccess: 'Espace Enseignant',
    promise: 'Une expérience de saisie rapide et agréable',
    promiseDetail: 'Une application intelligente qui vous alerte, gère votre emploi du temps et évite les erreurs.',
    heroGreeting: 'Bienvenue sur',
    heroTagline: 'Skip les tâches manuelles et gagnez un temps précieux ! Remplissez votre cahier de textes en quelques clics.',
    techBadge: 'Système Pédagogique',
    featureHighlights: [
      { text: 'Notifications intelligentes', desc: 'L\'application vous notifie à chaque séance et vous alerte si vous êtes en retard.' },
      { text: 'Calendrier scolaire intégré', desc: 'Prend en compte les vacances, jours fériés et examens.' },
      { text: 'Génération instantanée', desc: 'Remplissez vos cahiers en quelques secondes.' },
      { text: 'Sécurité & Synchronisation', desc: 'Moteur chiffré et conforme aux normes pédagogiques.' },
    ],
    welcomeTitle: 'Bon retour parmi nous !',
    createTitle: 'Créer votre compte',
    welcomeSubtitle: 'Vous n’avez pas de compte ?',
    createSubtitle: 'Vous avez déjà un compte ?',
    welcomeDetail: 'Accédez à votre plateforme de gestion pédagogique et au suivi de vos classes.',
    createDetail: 'Configurez votre établissement, vos cycles et vos classes en quelques secondes.',
    login: 'Connexion', createAccount: 'S’inscrire', name: 'Nom', firstName: 'Prénom',
    phone: 'Numéro de téléphone', password: 'Mot de passe', confirmPassword: 'Confirmer le mot de passe',
    showPassword: 'Afficher le mot de passe', hidePassword: 'Masquer le mot de passe', capsLock: 'Verr. maj. activée',
    passwordMin: '8 car. min.', samePassword: 'Identiques',
    wait: 'Traitement en cours…', signIn: 'Se connecter', createMyAccount: 'Créer mon compte',
    secure: 'Connexion sécurisée · Moteur de synchronisation chiffré', languageLabel: 'Choisir la langue',
    copyright: '© 2026 Cahier de Textes Numérique. Tous droits réservés.',
    nameRequired: 'Renseignez votre nom et votre prénom.', passwordRequired: 'Le mot de passe doit contenir au moins 8 caractères.',
    passwordMismatch: 'Les deux mots de passe ne correspondent pas.', unknownError: 'Une erreur est survenue.',
    strength: ['Très faible', 'Faible', 'Moyen', 'Bon', 'Excellent'],
  },
  ar: {
    brand: 'دفتر النصوص الرقمي', online: 'المنظومة التربوية', teacherAccess: 'فضاء الأستاذ',
    promise: 'تعبئة دفتر النصوص أصبحت تجربة ممتعة وسريعة',
    promiseDetail: 'تطبيق ذكي يرافقك في إنجاز أعمالك وتتبع حصصك التربوية بدون أخطاء.',
    heroGreeting: 'مرحباً بك في',
    heroTagline: 'تجنب المهام اليدوية المكررة ووفر وقتك الثمين ! قم بتعبئة دفتر النصوص في ثوانٍ معدودة.',
    techBadge: 'منظومة تربوية',
    featureHighlights: [
      { text: 'إشعارات وتنبيهات ذكية', desc: 'التطبيق يشعرك في كل حصة، وينبهك إذا تأخرت عن تعبئة دفترك.' },
      { text: 'تقويم مدرسي مدمج', desc: 'يأخذ بعين الاعتبار العطل الرسمية والامتحانات مع تفادي الأخطاء.' },
      { text: 'توليد بضغطة زر', desc: 'تعبئة دفتر النصوص الخاص بك في ثوانٍ قليلة وبتكنولوجيا متقدمة.' },
      { text: 'أمان ومزامنة تلقائية', desc: 'نظام مشفر ومطابق للمعايير التربوية.' },
    ],
    welcomeTitle: 'أهلاً بك مجدداً !',
    createTitle: 'إنشاء حساب جديد',
    welcomeSubtitle: 'ليس لديك حساب بعد؟',
    createSubtitle: 'لديك حساب بالفعل؟',
    welcomeDetail: 'ولوج إلى فضاء التدبير البيداغوجي وتتبع التدرج الدراسي للأقسام.',
    createDetail: 'قم بتهيئة مادتك، السلك والأقسام في ثوانٍ معدودة.',
    login: 'تسجيل الدخول', createAccount: 'إنشاء حساب', name: 'الاسم العائلي', firstName: 'الاسم الشخصي',
    phone: 'رقم الهاتف', password: 'كلمة المرور', confirmPassword: 'تأكيد كلمة المرور',
    showPassword: 'إظهار كلمة المرور', hidePassword: 'إخفاء كلمة المرور', capsLock: 'مفتاح الأحرف الكبيرة مفعّل',
    passwordMin: '8 أحرف على الأقل', samePassword: 'متطابقتان',
    wait: 'جاري المعالجة…', signIn: 'الدخول إلى حسابي', createMyAccount: 'إنشاء حسابي',
    secure: 'اتصال آمن · نظام مزامنة مشفر ورقيم', languageLabel: 'اختيار اللغة',
    copyright: 'جميع الحقوق محفوظة © 2026 دفتر النصوص الرقمي.',
    nameRequired: 'أدخل الاسم الشخصي والنسب.', passwordRequired: 'يجب أن تتضمن كلمة المرور 8 أحرف على الأقل.',
    passwordMismatch: 'كلمتا المرور غير متطابقتين.', unknownError: 'حدث خطأ غير متوقع.',
    strength: ['ضعيفة جداً', 'ضعيفة', 'متوسطة', 'جيدة', 'ممتازة'],
  },
} as const;

/** Force du mot de passe, indicative (le serveur n'exige que 8 caractères). */
const passwordStrength = (pw: string, labels: readonly string[]): { score: number; label: string; barClass: string; textClass: string } => {
  if (!pw) return { score: 0, label: '', barClass: '', textClass: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const level = Math.min(score, 4);
  const map = [
    { label: labels[0], barClass: 'bg-red-500', textClass: 'text-red-600 dark:text-red-400' },
    { label: labels[1], barClass: 'bg-red-500', textClass: 'text-red-600 dark:text-red-400' },
    { label: labels[2], barClass: 'bg-amber-500', textClass: 'text-amber-600 dark:text-amber-400' },
    { label: labels[3], barClass: 'bg-emerald-500', textClass: 'text-emerald-600 dark:text-emerald-400' },
    { label: labels[4], barClass: 'bg-emerald-500', textClass: 'text-emerald-600 dark:text-emerald-400' },
  ];
  return { score: level, ...map[level] };
};

/** Formatage téléphone marocain : « 06 12 34 56 78 » (le backend ne garde que les chiffres). */
const formatMoroccanPhone = (raw: string): string =>
  raw.replace(/[^\d]/g, '').slice(0, 10).replace(/(\d{2})(?=\d)/g, '$1 ').trim();

/** Champ mot de passe : bascule de visibilité + alerte Verr. Maj. */
const PasswordInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  placeholder?: string;
  minLength?: number;
  required?: boolean;
  showLabel: string;
  hideLabel: string;
  capsLockLabel: string;
}> = ({ value, onChange, autoComplete, placeholder = '••••••••', minLength, required, showLabel, hideLabel, capsLockLabel }) => {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const detectCaps = (e: React.KeyboardEvent<HTMLInputElement>) => setCapsLock(e.getModifierState?.('CapsLock') ?? false);

  return (
    <div>
      <div className="relative">
        <Input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyUp={detectCaps}
          onKeyDown={detectCaps}
          onBlur={() => setCapsLock(false)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="h-12 rounded-xl border border-slate-300/90 bg-white dark:border-slate-700/80 dark:bg-slate-900/90 pr-11 pl-4 text-left text-xs font-semibold text-slate-950 shadow-xs transition-all placeholder:text-slate-400 hover:border-blue-400 focus:border-blue-600 focus:bg-white focus:shadow-md focus-visible:ring-2 focus-visible:ring-blue-600/20 dark:text-white dark:hover:border-blue-500 sm:text-[13px]"
          dir="ltr"
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 focus-visible:outline-none cursor-pointer"
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {capsLock && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400 animate-in fade-in duration-200">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-amber-600" /> {capsLockLabel}
        </p>
      )}
    </div>
  );
};

const LiveCheck: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) => (
  <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold transition-colors ${ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
    <CircleCheck className={`h-3.5 w-3.5 ${ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} /> {label}
  </span>
);

interface AuthPageProps {
  locale: AppLocale;
  onLocaleChange: (locale: AuthLocale) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ locale, onLocaleChange }) => {
  const { login, register } = useAuth();
  const displayLocale: AuthLocale = locale === 'fr' ? 'fr' : 'ar';
  const copy = AUTH_COPY[displayLocale];
  const isRtl = displayLocale === 'ar';
  const [mode, setMode] = useState<Mode>('login');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const errorId = useId();

  const passwordLongEnough = password.length >= 8;
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const phoneValid = phone.replace(/[^\d]/g, '').length >= 8;
  const strength = passwordStrength(password, copy.strength);
  const isRegister = mode === 'register';

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const switchMode = (next: Mode) => { setMode(next); setError(null); };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (isRegister) {
      if (!nom.trim() || !prenom.trim()) return setError(copy.nameRequired);
      if (!passwordLongEnough) return setError(copy.passwordRequired);
      if (password !== confirmPassword) return setError(copy.passwordMismatch);
    }
    setIsSubmitting(true);
    try {
      if (mode === 'login') await login(phone, password);
      else await register({ nom: nom.trim(), prenom: prenom.trim(), phone, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.unknownError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderLanguageSwitch = () => (
    <div dir="ltr" className="flex items-center rounded-xl border border-slate-300/80 bg-white/90 p-1 shadow-xs dark:border-slate-700 dark:bg-slate-800/90" role="group" aria-label={copy.languageLabel}>
      <button
        type="button"
        onClick={() => onLocaleChange('ar')}
        aria-pressed={displayLocale === 'ar'}
        className={`min-h-[36px] rounded-lg px-3.5 text-xs font-black transition-all cursor-pointer font-ibm-arabic ${displayLocale === 'ar' ? 'bg-[#1b3a8a] text-white shadow-sm' : 'text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'}`}
      >
        العربية
      </button>
      <button
        type="button"
        onClick={() => onLocaleChange('fr')}
        aria-pressed={displayLocale === 'fr'}
        className={`min-h-[36px] rounded-lg px-3.5 text-xs font-black transition-all cursor-pointer ${displayLocale === 'fr' ? 'bg-[#1b3a8a] text-white shadow-sm' : 'text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'}`}
      >
        FR
      </button>
    </div>
  );

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      lang={displayLocale}
      className={`auth-page-shell min-h-screen w-full flex flex-col lg:flex-row bg-[#F8FAFC] dark:bg-slate-950 text-slate-950 dark:text-slate-50 overflow-x-hidden selection:bg-[#2563eb] selection:text-white ${isRtl ? 'font-ibm-arabic' : "font-['Roboto_Slab',serif]"}`}
    >
      {/* ================= HERO / BANNER IMAGE PANEL (DESKTOP ONLY) ================= */}
      <aside className="relative hidden lg:flex lg:w-1/2 xl:w-[52%] items-center justify-center p-6 lg:p-10 bg-slate-100/90 dark:bg-slate-950 overflow-hidden shrink-0 min-h-screen">
        <div className="relative w-full h-full max-w-2xl flex items-center justify-center overflow-hidden rounded-3xl shadow-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6">
          <img
            key={displayLocale}
            src={displayLocale === 'ar' ? '/login_ar.png' : '/login_fr.png'}
            alt={copy.brand}
            className="w-full h-full max-h-[88vh] object-contain rounded-2xl transition-all duration-300 animate-in fade-in zoom-in-95"
          />
        </div>
      </aside>

      {/* ================= FORM PANEL ================= */}
      <main className="w-full lg:w-1/2 xl:w-[48%] min-h-screen flex flex-col justify-between p-4 sm:p-8 lg:p-14 bg-[#FAFCFF] lg:bg-white dark:bg-slate-950 lg:dark:bg-slate-900 shrink-0">
        
        {/* Top Navigation Row */}
        <header className="w-full flex items-center justify-between pb-4 sm:pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/30">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="flex flex-col text-start">
              <span className={`font-black text-slate-950 dark:text-white text-base sm:text-lg leading-tight ${isRtl ? 'font-ibm-arabic' : ''}`}>
                {copy.brand}
              </span>
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                {copy.teacherAccess}
              </span>
            </div>
          </div>

          {renderLanguageSwitch()}
        </header>

        {/* Center Form Card */}
        <div className="w-full max-w-md mx-auto my-auto py-2 sm:py-6">
          <div className="w-full rounded-2xl sm:rounded-3xl bg-white sm:bg-transparent dark:bg-slate-900 sm:dark:bg-transparent p-6 sm:p-0 shadow-lg sm:shadow-none border border-slate-200/90 sm:border-none dark:border-slate-800">
          
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: isRtl ? -15 : 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {/* Main Welcome Header */}
            <div className="text-start mb-6">
              <h2 className={`text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight ${isRtl ? 'font-ibm-arabic leading-snug' : ''}`}>
                {isRegister ? copy.createTitle : copy.welcomeTitle}
              </h2>
              
              <div className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-1.5 font-medium">
                <span>{isRegister ? copy.createSubtitle : copy.welcomeSubtitle}</span>
                <button
                  type="button"
                  onClick={() => switchMode(isRegister ? 'login' : 'register')}
                  className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline cursor-pointer focus:outline-none"
                >
                  {isRegister ? copy.login : copy.createAccount}
                </button>
              </div>
            </div>

            {/* Segmented Mode Control */}
            <div className="mb-6 grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100/90 p-1.5 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/60">
              {(['login', 'register'] as const).map(value => (
                <button
                  key={value}
                  type="button"
                  onClick={() => switchMode(value)}
                  className={`relative min-h-[42px] sm:min-h-[44px] rounded-xl px-3 py-2 text-xs font-black transition-colors focus:outline-none cursor-pointer ${mode === value ? 'text-slate-950 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  {mode === value && (
                    <motion.span
                      layoutId="auth-tab-split"
                      className="absolute inset-0 rounded-xl bg-white shadow-sm dark:bg-slate-700 border border-slate-200/90 dark:border-slate-600/70"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                    />
                  )}
                  <span className={`relative z-10 ${isRtl ? 'font-ibm-arabic' : ''}`}>{value === 'login' ? copy.login : copy.createAccount}</span>
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" aria-busy={isSubmitting}>
              
              {/* Nom + Prénom (inscription) */}
              <AnimatePresence initial={false}>
                {isRegister && (
                  <motion.div
                    key="names"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-1 gap-3 overflow-hidden min-[390px]:grid-cols-2"
                  >
                    <label className="block text-start">
                      <span className={`mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300 ${isRtl ? 'font-ibm-arabic' : 'uppercase tracking-wider text-[11px]'}`}>{copy.name}</span>
                      <Input
                        value={nom}
                        onChange={e => setNom(e.target.value)}
                        autoComplete="family-name"
                        placeholder={isRtl ? 'العلمي' : 'Benali'}
                        className={`h-12 rounded-xl border border-slate-300/90 bg-white text-xs font-bold text-slate-950 shadow-xs transition-all placeholder:text-slate-400 hover:border-blue-400 focus:border-blue-600 focus:bg-white focus:shadow-md dark:border-slate-700/80 dark:bg-slate-900/90 dark:text-white sm:text-[13px] ${isRtl ? 'font-ibm-arabic' : ''}`}
                      />
                    </label>
                    <label className="block text-start">
                      <span className={`mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300 ${isRtl ? 'font-ibm-arabic' : 'uppercase tracking-wider text-[11px]'}`}>{copy.firstName}</span>
                      <Input
                        value={prenom}
                        onChange={e => setPrenom(e.target.value)}
                        autoComplete="given-name"
                        placeholder={isRtl ? 'سلمى' : 'Malek'}
                        className={`h-12 rounded-xl border border-slate-300/90 bg-white text-xs font-bold text-slate-950 shadow-xs transition-all placeholder:text-slate-400 hover:border-blue-400 focus:border-blue-600 focus:bg-white focus:shadow-md dark:border-slate-700/80 dark:bg-slate-900/90 dark:text-white sm:text-[13px] ${isRtl ? 'font-ibm-arabic' : ''}`}
                      />
                    </label>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Phone Input */}
              <label className="block text-start">
                <span className={`mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300 ${isRtl ? 'font-ibm-arabic' : 'uppercase tracking-wider text-[11px]'}`}>{copy.phone}</span>
                <div className="relative">
                  <Input
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={e => setPhone(formatMoroccanPhone(e.target.value))}
                    autoComplete="tel"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="06 12 34 56 78"
                    required
                    aria-describedby={error ? errorId : undefined}
                    className="h-12 rounded-xl border border-slate-300/90 bg-white pr-11 pl-4 text-left text-xs font-bold text-slate-950 shadow-xs transition-all placeholder:text-slate-400 hover:border-blue-400 focus:border-blue-600 focus:bg-white focus:shadow-md dark:border-slate-700/80 dark:bg-slate-900/90 dark:text-white sm:text-[13px]"
                    dir="ltr"
                  />
                  {phoneValid && <CircleCheck className="pointer-events-none absolute right-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-200" />}
                </div>
              </label>

              {/* Password Input */}
              <label className="block text-start">
                <span className={`mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300 ${isRtl ? 'font-ibm-arabic' : 'uppercase tracking-wider text-[11px]'}`}>{copy.password}</span>
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  required
                  minLength={isRegister ? 8 : undefined}
                  showLabel={copy.showPassword}
                  hideLabel={copy.hidePassword}
                  capsLockLabel={copy.capsLock}
                />
              </label>

              {/* Register Extra Confirmation */}
              <AnimatePresence initial={false}>
                {isRegister && (
                  <motion.div
                    key="register-extra"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3.5 overflow-hidden text-start"
                  >
                    <label className="block text-start">
                      <span className={`mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300 ${isRtl ? 'font-ibm-arabic' : 'uppercase tracking-wider text-[11px]'}`}>{copy.confirmPassword}</span>
                      <PasswordInput value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" showLabel={copy.showPassword} hideLabel={copy.hidePassword} capsLockLabel={copy.capsLock} />
                    </label>

                    {/* Jauge de force */}
                    {password.length > 0 && (
                      <div className="flex items-center gap-2.5 animate-in fade-in duration-200 bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200/90 dark:border-slate-700/70 shadow-xs">
                        <div className="flex flex-1 gap-1.5" aria-hidden>
                          {[0, 1, 2, 3].map(i => (
                            <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i < strength.score ? strength.barClass : 'bg-slate-200 dark:bg-slate-700'}`} />
                          ))}
                        </div>
                        <span className={`shrink-0 text-[11px] font-black uppercase tracking-wider ${strength.textClass}`}>{strength.label}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-x-3.5 gap-y-1.5">
                      <LiveCheck ok={passwordLongEnough} label={copy.passwordMin} />
                      <LiveCheck ok={passwordsMatch} label={copy.samePassword} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error Message */}
              {error && (
                <p ref={errorRef} id={errorId} tabIndex={-1} className="rounded-xl border border-red-300 bg-red-50 p-3.5 text-xs font-bold text-red-700 outline-none animate-in fade-in duration-200 text-start dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300 shadow-xs" role="alert">
                  {error}
                </p>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`group relative mt-2 flex h-12 w-full items-center justify-center overflow-hidden rounded-xl bg-blue-600 text-sm font-black text-white shadow-md shadow-blue-600/30 transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/40 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer ${isRtl ? 'font-ibm-arabic text-base' : ''}`}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> {copy.wait}</span>
                ) : (
                  <span className="tracking-wide">{isRegister ? copy.createMyAccount : copy.signIn}</span>
                )}
              </button>
            </form>
          </motion.div>
          </div>
        </div>

        {/* Footer Security Badge */}
        <footer className="w-full pt-6 text-center">
          <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className={isRtl ? 'font-ibm-arabic' : ''}>{copy.secure}</span>
          </p>
        </footer>

      </main>
    </div>
  );
};
