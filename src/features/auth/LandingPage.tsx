import { ArrowLeft, ArrowRight, CalendarDays, Check } from '@/components/ui/icons';
import { Cloud, PenLine } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { AppPhonePreview } from '@/components/ui/AppPhonePreview';
import type { AppLocale } from '@/types';
import './landing.css';

const COPY = {
  fr: {
    eyebrow: 'Pensé pour votre quotidien d’enseignant', title: 'Votre journée,', emphasis: 'plus simplement.',
    detail: 'Vos classes, vos séances et votre planning. Un cahier clair, toujours à portée de main.',
    start: 'Préparez votre classe, puis créez votre compte pour la conserver.',
    login: 'Se connecter', register: 'Préparer mon cahier',
    reassurance: 'Sur téléphone, tablette et ordinateur', preview: 'Votre cahier dans votre téléphone',
    features: [
      { title: 'Rédigez sans effort', detail: 'Des contenus prêts à adapter à vos séances.' },
      { title: 'Gardez le bon rythme', detail: 'Un planning lié au calendrier scolaire officiel.' },
      { title: 'Retrouvez votre travail', detail: 'Vos cahiers synchronisés entre vos appareils.' },
    ],
  },
  ar: {
    eyebrow: 'مصمّم ليومك كأستاذ', title: 'يومك الدراسي،', emphasis: 'بكل بساطة.',
    detail: 'أقسامك وحصصك وجدولك. دفتر واضح، دائماً في متناول يدك.',
    start: 'أعدّ قسمك، ثم أنشئ حسابك لحفظه.', login: 'تسجيل الدخول', register: 'إعداد دفتري',
    reassurance: 'على الهاتف والجهاز اللوحي والحاسوب', preview: 'دفتر نصوصك على هاتفك',
    features: [
      { title: 'دوّن بسهولة', detail: 'محتويات جاهزة لتكييفها مع حصصك.' },
      { title: 'نظّم حصصك', detail: 'جدول مرتبط بالتقويم المدرسي الرسمي.' },
      { title: 'عملك معك دائماً', detail: 'مزامنة دفاترك بين أجهزتك.' },
    ],
  },
} as const;
const FEATURE_ICONS = [PenLine, CalendarDays, Cloud];

export function LandingPage({ locale, onLogin, onRegister }: {
  locale: AppLocale; onLogin: () => void; onRegister: () => void;
}) {
  const ar = locale === 'ar';
  const copy = COPY[ar ? 'ar' : 'fr'];
  const Forward = ar ? ArrowLeft : ArrowRight;
  return <main className="landing-editorial" dir={ar ? 'rtl' : 'ltr'}>
    <div className="landing-composition auth-view-enter">
      <section className="landing-copy">
        <p className="landing-eyebrow"><span aria-hidden="true" />{copy.eyebrow}</p>
        <h1 tabIndex={-1}>{copy.title}<br /><span>{copy.emphasis}</span></h1>
        <p className="landing-detail">{copy.detail}</p>
        <div className="landing-actions">
          <Button type="button" onClick={onRegister} className="landing-primary"><span>{copy.register}</span><Forward aria-hidden="true" /></Button>
          <Button type="button" variant="outline" onClick={onLogin} className="landing-secondary">{copy.login}</Button>
        </div>
        <p className="landing-start">{copy.start}</p>
        <p className="landing-reassurance"><Check aria-hidden="true" />{copy.reassurance}</p>
      </section>
      <section className="landing-gallery" aria-label={copy.preview}><AppPhonePreview locale={locale} /></section>
      <ul className="landing-features">
        {copy.features.map((feature, index) => {
          const Icon = FEATURE_ICONS[index];
          return <li key={feature.title}><span className="landing-feature-icon"><Icon aria-hidden="true" /></span><div><h2>{feature.title}</h2><p>{feature.detail}</p></div></li>;
        })}
      </ul>
    </div>
  </main>;
}
