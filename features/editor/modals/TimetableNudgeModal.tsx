import React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { CalendarRange } from '@/components/ui/icons';
import { LangToggle, useModalLang, type ModalLang } from '@/components/ui/lang-toggle';

interface TimetableNudgeModalProps {
  isOpen: boolean;
  /** « Passer pour l'instant », mémorisé pour la session, jamais bloquant */
  onSkip: () => void;
  /** ouvre Paramètres ▸ Emploi du temps */
  onFill: () => void;
  classLabel: string;
}

/** même clé que le guide et le démarrage : préférence de langue PARTAGÉE */
const LANG_KEY = 'guide_lang_v1';

/** Textes chaleureux, dans les deux langues de l'enseignant marocain. */
const TEXTS: Record<ModalLang, {
  title: string;
  message: (classLabel: string) => string;
  benefits: string;
  fill: string;
  skip: string;
}> = {
  fr: {
    title: 'Emploi du temps en attente',
    message: classLabel =>
      `Bienvenue dans le cahier de « ${classLabel} » ! Pour qu'il veille sur vous, il ne lui manque que vos créneaux de cours, deux minutes suffisent.`,
    benefits: 'Suivi de progression · alertes de retard · rappels de fin de séance',
    fill: "Renseigner l'emploi du temps",
    skip: "Passer pour l'instant",
  },
  ar: {
    title: 'جدول الحصص في الانتظار',
    message: classLabel =>
      `مرحبًا بكم في دفتر « ${classLabel} » ! لكي يواكبكم الدفتر، لا ينقصه سوى حصصكم الأسبوعية، دقيقتان تكفيان.`,
    benefits: 'تتبّع التقدم · تنبيهات التأخر · تذكير بنهاية الحصة',
    fill: 'تعبئة جدول الحصص',
    skip: 'تخطّي الآن',
  },
};

/**
 * Invitation FLUIDE à renseigner l'emploi du temps, jamais bloquante :
 * affichée une fois par session et par classe, avec un « passer » discret.
 * Bilingue FR/AR (bascule en un tap, rendu RTL pour l'arabe).
 */
export const TimetableNudgeModal: React.FC<TimetableNudgeModalProps> = ({
  isOpen,
  onSkip,
  onFill,
  classLabel,
}) => {
  const { lang, setLang } = useModalLang(LANG_KEY, 'fr');
  const t = TEXTS[lang];
  const isAr = lang === 'ar';

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
        {/* Bascule de langue, discrète, en tête */}
        <div className="flex w-full justify-end">
          <LangToggle lang={lang} onChange={setLang} />
        </div>

        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 shadow-xs">
          <CalendarRange className="h-7 w-7 text-amber-600" />
        </span>

        <div dir={isAr ? 'rtl' : 'ltr'} className={isAr ? 'font-ar' : ''}>
          <p className="text-sm leading-relaxed text-muted-foreground">{t.message(classLabel)}</p>
          <p className="mt-3 text-[11px] font-bold text-muted-foreground">{t.benefits}</p>
        </div>

        <Button
          type="button"
          onClick={onFill}
          className="mt-1 h-9 w-full max-w-xs rounded-lg bg-primary text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          {t.fill}
        </Button>

        {/* Skip volontairement discret : simple lien texte */}
        <button
          type="button"
          onClick={onSkip}
          className="pb-1 text-xs font-semibold text-zinc-400 hover:text-foreground transition-colors"
        >
          {t.skip}
        </button>
      </div>
    </Modal>
  );
};
