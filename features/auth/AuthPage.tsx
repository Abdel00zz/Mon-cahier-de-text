import React, { useEffect, useId, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Bell, BookOpen, CalendarCheck, CircleCheck, Eye, EyeOff, ListChecks, Loader2, Plus, Printer, TriangleAlert } from '@/components/ui/icons';
import { AppLocale } from '@/types';

type Mode = 'login' | 'register';
type AuthLocale = Extract<AppLocale, 'ar' | 'fr'>;

const AUTH_COPY = {
  fr: {
    brand: 'Cahier de textes en ligne', online: 'En ligne', teacherAccess: 'Accès enseignant',
    organisation: "L’essentiel du guide", promise: 'Il sait où vous en êtes et vous alerte au bon moment',
    promiseDetail: "L’application croise cahier, emploi du temps et calendrier pour signaler l’utile, éviter les fausses alertes et préparer la prochaine séance.",
    featureHighlights: [
      { text: 'Cahier de textes au design raffiné et très bien structuré', desc: 'Une interface claire, ergonomique et sans superflu.' },
      { text: 'Le cahier numérique rend le remplissage simple, rapide et agréable', desc: 'Saisie intuitive sans double travail ni perte de temps.' },
      { text: 'Accès fluide depuis votre téléphone, ordinateur, tablette, etc.', desc: 'Disponible sur tous vos appareils, en ligne ou hors connexion.' },
      { text: 'Une technologie de pointe utilisée dans les grandes institutions éducatives', desc: 'Calcul automatique des progressions et alertes intelligentes.' },
    ],
    today: 'Circuit pédagogique', nextSessions: 'Votre prochaine séance est déjà prête',
    plan: 'Alertes au bon moment', planDetail: 'Retards et dates à vérifier',
    record: 'Progression calculée', recordDetail: 'Sans double saisie',
    assessments: 'Prochaine étape claire', assessmentsDetail: 'Reprenez au bon endroit',
    printTitle: 'Impression haute qualité', printDetail: 'Imprimez votre cahier de textes avec une mise en page nette, prête à le donner à la direction, ou à l’inspecteur, et prête à archiver.',
    offline: 'Hors ligne', automaticSync: 'Synchronisation automatique', languageLabel: 'Choisir la langue',
    heroAlt: 'Enseignant préparant ses prochaines séances dans une salle de classe',
    teacherSpace: '', welcome: 'Cahier de textes en ligne · Bon retour', createSpace: 'Créez votre espace',
    welcomeDetail: 'Retrouvez vos alertes utiles, la progression de vos classes et la prochaine séance à préparer',
    createDetail: 'Créez votre compte, puis choisissez votre matière, votre cycle et vos classes en quelques étapes.',
    login: 'Connexion', createAccount: 'Créer un compte', name: 'Nom', firstName: 'Prénom',
    phone: 'Téléphone', password: 'Mot de passe', confirmPassword: 'Confirmer le mot de passe',
    showPassword: 'Afficher le mot de passe', hidePassword: 'Masquer le mot de passe', capsLock: 'Verr. maj. activée',
    passwordMin: '8 car. min.', samePassword: 'Identiques',
    wait: 'Un instant…', signIn: 'Accéder à mon espace', createMyAccount: 'Créer mon compte',
    secure: 'Synchronisation sécurisée · Disponible hors connexion',
    nameRequired: 'Renseignez votre nom et votre prénom.', passwordRequired: 'Le mot de passe doit contenir au moins 8 caractères.',
    passwordMismatch: 'Les deux mots de passe ne correspondent pas.', unknownError: 'Une erreur est survenue.',
    strength: ['Très faible', 'Faible', 'Moyen', 'Bon', 'Excellent'],
  },
  ar: {
    brand: 'دفتر النصوص الرقمي', online: 'رقمي', teacherAccess: 'فضاء الأستاذ',
    organisation: 'خلاصة دليل الاستخدام', promise: 'يعرف أين توقّفت، وينبّهك في الوقت المناسب',
    promiseDetail: 'يربط الدفتر باستعمال الزمن والتقويم، فيكشف ما يستحق الانتباه، ويتجنب التنبيهات الخاطئة، ويحدّد بداية الحصة المقبلة.',
    featureHighlights: [
      { text: 'دفتر نصوص بتصميم راقٍ ومُنظَّم جدّاً', desc: 'واجهة عصرية مريحة للعين ومبسطة لأقصى درجة.' },
      { text: 'الدفتر الرقمي يجعل مهمة ملء دفتر النصوص سهلة وممتعة', desc: 'إدخال سريع وتلقائي دون تكرار أو مجهود زائد.' },
      { text: 'الوصول إلى دفترك من الهاتف أو الحاسوب', desc: 'متاح على أجهزتك مع مزامنة فورية.' },
      { text: 'تكنولوجيا جد متقدمة مستعملة في أبرز المؤسسات التعليمية العالمية', desc: 'حساب تلقائي للتقدم وتنبيهات ذكية ومزامنة آمنة.' },
    ],
    today: 'المسار التربوي', nextSessions: 'حصتك المقبلة جاهزة للتحضير',
    plan: 'تنبيهات في وقتها', planDetail: 'تأخر وتواريخ تحتاج التحقق',
    record: 'تقدّم محسوب تلقائياً', recordDetail: 'دون إدخال المعطيات مرتين',
    assessments: 'خطوتك المقبلة واضحة', assessmentsDetail: 'استأنف من المكان الصحيح',
    printTitle: 'طباعة واضحة', printDetail: 'اطبع دفتر النصوص بتنسيق مناسب للتقديم والأرشفة.',
    offline: 'يعمل دون اتصال', automaticSync: 'مزامنة تلقائية', languageLabel: 'اختيار اللغة',
    heroAlt: 'أستاذ يحضّر حصصه المقبلة داخل قاعة دراسية',
    teacherSpace: '', welcome: 'دفتر النصوص الرقمي · مرحباً بعودتك', createSpace: 'أنشئ فضاءك',
    welcomeDetail: 'اطّلع على التنبيهات المفيدة وتقدّم أقسامك والحصة المقبلة.',
    createDetail: 'أنشئ حسابك، ثم اختر المادة والسلك والأقسام في خطوات واضحة.',
    login: 'تسجيل الدخول', createAccount: 'إنشاء حساب', name: 'الاسم العائلي', firstName: 'الاسم الشخصي',
    phone: 'رقم الهاتف', password: 'كلمة المرور', confirmPassword: 'تأكيد كلمة المرور',
    showPassword: 'إظهار كلمة المرور', hidePassword: 'إخفاء كلمة المرور', capsLock: 'مفتاح الأحرف الكبيرة مفعّل',
    passwordMin: '8 أحرف على الأقل', samePassword: 'متطابقتان',
    wait: 'لحظة من فضلك…', signIn: 'الدخول إلى حسابي', createMyAccount: 'إنشاء حسابي',
    secure: 'مزامنة آمنة · متاح دون اتصال',
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
    { label: labels[0], barClass: 'bg-red-500', textClass: 'text-red-500' },
    { label: labels[1], barClass: 'bg-red-500', textClass: 'text-red-500' },
    { label: labels[2], barClass: 'bg-amber-500', textClass: 'text-amber-500' },
    { label: labels[3], barClass: 'bg-success', textClass: 'text-success' },
    { label: labels[4], barClass: 'bg-success', textClass: 'text-success' },
  ];
  return { score: level, ...map[level] };
};

/** Formatage téléphone marocain : « 06 12 34 56 78 » (le backend ne garde que les chiffres). */
const formatMoroccanPhone = (raw: string): string =>
  raw.replace(/[^\d]/g, '').slice(0, 10).replace(/(\d{2})(?=\d)/g, '$1 ').trim();

/** Champ mot de passe : bascule de visibilité + alerte Verr. Maj (cible ≥44px). */
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
          className="h-12 rounded-xl border border-slate-200 bg-slate-50 ps-11 text-left text-xs font-semibold text-slate-900 shadow-none transition-all placeholder:text-slate-400 hover:border-blue-300 focus:border-blue-500 focus:bg-white focus-visible:ring-1 focus-visible:ring-blue-500/20 sm:text-[13px]"
          dir="ltr"
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          className="absolute inset-y-0 end-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {capsLock && (
        <p className="mt-1 flex items-center gap-1 text-[10.5px] font-semibold text-amber-600 animate-in fade-in duration-200">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-amber-500" /> {capsLockLabel}
        </p>
      )}
    </div>
  );
};

const LiveCheck: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) => (
  <span className={`inline-flex items-center gap-1 text-[10.5px] font-bold transition-colors ${ok ? 'text-success' : 'text-muted-foreground/60'}`}>
    <CircleCheck className={`h-3.5 w-3.5 ${ok ? 'text-success' : 'text-muted-foreground/50'}`} /> {label}
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
    <div dir="ltr" className="flex rounded-lg border border-border/75 bg-card/88 p-0.5 shadow-2xs backdrop-blur-sm" role="group" aria-label={copy.languageLabel}>
      <button type="button" onClick={() => onLocaleChange('ar')} aria-pressed={displayLocale === 'ar'} className={`min-h-10 rounded-md px-2.5 text-[11px] font-bold transition-colors ${displayLocale === 'ar' ? 'bg-[#174f9e] text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>العربية</button>
      <button type="button" onClick={() => onLocaleChange('fr')} aria-pressed={displayLocale === 'fr'} className={`min-h-10 rounded-md px-2.5 text-[11px] font-bold transition-colors ${displayLocale === 'fr' ? 'bg-[#174f9e] text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>FR</button>
    </div>
  );

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} lang={displayLocale} className="auth-page-shell min-h-dvh p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-7xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-slate-200/60 lg:min-h-[calc(100dvh-4rem)] lg:flex-row">
        <aside className="order-2 relative flex w-full flex-col overflow-hidden border-t border-slate-100 bg-slate-50/70 px-6 py-7 text-slate-800 lg:w-1/2 lg:border-t-0 lg:border-e lg:px-10 lg:py-10 xl:px-12 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-2 text-[#1d4291] dark:text-blue-300">
              <BookOpen className="h-6 w-6 shrink-0" aria-hidden="true" />
              <h1 className={`truncate font-extrabold ${isRtl ? 'font-bold tracking-normal text-[1.5rem] xl:text-[1.85rem]' : 'font-bold tracking-tight text-lg xl:text-[1.45rem]'}`}>{copy.brand}</h1>
            </div>
            {renderLanguageSwitch()}
          </div>

          <div className="relative mt-7 overflow-hidden rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-200/50 dark:border-zinc-800">
            <img src="/auth/teacher-planning-hero.webp" alt={copy.heroAlt} className="h-56 w-full object-cover transition-transform duration-700 hover:scale-105 xl:h-64" loading="eager" decoding="async" />
            {copy.teacherAccess && (
              <span className="absolute bottom-4 end-4 flex items-center gap-2 rounded-xl border border-white/20 bg-slate-950/45 px-3 py-2 text-[11px] font-bold text-white backdrop-blur-md">{copy.teacherAccess}</span>
            )}
          </div>

          <div className="mt-7 space-y-3">
            <p className="text-xs font-bold text-[#2563eb] dark:text-blue-300">{copy.organisation}</p>
            <h2 className={`font-extrabold text-[#173a63] dark:text-blue-100 ${isRtl ? 'font-bold tracking-normal text-[1.75rem] leading-[1.35]' : 'font-bold tracking-tight text-[1.45rem] leading-tight'}`}>{copy.promise}</h2>
            <p className="text-sm leading-relaxed text-slate-500 dark:text-zinc-300">{copy.promiseDetail}</p>
            
            <div className="grid grid-cols-1 gap-3 pt-2">
              {copy.featureHighlights.map((feat, idx) => (
                <div key={idx} className="group flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/80 p-3.5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_8px_24px_-4px_rgba(37,99,235,0.08)] dark:border-zinc-800 dark:bg-zinc-950/80">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-inner ${idx === 0 ? 'bg-blue-600' : idx === 1 ? 'bg-indigo-600' : idx === 2 ? 'bg-purple-600' : 'bg-sky-600'}`}>
                    <CircleCheck className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold leading-snug text-slate-800 dark:text-slate-100">{feat.text}</p>
                    <p className="mt-1 text-[11px] leading-normal text-slate-500 dark:text-slate-400">{feat.desc}</p>
                  </div>
                  <CircleCheck className="h-5 w-5 shrink-0 text-emerald-500 opacity-80" aria-hidden="true" />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto grid grid-cols-2 gap-3 pt-7 xl:grid-cols-4">
            {[
              { icon: Bell, title: copy.plan },
              { icon: ListChecks, title: copy.record },
              { icon: CalendarCheck, title: copy.assessments },
              { icon: Printer, title: copy.printTitle },
            ].map(item => (
              <div key={item.title} className="flex min-w-0 items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white/80 p-3 shadow-sm backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-950">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#2468bd] dark:bg-blue-950 dark:text-blue-300">
                  <item.icon className="h-3.5 w-3.5" />
                </span>
                <span className={item.icon === Printer ? 'line-clamp-3 text-[10px] font-extrabold leading-snug text-[#173a63] dark:text-zinc-100' : 'line-clamp-2 text-[11px] font-extrabold leading-snug text-[#173a63] dark:text-zinc-100'}>{item.title}</span>
              </div>
            ))}
          </div>
        </aside>

        <main className="order-1 relative flex min-w-0 items-start justify-center bg-white px-5 py-8 sm:px-10 sm:py-10 lg:w-1/2 lg:items-center lg:px-14 xl:px-16">
          <div className="w-full max-w-[520px]">
            <div className="mb-6 flex items-center justify-between gap-3 sm:mb-8 lg:hidden">
              <div className="flex min-w-0 items-center gap-2 text-[#1d4291]">
                <BookOpen className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className={`truncate font-extrabold ${isRtl ? 'font-bold tracking-normal text-[1.35rem]' : 'text-lg tracking-tight'}`}>{copy.brand}</span>
              </div>
              {renderLanguageSwitch()}
            </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="text-card-foreground"
        >
          {/* Header section (above tabs) */}
          <header className="mb-7 text-center sm:mb-9">
            <h2 className={`flex items-center justify-center gap-2 font-extrabold text-slate-900 ${isRtl ? 'font-bold tracking-normal text-[1.8rem] leading-[1.3]' : 'text-[1.55rem] tracking-tight'}`}>
              <span>{copy.brand}</span>
              <BookOpen className="h-6 w-6 shrink-0 text-blue-600" aria-hidden="true" />
            </h2>
            <p className="mx-auto mt-3 max-w-[42rem] text-sm leading-relaxed text-slate-500">
              {isRegister ? copy.createDetail : (
                isRtl ? (
                  <>
                    اطّلع على التنبيهات المفيدة، وتقدّم أقسامك، والحصة التي تحتاج إلى التحضير.اطبع دفتر النصوص بتنسيق واضح، <strong className="font-bold text-foreground">جاهز للتقديم للإدارة، أو المفتش إلخ...</strong> و<strong className="font-bold text-foreground">جاهز للأرشفة</strong>.
                  </>
                ) : (
                  <>
                    Retrouvez vos alertes utiles, la progression de vos classes et la prochaine séance à préparer. Imprimez votre cahier de textes avec une mise en page nette, <strong className="font-bold text-foreground">prête à le donner à la direction, ou à l’inspecteur etc...</strong> et <strong className="font-bold text-foreground">prête à archiver</strong>.
                  </>
                )
              )}
            </p>
          </header>

          {/* Segment/Tab Control */}
          <div className="mb-7 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100/80 p-1 shadow-inner sm:mb-9">
            {(['login', 'register'] as const).map(value => (
              <button
                key={value}
                type="button"
                onClick={() => switchMode(value)}
                className={`relative min-h-11 rounded-xl px-2 py-2.5 text-xs font-bold transition-colors focus:outline-none ${mode === value ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {mode === value && (
                  <motion.span
                    layoutId="auth-tab"
                    className="absolute inset-0 rounded-xl border border-slate-200/60 bg-white shadow-sm"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10">{value === 'login' ? copy.login : copy.createAccount}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4" aria-busy={isSubmitting}>
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
                  <label className="block">
                    <span className={`mb-1.5 block text-[11px] font-bold text-muted-foreground ${isRtl ? '' : 'uppercase tracking-wider'}`}>{copy.name}</span>
                    <Input
                      value={nom}
                      onChange={e => setNom(e.target.value)}
                      autoComplete="family-name"
                      placeholder={isRtl ? 'العلمي' : 'Benali'}
                      className="h-12 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 shadow-none transition-all placeholder:text-slate-400 hover:border-blue-300 focus:border-blue-500 focus:bg-white focus-visible:ring-1 focus-visible:ring-blue-500/20 sm:text-[13px]"
                    />
                  </label>
                  <label className="block">
                    <span className={`mb-1.5 block text-[11px] font-bold text-muted-foreground ${isRtl ? '' : 'uppercase tracking-wider'}`}>{copy.firstName}</span>
                    <Input
                      value={prenom}
                      onChange={e => setPrenom(e.target.value)}
                      autoComplete="given-name"
                      placeholder={isRtl ? 'سلمى' : 'Malek'}
                      className="h-12 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 shadow-none transition-all placeholder:text-slate-400 hover:border-blue-300 focus:border-blue-500 focus:bg-white focus-visible:ring-1 focus-visible:ring-blue-500/20 sm:text-[13px]"
                    />
                  </label>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Téléphone */}
            <label className="block">
              <span className={`mb-1.5 block text-[11px] font-bold text-muted-foreground ${isRtl ? '' : 'uppercase tracking-wider'}`}>{copy.phone}</span>
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
                  className="h-12 rounded-xl border border-slate-200 bg-slate-50 ps-11 text-left text-xs font-semibold text-slate-900 shadow-none transition-all placeholder:text-slate-400 hover:border-blue-300 focus:border-blue-500 focus:bg-white focus-visible:ring-1 focus-visible:ring-blue-500/20 sm:text-[13px]"
                  dir="ltr"
                />
                {phoneValid && <CircleCheck className="pointer-events-none absolute end-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-success animate-in fade-in duration-200" />}
              </div>
            </label>

            {/* Mot de passe */}
            <label className="block">
              <span className={`mb-1.5 block text-[11px] font-bold text-muted-foreground ${isRtl ? '' : 'uppercase tracking-wider'}`}>{copy.password}</span>
              <PasswordInput value={password} onChange={setPassword} autoComplete={isRegister ? 'new-password' : 'current-password'} required minLength={isRegister ? 8 : undefined} showLabel={copy.showPassword} hideLabel={copy.hidePassword} capsLockLabel={copy.capsLock} />
            </label>

            {/* Confirmation et sécurité du compte (inscription). Les choix pédagogiques sont faits dans l'onboarding. */}
            <AnimatePresence initial={false}>
              {isRegister && (
                <motion.div
                  key="register-extra"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 overflow-hidden"
                >
                  <label className="block">
                    <span className={`mb-1.5 block text-[11px] font-bold text-muted-foreground ${isRtl ? '' : 'uppercase tracking-wider'}`}>{copy.confirmPassword}</span>
                    <PasswordInput value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" showLabel={copy.showPassword} hideLabel={copy.hidePassword} capsLockLabel={copy.capsLock} />
                  </label>

                  {/* Jauge de force */}
                  {password.length > 0 && (
                    <div className="flex items-center gap-2 animate-in fade-in duration-200 bg-muted p-2.5 rounded-lg border border-border">
                      <div className="flex flex-1 gap-1" aria-hidden>
                        {[0, 1, 2, 3].map(i => (
                          <span key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i < strength.score ? strength.barClass : 'bg-muted'}`} />
                        ))}
                      </div>
                      <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider ${strength.textClass}`}>{strength.label}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                    <LiveCheck ok={passwordLongEnough} label={copy.passwordMin} />
                    <LiveCheck ok={passwordsMatch} label={copy.samePassword} />
                  </div>

                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <p ref={errorRef} id={errorId} tabIndex={-1} className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-[12px] font-semibold text-red-600 outline-none animate-in fade-in duration-200" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative mt-4 flex h-12 w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-slate-900 text-[13px] font-bold text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {copy.wait}</>
              ) : (
                <>
                  {isRegister ? <Plus className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />}
                  {isRegister ? copy.createMyAccount : copy.signIn}
                </>
              )}
            </button>
          </form>
        </motion.div>

            <p className="mt-5 text-center text-[10px] font-medium text-muted-foreground">
              {copy.secure}
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};
