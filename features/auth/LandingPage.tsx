import { Sparkles, Calendar, Bell } from "lucide-react";
import { AppShowcaseMedia } from "@/components/ui/AppShowcaseMedia";
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
      className="flex flex-1 flex-col items-center px-3.5 py-4 sm:px-6 sm:py-7 w-full min-h-[calc(100dvh-56px)] overflow-y-auto bg-background"
    >
      <div className="auth-view-enter w-full max-w-4xl flex flex-col items-center text-center gap-4 sm:gap-6">
        {/* Title and Subtitle with breathable, balanced spacing */}
        <div className="space-y-2.5 sm:space-y-3.5 max-w-2xl mx-auto pt-1">
          <h1
            tabIndex={-1}
            className="whitespace-pre-line text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-stone-900 dark:text-stone-50 leading-[1.2] sm:leading-[1.15]"
          >
            {copy.title}
          </h1>

          <p className="text-xs sm:text-base md:text-lg text-stone-600 dark:text-stone-300 leading-relaxed max-w-xl mx-auto font-normal">
            {copy.subtitle}
          </p>
        </div>

        {/* CTA Actions - Touch target >= 44px with balanced text-only controls */}
        <div className="flex flex-col items-center gap-2 w-full max-w-sm sm:max-w-md mx-auto">
          <div className="flex flex-row items-center justify-center gap-2.5 sm:gap-3.5 w-full">
            <button
              type="button"
              onClick={onRegister}
              className="group auth-action flex-1 inline-flex min-h-[46px] sm:min-h-[48px] items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 px-4 sm:px-6 text-xs sm:text-base font-bold text-white shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
            >
              <span>{copy.register}</span>
            </button>
            <button
              type="button"
              onClick={onLogin}
              className="auth-action flex-1 inline-flex min-h-[46px] sm:min-h-[48px] items-center justify-center rounded-xl sm:rounded-2xl bg-stone-100/90 dark:bg-stone-900/90 border border-stone-300/80 dark:border-stone-700/80 text-stone-900 dark:text-stone-100 hover:bg-stone-200/70 dark:hover:bg-stone-800 px-4 sm:px-6 text-xs sm:text-base font-semibold shadow-xs hover:border-stone-400 dark:hover:border-stone-600 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
            >
              <span>{copy.login}</span>
            </button>
          </div>
        </div>

        <AppShowcaseMedia locale={locale} loading="eager" className="my-1 w-full max-w-[340px] sm:my-3 sm:max-w-3xl" />

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

