import { BookOpen, CalendarDays, Cloud } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { TeacherTeamIllustration } from '@/components/ui/DynamicIllustration';
import type { AppLocale } from '@/types';
import './landing.css';

const COPY = {
  fr: {
    title: 'Votre journée,', emphasis: 'plus simplement.',
    detail: 'Vos classes, vos séances, votre planning. Tout votre cahier à portée de main.',
    start: 'Votre classe d’abord. Votre compte ensuite.',
    login: 'Se connecter', register: 'Créer mon cahier',
    reassurance: 'Sur téléphone, tablette et ordinateur', preview: 'Enseigner, préparer, avancer ensemble',
    features: [
      { title: 'Contenus prêts', detail: 'À adapter à vos séances.' },
      { title: 'Séances datées', detail: 'Choisissez le contenu et sa date.' },
      { title: 'Cahier synchronisé', detail: 'Sur vos appareils, via votre compte.' },
    ],
  },
  ar: {
    title: 'دفتر نصوصك', emphasis: 'بكل بساطة.',
    detail: 'أقسامك وحصصك وجدولك. دفتر واضح، دائماً في متناول يدك.',
    start: 'قسمك أولاً، ثم حسابك لحفظه.',
    login: 'تسجيل الدخول', register: 'إعداد دفتري',
    reassurance: 'على الهاتف والجهاز اللوحي والحاسوب', preview: 'نحضّر ونتقدّم معاً',
    features: [
      { title: 'محتوى جاهز', detail: 'تكيّفه مع حصصك.' },
      { title: 'حصص مؤرّخة', detail: 'حدّد المحتوى وأسند إليه تاريخاً.' },
      { title: 'دفتر متزامن', detail: 'بين أجهزتك، عبر حسابك.' },
    ],
  },
} as const;
const FEATURE_ICONS = [BookOpen, CalendarDays, Cloud];

export function LandingPage({ locale, onLogin, onRegister }: {
  locale: AppLocale; onLogin: () => void; onRegister: () => void;
}) {
  const ar = locale === 'ar';
  const copy = COPY[ar ? 'ar' : 'fr'];
  return <main className="landing-editorial" dir={ar ? 'rtl' : 'ltr'}>
    <div className="landing-composition auth-view-enter">
      <section className="landing-copy">
        <h1 tabIndex={-1}>{copy.title}<br /><span>{copy.emphasis}</span></h1>
        <p className="landing-detail">{copy.detail}</p>
        <div className="landing-actions">
          <Button type="button" onClick={onRegister} className="landing-primary">{copy.register}</Button>
          <Button type="button" variant="outline" onClick={onLogin} className="landing-secondary">{copy.login}</Button>
        </div>
        <p className="landing-start">{copy.start}</p>
      </section>
      <section className="landing-gallery" aria-label={copy.preview}><TeacherTeamIllustration size={348} className="landing-teachers" /><p>{copy.reassurance}</p></section>
      <ul className="landing-features">
        {copy.features.map((feature, index) => {
          const Icon = FEATURE_ICONS[index];
          return (
            <li key={feature.title}>
              <div className="landing-feature-header">
                <span className="landing-feature-icon"><Icon aria-hidden="true" /></span>
                <h2>{feature.title}</h2>
              </div>
              <p>{feature.detail}</p>
            </li>
          );
        })}
      </ul>
    </div>
  </main>;
}
