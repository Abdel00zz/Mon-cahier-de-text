import React, { FC } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ArrowUp, ArrowDown, Plus, CalendarDays, CalendarCheck, CalendarX,
  Pencil, Trash2, X, MoreVertical,
} from '@/components/ui/icons';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useLocale } from '@/i18n/LocaleProvider';

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
interface Action {
  id: string;
  icon: IconType;
  onClick: () => void;
  title: string;
  disabled?: boolean;
}

const ActionButton: FC<Omit<Action, 'id'> & { label?: string; accent?: boolean }> = ({
  icon: Icon, onClick, title, label, accent = false, disabled = false,
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-label={title}
    disabled={disabled}
    className={cn(
      'selection-action shrink-0 inline-flex items-center justify-center rounded-xl transition-all duration-150 active:scale-95 cursor-pointer touch-manipulation',
      label ? 'h-9 px-2.5 sm:px-3 gap-1.5 sm:gap-2' : 'h-9 w-9 p-0',
      accent
        ? 'bg-primary/10 text-primary hover:bg-primary/15 font-medium'
        : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
      disabled && 'opacity-50 pointer-events-none'
    )}
  >
    <Icon aria-hidden className="size-[18px] shrink-0" />
    {label && <span className="hidden whitespace-nowrap font-sans text-xs sm:text-sm font-semibold sm:inline">{label}</span>}
  </button>
);

/** Actions fréquentes visibles ; le reste dans un menu accessible, sans rail masqué. */
export const SelectionBar: FC<SelectionBarProps> = ({
  count, hasDate, canAdd, canAssignDate, onAdd, onAssignDate, onAssignToday,
  onClearDate, onEdit, onDelete, onClear, canEdit, canMoveUp = false,
  canMoveDown = false, onMoveUp, onMoveDown, isPending = false,
}) => {
  const { t, locale } = useLocale();
  if (count === 0) return null;
  const formattedCount = new Intl.NumberFormat(locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-MA').format(count);
  const selectedLabel = t(count === 1 ? 'selection.selectedOne' : 'selection.selectedMany', { count: formattedCount });
  const secondary: Action[] = [];
  if (canAdd) secondary.push({ id: 'add', icon: Plus, onClick: onAdd, title: t('selection.addAfter') });
  if ((canMoveUp || canMoveDown) && onMoveUp && onMoveDown) {
    secondary.push(
      { id: 'up', icon: ArrowUp, onClick: onMoveUp, title: t('selection.moveUp'), disabled: !canMoveUp },
      { id: 'down', icon: ArrowDown, onClick: onMoveDown, title: t('selection.moveDown'), disabled: !canMoveDown },
    );
  }
  if (hasDate) secondary.push({ id: 'clear-date', icon: CalendarX, onClick: onClearDate, title: t('selection.unassignDate') });

  const navigateActions = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || !(event.target instanceof HTMLButtonElement)
      || !event.currentTarget.contains(event.target)) return;
    if (event.key === 'Escape') { event.preventDefault(); onClear(); return; }
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
    const current = buttons.indexOf(event.target);
    const step = (event.key === 'ArrowRight' ? 1 : -1) * (locale === 'ar' ? -1 : 1);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
      : (current + step + buttons.length) % buttons.length;
    event.preventDefault();
    buttons[next]?.focus();
  };

  return (
    <div className="selection-bar-anchor print:hidden">
      <div className="selection-bar" role="toolbar" dir={locale === 'ar' ? 'rtl' : 'ltr'}
        aria-label={t('selection.actionsAria')} aria-busy={isPending}
        onClick={event => event.stopPropagation()} onKeyDown={navigateActions}>
        <button
          type="button"
          onClick={onClear}
          className="selection-action inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-all duration-150 active:scale-95 cursor-pointer touch-manipulation"
          title={t('selection.closeShortcut')}
          aria-label={t('selection.clearAria')}
        >
          <X aria-hidden className="size-[18px]" />
        </button>
        <span className="selection-count shrink-0 px-1 font-semibold text-sm tabular-nums text-foreground select-none" title={selectedLabel} aria-label={selectedLabel} role="status" aria-atomic="true">
          {formattedCount}
        </span>
        <span aria-hidden className="mx-0.5 h-5 w-px shrink-0 bg-border/80 select-none" />
        {canAssignDate && onAssignToday && <ActionButton icon={CalendarCheck} onClick={onAssignToday}
          title={t('selection.dateToday')} label={t('selection.today')} accent disabled={isPending} />}
        {canAssignDate && <ActionButton icon={CalendarDays} onClick={onAssignDate}
          title={t('selection.chooseDate')} disabled={isPending} />}
        {canEdit && onEdit && <ActionButton icon={Pencil} onClick={onEdit}
          title={t('selection.edit')} disabled={isPending} />}
        <DropdownMenu dir={locale === 'ar' ? 'rtl' : 'ltr'}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={isPending}
              className="selection-action inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-all duration-150 active:scale-95 cursor-pointer touch-manipulation disabled:opacity-50"
              title={t('selection.moreActions')}
              aria-label={t('selection.moreActions')}
            >
              <MoreVertical aria-hidden className="size-[18px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" sideOffset={10} collisionPadding={12}
            className="w-max max-w-[calc(100vw-1.5rem)]">
            {secondary.map(({ id, icon: Icon, onClick, title, disabled }) => (
              <DropdownMenuItem key={id} onSelect={onClick} disabled={isPending || disabled} className="min-h-11 gap-3">
                <Icon aria-hidden className="size-4" />{title}
              </DropdownMenuItem>
            ))}
            {secondary.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem onSelect={onDelete} disabled={isPending} destructive className="min-h-11 gap-3">
              <Trash2 aria-hidden className="size-4" />{t('selection.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
