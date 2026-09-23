import { memo } from 'react';
import { CalendarDays, Cloud, PenLine, ShieldCheck } from '@/components/ui/icons';

import { AppShowcaseMedia } from '@/components/ui/AppShowcaseMedia';

const COPY = {
  fr: {
    badge: 'Votre espace pédagogique', title: 'Moins de saisie.\nPlus de pédagogie.',
    description: 'Vos classes, vos séances et votre progression, réunies dans un cahier clair.',
    features: ['Saisie ultra-rapide', 'Calendrier scolaire officiel', 'Hors-ligne & Cloud'],
    offline: 'Après une première connexion, retrouvez vos données enregistrées hors ligne. La synchronisation nécessite Internet.',
  },
  ar: {
    badge: 'فضاؤك التربوي', title: 'وقت أقل للتعبئة.\nوقت أكثر للتدريس.',
    description: 'أقسامك وحصصك وتدرجك الدراسي، في دفتر واحد واضح ومنظم.',
    features: ['تعبئة سريعة', 'التقويم المدرسي الرسمي', 'دون اتصال ومع مزامنة سحابية'],
    offline: 'بعد تسجيل الدخول أول مرة، تتوفر بياناتك المحفوظة دون اتصال. تتطلب المزامنة الاتصال بالإنترنت.',
  },
} as const;
const FEATURE_ICONS = [PenLine, CalendarDays, Cloud];

/** Shared editorial artwork with bilingual, accessible lesson content. */
export const AuthShowcase = memo(({ locale }: { locale: 'fr' | 'ar' }) => {
  const copy = COPY[locale];
  return (
    <aside dir={locale === 'ar' ? 'rtl' : 'ltr'} className="auth-artisan-showcase hidden min-w-0 flex-col justify-center border-e border-border bg-muted/40 p-8 lg:flex xl:p-12">
      <div className="mx-auto w-full max-w-xl space-y-7">
        <span className="inline-flex items-center gap-2 text-xs font-medium text-stone-600 dark:text-stone-300">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />{copy.badge}
        </span>
        <div>
          <h2 className="whitespace-pre-line text-3xl font-semibold leading-tight tracking-tight xl:text-[2.5rem]">{copy.title}</h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-stone-600 dark:text-stone-300">{copy.description}</p>
        </div>
        <AppShowcaseMedia locale={locale} landscape desktopOnly loading="eager" />
        <div className="flex flex-wrap gap-2">
          {copy.features.map((feature, index) => {
            const Icon = FEATURE_ICONS[index];
            return <span key={feature} className="flex items-center gap-2 rounded-[8px] border border-stone-300/70 px-3 py-2 text-xs font-medium dark:border-[hsl(var(--border))]"><Icon className="h-4 w-4 shrink-0" aria-hidden="true" />{feature}</span>;
          })}
        </div>
        <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">{copy.offline}</p>
      </div>
    </aside>
  );
});
AuthShowcase.displayName = 'AuthShowcase';
