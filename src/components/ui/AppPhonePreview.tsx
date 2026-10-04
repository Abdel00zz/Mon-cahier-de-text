import { ArrowLeft, ArrowRight, Bell, BookOpen, CalendarDays, Check, Clock, LayoutGrid, MoreHorizontal, Settings, Signal, Wifi, BatteryFull } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import type { AppLocale } from '@/types';
import './app-phone-preview.css';

const COPY = {
  fr: {
    label: 'Aperçu illustratif de l’application sur un téléphone', brand: 'Mon cahier de textes',
    greeting: 'Une belle journée pour enseigner.', classes: 'Mes classes', notebook: 'Mon cahier',
    schedule: 'Planning', settings: 'Réglages', today: 'Aujourd’hui', date: 'Lundi 14 septembre',
    subject: 'Mathématiques', current: 'Séance en cours', lesson: 'Les nombres rationnels',
    next: 'Prochaine séance', nextLesson: 'Calcul littéral', readyDetail: 'Vos séances à portée de main.',
    caption: 'Exemple d’un espace enseignant', level: '1ʳᵉ année collège', secondLevel: '2ᵉ année collège',
  },
  ar: {
    label: 'معاينة توضيحية للتطبيق على هاتف', brand: 'دفتر نصوصي', greeting: 'يوم جميل للتدريس.',
    classes: 'أقسامي', notebook: 'دفتري', schedule: 'الجدول', settings: 'الإعدادات',
    today: 'اليوم', date: 'الاثنين 14 شتنبر', subject: 'الرياضيات', current: 'حصة جارية',
    lesson: 'الأعداد الجذرية', next: 'الحصة المقبلة', nextLesson: 'الحساب الحرفي',
    readyDetail: 'حصصك في متناول يدك.',
    caption: 'نموذج لفضاء الأستاذ', level: 'الأولى إعدادي', secondLevel: 'الثانية إعدادي',
  },
} as const;

/** Lightweight HTML/SVG illustration. No screenshot download, video, timers or fake controls. */
export function AppPhonePreview({ locale, compact = false, className }: {
  locale: AppLocale; compact?: boolean; className?: string;
}) {
  const ar = locale === 'ar';
  const copy = COPY[ar ? 'ar' : 'fr'];
  const Forward = ar ? ArrowLeft : ArrowRight;
  return <figure className={cn('phone-preview', compact && 'phone-preview--compact', className)} dir={ar ? 'rtl' : 'ltr'} aria-label={copy.label}>
    <div className="phone-preview__stage" aria-hidden="true">
      <div className="phone-preview__device">
        <div className="phone-preview__screen">
          <div className="phone-preview__status" dir="ltr"><span>9:41</span><i /><span><Signal /><Wifi /><BatteryFull /></span></div>
          <div className="phone-preview__app-header">
            <span className="phone-preview__logo"><BookOpen /></span>
            <div><strong>{copy.brand}</strong><span>{copy.greeting}</span></div>
            <Bell className="phone-preview__bell" />
          </div>
          <div className="phone-preview__date"><span>{copy.today}</span><span>{copy.date}</span></div>
          <div className="phone-preview__title"><strong>{copy.classes}</strong><span>2</span></div>
          <div className="phone-preview__class phone-preview__class--active">
            <div className="phone-preview__class-top"><span>{copy.subject}</span><MoreHorizontal /></div>
            <h3>{copy.level} <bdi>1</bdi></h3>
            <div className="phone-preview__live"><i />{copy.current}</div>
            <p>{copy.lesson}</p>
            <div className="phone-preview__class-bottom"><span><Clock /><bdi dir="ltr">09:00 — 10:00</bdi></span><Forward /></div>
          </div>
          <div className="phone-preview__class phone-preview__class--next">
            <div className="phone-preview__class-top"><span>{copy.subject}</span><MoreHorizontal /></div>
            <h3>{copy.secondLevel} <bdi>2</bdi></h3>
            <p>{copy.nextLesson}</p>
            <div className="phone-preview__class-bottom"><span><Clock /><bdi dir="ltr">11:00 — 12:00</bdi></span><Forward /></div>
          </div>
          <div className="phone-preview__note"><Check /><span>{copy.readyDetail}</span></div>
          <div className="phone-preview__navigation">
            {[LayoutGrid, BookOpen, CalendarDays, Settings].map((Icon, i) => <span key={i} data-active={i === 0}><Icon />{[copy.classes, copy.notebook, copy.schedule, copy.settings][i]}</span>)}
          </div>
          <div className="phone-preview__home" />
        </div>
      </div>
      <div className="phone-preview__reminder"><span className="phone-preview__reminder-icon"><CalendarDays /></span><div><span>{copy.next}</span><strong>{copy.secondLevel}</strong><bdi dir="ltr">11:00 — 12:00</bdi></div><Check /></div>
    </div>
    <figcaption>{copy.caption}</figcaption>
  </figure>;
}
