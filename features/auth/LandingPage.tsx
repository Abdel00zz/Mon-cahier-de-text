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
      className="landing-artisan-shell flex flex-1 flex-col items-center overflow-y-auto bg-[#f7f5ef] px-4 py-4 text-stone-900 dark:bg-stone-950 dark:text-stone-50 sm:px-6 sm:py-6"
    >
      <div className="auth-view-enter flex w-full max-w-5xl flex-col items-center gap-5 text-center sm:gap-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#a4772e] sm:text-base">
          <span aria-hidden="true" className="h-px w-8 bg-[#caa35a]/60 sm:w-12" />
          <span>{ar ? "دفترك، ببساطة" : "Votre cahier, simplement"}</span>
          <span aria-hidden="true" className="h-px w-8 bg-[#caa35a]/60 sm:w-12" />
        </div>

        <div className="max-w-3xl space-y-4 sm:space-y-5">
          <h1
            tabIndex={-1}
            className="whitespace-pre-line font-[var(--font-serif)] text-[clamp(2rem,7vw,4.5rem)] font-black leading-[1.12] tracking-[-0.04em] text-[#202333] outline-none dark:text-stone-100"
          >
            {copy.title}
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-8 text-[#33405b] dark:text-stone-300 sm:text-lg sm:leading-9">
            {copy.subtitle}
          </p>
        </div>

        <div className="flex w-full max-w-xl flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <button
            type="button"
            onClick={onRegister}
            className="auth-action inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#df2d38] px-7 text-sm font-bold text-white shadow-[0_10px_22px_-13px_rgba(185,35,45,0.8)] hover:bg-[#c92530] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#df2d38] focus-visible:ring-offset-2 sm:w-auto sm:min-w-48 sm:text-base"
          >
            {copy.register}
          </button>
          <button
            type="button"
            onClick={onLogin}
            className="auth-action inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#263653]/20 bg-[#fffdf8]/90 px-7 text-sm font-semibold text-[#263653] shadow-[0_8px_20px_-18px_rgba(38,54,83,0.8)] hover:border-[#263653]/40 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#263653]/40 focus-visible:ring-offset-2 sm:w-auto sm:min-w-48 sm:text-base dark:border-stone-600 dark:bg-stone-900/80 dark:text-stone-100 dark:hover:bg-stone-800"
          >
            {copy.login}
          </button>
        </div>

        <AppShowcaseMedia locale={locale} loading="eager" className="w-full max-w-[340px] rounded-[1.5rem] border-[#cfcac0]/70 sm:mt-2 sm:max-w-4xl" />

        {/* Feature Badges with contextual icons and harmonious tones */}
        <div className="flex flex-wrap items-center justify-center gap-2 pb-4 sm:gap-3">
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

