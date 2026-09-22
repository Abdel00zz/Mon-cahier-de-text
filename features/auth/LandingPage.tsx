import { Sparkles, Calendar, Bell, ArrowRight, ArrowLeft, LogIn } from 'lucide-react';
import { AppShowcaseMedia } from '@/components/ui/AppShowcaseMedia';
import type { AppLocale } from '@/types';
import './landing.css';

const COPY = {
  fr: {
    eyebrow: 'Votre quotidien enseignant, allégé.',
    title: 'Gagnez du temps.', emphasis: 'Enseignez mieux.',
    subtitle: 'Vos classes, vos séances et votre progression, réunies dans un cahier clair.',
    start: 'Préparez votre première classe, puis finalisez votre inscription pour retrouver votre cahier.',
    login: 'Se connecter', register: 'Créer un compte',
    badges: ['Saisie rapide et intelligente', 'Calendrier scolaire officiel', 'Notifications importantes'],
    preview: 'Votre cahier, partout avec vous.',
  },
  ar: {
    eyebrow: 'مساحة ليوم دراسي أكثر هدوءاً.',
    title: 'وقت أقل للتعبئة.', emphasis: 'وقت أكثر للتدريس.',
    subtitle: 'أقسامك وحصصك وتدرجك الدراسي، في دفتر واحد واضح ومنظم.',
    start: 'أعدّ قسمك الأول، ثم أكمل التسجيل لحفظ دفتر نصوصك والعودة إليه.',
    login: 'تسجيل الدخول', register: 'إنشاء حساب جديد',
    badges: ['تعبئة سريعة وذكية', 'التقويم المدرسي الرسمي', 'إشعارات مهمة'],
    preview: 'دفترك، أينما كنت.',
  },
} as const;
const FEATURE_ICONS = [Sparkles, Calendar, Bell];

export function LandingPage({ locale, onLogin, onRegister }: {
  locale: AppLocale; onLogin: () => void; onRegister: () => void;
}) {
  const ar = locale === 'ar';
  const language = ar ? 'ar' : 'fr';
  const copy = COPY[language];
  const Arrow = ar ? ArrowLeft : ArrowRight;
  return <main className="landing-editorial" dir={ar ? 'rtl' : 'ltr'}>
    <div className="landing-composition auth-view-enter">
      <section className="landing-copy">
        <p className="landing-eyebrow">{copy.eyebrow}</p>
        <h1 tabIndex={-1}>{copy.title}<br /><span>{copy.emphasis}</span></h1>
        <p className="landing-description">{copy.subtitle}</p>
        <div className="landing-actions">
          <button type="button" onClick={onRegister} className="landing-primary"><span>{copy.register}</span><Arrow className="h-4 w-4" aria-hidden="true" /></button>
          <button type="button" onClick={onLogin} className="landing-secondary"><LogIn className="h-4 w-4" aria-hidden="true" /><span>{copy.login}</span></button>
        </div>
        <p className="landing-start">{copy.start}</p>
        <ul className="landing-features">{copy.badges.map((text, index) => {
          const Icon = FEATURE_ICONS[index];
          return <li key={text}><Icon className="h-4 w-4 shrink-0" aria-hidden="true" /><span>{text}</span></li>;
        })}</ul>
      </section>
      <section className="landing-gallery" aria-label={copy.preview}>
        <div className="landing-gallery-halo" aria-hidden="true" />
        <div className="landing-device landing-device-back landing-device-left" aria-hidden="true">
          <img src={`/showcase/portrait-${language}-editor.webp`} width={448} height={680} alt="" decoding="async" />
        </div>
        <div className="landing-device landing-device-back landing-device-right" aria-hidden="true">
          <img src={`/showcase/portrait-${language}-schedule.webp`} width={448} height={680} alt="" decoding="async" />
        </div>
        <AppShowcaseMedia locale={locale} portrait loading="eager" className="landing-device landing-device-front" />
        <p className="landing-gallery-caption">{copy.preview}</p>
      </section>
    </div>
  </main>;
}
