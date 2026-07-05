import React from 'react';
import { Dialog } from '../ui/dialog';
import { JournalEntry, opLabel, timeAgoFr } from '../../utils/journal';
import { Clock } from '../ui/icons';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: JournalEntry[];
}

/** Historique détaillé des actions d'édition de la classe. */
export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, entries }) => (
  <Dialog
    isOpen={isOpen}
    onClose={onClose}
    title={
      <span className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" />
        Historique des modifications
      </span>
    }
    description="Les dernières actions effectuées sur ce cahier (conservées sur cet appareil)"
    maxWidth="lg"
  >
    {entries.length === 0 ? (
      <div className="rounded-xl border border-dashed border-border bg-slate-50 p-8 text-center text-sm text-slate-500">
        Aucune action enregistrée pour l'instant.
      </div>
    ) : (
      <ol className="relative space-y-0">
        {entries.map((entry, index) => (
          <li key={`${entry.at}-${index}`} className="relative flex gap-3 pb-3 last:pb-0">
            {/* fil chronologique */}
            <span className="flex flex-col items-center">
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${index === 0 ? 'bg-primary' : 'bg-slate-300'}`} />
              {index < entries.length - 1 && <span className="w-px flex-1 bg-slate-200" />}
            </span>
            <div className="min-w-0 flex-1 pb-1">
              <p className={`text-sm ${index === 0 ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>
                {opLabel(entry.op)}
              </p>
              <p className="text-[11px] text-slate-400">
                {timeAgoFr(entry.at)} · {new Date(entry.at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </li>
        ))}
      </ol>
    )}
  </Dialog>
);
