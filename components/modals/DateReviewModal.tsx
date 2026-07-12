import React from 'react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';

interface DateReviewModalProps {
  isOpen: boolean;
  date: string;
  warnings: { message: string }[];
  /** Revient exactement au formulaire qui a proposé la date, sans perdre la saisie. */
  onModify: () => void;
  onConfirm: () => void;
}

/** Étape unique avant toute écriture d'une date qui mérite une vérification. */
export const DateReviewModal: React.FC<DateReviewModalProps> = ({ isOpen, date, warnings, onModify, onConfirm }) => (
  <Modal
    isOpen={isOpen}
    onClose={onModify}
    title="Vérification de la date"
    description={date ? `Date choisie : ${date.split('-').reverse().join('/')}` : undefined}
    maxWidth="sm"
    footer={
      <>
        <Button type="button" variant="secondary" onClick={onModify}>Modifier la date</Button>
        <Button type="button" onClick={onConfirm}>J’ai compris, enregistrer</Button>
      </>
    }
  >
    <div className="rounded-xl border border-warning/25 bg-warning/10 p-3" role="status">
      <p className="text-xs font-bold text-foreground">À vérifier avant de continuer</p>
      <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
        {warnings.map((warning, index) => <li key={index}>• {warning.message}</li>)}
      </ul>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Une séance de rattrapage ou une exception peut justifier cette date. Cette étape confirme simplement que vous en avez pris connaissance.
      </p>
    </div>
  </Modal>
);
