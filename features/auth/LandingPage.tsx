import { Sparkles, Calendar, Bell, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppShowcaseMedia } from '@/components/ui/AppShowcaseMedia';
import type { AppLocale } from '@/types';
import './landing.css';

const COPY = {
  fr: {
    title: 'Gagnez du temps.', emphasis: 'Enseignez mieux.',
    start: 'Préparez votre première classe, puis finalisez votre inscription pour retrouver votre cahier.',
    login: 'Se connecter', register: 'Créer un compte',
    badges: ['Saisie rapide et intelligente', 'Calendrier scolaire officiel', 'Notifications importantes'],
    preview: 'Votre cahier, partout avec vous.',
  },
  ar: {
    title: 'وقت أقل للتعبئة.', emphasis: 'وقت أكثر للتدريس.',
    start: 'أعدّ قسمك الأول، ثم أكمل التسجيل لحفظ دفتر نصوصك والعودة إليه.',
    login: 'تسجيل الدخول', register: 'إنشاء حساب جديد',
    badges: ['تعبئة سريعة وذكية', 'التقويم المدرسي الرسمي', 'إشعارات مهمة'],
    preview: 'دفترك، أينما كنت.',
  },
} as const;
const FEATURE_ICONS = [Sparkles, Calendar, Bell];
const FEATURE_VARIANTS = [
  'landing-badge-smart',
  'landing-badge-calendar',
  'landing-badge-notifications',
] as const;

export function LandingPage({ locale, onLogin, onRegister }: {
  locale: AppLocale; onLogin: () => void; onRegister: () => void;
}) {
  const ar = locale === 'ar';
  const language = ar ? 'ar' : 'fr';
  const copy = COPY[language];

  const renderBadges = (extraClass: string) => (
    <ul className={`landing-features ${extraClass}`}>
      {copy.badges.map((text, index) => {
        const Icon = FEATURE_ICONS[index];
        const variantClass = FEATURE_VARIANTS[index] ?? '';
        return (
          <li key={text} className={`landing-badge ${variantClass}`}>
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{text}</span>
          </li>
        );
      })}
    </ul>
  );

  return <main className="landing-editorial" dir={ar ? 'rtl' : 'ltr'}>
    <div className="landing-composition auth-view-enter">
      <section className="landing-copy">
        <h1 tabIndex={-1}>{copy.title}<br /><span>{copy.emphasis}</span></h1>
        <div className="landing-actions">
          <Button type="button" onClick={onRegister} className="landing-primary"><span>{copy.register}</span><ArrowUpRight aria-hidden="true" className="rtl:-scale-x-100" /></Button>
          <Button type="button" variant="outline" onClick={onLogin} className="landing-secondary"><span>{copy.login}</span></Button>
        </div>
        <p className="landing-start">{copy.start}</p>
        {renderBadges('landing-features-desktop')}
      </section>
      <section className="landing-gallery" aria-label={copy.preview}>
        <AppShowcaseMedia locale={locale} loading="eager" showPreview={false} />
        <p className="landing-gallery-caption">{copy.preview}</p>
      </section>
      {renderBadges('landing-features-mobile')}
    </div>
  </main>;
}
