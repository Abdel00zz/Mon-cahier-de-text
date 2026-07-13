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
  oldestAt: string;
  count: number;
}

type HistoryFilter = 'all' | 'content' | 'dates' | 'structure';

const dayKey = (iso: string): string => {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

const categoryFor = (op: string): Exclude<HistoryFilter, 'all'> => {
  if (op.includes('date')) return 'dates';
  if (/add-|delete|reorder|manage|import|export/.test(op)) return 'structure';
  return 'content';
};

const groupConsecutive = (entries: JournalEntry[]): GroupedEntry[] => {
  const groups: GroupedEntry[] = [];
  for (const entry of entries) {
    const last = groups[groups.length - 1];
    const closeInTime = last && Math.abs(new Date(last.oldestAt).getTime() - new Date(entry.at).getTime()) <= 5 * 60_000;
    if (last && last.op === entry.op && dayKey(last.at) === dayKey(entry.at) && closeInTime) {
      last.count += 1;
      last.oldestAt = entry.at;
    } else {
      groups.push({ op: entry.op, at: entry.at, oldestAt: entry.at, count: 1 });
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
  const [filter, setFilter] = React.useState<HistoryFilter>('all');

  React.useEffect(() => {
    if (isOpen) setFilter('all');
  }, [isOpen]);

  const filteredEntries = React.useMemo(
    () => filter === 'all' ? entries : entries.filter(entry => categoryFor(entry.op) === filter),
    [entries, filter],
  );

  // regroupement par jour, puis compactage des opérations répétées
  const byDay = React.useMemo(() => {
    const grouped = groupConsecutive(filteredEntries);
    const days: { label: string; items: GroupedEntry[] }[] = [];
    for (const item of grouped) {
      const label = dayLabel(item.at);
      const last = days[days.length - 1];
      if (last && last.label === label) last.items.push(item);
      else days.push({ label, items: [item] });
    }
    return days;
  }, [filteredEntries]);

  const dayCount = React.useMemo(() => new Set(entries.map(entry => dayKey(entry.at))).size, [entries]);
  const filters: Array<{ key: HistoryFilter; label: string }> = [
    { key: 'all', label: 'Tout' },
    { key: 'content', label: 'Contenu' },
    { key: 'dates', label: 'Dates' },
    { key: 'structure', label: 'Structure' },
  ];

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
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-xl bg-secondary/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              <span className="font-extrabold text-foreground">{entries.length}</span> action{entries.length > 1 ? 's' : ''}
              <span className="mx-1.5 text-border">·</span>
              <span className="font-extrabold text-foreground">{dayCount}</span> jour{dayCount > 1 ? 's' : ''}
              {entries[0] && <><span className="mx-1.5 text-border">·</span>{timeAgoFr(entries[0].at)}</>}
            </p>
            <div className="no-scrollbar flex max-w-full gap-1 overflow-x-auto" aria-label="Filtrer l'historique">
              {filters.map(item => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  aria-pressed={filter === item.key}
                  className={`shrink-0 rounded-lg px-2.5 py-1.5 font-mono text-[9px] font-extrabold uppercase tracking-[0.035em] transition-colors ${filter === item.key ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-card hover:text-foreground'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Aucune action dans cette catégorie.</div>
          ) : (
          <div className="custom-scrollbar max-h-[48vh] space-y-4 overflow-y-auto pr-1">
          {byDay.map((day, dayIndex) => (
            <section key={`${day.label}-${dayIndex}`}>
              <h4 className="sticky top-0 z-10 bg-card/95 py-1.5 font-mono text-[9px] font-extrabold uppercase tracking-[0.06em] text-muted-foreground backdrop-blur">
                {day.label}
              </h4>
              <ol className="rounded-xl bg-secondary/35 px-3">
                {day.items.map((entry, index) => {
                  const isLatest = dayIndex === 0 && index === 0;
                  return (
                    <li key={`${entry.at}-${index}`} className="flex items-start justify-between gap-3 border-b border-border/65 py-3 last:border-b-0">
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${isLatest ? 'font-extrabold text-foreground' : 'font-semibold text-foreground/75'}`}>
                          {opLabel(entry.op)}
                          {entry.count > 1 && (
                            <span className="ml-1.5 rounded-full bg-secondary px-1.5 py-0.5 align-middle text-[10px] font-bold text-muted-foreground">
                              ×{entry.count}
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                          {timeAgoFr(entry.at)} · {entry.count > 1
                            ? `${new Date(entry.oldestAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}–${new Date(entry.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                            : new Date(entry.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {isLatest && <span className="shrink-0 rounded-md bg-primary/10 px-2 py-1 font-mono text-[8px] font-extrabold uppercase tracking-[0.04em] text-primary">Dernière</span>}
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
          </div>
          )}
        </div>
      )}
    </Modal>
  );
};
