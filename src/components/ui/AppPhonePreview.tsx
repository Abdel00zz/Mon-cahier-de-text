import { cn } from '@/lib/utils';
import type { AppLocale } from '@/types';
import './app-phone-preview.css';

/** Real application capture, refreshed with the guide's demonstration data. */
export function AppPhonePreview({ locale, compact = false, className }: {
  locale: AppLocale; compact?: boolean; className?: string;
}) {
  const ar = locale === 'ar';
  const caption = ar ? 'نموذج لفضاء الأستاذ' : 'Exemple d’un espace enseignant';
  return <figure className={cn('phone-preview', compact && 'phone-preview--compact', className)} dir={ar ? 'rtl' : 'ltr'}>
    <div className="phone-preview__stage">
      <div className="phone-preview__device">
        <img className="phone-preview__screen" src={`/guide/current/phone-${ar ? 'ar' : 'fr'}.webp`}
          width={390} height={844} loading="lazy" decoding="async"
          alt={ar ? 'واجهة الأقسام الحالية — بيانات توضيحية' : 'Interface actuelle des classes — données d’exemple'} />
      </div>
    </div>
    <figcaption>{caption}</figcaption>
  </figure>;
}
