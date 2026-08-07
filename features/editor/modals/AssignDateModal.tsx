import { FC, useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { CalendarX, CalendarPlus, CalendarMinus, ChevronRight } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MathJax } from 'better-react-mathjax';
import { Indices } from '@/types';
import { TYPE_MAP, BADGE_TEXT_MAP, BADGE_COLOR_MAP, TOP_LEVEL_TYPE_CONFIG } from '@/constants';
import { todayInMorocco } from '@/utils/calendar';

interface SelectedItemPreview {
  indices: Indices;
  item: any;
  title: string;
  date?: string;
  description?: string;
  canDate: boolean;
}

interface AssignDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (date: string) => void;
  selectedCount: number;
  selectedItems: SelectedItemPreview[];
  /** validation intelligente : alertes live pour la date choisie (emploi du temps, fériés, vacances, absences) */
  getDateWarnings?: (date: string) => { type: string; message: string }[];
  /** Date conservée lors d'un retour depuis la vérification. */
  initialDate?: string;
}

const addDaysISO = (iso: string, offset: number): string => {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + offset);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
};

const isoFromOffset = (offset: number) => {
  return addDaysISO(todayInMorocco(), offset);
};

const formatDateFr = (dateStr?: string) => {
  if (!dateStr) return 'Sans date';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = Number(parts[0]);
      const m = Number(parts[1]);
      const d = Number(parts[2]);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
    const dObj = new Date(dateStr);
    if (isNaN(dObj.getTime())) return dateStr;
    return dObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
};

const formatFullDateFr = (dateStr?: string) => {
  if (!dateStr) return 'Aucune date sélectionnée';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = Number(parts[0]);
      const m = Number(parts[1]);
      const d = Number(parts[2]);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    const dObj = new Date(dateStr);
    if (isNaN(dObj.getTime())) return dateStr;
    return dObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

const hasMathSyntax = (value: unknown): boolean => {
  if (!value || typeof value !== 'string') return false;
  return /\$\$?[^$]+\$\$?|\\\(|\\\[|\\begin\{/.test(value);
};

export const AssignDateModal: FC<AssignDateModalProps> = ({
  isOpen,
  onClose,
  onApply,
  selectedCount,
  selectedItems,
  getDateWarnings,
  initialDate,
}) => {
  const [actionType, setActionType] = useState<'associate' | 'dissociate'>('associate');
  const [selectedDate, setSelectedDate] = useState(() => isoFromOffset(0));

  useEffect(() => {
    if (!isOpen) return;
    setActionType('associate');
    setSelectedDate(initialDate || isoFromOffset(0));
  }, [initialDate, isOpen]);

  // Alertes live : recalculées à chaque changement de date choisie.
  const dateWarnings = useMemo(
    () => (actionType === 'associate' && getDateWarnings && selectedDate ? getDateWarnings(selectedDate) : []),
    [actionType, getDateWarnings, selectedDate]
  );

  const getItemBadge = (item: any) => {
    if (!item) return null;
    const type = item.type || '';
    if (!type) return null;

    if (TOP_LEVEL_TYPE_CONFIG.hasOwnProperty(type)) {
      const config = TOP_LEVEL_TYPE_CONFIG[type];
      return {
        text: config.name.slice(0, 10) + (config.name.length > 10 ? '.' : ''),
        color: config.badgeColor || 'bg-secondary text-secondary-foreground border-border',
        icon: config.icon
      };
    }

    const normalizedType = TYPE_MAP[type.toLowerCase()] || type;
    const text = BADGE_TEXT_MAP[normalizedType] || normalizedType;
    const color = BADGE_COLOR_MAP[normalizedType] || 'bg-secondary text-secondary-foreground border-border';

    return { text, color, icon: null };
  };

  const handleApply = () => {
    if (actionType === 'associate') {
      onApply(selectedDate);
    } else {
      onApply(''); // Empty string dissociates the date
    }
  };

  const maxItemsToShow = 3;
  const remainingItemsCount = Math.max(0, selectedItems.length - maxItemsToShow);
  const visibleItems = useMemo(() => {
    return selectedItems.slice(0, maxItemsToShow);
  }, [selectedItems]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Planification & Affectation"
      description={`${selectedCount} élément${selectedCount > 1 ? 's' : ''} sélectionné${selectedCount > 1 ? 's' : ''}`}
      maxWidth="md"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button type="button" variant="secondary" onClick={onClose} className="px-3 text-xs font-semibold">
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            className={`cursor-pointer px-3.5 text-xs font-bold shadow-sm transition-all duration-150 ${
              actionType === 'associate'
                ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
          >
            {actionType === 'associate' ? (
              <span>Appliquer la date</span>
            ) : (
              <span>Dissocier les dates</span>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Sleek toggle selector */}
        <div className="grid grid-cols-2 p-1 bg-zinc-100 rounded-xl max-w-sm mx-auto">
          <button
            type="button"
            onClick={() => setActionType('associate')}
            className={`flex min-h-9 items-center justify-center gap-1.5 rounded-lg py-1 text-xs font-bold transition-all duration-150 active:scale-95 ${
              actionType === 'associate'
                ? 'bg-white text-zinc-800 shadow-xs border border-zinc-200/50'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <CalendarPlus className="h-3 w-3" /> Affecter
          </button>
          <button
            type="button"
            onClick={() => setActionType('dissociate')}
            className={`flex min-h-9 items-center justify-center gap-1.5 rounded-lg py-1 text-xs font-bold transition-all duration-150 active:scale-95 ${
              actionType === 'dissociate'
                ? 'bg-white text-red-600 shadow-xs border border-zinc-200/50'
                : 'text-zinc-500 hover:text-red-600'
            }`}
          >
            <CalendarMinus className="h-3 w-3" /> Dissocier
          </button>
        </div>

        {/* Dynamic & Centered Middle Section */}
        {actionType === 'associate' ? (
          <div className="space-y-3.5 animate-fade-in text-center max-w-sm mx-auto py-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              Saisir ou choisir la date
            </span>
            
            {/* Centered Date Input */}
            <div className="relative flex flex-col items-center gap-1.5">
              <Input
                id="assign-date-input"
                type="date"
                value={selectedDate}
                onChange={event => setSelectedDate(event.target.value)}
                className="h-10 w-48 rounded-lg border border-zinc-200 bg-white text-center text-sm font-bold shadow-xs transition-colors hover:bg-zinc-50 focus:border-zinc-300 focus:ring-0"
              />
              {/* Intelligent date readout / Capteur intelligent */}
              <span className="text-xs font-semibold text-zinc-600 capitalize">
                {formatFullDateFr(selectedDate)}
              </span>
            </div>

            {/* Garde intelligente : conflits emploi du temps / fériés / vacances / absences */}
            {dateWarnings.length > 0 && (
              <div className="mx-auto max-w-sm space-y-1 rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-left animate-fade-in" role="status">
                {dateWarnings.map((warning, i) => (
                  <p key={i} className="flex items-start gap-1.5 text-[11px] font-medium leading-snug text-amber-800">
                    <span aria-hidden className="mt-0.5 shrink-0 text-amber-600">⚠</span>
                    {warning.message}
                  </p>
                ))}
                <p className="pl-4 text-[10px] text-amber-600/95 font-medium mt-1">
                  Vous pouvez tout de même affecter cette date (séance de rattrapage, exception...).
                </p>
              </div>
            )}

            {/* Quick Presets */}
            <div className="grid grid-cols-3 gap-1.5 max-w-xs mx-auto pt-1">
              <Button
                type="button"
                className={`h-9 rounded-lg border border-zinc-200 py-1 text-[11px] font-bold shadow-xs transition-all duration-150 active:scale-95 ${
                  selectedDate === isoFromOffset(-1)
                    ? 'bg-primary text-primary-foreground border-primary font-extrabold'
                    : 'bg-white hover:bg-zinc-50 text-zinc-700'
                }`}
                onClick={() => setSelectedDate(isoFromOffset(-1))}
              >
                Hier
              </Button>
              <Button
                type="button"
                className={`h-9 rounded-lg border border-zinc-200 py-1 text-[11px] font-bold shadow-xs transition-all duration-150 active:scale-95 ${
                  selectedDate === isoFromOffset(0)
                    ? 'bg-primary text-primary-foreground border-primary font-extrabold'
                    : 'bg-white hover:bg-zinc-50 text-zinc-700'
                }`}
                onClick={() => setSelectedDate(isoFromOffset(0))}
              >
                Aujourd'hui
              </Button>
              <Button
                type="button"
                className={`h-9 rounded-lg border border-zinc-200 py-1 text-[11px] font-bold shadow-xs transition-all duration-150 active:scale-95 ${
                  selectedDate === isoFromOffset(1)
                    ? 'bg-primary text-primary-foreground border-primary font-extrabold'
                    : 'bg-white hover:bg-zinc-50 text-zinc-700'
                }`}
                onClick={() => setSelectedDate(isoFromOffset(1))}
              >
                Demain
              </Button>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-sm animate-fade-in space-y-1.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-center">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-rose-100 text-rose-600 mb-0.5">
              <CalendarX className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider">Suppression des dates</h4>
            <p className="text-[11px] text-rose-600 font-medium leading-relaxed max-w-xs mx-auto">
              Les dates de planification de vos éléments sélectionnés seront effacées. Ils deviendront non datés.
            </p>
          </div>
        )}

        {/* Compact selected items list preview with transition preview */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-1">
            <span>Aperçu du contenu</span>
            <span>Changement</span>
          </div>
          
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-1.5 space-y-1">
            {visibleItems.map((previewItem, index) => {
              const badge = getItemBadge(previewItem.item);
              const isDateable = previewItem.canDate;

              return (
                <div
                  key={`${previewItem.title}-${index}`}
                  className={`flex items-center justify-between gap-3 p-1.5 rounded-lg border border-zinc-150 bg-white shadow-xs transition-opacity duration-150 ${
                    !isDateable ? 'opacity-40' : ''
                  }`}
                >
                  {/* Left Side: Badge & Title */}
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {badge && (
                      <Badge
                        variant="outline"
                        className={`text-[8.5px] font-bold uppercase py-0 px-1 h-4 rounded flex items-center gap-0.5 flex-shrink-0 ${badge.color}`}
                      >
                        {badge.icon && <badge.icon className="mr-0.5 h-2 w-2" />}
                        {badge.text}
                      </Badge>
                    )}

                    <div className="min-w-0 flex-grow text-[11px] font-semibold text-zinc-800 truncate">
                      {hasMathSyntax(previewItem.title) ? (
                        <MathJax inline hideUntilTypeset="first">
                          {previewItem.title}
                        </MathJax>
                      ) : (
                        <span>{previewItem.title || 'Élément sans titre'}</span>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Visual state change representation */}
                  <div className="flex items-center gap-1 text-[10px] font-bold flex-shrink-0">
                      <span className="text-zinc-400 font-semibold">
                      {formatDateFr(previewItem.date)}
                    </span>

                    {isDateable && (
                      <div className="flex items-center gap-1 animate-fade-in">
                        <ChevronRight className="h-2 w-2 text-zinc-300" />
                        {actionType === 'associate' ? (
                          <span className="px-1.5 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-800 font-bold shadow-xs">
                            {formatDateFr(selectedDate)}
                          </span>
                        ) : previewItem.date ? (
                          <span className="px-1.5 py-0.5 rounded-md bg-red-50 border border-red-100 text-red-600 font-bold shadow-xs line-through">
                            {formatDateFr(previewItem.date)}
                          </span>
                        ) : (
                          <span className="text-zinc-400 font-medium italic">Sans changement</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {remainingItemsCount > 0 && (
              <div className="text-center py-1 text-[10px] font-bold text-zinc-400 italic">
                + {remainingItemsCount} autre{remainingItemsCount > 1 ? 's' : ''} élément{remainingItemsCount > 1 ? 's' : ''} sélectionné{remainingItemsCount > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
