import React, { useState } from 'react';
import { Modal } from '../ui/modal';
import { Check, Plus, CalendarRange, BookOpen } from '../ui/icons';

type Lang = 'fr' | 'ar';
/** même clé que le guide : la préférence de langue est PARTAGÉE dans toute l'app */
const LANG_KEY = 'guide_lang_v1';

const readLang = (): Lang => {
  try {
    return localStorage.getItem(LANG_KEY) === 'ar' ? 'ar' : 'fr';
  } catch {
    return 'fr';
  }
};

export interface StartStepsState {
  hasClass: boolean;
  hasTimetable: boolean;
  hasContent: boolean;
}

interface StartStepsModalProps {
  isOpen: boolean;
  onClose: () => void;
  steps: StartStepsState;
  onCreateClass: () => void;
  onOpenTimetable: () => void;
  onOpenNotebook: () => void;
}

const TEXTS: Record<Lang, {
  title: string;
  subtitle: string;
  progress: (done: number) => string;
  steps: { title: string; desc: string; action: string }[];
  later: string;
  allDone: string;
}> = {
  fr: {
    title: 'Bien démarrer',
    subtitle: 'Commencez par votre emploi du temps — tout le reste suit naturellement. Vous allez y arriver en quelques minutes !',
    progress: done => `${done}/3 étapes complétées — continuez, vous y êtes presque !`,
    steps: [
      {
        title: 'Composez votre emploi du temps',
        desc: "Le geste fondateur : posez vos créneaux et créez vos classes DIRECTEMENT depuis la grille (« ＋ Créer une classe… » dans chaque case). Deux minutes suffisent, promis.",
        action: 'Composer mon emploi du temps',
      },
      {
        title: 'Vos classes prennent vie',
        desc: 'Nées de la grille, elles apparaissent sur votre tableau de bord avec leur couleur, leur prochaine séance et leur progression — sans rien saisir deux fois.',
        action: 'Créer une classe manuellement',
      },
      {
        title: 'Remplissez votre premier cahier',
        desc: 'Un programme officiel prêt à charger vous attend souvent — acceptez-le, adaptez-le, puis datez vos séances au fil des cours. Vous êtes lancé !',
        action: 'Ouvrir mon cahier',
      },
    ],
    later: 'Plus tard',
    allDone: 'Bravo, tout est prêt — excellente année scolaire ! 🎉',
  },
  ar: {
    title: 'البداية الصحيحة',
    subtitle: 'ابدؤوا باستعمال الزمن — وكل الباقي يتبع تلقائياً. دقائق قليلة وتكونون جاهزين!',
    progress: done => `أُنجزت ${done}/3 خطوات — واصلوا، أوشكتم على الانتهاء!`,
    steps: [
      {
        title: 'ركّبوا استعمال الزمن',
        desc: 'الخطوة المؤسِّسة: ضعوا حصصكم وأنشئوا أقسامكم مباشرة من الشبكة («＋ إنشاء قسم…» في كل خانة). دقيقتان تكفيان، وعدٌ منا.',
        action: 'تركيب استعمال الزمن',
      },
      {
        title: 'أقسامكم تنبض بالحياة',
        desc: 'وُلدت من الشبكة، وتظهر في لوحة التحكم بلونها وحصتها القادمة وتقدمها — دون إدخال أي شيء مرتين.',
        action: 'إنشاء قسم يدوياً',
      },
      {
        title: 'املؤوا دفتركم الأول',
        desc: 'غالباً ما ينتظركم مقرر رسمي جاهز للتحميل — اقبلوه وعدّلوه، ثم أرّخوا حصصكم مع مرور الدروس. انطلقتم!',
        action: 'فتح دفتري',
      },
    ],
    later: 'لاحقاً',
    allDone: 'أحسنتم، كل شيء جاهز — سنة دراسية موفقة! 🎉',
  },
};

const STEP_ICONS = [CalendarRange, Plus, BookOpen];

/**
 * Démarrage en 3 étapes — modale bilingue PREMIUM et INTELLIGENTE :
 * chaque étape reflète l'état réel (✓ si déjà faite), l'action ouvre
 * directement le bon écran, et l'étape courante est mise en avant.
 * La langue suit la préférence partagée du guide (FR/AR, mémorisée).
 */
export const StartStepsModal: React.FC<StartStepsModalProps> = ({
  isOpen,
  onClose,
  steps,
  onCreateClass,
  onOpenTimetable,
  onOpenNotebook,
}) => {
  const [lang, setLangState] = useState<Lang>(readLang);
  const isAr = lang === 'ar';
  const t = TEXTS[lang];

  const setLang = (next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {
      // stockage indisponible : le choix vaut pour cette session
    }
  };

  // ORDRE : l'emploi du temps d'ABORD — les classes s'y créent automatiquement
  // (« + Créer une classe… » dans chaque case de la grille), le cahier suit.
  const done = [steps.hasTimetable, steps.hasClass, steps.hasContent];
  const doneCount = done.filter(Boolean).length;
  const currentIndex = done.findIndex(d => !d); // -1 = tout est fait
  const actions = [onOpenTimetable, onCreateClass, onOpenNotebook];
  // le cahier ne s'ouvre qu'une fois une classe créée ; le reste est toujours accessible
  const actionEnabled = [true, true, steps.hasClass];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title={
        <div className="flex w-full items-center justify-between gap-3">
          <span dir={isAr ? 'rtl' : 'ltr'} className={`block ${isAr ? 'font-ar text-right' : ''} text-[#2f3e46]`}>
            {t.title}
          </span>
          <div className="flex shrink-0 items-center rounded-full border border-[#e8e4d9] bg-[#f4f1ea] p-0.5">
            {(['fr', 'ar'] as const).map(l => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-extrabold transition-all ${
                  lang === l ? 'bg-[#52796f] text-white shadow-sm' : 'text-[#84a98c] hover:text-[#52796f]'
                }`}
              >
                {l === 'fr' ? 'FR' : 'ع'}
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div dir={isAr ? 'rtl' : 'ltr'} className={`space-y-3 py-0.5 ${isAr ? 'font-ar' : ''}`}>
        <p className={`text-sm leading-relaxed text-[#52796f] ${isAr ? 'text-right' : ''}`}>{t.subtitle}</p>

        {/* Progression : barre + compteur */}
        <div className="space-y-1.5">
          <div className="h-2 overflow-hidden rounded-full bg-[#f4f1ea] border border-[#e8e4d9]">
            <div
              className="h-full rounded-full bg-[#84a98c] transition-[width] duration-700 ease-out"
              style={{ width: `${(doneCount / 3) * 100}%` }}
            />
          </div>
          <p className={`text-[11px] font-bold text-[#84a98c] ${isAr ? 'text-right' : ''}`}>
            {doneCount === 3 ? t.allDone : t.progress(doneCount)}
          </p>
        </div>

        {/* Étapes : ✓ si faite, étape courante mise en avant avec son action */}
        <div className="space-y-2">
          {t.steps.map((step, index) => {
            const isDone = done[index];
            const isCurrent = index === currentIndex;
            const Icon = STEP_ICONS[index];
            return (
              <div
                key={index}
                className={`flex items-start gap-3 rounded-xl border-2 p-3.5 transition-all animate-slide-in-up opacity-0 ${
                  isDone
                    ? 'border-[#cad2c5] bg-[#e8f0ec]/60'
                    : isCurrent
                      ? 'border-[#84a98c] bg-[#fdfbf7] shadow-md shadow-[#84a98c]/10'
                      : 'border-[#e8e4d9] bg-[#fdfbf7]/60 opacity-70'
                }`}
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <span
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-black ${
                    isDone
                      ? 'border-[#84a98c] bg-[#84a98c] text-white'
                      : isCurrent
                        ? 'border-[#ffd6c2] bg-[#fff3ec] text-[#e76f51]'
                        : 'border-[#e8e4d9] bg-[#f4f1ea] text-[#84a98c]'
                  }`}
                >
                  {isDone ? <Check className="h-4.5 w-4.5" /> : index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-bold ${isDone ? 'text-[#52796f] line-through decoration-[#84a98c]/40' : 'text-[#2f3e46]'}`}>
                    {step.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[#52796f]/90">{step.desc}</p>
                  {!isDone && isCurrent && (
                    <button
                      type="button"
                      disabled={!actionEnabled[index]}
                      onClick={actions[index]}
                      className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-[#52796f] px-4 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#2f3e46] disabled:opacity-40"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {step.action}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* « Passer » : aligné en fin de ligne (suit automatiquement le sens
            de lecture FR/AR), cible tactile confortable, jamais centré-perdu */}
        <div className="flex justify-end pt-0.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1.5 text-xs font-bold text-[#84a98c] transition-colors hover:bg-[#f4f1ea] hover:text-[#52796f]"
          >
            {t.later} {isAr ? '←' : '→'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
