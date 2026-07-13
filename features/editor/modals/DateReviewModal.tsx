import React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

interface DateReviewModalProps {
  isOpen: boolean;
  date: string;
  warnings: { message: string }[];
  /** Revient exactement au formulaire qui a proposé la date, sans perdre la saisie. */
  onModify: () => void;
  onConfirm: () => void;
  /** Enregistre l'exception et retire uniquement ce contrôle du centre d'actions. */
  onIgnore?: () => void;
}

/** Étape unique avant toute écriture d'une date qui mérite une vérification. */
export const DateReviewModal: React.FC<DateReviewModalProps> = ({ isOpen, date, warnings, onModify, onConfirm, onIgnore }) => {
  const distinctWarnings = warnings.filter(
    (warning, index, all) => all.findIndex(item => item.message === warning.message) === index,
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onModify}
      title="Vérification de la date"
      description={date ? `Date choisie : ${date.split('-').reverse().join('/')}` : undefined}
      maxWidth="sm"
      footer={
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
          <Button type="button" variant="secondary" onClick={onModify}>Modifier la date</Button>
          <Button type="button" onClick={onConfirm} aria-label="J’ai compris et enregistrer la date">
            J’ai compris
          </Button>
        </div>
      }
    >
      <div className="rounded-2xl border border-warning/30 bg-warning/[0.08] p-4" role="status" aria-live="polite">
        <p className="text-sm font-extrabold text-foreground">À vérifier avant de continuer</p>
        <ul className="mt-3 divide-y divide-warning/15">
          {distinctWarnings.map((warning, index) => (
            <li key={index} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
              <span className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-hidden />
              <span className="text-[13px] font-medium leading-relaxed text-slate-700">{warning.message}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs font-medium leading-relaxed text-slate-600">
          Une séance de rattrapage ou une situation exceptionnelle peut justifier cette date. Confirmez simplement que vous avez pris connaissance de ces points.
        </p>
        {onIgnore && (
          <button
            type="button"
            onClick={onIgnore}
            className="mt-3 min-h-10 w-full rounded-xl px-3 text-[11px] font-bold text-slate-500 transition-colors hover:bg-white hover:text-amber-700"
          >
            Conserver comme exception et ne plus signaler cette date
          </button>
        )}
      </div>
    </Modal>
  );
};
