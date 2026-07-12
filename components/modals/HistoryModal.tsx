import React from 'react';
import { Modal } from '../ui/modal';
import { JournalEntry, opLabel, timeAgoFr } from '../../utils/journal';
import { Clock } from '../ui/icons';
import { Button } from '../ui/button';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: JournalEntry[];
}

/** Opérations identiques consécutives compactées : « Modification de cellule ×5 ». */
interface GroupedEntry {
  op: JournalEntry['op'];
  at: string; // horodatage le plus récent du groupe
  count: number;
}

const groupConsecutive = (entries: JournalEntry[]): GroupedEntry[] => {
  const groups: GroupedEntry[] = [];
  for (const entry of entries) {
    const last = groups[groups.length - 1];
    if (last && last.op === entry.op) {
      last.count += 1;
    } else {
      groups.push({ op: entry.op, at: entry.at, count: 1 });
    }
  }
  return groups;
};

/** Étiquette de jour relative : Aujourd'hui / Hier / date complète. */
const dayLabel = (iso: string): string => {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(date, today)) return "Aujourd'hui";
  if (sameDay(date, yesterday)) return 'Hier';
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
};

/** Historique détaillé des actions d'édition de la classe. */
export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, entries }) => {
  // regroupement par jour, puis compactage des opérations répétées
  const byDay = React.useMemo(() => {
    const grouped = groupConsecutive(entries);
    const days: { label: string; items: GroupedEntry[] }[] = [];
    for (const item of grouped) {
      const label = dayLabel(item.at);
      const last = days[days.length - 1];
      if (last && last.label === label) last.items.push(item);
      else days.push({ label, items: [item] });
    }
    return days;
  }, [entries]);

  return (
    <Modal
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
      footer={<Button type="button" variant="secondary" onClick={onClose}>Fermer</Button>}
    >
      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-secondary/50 p-8 text-center text-sm text-muted-foreground">
          Aucune action enregistrée pour l'instant.
        </div>
      ) : (
        <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">
          {byDay.map((day, dayIndex) => (
            <section key={`${day.label}-${dayIndex}`}>
              <h4 className="sticky top-0 z-10 mb-1.5 bg-card/95 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 backdrop-blur">
                {day.label}
              </h4>
              <ol className="relative space-y-0">
                {day.items.map((entry, index) => {
                  const isLatest = dayIndex === 0 && index === 0;
                  return (
                    <li key={`${entry.at}-${index}`} className="relative flex gap-3 pb-3 last:pb-0">
                      {/* fil chronologique */}
                      <span className="flex flex-col items-center">
                        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${isLatest ? 'bg-primary' : 'bg-border'}`} />
                        {index < day.items.length - 1 && <span className="w-px flex-1 bg-muted" />}
                      </span>
                      <div className="min-w-0 flex-1 pb-1">
                        <p className={`text-sm ${isLatest ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'}`}>
                          {opLabel(entry.op)}
                          {entry.count > 1 && (
                            <span className="ml-1.5 rounded-full bg-secondary px-1.5 py-0.5 align-middle text-[10px] font-bold text-muted-foreground">
                              ×{entry.count}
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-muted-foreground/60">
                          {timeAgoFr(entry.at)} · {new Date(entry.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </Modal>
  );
};
