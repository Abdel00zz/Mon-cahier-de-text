import React, { FC } from 'react';
import { Button } from './ui/button';
import { MathText } from './ui/math-text';
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
  <Button
    variant="ghost"
    size="icon"
    onClick={onClick}
    title={title}
    disabled={disabled}
    className={`group relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all duration-150 cursor-pointer disabled:pointer-events-none disabled:opacity-30 ${
      danger
        ? 'text-[color-mix(in_srgb,hsl(var(--destructive))_60%,white)] hover:bg-destructive hover:text-destructive-foreground'
        : accent
          ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground'
          : 'text-card/75 hover:bg-card/15 hover:text-card'
    }`}
    aria-label={title}
  >
    <Icon className="h-5 w-5" />
    <span className="pointer-events-none absolute -top-9 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground border border-border/30 px-2 py-1 text-[10px] font-semibold text-card opacity-0 shadow-md transition-opacity group-hover:opacity-100 sm:block font-sans">
      {title}
    </span>
  </Button>
);

const Divider: FC = () => <span aria-hidden className="mx-0.5 h-7 w-px shrink-0 bg-border/20" />;

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

  /*
   * Groupes d'actions par intention. Chaque groupe n'est rendu que s'il a au
   * moins un bouton, et les séparateurs sont insérés UNIQUEMENT entre deux
   * groupes présents — plus de trait orphelin (ex. sélection multiple non
   * datable = seulement « Supprimer », sans divider avant).
   */
  const groups: React.ReactNode[] = [];

  if (showMove) {
    groups.push(
      <React.Fragment key="move">
        <ActionButton icon={ArrowUp} onClick={onMoveUp!} title="Monter" disabled={!canMoveUp} />
        <ActionButton icon={ArrowDown} onClick={onMoveDown!} title="Descendre" disabled={!canMoveDown} />
      </React.Fragment>
    );
  }

  const contentActions: React.ReactNode[] = [];
  if (canAdd) contentActions.push(<ActionButton key="add" icon={Plus} onClick={onAdd} title="Ajouter après" />);
  if (canEdit && onEdit) contentActions.push(<ActionButton key="edit" icon={Pencil} onClick={onEdit} title="Modifier" />);
  if (canDescription) contentActions.push(<ActionButton key="desc" icon={FileText} onClick={onDescription} title={descriptionLabel} />);
  if (contentActions.length > 0) groups.push(<React.Fragment key="content">{contentActions}</React.Fragment>);

  const dateActions: React.ReactNode[] = [];
  if (canAssignDate && onAssignToday) dateActions.push(<ActionButton key="today" icon={CalendarCheck} onClick={onAssignToday} title="Dater aujourd'hui" accent />);
  if (canAssignDate) dateActions.push(<ActionButton key="pick" icon={CalendarDays} onClick={onAssignDate} title="Choisir une date…" />);
  if (hasDate) dateActions.push(<ActionButton key="clear" icon={CalendarX} onClick={onClearDate} title="Dissocier la date" />);
  if (dateActions.length > 0) groups.push(<React.Fragment key="dates">{dateActions}</React.Fragment>);

  groups.push(
    <React.Fragment key="danger">
      <ActionButton icon={Trash2} onClick={onDelete} title="Supprimer" danger />
    </React.Fragment>
  );

  return (
    <div
      className="fixed bottom-4 left-1/2 z-[60] w-max max-w-[calc(100vw-1rem)] -translate-x-1/2 rounded-3xl border border-border/50 bg-foreground/95 shadow-2xl shadow-foreground/40 backdrop-blur-md sm:bottom-6 print:hidden"
      style={{ animation: 'slide-in-up 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
      onClick={event => event.stopPropagation()}
      role="toolbar"
      aria-label="Actions sur la sélection"
    >
      {/* En-tête contextuel : QUOI est sélectionné */}
      <div className="flex items-center justify-between gap-2 border-b border-border/20 px-4 pb-1.5 pt-2">
        <div className="min-w-0 flex items-baseline gap-2">
          {count === 1 && selectionLabel ? (
            /* barre resserrée : le titre est tronqué (…) et borné pour ne pas
               étirer la barre — l'info complète reste dans le tableau/l'édition */
            <span className="max-w-[9rem] sm:max-w-[11rem] truncate text-xs font-bold text-card font-display">
              <MathText source={selectionLabel} cacheKey={selectionLabel} inline>{selectionLabel}</MathText>
            </span>
          ) : (
            <span className="text-xs font-bold text-card font-display">{count} éléments sélectionnés</span>
          )}
          {hasDate && sharedDate && (
            <span className="shrink-0 text-[10px] font-semibold text-primary font-mono">· {sharedDate}</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClear}
          title="Fermer (Échap)"
          className="h-7 w-7 shrink-0 rounded-full text-muted-foreground/60 hover:bg-card/10 hover:text-white cursor-pointer"
          aria-label="Effacer la sélection"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Actions groupées par intention — dividers seulement entre groupes
          présents ; défilement horizontal sur très petit écran */}
      <div className={`flex items-center gap-0.5 overflow-x-auto px-2 py-1.5 no-scrollbar ${isPending ? 'opacity-60' : ''}`}>
        {groups.map((group, index) => (
          <React.Fragment key={index}>
            {index > 0 && <Divider />}
            {group}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
