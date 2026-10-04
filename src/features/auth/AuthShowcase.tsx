import { memo } from 'react';
import { Check } from '@/components/ui/icons';
import { Cloud } from '@/components/ui/icons';
import { AppPhonePreview } from '@/components/ui/AppPhonePreview';

const COPY = {
  fr: {
    badge: 'Tout votre enseignement, au même endroit', title: 'Moins de saisie.\nPlus de pédagogie.',
    detail: 'Votre prochaine séance commence par un cahier bien organisé.',
    sync: 'Vos cahiers vous suivent', offline: 'Vos données enregistrées restent accessibles hors ligne après une première connexion. La synchronisation nécessite Internet.',
  },
  ar: {
    badge: 'كل عملك التربوي، في مكان واحد', title: 'وقت أقل للتعبئة.\nوقت أكثر للتدريس.',
    detail: 'حصتك المقبلة تبدأ بدفتر منظّم.', sync: 'دفاترك معك أينما كنت',
    offline: 'تبقى بياناتك المحفوظة متاحة دون اتصال بعد تسجيل الدخول أول مرة. تتطلب المزامنة الاتصال بالإنترنت.',
  },
} as const;

export const AuthShowcase = memo(({ locale }: { locale: 'fr' | 'ar' }) => {
  const copy = COPY[locale];
  return <aside dir={locale === 'ar' ? 'rtl' : 'ltr'} className="auth-showcase">
    <div className="auth-showcase__intro"><p className="auth-showcase__eyebrow"><Check aria-hidden="true" />{copy.badge}</p><h2>{copy.title}</h2><p>{copy.detail}</p></div>
    <AppPhonePreview locale={locale} compact />
    <p className="auth-showcase__sync"><Cloud aria-hidden="true" />{copy.sync}</p>
    <p className="auth-showcase__offline">{copy.offline}</p>
  </aside>;
});
AuthShowcase.displayName = 'AuthShowcase';
