import React, { FC } from 'react';
import { Button } from '@/components/ui/button';
import {
  ArrowUp, ArrowDown, Plus, CalendarDays, CalendarCheck, CalendarX,
  FileText, Pencil, Trash2, X,
} from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';

/*
 * Barre d'actions contextuelle, réinventée pour être CIBLÉE :
 * L'en-tête montre ce qui est sélectionné (type + titre), pas juste un compte ;
 * « Dater aujourd'hui » en un tap (l'action la plus fréquente du professeur en classe) ;
 * Actions groupées par intention : déplacer · contenu · dates · danger ;
 * Cibles 48px sur téléphone, icônes plus grandes et défilement horizontal si étroit.
 */

interface SelectionBarProps {
  count: number;
  hasDate: boolean;
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
  label?: string;
  danger?: boolean;
  accent?: boolean;
  disabled?: boolean;
}> = ({ icon: Icon, onClick, title, label, danger = false, accent = false, disabled = false }) => (
  <Button
    variant="ghost"
    size="sm"
    onClick={onClick}
    title={title}
    disabled={disabled}
    className={`group relative flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-lg px-2.5 transition-all duration-150 cursor-pointer disabled:pointer-events-none disabled:opacity-25 active:scale-95 ${
      danger
        ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400'
        : accent
          ? 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90'
          : 'text-foreground/80 hover:bg-muted hover:text-foreground'
    }`}
    aria-label={title}
  >
    <Icon className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-105" />
    {label && <span className="text-xs font-semibold whitespace-nowrap">{label}</span>}
    <span className="pointer-events-none absolute -top-9 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-900 border border-zinc-800 px-2 py-1 text-[10px] font-semibold text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 sm:block font-sans z-[70]">
      {title}
    </span>
  </Button>
);

const Divider: FC = () => <span aria-hidden className="mx-0.5 h-5 w-px shrink-0 bg-border/60" />;

export const SelectionBar: FC<SelectionBarProps> = ({
  count,
  hasDate,
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
  const { t, locale } = useLocale();
  if (count === 0) return null;
  const formattedCount = new Intl.NumberFormat(locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-MA').format(count);

  const showMove = (canMoveUp || canMoveDown) && onMoveUp && onMoveDown;

  /*
   * Groupes d'actions par intention. Chaque groupe n'est rendu que s'il a au
   * moins un bouton, et les séparateurs sont insérés UNIQUEMENT entre deux
   * groupes présents, plus de trait orphelin (ex. sélection multiple non
   * datable = seulement « Supprimer », sans divider avant).
   */
  const groups: React.ReactNode[] = [];

  if (showMove) {
    groups.push(
      <React.Fragment key="move">
        <ActionButton icon={ArrowUp} onClick={onMoveUp!} title={t('selection.moveUp')} disabled={!canMoveUp} />
        <ActionButton icon={ArrowDown} onClick={onMoveDown!} title={t('selection.moveDown')} disabled={!canMoveDown} />
      </React.Fragment>
    );
  }

  const contentActions: React.ReactNode[] = [];
  if (canAdd) contentActions.push(<ActionButton key="add" icon={Plus} onClick={onAdd} title={t('selection.addAfter')} />);
  if (canEdit && onEdit) contentActions.push(<ActionButton key="edit" icon={Pencil} onClick={onEdit} title={t('selection.edit')} />);
  if (canDescription) contentActions.push(<ActionButton key="desc" icon={FileText} onClick={onDescription} title={descriptionLabel} />);
  if (contentActions.length > 0) groups.push(<React.Fragment key="content">{contentActions}</React.Fragment>);

  const dateActions: React.ReactNode[] = [];
  if (canAssignDate && onAssignToday) dateActions.push(<ActionButton key="today" icon={CalendarCheck} onClick={onAssignToday} title={t('selection.dateToday')} label={t('selection.today')} accent />);
  if (canAssignDate) dateActions.push(<ActionButton key="pick" icon={CalendarDays} onClick={onAssignDate} title={t('selection.chooseDate')} />);
  if (hasDate) dateActions.push(<ActionButton key="clear" icon={CalendarX} onClick={onClearDate} title={t('selection.unassignDate')} />);
  if (dateActions.length > 0) groups.push(<React.Fragment key="dates">{dateActions}</React.Fragment>);

  groups.push(
    <React.Fragment key="danger">
      <ActionButton icon={Trash2} onClick={onDelete} title={t('selection.delete')} danger />
    </React.Fragment>
  );

  return (
    <div
      className="fixed bottom-4 left-1/2 z-[60] flex items-center gap-1.5 max-w-[calc(100vw-1.25rem)] -translate-x-1/2 rounded-full border border-border/80 bg-card/95 p-1.5 text-card-foreground shadow-2xl backdrop-blur-md sm:bottom-6 print:hidden"
      style={{ animation: 'slide-in-up 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}
      onClick={event => event.stopPropagation()}
      role="toolbar"
      aria-label={t('selection.actionsAria')}
    >
      {/* Badge indicateur de nombre (ex: 4 ou x4) */}
      <div
        className="flex shrink-0 h-8 min-w-8 items-center justify-center rounded-full bg-primary/15 text-primary px-2.5 text-xs font-black font-mono tracking-tight"
        title={t(count === 1 ? 'selection.selectedOne' : 'selection.selectedMany', { count: formattedCount })}
      >
        {count > 1 ? `×${formattedCount}` : formattedCount}
      </div>

      <Divider />

      {/* Actions groupées par intention */}
      <div className={`flex items-center gap-1 overflow-x-auto no-scrollbar ${isPending ? 'opacity-60' : ''}`}>
        {groups.map((group, index) => (
          <React.Fragment key={index}>
            {index > 0 && <Divider />}
            {group}
          </React.Fragment>
        ))}
      </div>

      <Divider />

      {/* Bouton Fermer X */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClear}
        title={t('selection.closeShortcut')}
        className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer active:scale-95"
        aria-label={t('selection.clearAria')}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
