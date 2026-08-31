import type { AppLocale } from "@/types";

const COPY = {
  fr: {
    title: "Gagnez du temps.\nEnseignez mieux.",
    subtitle:
      "Préparez votre première classe, puis finalisez votre inscription pour retrouver votre cahier.",
    login: "Se connecter",
    register: "Créer un compte",
    badges: [
      { text: "Saisie rapide et intelligente", tone: "sand" },
      { text: "Calendrier scolaire officiel", tone: "mint" },
      { text: "Notifications importantes", tone: "sky" },
    ],
    imgAlt: "Aperçu de la démonstration du cahier de textes et des tableaux",
  },
  ar: {
    title: "وقت أقل للتعبئة.\nوقت أكثر للتدريس.",
    subtitle: "أعدّ قسمك الأول، ثم أكمل التسجيل لحفظ دفتر نصوصك والعودة إليه.",
    login: "تسجيل الدخول",
    register: "إنشاء حساب جديد",
    badges: [
      { text: "تعبئة سريعة وذكية", tone: "sand" },
      { text: "التقويم المدرسي الرسمي", tone: "mint" },
      { text: "إشعارات مهمة", tone: "sky" },
    ],
    imgAlt: "معاينة توضيحية لدفتر النصوص والجداول",
  },
} as const;

const BADGE_STYLES = {
  sand: "bg-[#fef9c3] text-[#713f12] border border-[#fef08a] dark:bg-[#45371c] dark:text-[#fef08a] dark:border-[#713f12]",
  mint: "bg-[#dcfce7] text-[#14532d] border border-[#bbf7d0] dark:bg-[#143823] dark:text-[#bbf7d0] dark:border-[#14532d]",
  sky: "bg-[#e0f2fe] text-[#075985] border border-[#bae6fd] dark:bg-[#13354a] dark:text-[#bae6fd] dark:border-[#075985]",
};

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
    <div className="flex flex-1 flex-col items-center px-3 py-4 sm:px-6 sm:py-6 w-full min-h-[calc(100dvh-56px)] overflow-y-auto bg-background">
      <div className="auth-view-enter w-full max-w-4xl flex flex-col items-center text-center gap-4 sm:gap-6">
        {/* Title and Subtitle with breathable spacing */}
        <div className="space-y-2 sm:space-y-3 max-w-2xl mx-auto pt-1">
          <h1
            tabIndex={-1}
            className="whitespace-pre-line text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-stone-900 dark:text-stone-50 leading-[1.25] sm:leading-[1.2]"
          >
            {copy.title}
          </h1>

          <p className="text-xs sm:text-base md:text-lg text-stone-600 dark:text-stone-300 leading-relaxed max-w-xl mx-auto">
            {copy.subtitle}
          </p>
        </div>

        {/* CTA Actions - Aligned and compact on mobile (Single Row) */}
        <div className="flex flex-col items-center gap-2 w-full max-w-sm sm:max-w-md mx-auto">
          <div className="flex flex-row items-center justify-center gap-2 sm:gap-3 w-full">
            <button
              type="button"
              onClick={onRegister}
              className="auth-action flex-1 inline-flex min-h-11 sm:min-h-12 items-center justify-center rounded-full bg-[#f97316] hover:bg-[#ea580c] px-3 sm:px-6 text-xs sm:text-base font-bold text-white shadow-md cursor-pointer whitespace-nowrap"
            >
              <span>{copy.register}</span>
            </button>
            <button
              type="button"
              onClick={onLogin}
              className="auth-action flex-1 inline-flex min-h-11 sm:min-h-12 items-center justify-center rounded-full bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 hover:bg-stone-50 dark:hover:bg-stone-800/80 px-3 sm:px-6 text-xs sm:text-base font-bold shadow-sm cursor-pointer whitespace-nowrap"
            >
              {copy.login}
            </button>
          </div>
        </div>

        {/* Wider Screen Mockup Container to clearly display tables and schedule GIFs */}
        <div className="relative mx-auto flex items-center justify-center w-full my-1 sm:my-3">
          {/* Subtle warm ambient glow behind the device */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-[32rem] h-60 sm:h-80 bg-gradient-to-tr from-amber-500/20 via-orange-500/15 to-transparent rounded-full blur-3xl -z-10" />

          {/* Wide Device Chassis (Optimized for tables readability) */}
          <div className="relative w-full max-w-[340px] sm:max-w-xl md:max-w-2xl lg:max-w-3xl h-[42vh] sm:h-[50vh] md:h-[54vh] max-h-[500px] min-h-[260px] rounded-[28px] sm:rounded-[36px] md:rounded-[40px] p-2 sm:p-2.5 md:p-3 bg-stone-900 dark:bg-stone-950 border-[3.5px] sm:border-[5px] border-stone-700/80 dark:border-stone-600/80 shadow-2xl ring-1 ring-black/30 flex flex-col justify-between overflow-hidden">
            {/* Screen Inner Wrapper */}
            <div className="relative w-full h-full rounded-[20px] sm:rounded-[28px] md:rounded-[32px] overflow-hidden bg-black flex flex-col">
              {/* Dynamic Island / Modern Camera Bar */}
              <div className="absolute top-1.5 sm:top-2 left-1/2 -translate-x-1/2 z-20 flex items-center justify-between px-2 w-14 sm:w-20 h-3.5 sm:h-4.5 bg-black rounded-full shadow-inner border border-white/10">
                <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-stone-800" />
                <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-blue-950/80 ring-1 ring-blue-900/50" />
              </div>

              {/* Responsive GIF Preview: Landscape on tablet/desktop, portrait on small mobile with wide clarity */}
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
              <div className="absolute bottom-1 sm:bottom-1.5 left-1/2 -translate-x-1/2 w-16 sm:w-24 h-1 sm:h-1.5 bg-white/70 rounded-full z-20 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Feature Badges at the bottom */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 pt-1 pb-4">
          {copy.badges.map((badge) => (
            <span
              key={badge.text}
              className={`inline-flex items-center px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-sm font-semibold shadow-xs ${BADGE_STYLES[badge.tone]}`}
            >
              {badge.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
