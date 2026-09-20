import { Sparkles, Calendar, Bell } from "lucide-react";
import type { AppLocale } from "@/types";

const COPY = {
  fr: {
    title: "Gagnez du temps.\nEnseignez mieux.",
    subtitle:
      "Préparez votre première classe, puis finalisez votre inscription pour retrouver votre cahier.",
    login: "Se connecter",
    register: "Créer un compte",
    badges: [
      { text: "Saisie rapide et intelligente", tone: "sand", icon: Sparkles },
      { text: "Calendrier scolaire officiel", tone: "mint", icon: Calendar },
      { text: "Notifications importantes", tone: "sky", icon: Bell },
    ],
    imgAlt: "Aperçu de la démonstration du cahier de textes et des tableaux",
  },
  ar: {
    title: "وقت أقل للتعبئة.\nوقت أكثر للتدريس.",
    subtitle: "أعدّ قسمك الأول، ثم أكمل التسجيل لحفظ دفتر نصوصك والعودة إليه.",
    login: "تسجيل الدخول",
    register: "إنشاء حساب جديد",
    badges: [
      { text: "تعبئة سريعة وذكية", tone: "sand", icon: Sparkles },
      { text: "التقويم المدرسي الرسمي", tone: "mint", icon: Calendar },
      { text: "إشعارات مهمة", tone: "sky", icon: Bell },
    ],
    imgAlt: "معاينة توضيحية لدفتر النصوص والجداول",
  },
} as const;

const BADGE_STYLES = {
  sand: "bg-amber-500/10 text-amber-900 dark:text-amber-200 border-amber-500/30 hover:bg-amber-500/15",
  mint: "bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 border-emerald-500/30 hover:bg-emerald-500/15",
  sky: "bg-sky-500/10 text-sky-900 dark:text-sky-200 border-sky-500/30 hover:bg-sky-500/15",
} as const;

export function LandingPage({
  locale,
  onLogin,
  onRegister,
}: {
  locale: AppLocale;
  onLogin: () => void;
  onRegister: () => void;
}) {
  const ar = locale === "ar";
  const copy = COPY[ar ? "ar" : "fr"];

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      className="landing-artisan-shell flex flex-1 flex-col items-center px-3.5 py-4 sm:px-6 sm:py-7 w-full min-h-[calc(100dvh-56px)] overflow-y-auto bg-background"
    >
      <div className="auth-view-enter w-full max-w-4xl flex flex-col items-center text-center gap-4 sm:gap-6">
        {/* Title and Subtitle with breathable, balanced spacing */}
        <div className="space-y-2.5 sm:space-y-3.5 max-w-2xl mx-auto pt-1">
          <h1
            tabIndex={-1}
            className="landing-artisan-title whitespace-pre-line text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-stone-900 dark:text-stone-50 leading-[1.2] sm:leading-[1.15]"
          >
            {copy.title}
          </h1>

          <p className="text-xs sm:text-base md:text-lg text-stone-600 dark:text-stone-300 leading-relaxed max-w-xl mx-auto font-normal">
            {copy.subtitle}
          </p>
        </div>

        {/* CTA Actions - Touch target >= 44px, ergonomic buttons with icons */}
        <div className="flex flex-col items-center gap-2 w-full max-w-sm sm:max-w-md mx-auto">
          <div className="flex flex-row items-center justify-center gap-2.5 sm:gap-3.5 w-full">
            <button
              type="button"
              onClick={onRegister}
              className="landing-primary-cta group auth-action flex-1 inline-flex min-h-[46px] sm:min-h-[48px] items-center justify-center gap-2 rounded-xl sm:rounded-2xl px-4 sm:px-6 text-xs sm:text-base font-bold shadow-md active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
            >
              <span>{copy.register}</span>
            </button>
            <button
              type="button"
              onClick={onLogin}
              className="landing-secondary-cta group auth-action flex-1 inline-flex min-h-[46px] sm:min-h-[48px] items-center justify-center gap-2 rounded-xl sm:rounded-2xl px-4 sm:px-6 text-xs sm:text-base font-semibold active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
            >
              <span>{copy.login}</span>
            </button>
          </div>
        </div>

        {/* Device Chassis Preview: Nested border radius mathematically calculated */}
        {/* Outer Radius = 28px/36px/40px, Padding = 8px/10px/12px -> Inner Radius = 20px/26px/28px */}
        <div className="relative mx-auto flex items-center justify-center w-full my-1 sm:my-3">
          {/* Subtle warm ambient glow behind the device chassis */}
          <div
            aria-hidden="true"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-[32rem] h-60 sm:h-80 bg-gradient-to-tr from-amber-500/15 via-orange-500/10 to-transparent rounded-full blur-3xl -z-10 pointer-events-none"
          />

          {/* Device Chassis (Graphite & subtle specular border) */}
          <div className="relative w-full max-w-[340px] sm:max-w-xl md:max-w-2xl lg:max-w-3xl h-[42vh] sm:h-[50vh] md:h-[54vh] max-h-[500px] min-h-[260px] rounded-[28px] sm:rounded-[36px] md:rounded-[40px] p-2 sm:p-2.5 md:p-3 bg-stone-900 dark:bg-stone-950 border-[3.5px] sm:border-[5px] border-stone-700/90 dark:border-stone-700 shadow-2xl ring-1 ring-black/40 flex flex-col justify-between overflow-hidden">
            {/* Screen Inner Wrapper (Outer - Padding = 20px / 26px / 28px) */}
            <div className="relative w-full h-full rounded-[20px] sm:rounded-[26px] md:rounded-[28px] overflow-hidden bg-stone-950 flex flex-col">
              {/* Dynamic Island / Modern Camera Bar */}
              <div
                aria-hidden="true"
                className="absolute top-1.5 sm:top-2 left-1/2 -translate-x-1/2 z-20 flex items-center justify-between px-2 w-14 sm:w-20 h-3.5 sm:h-4.5 bg-black rounded-full shadow-inner border border-white/10 pointer-events-none"
              >
                <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-stone-800" />
                <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-blue-950/80 ring-1 ring-blue-900/50" />
              </div>

              {/* Responsive GIF Preview: Landscape on tablet/desktop, portrait on small mobile */}
              <picture className="block w-full h-full">
                <source media="(min-width: 640px)" srcSet="/landscape.gif" />
                <img
                  src="/portrait.gif"
                  alt={copy.imgAlt}
                  className="w-full h-full object-cover object-top sm:object-contain sm:bg-stone-950"
                  loading="eager"
                />
              </picture>

              {/* Bottom Home Indicator Bar */}
              <div
                aria-hidden="true"
                className="absolute bottom-1 sm:bottom-1.5 left-1/2 -translate-x-1/2 w-16 sm:w-24 h-1 sm:h-1.5 bg-white/60 dark:bg-white/40 rounded-full z-20 pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Feature Badges with contextual icons and harmonious tones */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 pt-1 pb-4">
          {copy.badges.map((badge) => {
            const Icon = badge.icon;
            return (
              <span
                key={badge.text}
                className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs md:text-sm font-semibold border shadow-2xs transition-all ${BADGE_STYLES[badge.tone]}`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 opacity-80" />
                <span>{badge.text}</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

