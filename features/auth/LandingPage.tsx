import { Sparkles, Calendar, Bell, ArrowRight, ArrowLeft, LogIn } from "lucide-react";
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
  sand: "border-border bg-card text-muted-foreground hover:bg-muted",
  mint: "border-border bg-card text-muted-foreground hover:bg-muted",
  sky: "border-border bg-card text-muted-foreground hover:bg-muted",
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
      className="flex min-h-[calc(100dvh-56px)] w-full flex-1 flex-col items-center overflow-y-auto bg-background px-4 py-5 sm:px-6 sm:py-8"
    >
      <div className="auth-view-enter flex w-full max-w-3xl flex-col items-center gap-6 text-center sm:gap-8">
        {/* Title and Subtitle with breathable, balanced spacing */}
        <div className="space-y-2.5 sm:space-y-3.5 max-w-2xl mx-auto pt-1">
          <h1
            tabIndex={-1}
            className="whitespace-pre-line text-[2rem] font-bold leading-[1.12] tracking-[-0.035em] text-foreground sm:text-5xl sm:leading-[1.08]"
          >
            {copy.title}
          </h1>

          <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {copy.subtitle}
          </p>
        </div>

        {/* CTA Actions - Touch target >= 44px, ergonomic buttons with icons */}
        <div className="flex flex-col items-center gap-2 w-full max-w-sm sm:max-w-md mx-auto">
          <div className="flex flex-row items-center justify-center gap-2.5 sm:gap-3.5 w-full">
            <button
              type="button"
              onClick={onRegister}
              className="group auth-action flex-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:brightness-105 active:scale-[0.98] sm:px-6 sm:text-base"
            >
              <span>{copy.register}</span>
              {ar ? (
                <ArrowLeft className="w-4 h-4 shrink-0 transition-transform group-hover:-translate-x-0.5" />
              ) : (
                <ArrowRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
              )}
            </button>
            <button
              type="button"
              onClick={onLogin}
              className="group auth-action flex-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-none transition-colors hover:bg-muted active:scale-[0.98] sm:px-6 sm:text-base"
            >
              <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-stone-500 dark:text-stone-400 group-hover:text-stone-900 dark:group-hover:text-stone-100 transition-colors" />
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
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 hidden h-60 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl sm:block sm:h-80 sm:w-[32rem]"
          />

          {/* Device Chassis (Graphite & subtle specular border) */}
          <div className="relative flex min-h-[260px] w-full max-w-[340px] flex-col justify-between overflow-hidden rounded-[24px] border border-border bg-muted p-1.5 shadow-sm sm:h-[50vh] sm:max-w-xl sm:rounded-[28px] sm:p-2.5 md:max-w-2xl">
            {/* Screen Inner Wrapper (Outer - Padding = 20px / 26px / 28px) */}
            <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[18px] bg-background sm:rounded-[22px]">
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

