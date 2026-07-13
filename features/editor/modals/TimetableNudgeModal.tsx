import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { CalendarRange } from '@/components/ui/icons';

interface TimetableNudgeModalProps {
  isOpen: boolean;
  /** « Passer pour l'instant » — mémorisé pour la session, jamais bloquant */
  onSkip: () => void;
  /** ouvre Paramètres ▸ Emploi du temps */
  onFill: () => void;
  classLabel: string;
}

type Lang = 'fr' | 'ar';
/** même clé que le guide et le démarrage : préférence de langue PARTAGÉE */
const LANG_KEY = 'guide_lang_v1';

const readLang = (): Lang => {
  try {
    return localStorage.getItem(LANG_KEY) === 'ar' ? 'ar' : 'fr';
  } catch {
    return 'fr';
  }
};

/** Textes chaleureux, dans les deux langues de l'enseignant marocain. */
const TEXTS: Record<Lang, {
  title: string;
  message: (classLabel: string) => string;
  benefits: string;
  fill: string;
  skip: string;
}> = {
  fr: {
    title: 'Emploi du temps en attente',
    message: classLabel =>
      `Bienvenue dans le cahier de « ${classLabel} » ! Pour qu'il veille sur vous, il ne lui manque que vos créneaux de cours — deux minutes suffisent.`,
    benefits: 'Suivi de progression · alertes de retard · rappels de fin de séance',
    fill: "Renseigner l'emploi du temps",
    skip: "Passer pour l'instant",
  },
  ar: {
    title: 'جدول الحصص في الانتظار',
    message: classLabel =>
      `مرحبًا بكم في دفتر « ${classLabel} » ! لكي يواكبكم الدفتر، لا ينقصه سوى حصصكم الأسبوعية — دقيقتان تكفيان.`,
    benefits: 'تتبّع التقدم · تنبيهات التأخر · تذكير بنهاية الحصة',
    fill: 'تعبئة جدول الحصص',
    skip: 'تخطّي الآن',
  },
};

/**
 * Invitation FLUIDE à renseigner l'emploi du temps — jamais bloquante :
 * affichée une fois par session et par classe, avec un « passer » discret.
 * Bilingue FR/AR (bascule en un tap, rendu RTL pour l'arabe).
 */
export const TimetableNudgeModal: React.FC<TimetableNudgeModalProps> = ({
  isOpen,
  onSkip,
  onFill,
  classLabel,
}) => {
  const [lang, setLangState] = useState<Lang>(readLang);
  const t = TEXTS[lang];
  const isAr = lang === 'ar';

  const setLang = (next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {
      // stockage indisponible : le choix vaut pour cette session
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onSkip}
      maxWidth="sm"
      title={
        <span dir={isAr ? 'rtl' : 'ltr'} className={`block ${isAr ? 'font-ar text-right' : ''}`}>
          {t.title}
        </span>
      }
    >
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        {/* Bascule de langue — discrète, en tête */}
        <div className="flex w-full justify-end">
          <div className="inline-flex rounded-full border border-border bg-secondary/60 p-0.5">
            {(['fr', 'ar'] as const).map(l => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                className={`rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${
                  lang === l ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {l === 'fr' ? 'FR' : 'ع'}
              </button>
            ))}
          </div>
        </div>

        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/15 text-warning">
          <CalendarRange className="h-7 w-7" />
        </span>

        <div dir={isAr ? 'rtl' : 'ltr'} className={isAr ? 'font-ar' : ''}>
          <p className="text-sm leading-relaxed text-muted-foreground">{t.message(classLabel)}</p>
          <p className="mt-3 text-[11px] font-semibold text-primary/80">{t.benefits}</p>
        </div>

        <Button
          type="button"
          onClick={onFill}
          className="mt-1 h-11 w-full max-w-xs rounded-full text-sm font-bold shadow-md shadow-primary/20"
        >
          {t.fill}
        </Button>

        {/* Skip volontairement discret : simple lien texte */}
        <button
          type="button"
          onClick={onSkip}
          className="pb-1 text-xs font-semibold text-muted-foreground/60 underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          {t.skip}
        </button>
      </div>
    </Modal>
  );
};
