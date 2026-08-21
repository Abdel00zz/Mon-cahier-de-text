import React, { FC } from 'react';
import { Button } from '@/components/ui/button';
import {
  ArrowUp, ArrowDown, Plus, CalendarDays, CalendarCheck, CalendarX,
  Pencil, Trash2, X,
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
  onAdd: () => void;
  onAssignDate: () => void;
  onAssignToday?: () => void;
  onClearDate: () => void;
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
    className={`group relative flex h-7.5 w-7.5 shrink-0 items-center justify-center gap-1 rounded-none border border-transparent p-0 transition-all duration-150 cursor-pointer disabled:pointer-events-none disabled:opacity-25 active:scale-90 sm:h-8 sm:w-auto sm:px-2 ${
      danger
        ? 'text-rose-600 hover:border-rose-200 hover:bg-rose-50 dark:text-rose-400 dark:hover:border-rose-900/60 dark:hover:bg-rose-950/40'
        : accent
          ? 'border-primary/25 bg-primary/10 text-primary shadow-xs hover:bg-primary/15'
          : 'text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground'
    }`}
    aria-label={title}
  >
    <Icon aria-hidden className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:scale-105" />
    {label && <span className="hidden whitespace-nowrap text-[11px] font-semibold sm:inline">{label}</span>}
    <span className="pointer-events-none absolute -top-9 left-1/2 z-[70] hidden -translate-x-1/2 whitespace-nowrap rounded-none border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] font-semibold text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 sm:block font-sans">
      {title}
    </span>
  </Button>
);

const Divider: FC = () => <span aria-hidden className="mx-0.5 h-4 w-px shrink-0 bg-border/80" />;

export const SelectionBar: FC<SelectionBarProps> = ({
  count,
  hasDate,
  canAdd,
  canAssignDate,
  onAdd,
  onAssignDate,
  onAssignToday,
  onClearDate,
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
   * groupes présents.
   */
  const groups: React.ReactNode[] = [];

  if (showMove) {
    groups.push(
      <div key="move" className="flex items-center gap-0.5 shrink-0">
        <ActionButton icon={ArrowUp} onClick={onMoveUp!} title={t('selection.moveUp')} disabled={!canMoveUp} />
        <ActionButton icon={ArrowDown} onClick={onMoveDown!} title={t('selection.moveDown')} disabled={!canMoveDown} />
      </div>
    );
  }

  const contentActions: React.ReactNode[] = [];
  if (canAdd) contentActions.push(<ActionButton key="add" icon={Plus} onClick={onAdd} title={t('selection.addAfter')} />);
  if (canEdit && onEdit) contentActions.push(<ActionButton key="edit" icon={Pencil} onClick={onEdit} title={t('selection.edit')} />);
  if (contentActions.length > 0) groups.push(<div key="content" className="flex items-center gap-0.5 shrink-0">{contentActions}</div>);

  const dateActions: React.ReactNode[] = [];
  if (canAssignDate && onAssignToday) dateActions.push(<ActionButton key="today" icon={CalendarCheck} onClick={onAssignToday} title={t('selection.dateToday')} label={t('selection.today')} accent />);
  if (canAssignDate) dateActions.push(<ActionButton key="pick" icon={CalendarDays} onClick={onAssignDate} title={t('selection.chooseDate')} />);
  if (hasDate) dateActions.push(<ActionButton key="clear" icon={CalendarX} onClick={onClearDate} title={t('selection.unassignDate')} />);
  if (dateActions.length > 0) groups.push(<div key="dates" className="flex items-center gap-0.5 shrink-0">{dateActions}</div>);

  groups.push(
    <div key="danger" className="flex items-center gap-0.5 shrink-0">
      <ActionButton icon={Trash2} onClick={onDelete} title={t('selection.delete')} danger />
    </div>
  );

  return (
    <div
      className="fixed inset-x-2 bottom-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] z-[60] mx-auto flex w-auto max-w-[calc(100vw-1rem)] items-center justify-between gap-1 overflow-hidden rounded-none border border-border/80 bg-card/95 p-1 text-card-foreground shadow-2xl shadow-black/20 ring-1 ring-black/5 backdrop-blur-xl sm:bottom-6 sm:left-1/2 sm:right-auto sm:inset-x-auto sm:w-fit sm:max-w-[calc(100vw-2rem)] sm:-translate-x-1/2 sm:p-1.5 sm:gap-1.5 print:hidden"
      style={{ animation: 'slide-in-up 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}
      onClick={event => event.stopPropagation()}
      role="toolbar"
      aria-label={t('selection.actionsAria')}
    >
      {/* Badge indicateur de nombre */}
      <div
        className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-none bg-primary text-primary-foreground px-1.5 text-[11px] font-extrabold tracking-tight font-mono shadow-xs"
        title={t(count === 1 ? 'selection.selectedOne' : 'selection.selectedMany', { count: formattedCount })}
      >
        {count > 1 ? `×${formattedCount}` : formattedCount}
      </div>

      <Divider />

      {/* Actions groupées par intention avec scroll horizontal fluide sans scrollbar sur mobile */}
      <div className={`flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto no-scrollbar py-0.5 px-0.5 sm:flex-nowrap ${isPending ? 'opacity-60' : ''}`}>
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
        className="h-7 w-7 shrink-0 rounded-none border border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground cursor-pointer active:scale-90"
        aria-label={t('selection.clearAria')}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};
