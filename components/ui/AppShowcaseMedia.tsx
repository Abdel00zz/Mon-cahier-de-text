import { useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AppLocale } from '@/types';

/** Actual app captures; the static cover is also the reduced-motion/error fallback. */
export function AppShowcaseMedia({ locale, landscape = false, portrait = false, desktopOnly = false, className, loading = 'lazy' }: {
  locale: AppLocale;
  landscape?: boolean;
  portrait?: boolean;
  desktopOnly?: boolean;
  className?: string;
  loading?: 'eager' | 'lazy';
}) {
  const reducedMotion = useReducedMotion();
  const [playOverride, setPlayOverride] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);
  const playing = !failed && (playOverride ?? !reducedMotion);
  const lang = locale === 'ar' ? 'ar' : 'fr';
  const ar = lang === 'ar';
  const asset = (format: 'landscape' | 'portrait', animated: boolean) => `/showcase/${format}-${lang}.${animated ? 'gif' : 'webp'}`;

  return <figure className={cn('overflow-hidden rounded-2xl border border-stone-300/60 bg-[#f7f9f6] shadow-[0_24px_64px_-36px_rgba(42,54,49,0.4)]', className)}>
    <picture className="block">
      {/* A hidden desktop panel must not download or decode the GIF on phones. */}
      {desktopOnly && <source media="(max-width: 1023px)" srcSet={asset('landscape', false)} />}
      {playOverride === null && !landscape && !portrait && <source media="(prefers-reduced-motion: reduce) and (min-width: 640px)" srcSet={asset('landscape', false)} width={1024} height={704} />}
      {playOverride === null && <source media="(prefers-reduced-motion: reduce)" srcSet={asset(landscape ? 'landscape' : 'portrait', false)} />}
      {!landscape && !portrait && <source media="(min-width: 640px)" srcSet={asset('landscape', playing)} width={1024} height={704} />}
      <img
        src={asset(landscape ? 'landscape' : 'portrait', playing)}
        width={landscape ? 1024 : 448} height={landscape ? 704 : 680}
        alt={ar ? 'معاينة أقسام التطبيق ودفتر النصوص واستعمال الزمن ببيانات توضيحية' : 'Les classes, le cahier de textes et l’emploi du temps de l’application, avec des données de démonstration'}
        loading={loading} decoding="async"
        className={cn('block h-auto w-full object-contain', landscape ? 'aspect-[16/11]' : portrait ? 'aspect-[56/85]' : 'aspect-[56/85] sm:aspect-[16/11]')}
        onError={() => setFailed(true)}
      />
    </picture>
    <figcaption dir={ar ? 'rtl' : 'ltr'} className="flex min-h-12 items-center justify-between gap-2 border-t border-stone-300/40 bg-[#f7f9f6] ps-3 pe-1 text-[11px] text-stone-600 sm:ps-4">
      <span>{ar ? 'من التطبيق · بيانات توضيحية' : 'Dans l’application · données de démonstration'}</span>
      {!failed && <button type="button" onClick={() => setPlayOverride(!playing)} aria-pressed={!playing}
        aria-label={ar ? 'إيقاف المعاينة المتحركة' : 'Arrêter l’aperçu animé'}
        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-xl px-2 text-stone-700 transition-colors hover:bg-stone-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500">
        {playing ? <Pause className="h-3.5 w-3.5" aria-hidden="true" /> : <Play className="h-3.5 w-3.5" aria-hidden="true" />}
        <span>{playing ? (ar ? 'إيقاف' : 'Pause') : (ar ? 'تشغيل' : 'Lire')}</span>
      </button>}
    </figcaption>
  </figure>;
}
