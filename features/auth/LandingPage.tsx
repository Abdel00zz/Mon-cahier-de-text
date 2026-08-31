import { useState } from 'react';
import { BookOpen, ChevronRight, Play, X } from '@/components/ui/icons';
import type { AppLocale } from '@/types';

const COPY = {
  fr: {
    title: 'Votre prochain cours commence ici.',
    subtitle:
      'Préparez votre première classe, donnez forme à votre cahier, puis créez votre compte pour le retrouver.',
    start: 'Créer mon espace',
    login: 'J’ai déjà un compte',
    steps: ['Ma classe', 'Mon premier contenu', 'Mon compte'],
    note: 'Vos identifiants viennent à la fin. Vous pouvez revenir sur chaque choix.',
    preview: 'Un cahier clair, prêt pour vos séances',
    example: 'Exemple de cahier',
    classroom: '1ère année collège · Groupe 1',
    subject: 'Mathématiques',
    chapter: 'Nombres relatifs',
    content: 'Cours, activités et exercices au même endroit.',
    watch: 'Voir l’aperçu animé',
    stop: 'Fermer l’aperçu animé',
    features: [
      'Une saisie simple',
      'Des classes organisées',
      'Vos cahiers à portée de main',
    ],
  },
  ar: {
    title: 'حصتك المقبلة تبدأ من هنا.',
    subtitle:
      'أعدّ قسمك الأول، وابدأ دفتر نصوصك، ثم أنشئ حسابك لحفظ عملك والعودة إليه.',
    start: 'إنشاء فضائي',
    login: 'لديّ حساب',
    steps: ['قسمي', 'محتواي الأول', 'حسابي'],
    note: 'بيانات الدخول في الخطوة الأخيرة. يمكنك مراجعة اختياراتك في أي وقت.',
    preview: 'دفتر واضح وجاهز لحصصك',
    example: 'مثال توضيحي',
    classroom: 'الأولى إعدادي · الفوج 1',
    subject: 'الرياضيات',
    chapter: 'الأعداد النسبية',
    content: 'الدروس والأنشطة والتمارين في مكان واحد.',
    watch: 'عرض المعاينة المتحركة',
    stop: 'إغلاق المعاينة المتحركة',
    features: ['تدوين بسيط', 'أقسام منظمة', 'دفاترك في متناولك'],
  },
} as const;

export function LandingPage({
  locale,
  onLogin,
  onStart,
}: {
  locale: AppLocale;
  onLogin: () => void;
  onStart: () => void;
}) {
  const copy = COPY[locale === 'ar' ? 'ar' : 'fr'];
  const [showAnimation, setShowAnimation] = useState(false);
  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 content-center gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-2 lg:items-center lg:gap-12">
      <section className="min-w-0">
        <h1
          tabIndex={-1}
          className="max-w-xl text-3xl font-semibold leading-tight tracking-tight outline-none sm:text-4xl lg:text-5xl"
        >
          {copy.title}
        </h1>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-stone-600 dark:text-stone-300">
          {copy.subtitle}
        </p>
        <ol
          className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm"
          aria-label={
            locale === 'ar' ? 'خطوات البداية' : 'Les étapes pour commencer'
          }
        >
          {copy.steps.map((step, index) => (
            <li key={step} className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-xs tabular-nums dark:bg-white/10">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <div className="mt-7 flex flex-col items-stretch gap-2 sm:items-start">
          <button
            type="button"
            onClick={onStart}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-stone-900 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-stone-700 focus-visible:outline-2 focus-visible:outline-offset-4 dark:bg-stone-100 dark:text-stone-950"
          >
            {copy.start}
            <ChevronRight
              className="h-4 w-4 shrink-0 rtl:rotate-180"
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            onClick={onLogin}
            className="min-h-11 rounded-lg px-2 text-sm underline underline-offset-4 focus-visible:outline-2"
          >
            {copy.login}
          </button>
        </div>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          {copy.note}
        </p>
      </section>
      <section className="min-w-0" aria-label={copy.preview}>
        <div className="keep-surface overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-[#e0e0e0] px-4 py-3 text-sm dark:border-[#5f6368]">
            <BookOpen className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{copy.example}</span>
          </div>
          <div className="space-y-4 p-4 sm:p-6">
            <div className="keep-surface p-4" data-keep-tone="sand">
              <p className="text-lg font-semibold">{copy.classroom}</p>
              <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
                {copy.subject}
              </p>
            </div>
            <div className="rounded-lg bg-stone-50 p-4 dark:bg-white/5">
              <p className="text-lg font-semibold">{copy.chapter}</p>
              <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                {copy.content}
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowAnimation((value) => !value)}
          aria-expanded={showAnimation}
          aria-controls="landing-animation"
          className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm text-stone-600 focus-visible:outline-2 dark:text-stone-300"
        >
          {showAnimation ? (
            <X className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Play className="h-4 w-4" aria-hidden="true" />
          )}
          {showAnimation ? copy.stop : copy.watch}
        </button>
        {showAnimation && (
          <div
            id="landing-animation"
            className="keep-surface mt-2 overflow-hidden"
          >
            <picture>
              <source media="(min-width: 640px)" srcSet="/landscape.gif" />
              <img
                src="/portrait.gif"
                alt={copy.preview}
                className="aspect-[4/3] max-h-96 w-full object-contain"
                decoding="async"
              />
            </picture>
          </div>
        )}
        <ul className="mt-4 flex flex-wrap gap-2">
          {copy.features.map((text) => (
            <li
              key={text}
              className="rounded-lg bg-stone-100 px-3 py-2 text-sm dark:bg-white/5"
            >
              {text}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
