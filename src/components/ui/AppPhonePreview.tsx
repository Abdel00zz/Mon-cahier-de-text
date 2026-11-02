import { cn } from '@/lib/utils';
import type { AppLocale } from '@/types';
import { BookOpen, CalendarCheck, CircleCheck, Clock, Sparkles, Users, Settings, CircleHelp } from './icons';
import './app-phone-preview.css';

interface PreviewClass {
  title: string;
  tier: string;
  group: string;
  schedule: string;
  hours?: string;
  active?: boolean;
  bg: string;
  border: string;
  ink: string;
  secondary: string;
}

const PREVIEW_CLASSES: Record<'ar' | 'fr', PreviewClass[]> = {
  ar: [
    {
      title: 'علوم فيزيائية',
      tier: 'الثانية بكالوريا',
      group: '1',
      schedule: 'حصة جارية الآن · 08:00–10:00',
      hours: '2س',
      active: true,
      bg: '#ece9f7',
      border: '#c4b8e8',
      ink: '#2e2766',
      secondary: '#5d55a3',
    },
    {
      title: 'علوم رياضية أ',
      tier: 'الأولى بكالوريا',
      group: '2',
      schedule: 'اليوم على 10:05',
      hours: '2س',
      bg: '#e6f3e9',
      border: '#cfe6d5',
      ink: '#14503a',
      secondary: '#3f7f63',
    },
    {
      title: 'علمي',
      tier: 'الجذع المشترك',
      group: '3',
      schedule: 'غداً على 08:00',
      bg: '#fdeede',
      border: '#f6d9bd',
      ink: '#6b3a12',
      secondary: '#a8642a',
    },
  ],
  fr: [
    {
      title: 'Sciences Physiques',
      tier: '2ème Bac',
      group: '1',
      schedule: 'Séance en cours · 08h00–10h00',
      hours: '2h',
      active: true,
      bg: '#ece9f7',
      border: '#c4b8e8',
      ink: '#2e2766',
      secondary: '#5d55a3',
    },
    {
      title: 'Sciences Mathématiques A',
      tier: '1er Bac',
      group: '2',
      schedule: 'Aujourd’hui à 10h05',
      hours: '2h',
      bg: '#e6f3e9',
      border: '#cfe6d5',
      ink: '#14503a',
      secondary: '#3f7f63',
    },
    {
      title: 'Scientifique',
      tier: 'Tronc Commun',
      group: '3',
      schedule: 'Demain à 08h00',
      bg: '#fdeede',
      border: '#f6d9bd',
      ink: '#6b3a12',
      secondary: '#a8642a',
    },
  ],
};

/** Interactive-looking iOS editorial preview of the teacher workspace for the login showcase. */
export function AppPhonePreview({ locale, compact = false, className }: {
  locale: AppLocale; compact?: boolean; className?: string;
}) {
  const ar = locale === 'ar';
  const lang = ar ? 'ar' : 'fr';
  const classes = PREVIEW_CLASSES[lang];
  const caption = ar
    ? 'فضاء أستاذ متكامل: تتبّع الحصص، الدفاتر والمراقبة المستمرة في نظرة واحدة'
    : 'Espace enseignant unifié : séances en direct, cahiers et évaluations en un coup d’œil';

  return (
    <figure
      className={cn('phone-preview', compact && 'phone-preview--compact', className)}
      dir={ar ? 'rtl' : 'ltr'}
      aria-label={caption}
    >
      <div className="phone-preview__stage">
        {/* Ambient radial glow behind the device */}
        <div className="phone-preview__glow" aria-hidden="true" />

        {/* Floating pedagogical badge — Top */}
        <div className="phone-preview__float phone-preview__float--top" aria-hidden="true">
          <span className="phone-preview__float-icon phone-preview__float-icon--emerald">
            <CircleCheck className="size-3.5" />
          </span>
          <div className="phone-preview__float-text">
            <strong>{ar ? 'دفتر النصوص محيّن' : 'Cahier à jour'}</strong>
            <span>{ar ? 'إسناد التواريخ بنقرة واحدة' : 'Dates attribuées en 1 clic'}</span>
          </div>
        </div>

        {/* Floating pedagogical badge — Bottom */}
        <div className="phone-preview__float phone-preview__float--bottom" aria-hidden="true">
          <span className="phone-preview__float-icon phone-preview__float-icon--terracotta">
            <CalendarCheck className="size-3.5" />
          </span>
          <div className="phone-preview__float-text">
            <strong>{ar ? 'المراقبة المستمرة' : 'Contrôle continu'}</strong>
            <span>{ar ? 'تواريخ الفروض والغياب' : 'Suivi des devoirs & absences'}</span>
          </div>
        </div>

        {/* Modern iOS Titanium Frame */}
        <div className="phone-preview__device" role="img" aria-label={ar ? 'معاينة حية لواجهة فضاء الأستاذ' : 'Aperçu de l’interface espace enseignant'}>
          <div className="phone-preview__screen">
            {/* Dynamic Island & Status Bar */}
            <div className="phone-preview__statusbar" aria-hidden="true">
              <span className="phone-preview__time">08:42</span>
              <div className="phone-preview__island" />
              <div className="phone-preview__indicators">
                <span className="phone-preview__signal" />
                <span className="phone-preview__battery" />
              </div>
            </div>

            {/* App Header */}
            <div className="phone-preview__header" aria-hidden="true">
              <div className="phone-preview__header-title">
                <span>{ar ? 'أقسامي الدراسية' : 'Mes classes'}</span>
                <span className="phone-preview__header-colon">:</span>
              </div>
              <div className="phone-preview__header-actions">
                <span className="phone-preview__companion-pill">
                  <Sparkles className="size-3" />
                  <span>{ar ? 'حصة جارية' : 'En cours'}</span>
                </span>
                <span className="phone-preview__plus-btn">+</span>
              </div>
            </div>

            {/* Live Class Cards */}
            <div className="phone-preview__cards" aria-hidden="true">
              {classes.map((item, idx) => (
                <div
                  key={idx}
                  className={cn('phone-preview__card', item.active && 'phone-preview__card--active')}
                  style={{
                    backgroundColor: item.bg,
                    borderColor: item.border,
                    color: item.ink,
                  }}
                >
                  <div className="phone-preview__card-top">
                    <div className="phone-preview__card-identity">
                      <div className="phone-preview__card-title-row">
                        <span className="phone-preview__card-title">{item.title}</span>
                        <span
                          className="phone-preview__card-group"
                          style={{ borderColor: item.border, color: item.ink }}
                        >
                          {item.group}
                        </span>
                      </div>
                      <span className="phone-preview__card-tier" style={{ color: item.secondary }}>
                        {item.tier}
                      </span>
                    </div>
                    {item.hours && (
                      <span
                        className="phone-preview__card-hours"
                        style={{ color: item.ink, borderColor: item.border }}
                      >
                        {item.hours}
                      </span>
                    )}
                  </div>

                  <div className="phone-preview__card-footer">
                    <span
                      className={cn(
                        'phone-preview__card-status',
                        item.active && 'phone-preview__card-status--live',
                      )}
                      style={!item.active ? { color: item.secondary } : undefined}
                    >
                      {item.active ? (
                        <span className="phone-preview__live-dot" />
                      ) : (
                        <Clock className="size-2.5 opacity-75" />
                      )}
                      <span>{item.schedule}</span>
                    </span>
                    <BookOpen className="size-3 opacity-55" />
                  </div>
                </div>
              ))}
            </div>

            {/* Mini Session Progress Strip inside Screen */}
            <div className="phone-preview__mini-notebook" aria-hidden="true">
              <div className="phone-preview__mini-notebook-header">
                <span className="phone-preview__mini-badge">
                  {ar ? 'آخر حصة مسجّلة' : 'Dernière séance'}
                </span>
                <span className="phone-preview__mini-date">02/11</span>
              </div>
              <p className="phone-preview__mini-lesson">
                {ar
                  ? 'الموجات الميكانيكية المتوالية — تحديد سرعة الانتشار'
                  : 'Ondes mécaniques progressives — Célérité de propagation'}
              </p>
            </div>

            {/* iOS Liquid Glass Floating TabBar */}
            <div className="phone-preview__tabbar" aria-hidden="true">
              <div className="phone-preview__tab phone-preview__tab--active">
                <Users className="size-3" />
                <span>{ar ? 'الأقسام' : 'Classes'}</span>
              </div>
              <div className="phone-preview__tab">
                <Settings className="size-3" />
                <span>{ar ? 'الإعدادات' : 'Réglages'}</span>
              </div>
              <div className="phone-preview__tab">
                <CircleHelp className="size-3" />
                <span>{ar ? 'المساعدة' : 'Aide'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
