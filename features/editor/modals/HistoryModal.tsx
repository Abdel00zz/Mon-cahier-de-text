import React from 'react';
import { Modal } from '@/components/ui/modal';
import { JournalEntry, opLabel, timeAgoFr } from '@/utils/journal';
import { Clock } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';

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
          <Clock className="h-4 w-4 text-zinc-700" />
          Historique des modifications
        </span>
      }
      description="Les dernières actions effectuées sur ce cahier (conservées sur cet appareil)"
      maxWidth="md"
      footer={<Button type="button" onClick={onClose} className="px-3.5">Fermer</Button>}
    >
      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500">
          Aucune action enregistrée pour l'instant.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="px-1 text-[10px] text-zinc-500">
              <span className="font-extrabold text-zinc-800">{entries.length}</span> action{entries.length > 1 ? 's' : ''}
              <span className="mx-1.5 text-zinc-300">·</span>
              <span className="font-extrabold text-zinc-800">{dayCount}</span> jour{dayCount > 1 ? 's' : ''}
              {entries[0] && <><span className="mx-1.5 text-zinc-300">·</span>{timeAgoFr(entries[0].at)}</>}
            </p>
            <div className="no-scrollbar flex max-w-full gap-0.5 overflow-x-auto rounded-md bg-zinc-100 p-0.5" aria-label="Filtrer l'historique">
              {filters.map(item => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  aria-pressed={filter === item.key}
                  className={`shrink-0 rounded px-2 py-1 font-mono text-[8px] font-extrabold uppercase tracking-wide transition-all duration-150 ${filter === item.key ? 'bg-[#123a63] text-white shadow-xs' : 'text-zinc-500 hover:bg-white hover:text-zinc-800'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-500">Aucune action dans cette catégorie.</div>
          ) : (
          <div className="custom-scrollbar max-h-[52vh] space-y-3 overflow-y-auto pr-1">
          {byDay.map((day, dayIndex) => (
            <section key={`${day.label}-${dayIndex}`}>
              <h4 className="sticky top-0 z-10 bg-zinc-50/95 px-1 py-1.5 font-mono text-[9px] font-extrabold uppercase tracking-[0.06em] text-zinc-400 backdrop-blur">
                {day.label}
              </h4>
              <ol className="rounded-lg border border-zinc-200 bg-white px-2.5">
                {day.items.map((entry, index) => {
                  const isLatest = dayIndex === 0 && index === 0;
                  return (
                    <li key={`${entry.at}-${index}`} className="flex items-start gap-2.5 border-b border-zinc-100 py-2.5 last:border-b-0">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${isLatest ? 'bg-[#123a63]' : 'bg-zinc-300'}`} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs ${isLatest ? 'font-extrabold text-zinc-900' : 'font-semibold text-zinc-700'}`}>
                          {opLabel(entry.op)}
                          {entry.count > 1 && (
                            <span className="ml-1.5 rounded-full bg-zinc-100 border border-zinc-200/60 px-1.5 py-0.5 align-middle text-[10px] font-bold text-zinc-500">
                              ×{entry.count}
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-[10px] text-zinc-400">
                          {timeAgoFr(entry.at)} · {entry.count > 1
                            ? `${new Date(entry.oldestAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}–${new Date(entry.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                            : new Date(entry.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {isLatest && <span className="shrink-0 rounded-md border border-blue-100 bg-blue-50 px-1.5 py-0.5 font-mono text-[8px] font-extrabold uppercase tracking-wide text-[#123a63]">Dernière</span>}
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
