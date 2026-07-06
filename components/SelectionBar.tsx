import React, { FC } from 'react';
import {
  ArrowUp, ArrowDown, Plus, CalendarDays, CalendarCheck, CalendarX,
  FileText, Pencil, Trash2, X,
} from './ui/icons';

/*
 * Barre d'actions contextuelle — réinventée pour être CIBLÉE :
 *  — l'en-tête montre CE qui est sélectionné (type + titre), pas juste un compte ;
 *  — « Dater aujourd'hui » en un tap (l'action la plus fréquente du prof en classe) ;
 *  — actions groupées par intention : déplacer · contenu · dates · danger ;
 *  — cibles 48px sur téléphone, icônes plus grandes, défilement horizontal si étroit.
 */

interface SelectionBarProps {
  count: number;
  /** description courte de la sélection (badge type + titre) pour un seul élément */
  selectionLabel?: string | null;
  hasDate: boolean;
  sharedDate?: string | null;
  canAdd: boolean;
  canAssignDate: boolean;
  canDescription: boolean;
  descriptionLabel?: string;
  onAdd: () => void;
  onAssignDate: () => void;
  onAssignToday?: () => void;
  onClearDate: () => void;
  onDescription: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  onClear: () => void;
  canEdit?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isPending?: boolean;
}

type IconType = React.ComponentType<{ className?: string }>;

const ActionButton: FC<{
  icon: IconType;
  onClick: () => void;
  title: string;
  danger?: boolean;
  accent?: boolean;
  disabled?: boolean;
}> = ({ icon: Icon, onClick, title, danger = false, accent = false, disabled = false }) => (
  <button
    onClick={onClick}
    title={title}
    disabled={disabled}
    className={`group relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all duration-150 active:scale-95 disabled:pointer-events-none disabled:opacity-25 ${
      danger
        ? 'text-rose-400 hover:bg-rose-500/20'
        : accent
          ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
          : 'text-[#E4D3AC] hover:bg-[#FFFDF7]/10 hover:text-[#FFFDF7]'
    }`}
    aria-label={title}
  >
    <Icon className="h-5 w-5" />
    <span className="pointer-events-none absolute -top-9 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-[#2B241D] border border-[#E4D3AC]/30 px-2 py-1 text-[10px] font-semibold text-[#FFFDF7] opacity-0 shadow-md transition-opacity group-hover:opacity-100 sm:block font-sans">
      {title}
    </span>
  </button>
);

const Divider: FC = () => <span aria-hidden className="mx-0.5 h-7 w-px shrink-0 bg-[#E4D3AC]/20" />;

export const SelectionBar: FC<SelectionBarProps> = ({
  count,
  selectionLabel,
  hasDate,
  sharedDate,
  canAdd,
  canAssignDate,
  canDescription,
  descriptionLabel = 'Description',
  onAdd,
  onAssignDate,
  onAssignToday,
  onClearDate,
  onDescription,
  onEdit,
  onDelete,
  onClear,
  canEdit,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
  isPending = false,
}) => {
  if (count === 0) return null;

  const showMove = (canMoveUp || canMoveDown) && onMoveUp && onMoveDown;

  return (
    <div
      className="fixed bottom-4 left-1/2 z-[60] w-max max-w-[calc(100vw-1rem)] -translate-x-1/2 rounded-3xl border border-[#E4D3AC]/50 bg-[#2B241D]/95 shadow-2xl shadow-[#1E1914]/40 backdrop-blur-md sm:bottom-6 print:hidden"
      style={{ animation: 'slide-in-up 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
      onClick={event => event.stopPropagation()}
      role="toolbar"
      aria-label="Actions sur la sélection"
    >
      {/* En-tête contextuel : QUOI est sélectionné */}
      <div className="flex items-center justify-between gap-2 border-b border-[#E4D3AC]/20 px-4 pb-1.5 pt-2">
        <div className="min-w-0 flex items-baseline gap-2">
          {count === 1 && selectionLabel ? (
            <span className="max-w-[16rem] truncate text-xs font-bold text-[#FFFDF7] font-display">{selectionLabel}</span>
          ) : (
            <span className="text-xs font-bold text-[#FFFDF7] font-display">{count} éléments sélectionnés</span>
          )}
          {hasDate && sharedDate && (
            <span className="shrink-0 text-[10px] font-semibold text-[#B8935A] font-mono">· {sharedDate}</span>
          )}
        </div>
        <button
          onClick={onClear}
          title="Fermer (Échap)"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#A79C87] transition-colors hover:bg-[#FFFDF7]/10 hover:text-[#FFFDF7] active:scale-95"
          aria-label="Effacer la sélection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Actions groupées par intention — défilement horizontal sur très petit écran */}
      <div className={`flex items-center gap-0.5 overflow-x-auto px-2 py-1.5 no-scrollbar ${isPending ? 'opacity-60' : ''}`}>
        {showMove && (
          <>
            <ActionButton icon={ArrowUp} onClick={onMoveUp!} title="Monter" disabled={!canMoveUp} />
            <ActionButton icon={ArrowDown} onClick={onMoveDown!} title="Descendre" disabled={!canMoveDown} />
            <Divider />
          </>
        )}

        {canAdd && <ActionButton icon={Plus} onClick={onAdd} title="Ajouter après" />}
        {canEdit && onEdit && <ActionButton icon={Pencil} onClick={onEdit} title="Modifier" />}
        {canDescription && <ActionButton icon={FileText} onClick={onDescription} title={descriptionLabel} />}

        {(canAssignDate || hasDate) && <Divider />}

        {/* L'action la plus fréquente en classe : dater à AUJOURD'HUI, un seul tap */}
        {canAssignDate && onAssignToday && (
          <ActionButton icon={CalendarCheck} onClick={onAssignToday} title="Dater aujourd'hui" accent />
        )}
        {canAssignDate && <ActionButton icon={CalendarDays} onClick={onAssignDate} title="Choisir une date…" />}
        {hasDate && <ActionButton icon={CalendarX} onClick={onClearDate} title="Dissocier la date" />}

        <Divider />
        <ActionButton icon={Trash2} onClick={onDelete} title="Supprimer" danger />
      </div>
    </div>
  );
};
