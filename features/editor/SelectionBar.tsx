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
    className={`group relative flex h-9 w-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-transparent p-0 transition-all duration-150 cursor-pointer disabled:pointer-events-none disabled:opacity-30 active:scale-95 sm:h-9 sm:w-auto sm:px-3 ${
      danger
        ? 'text-destructive hover:bg-destructive/10'
        : accent
          ? 'bg-primary/10 text-primary hover:bg-primary/20'
          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
    }`}
    aria-label={title}
  >
    <Icon aria-hidden className="h-4.5 w-4.5 stroke-[2.2] shrink-0 transition-transform duration-200 group-hover:scale-105 sm:h-4 sm:w-4" />
    {label && <span className="hidden whitespace-nowrap text-xs font-semibold sm:inline font-tajawal">{label}</span>}
    <span className="pointer-events-none absolute -top-10 start-1/2 z-[70] hidden -translate-x-1/2 whitespace-nowrap rounded-none border border-border bg-popover px-2.5 py-1 text-[11px] font-semibold text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100 sm:block font-tajawal">
      {title}
    </span>
  </Button>
);

const Divider: FC = () => <span aria-hidden className="mx-0.5 self-stretch w-[1px] shrink-0 bg-border" />;

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
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] z-[60] mx-auto flex w-auto max-w-[calc(100vw-1.5rem)] items-center justify-between gap-1 overflow-hidden rounded-2xl border border-border bg-card p-1 text-card-foreground shadow-lg ring-1 ring-black/5 sm:bottom-8 sm:inset-x-0 sm:w-fit sm:max-w-[calc(100vw-3rem)] sm:p-1.5 sm:gap-1.5 print:hidden"
      style={{ animation: 'slide-in-up 0.25s cubic-bezier(0.16, 1, 0.3, 1) backwards' }}
      onClick={event => event.stopPropagation()}
      role="toolbar"
      aria-label={t('selection.actionsAria')}
    >
      {/* Badge indicateur de nombre */}
      <div
        className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-xl bg-muted px-2.5 text-[13px] font-bold tracking-tight text-foreground font-sans"
        title={t(count === 1 ? 'selection.selectedOne' : 'selection.selectedMany', { count: formattedCount })}
      >
        {count > 1 ? `×${formattedCount}` : formattedCount}
      </div>

      <Divider />

      {/* Actions groupées par intention avec scroll horizontal fluide sans scrollbar sur mobile */}
      <div className={`flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto no-scrollbar py-0.5 sm:flex-nowrap ${isPending ? 'opacity-60' : ''}`}>
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
        className="h-9 w-9 shrink-0 rounded-none border border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer active:scale-95 sm:h-9 sm:w-9"
        aria-label={t('selection.clearAria')}
      >
        <X className="h-4.5 w-4.5 stroke-[2.2] sm:h-4 sm:w-4" />
      </Button>
    </div>
  );
};
