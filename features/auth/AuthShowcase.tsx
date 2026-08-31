import { memo } from 'react';
import { BookOpen, CalendarDays, CircleCheck, Cloud, PenLine, ShieldCheck } from '@/components/ui/icons';

const COPY = {
  fr: {
    badge: 'Plateforme Pédagogique Officielle', title: 'Moins de saisie.\nPlus de pédagogie.',
    description: 'Vos classes, vos séances et votre progression, réunies dans un cahier clair.',
    preview: 'Aperçu de votre espace', notebook: 'Mon cahier de textes', week: 'Cette semaine',
    classes: ['1re année collège · 1', '2e année collège · 2', '3e année collège · 1'],
    subject: 'Mathématiques', session: 'Prochaine séance', day: 'Lundi', lesson: 'Nombres relatifs',
    activity: 'Cours et exercices d’application', status: 'Séance préparée',
    features: ['Saisie ultra-rapide', 'Calendrier scolaire officiel', 'Hors-ligne & Cloud'],
    offline: 'Après une première connexion, retrouvez vos données enregistrées hors ligne. La synchronisation nécessite Internet.',
  },
  ar: {
    badge: 'المنصة التربوية الرسمية', title: 'وقت أقل للتعبئة.\nوقت أكثر للتدريس.',
    description: 'أقسامك وحصصك وتدرجك الدراسي، في دفتر واحد واضح ومنظم.',
    preview: 'معاينة فضاء الأستاذ', notebook: 'دفتر نصوصي', week: 'هذا الأسبوع',
    classes: ['الأولى إعدادي · 1', 'الثانية إعدادي · 2', 'الثالثة إعدادي · 1'],
    subject: 'الرياضيات', session: 'الحصة المقبلة', day: 'الاثنين', lesson: 'الأعداد النسبية',
    activity: 'درس وتمارين تطبيقية', status: 'الحصة جاهزة',
    features: ['تعبئة سريعة', 'التقويم المدرسي الرسمي', 'دون اتصال ومع مزامنة سحابية'],
    offline: 'بعد تسجيل الدخول أول مرة، تتوفر بياناتك المحفوظة دون اتصال. تتطلب المزامنة الاتصال بالإنترنت.',
  },
} as const;
const FEATURE_ICONS = [PenLine, CalendarDays, Cloud];

/** Static preview: no data fetches, timers or large screenshots. */
export const AuthShowcase = memo(({ locale }: { locale: 'fr' | 'ar' }) => {
  const copy = COPY[locale];
  return (
    <aside className="hidden min-w-0 flex-col justify-center border-e border-[#e0e0e0] bg-[#f6f4ed] p-8 dark:border-[#5f6368] dark:bg-[#242622] lg:flex xl:p-12">
      <div className="mx-auto w-full max-w-xl space-y-7">
        <span className="inline-flex items-center gap-2 text-xs font-medium text-stone-600 dark:text-stone-300">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />{copy.badge}
        </span>
        <div>
          <h2 className="whitespace-pre-line text-3xl font-semibold leading-tight tracking-tight xl:text-[2.5rem]">{copy.title}</h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-stone-600 dark:text-stone-300">{copy.description}</p>
        </div>
        <figure className="overflow-hidden rounded-[12px] border border-[#e0e0e0] bg-white shadow-sm dark:border-[#5f6368] dark:bg-[#202124]">
          <figcaption className="flex items-center justify-between gap-3 border-b border-[#e0e0e0] px-4 py-3 text-xs dark:border-[#5f6368]">
            <span className="flex items-center gap-2 font-medium"><BookOpen className="h-4 w-4" aria-hidden="true" />{copy.notebook}</span>
            <span className="text-stone-500 dark:text-stone-400">{copy.preview}</span>
          </figcaption>
          <div className="space-y-4 p-5">
            <p className="text-sm font-semibold">{copy.week}</p>
            <div className="grid grid-cols-3 gap-2">
              {copy.classes.map((name, index) => <div key={name} data-keep-tone={['mint', 'sand', 'sky'][index]} className="keep-surface min-w-0 p-3">
                <BookOpen className="mb-3 h-4 w-4" aria-hidden="true" />
                <p className="text-xs font-medium leading-relaxed">{name}</p>
                <p className="mt-1 text-[11px] opacity-75">{copy.subject}</p>
              </div>)}
            </div>
            <div className="rounded-[8px] bg-stone-50 p-4 dark:bg-white/5">
              <div className="flex items-center justify-between gap-2 text-xs text-stone-600 dark:text-stone-300">
                <span>{copy.session}</span><span>{copy.day} · <bdi>08:00</bdi></span>
              </div>
              <p className="mt-3 text-sm font-semibold">{copy.lesson}</p>
              <p className="mt-1 text-xs text-stone-600 dark:text-stone-300">{copy.activity}</p>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300"><CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />{copy.status}</p>
            </div>
          </div>
        </figure>
        <div className="flex flex-wrap gap-2">
          {copy.features.map((feature, index) => {
            const Icon = FEATURE_ICONS[index];
            return <span key={feature} className="flex items-center gap-2 rounded-[8px] border border-stone-300/70 px-3 py-2 text-xs font-medium dark:border-[#5f6368]"><Icon className="h-4 w-4 shrink-0" aria-hidden="true" />{feature}</span>;
          })}
        </div>
        <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">{copy.offline}</p>
      </div>
    </aside>
  );
});
AuthShowcase.displayName = 'AuthShowcase';
