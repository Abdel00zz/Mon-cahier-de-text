import { useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { BookOpen, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AppLocale } from '@/types';
import './app-showcase.css';

/** Original transparent artwork; real text stays crisp and localizable at every size. */
export function AppShowcaseMedia({ locale, landscape = false, desktopOnly = false, showPreview = true, className, loading = 'lazy' }: {
  locale: AppLocale;
  landscape?: boolean;
  desktopOnly?: boolean;
  /** Faux aperçu de séances posé sur le cahier (premier plan) : la landing page
   *  ne garde que l'illustration du cahier sculpté. */
  showPreview?: boolean;
  className?: string;
  loading?: 'eager' | 'lazy';
}) {
  const reducedMotion = useReducedMotion();
  const [playOverride, setPlayOverride] = useState<boolean | null>(null);
  const playing = playOverride ?? !reducedMotion;
  const ar = locale === 'ar';
  const lessons = ar
    ? ['الاستمرارية في نقطة', 'نهايات الدوال', 'دراسة دالة عددية']
    : ['Continuité en un point', 'Limites de fonctions', 'Étude d’une fonction'];

  return <figure className={cn('showcase-art', landscape && 'showcase-art--wide', desktopOnly && 'showcase-art--desktop', className)}
    data-playing={playing} data-motion-override={playOverride !== null} dir={ar ? 'rtl' : 'ltr'}>
    <picture className="showcase-art__sculpture" aria-hidden="true">
      {/* Avoid downloading an invisible desktop illustration on a phone. */}
      {desktopOnly && <source media="(max-width: 1023px)" srcSet="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E" />}
      <img src="/showcase/notebook-sculpture.png" width={1280} height={1280} alt="" loading={loading} decoding="async" />
    </picture>
    {showPreview && <div className="showcase-art__sheet">
      <div className="showcase-art__sheet-heading">
        <span className="showcase-art__book"><BookOpen size={19} strokeWidth={1.5} aria-hidden="true" /></span>
        <div><span className="showcase-art__eyebrow">{ar ? 'دفتر نصوصي' : 'Mon cahier de textes'}</span>
          <p>{ar ? 'مساحة لأفكارك.' : 'De la place pour vos idées.'}</p></div>
      </div>
      <ol className="showcase-art__lessons">
        {lessons.map((lesson, index) => <li key={lesson}>
          <span className="showcase-art__index" aria-hidden="true">0{index + 1}</span>
          <span>{lesson}</span><span className="showcase-art__lesson-dot" aria-hidden="true" />
        </li>)}
      </ol>
      <div className="showcase-art__sheet-footer"><span>{ar ? 'معاينة توضيحية' : 'Aperçu illustratif'}</span><span aria-hidden="true">✦</span></div>
    </div>}
    <figcaption className="sr-only">{ar
      ? (showPreview ? 'دفتر مفتوح بأوراق منحنية، يرافقه نموذج لحصص الرياضيات.' : 'دفتر مفتوح بأوراق منحنية.')
      : (showPreview ? 'Un cahier aux pages sculptées, accompagné d’un exemple de séances de mathématiques.' : 'Un cahier aux pages sculptées.')}</figcaption>
    <button type="button" onClick={() => setPlayOverride(!playing)} aria-pressed={!playing}
      aria-label={playing ? (ar ? 'إيقاف المعاينة المتحركة' : 'Arrêter l’aperçu animé') : (ar ? 'تشغيل المعاينة المتحركة' : 'Relancer l’aperçu animé')}
      className="showcase-art__motion">
      {playing ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
    </button>
  </figure>;
}
