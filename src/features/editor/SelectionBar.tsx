import React, { FC, memo, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  ArrowUp, ArrowDown, Plus, CalendarDays, CalendarCheck, CalendarX,
  Pencil, Trash2, MoreVertical,
} from '@/components/ui/icons';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useLocale } from '@/i18n/LocaleProvider';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

export interface SelectionBarProps {
  /** Sert à la logique et à l'annonce vocale ; jamais affiché. */
  count: number;
  hasDate: boolean;
  /** Toutes les lignes choisies portent déjà la date du jour : « Aujourd'hui » n'a plus de sens. */
  allToday?: boolean;
  canAdd: boolean;
  canAssignDate: boolean;
  onAdd: () => void;
  onAssignDate: () => void;
  onAssignToday?: () => void;
  onClearDate: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  /** Désélection : Échap, balayage vers le bas, clic hors de la liste (géré par l'éditeur). */
  onClear: () => void;
  canEdit?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isPending?: boolean;
}

type IconType = React.ComponentType<{ className?: string }>;

interface ActionButtonProps {
  icon: IconType;
  onClick: () => void;
  title: string;
  label?: string;
  accent?: boolean;
  disabled?: boolean;
  className?: string;
}

const ActionButton: FC<ActionButtonProps> = ({ icon: Icon, onClick, title, label, accent = false, disabled = false, className }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-label={title}
    disabled={disabled}
    className={cn(
      'selection-action shrink-0 inline-flex items-center justify-center rounded-xl cursor-pointer touch-manipulation',
      label ? 'h-11 gap-1.5 px-3 sm:gap-2' : 'h-11 w-11 p-0',
      accent
        ? 'bg-primary/15 font-semibold text-primary hover:bg-primary/25'
        : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
      'disabled:pointer-events-none disabled:opacity-50',
      className,
    )}
  >
    <Icon aria-hidden className="size-[22px] shrink-0" />
    {label && <span className="whitespace-nowrap font-sans text-sm font-semibold">{label}</span>}
  </button>
);

const EXIT_MS = 180;
const DISMISS_DISTANCE = 44;

/**
 * Contenu de la barre. Pendant un calcul de sélection (isPending), toute action est
 * verrouillée : aucune mutation ne doit partir d'une sélection pas encore à jour.
 * Les actions suivent la situation :
 * - « Aujourd'hui » disparaît quand tout porte déjà la date du jour ;
 * - « Modifier » n'existe que pour un contenu unique ;
 * - le déplacement n'apparaît que s'il est possible ;
 * - « Dissocier la date » n'est proposé que s'il y a une date.
 */
const SelectionBarView: FC<SelectionBarProps & { state: 'open' | 'closed' }> = ({
  count, hasDate, allToday = false, canAdd, canAssignDate, onAdd, onAssignDate, onAssignToday,
  onClearDate, onEdit, onDelete, onClear, canEdit, canMoveUp = false, canMoveDown = false,
  onMoveUp, onMoveDown, isPending = false, state,
}) => {
  const { t, locale } = useLocale();
  const { impact, selection } = useHapticFeedback();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const rootRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ x: number; y: number; id: number; dragging: boolean } | null>(null);
  const swallowClick = useRef(false);

  const run = (action: () => void, strong = false) => () => {
    if (strong) impact('medium'); else selection();
    action();
  };

  const showToday = canAssignDate && Boolean(onAssignToday) && !allToday;
  const showEdit = Boolean(canEdit && onEdit);

  const menu = useMemo(() => {
    const items: { id: string; icon: IconType; onSelect: () => void; title: string }[] = [];
    if (onMoveUp && canMoveUp) items.push({ id: 'move-up', icon: ArrowUp, onSelect: onMoveUp, title: t('selection.moveUp') });
    if (onMoveDown && canMoveDown) items.push({ id: 'move-down', icon: ArrowDown, onSelect: onMoveDown, title: t('selection.moveDown') });
    if (canAdd) items.push({ id: 'add', icon: Plus, onSelect: onAdd, title: t('selection.addAfter') });
    if (hasDate) items.push({ id: 'clear-date', icon: CalendarX, onSelect: onClearDate, title: t('selection.unassignDate') });
    return items;
  }, [onMoveUp, canMoveUp, onMoveDown, canMoveDown, canAdd, onAdd, hasDate, onClearDate, t]);

  /** Flèches, Début/Fin pour parcourir les actions ; Échap désélectionne. */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || !(event.target instanceof HTMLButtonElement)) return;
    if (event.key === 'Escape') { event.preventDefault(); onClear(); return; }
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
      .filter(button => button.offsetParent !== null);
    const current = buttons.indexOf(event.target);
    if (current < 0) return;
    const step = (event.key === 'ArrowRight' ? 1 : -1) * (dir === 'rtl' ? -1 : 1);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
      : (current + step + buttons.length) % buttons.length;
    event.preventDefault();
    buttons[next]?.focus();
  };

  /* Balayage vers le bas sur écran tactile : ferme la sélection sans bouton.
     Le déplacement écrit directement dans le style (aucun rendu React). */
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' || isPending) return;
    gesture.current = { x: event.clientX, y: event.clientY, id: event.pointerId, dragging: false };
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    const node = rootRef.current;
    if (!g || !node || g.id !== event.pointerId) return;
    const dy = event.clientY - g.y;
    const dx = event.clientX - g.x;
    if (!g.dragging) {
      if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return;
      if (dy <= 0 || Math.abs(dx) > Math.abs(dy)) { gesture.current = null; return; }
      g.dragging = true;
      node.setPointerCapture(event.pointerId);
      node.style.transition = 'none';
    }
    node.style.transform = `translate3d(0, ${Math.max(0, dy)}px, 0)`;
    node.style.opacity = String(1 - Math.min(dy / 140, 0.6));
  };
  const endGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    const node = rootRef.current;
    gesture.current = null;
    if (!g || !node || !g.dragging) return;
    const dismissed = event.clientY - g.y > DISMISS_DISTANCE && event.type === 'pointerup';
    swallowClick.current = true;
    window.setTimeout(() => { swallowClick.current = false; }, 0);
    node.style.transition = 'transform 180ms cubic-bezier(0.2, 0, 0, 1), opacity 180ms ease';
    node.style.transform = '';
    node.style.opacity = '';
    if (dismissed) { impact('light'); onClear(); }
  };

  return (
    <div className="selection-bar-anchor print:hidden">
      <div
        ref={rootRef}
        className="selection-bar"
        data-state={state}
        role="toolbar"
        dir={dir}
        aria-label={t('selection.actionsAria')}
        aria-busy={isPending}
        onClick={event => event.stopPropagation()}
        onClickCapture={event => { if (swallowClick.current) { event.preventDefault(); event.stopPropagation(); } }}
        onKeyDown={handleKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
      >
        <span className="sr-only" role="status" aria-live="polite">{t('selection.announce', { count })}</span>

        {showToday && <ActionButton icon={CalendarCheck} onClick={run(onAssignToday!, true)}
          title={t('selection.dateToday')} label={t('selection.today')} accent disabled={isPending} />}
        {canAssignDate && <ActionButton icon={CalendarDays} onClick={run(onAssignDate)}
          title={t('selection.chooseDate')} disabled={isPending} />}
        {showEdit && <ActionButton icon={Pencil} onClick={run(onEdit!)}
          title={t('selection.edit')} disabled={isPending} className="hidden sm:inline-flex" />}

        <DropdownMenu dir={dir}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={isPending}
              className="selection-action inline-flex h-11 w-11 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/70 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
              title={t('selection.moreActions')}
              aria-label={t('selection.moreActions')}
            >
              <MoreVertical aria-hidden className="size-[22px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" sideOffset={10} collisionPadding={12}
            className="w-max max-w-[calc(100vw-1.5rem)]">
            {showEdit && <DropdownMenuItem onSelect={onEdit} disabled={isPending} className="min-h-11 gap-3 sm:hidden">
              <Pencil aria-hidden className="size-4" />{t('selection.edit')}
            </DropdownMenuItem>}
            {menu.map(({ id, icon: Icon, onSelect, title }) => (
              <DropdownMenuItem key={id} onSelect={onSelect} disabled={isPending} className="min-h-11 gap-3">
                <Icon aria-hidden className="size-4" />{title}
              </DropdownMenuItem>
            ))}
            {(menu.length > 0 || showEdit) && <DropdownMenuSeparator />}
            <DropdownMenuItem onSelect={onDelete} disabled={isPending} destructive className="min-h-11 gap-3">
              <Trash2 aria-hidden className="size-4" />{t('selection.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

/**
 * Barre d'actions de la sélection. Elle reste montée le temps de l'animation de sortie
 * avec les dernières valeurs connues (le contenu ne se vide pas pendant qu'elle s'efface).
 * Mémoïsée : elle ne se redessine que si une valeur affichée ou une action change.
 */
export const SelectionBar = memo<SelectionBarProps>(function SelectionBar(props) {
  const active = props.count > 0;
  const [mounted, setMounted] = useState(active);
  const last = useRef(props);
  if (active) last.current = props;

  useEffect(() => {
    if (active) { setMounted(true); return; }
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => setMounted(false), reduce ? 0 : EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [active]);

  if (!active && !mounted) return null;
  return <SelectionBarView {...(active ? props : last.current)} state={active ? 'open' : 'closed'} />;
});
