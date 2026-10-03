import React from 'react';
import { cn } from '@/lib/utils';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { Loader2 } from '@/components/ui/icons';

type SquareActionButtonVariant = 'amber' | 'blue' | 'emerald' | 'purple' | 'primary' | 'rose' | 'card' | 'outline';
export interface SquareActionButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  icon: React.ComponentType<{ className?: string }> | React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  badgeVariant?: Exclude<SquareActionButtonVariant, 'card' | 'outline'> | 'muted';
  variant?: SquareActionButtonVariant;
  isLoading?: boolean;
  loadingText?: string;
  ariaLabel?: string;
  aspectRatio?: 'square' | 'auto';
  iconClassName?: string;
}

/** Quiet action tiles. Labels stay visible; color is confined to the icon and badge. */
export const SquareActionButton: React.FC<SquareActionButtonProps> = ({
  icon, title, subtitle, badge, badgeVariant, variant = 'card', isLoading = false,
  loadingText, ariaLabel, aspectRatio = 'square', className, iconClassName,
  onClick, disabled, ...props
}) => {
  const { impact } = useHapticFeedback();
  // Lucide uses forwardRef objects as well as function components.
  const Icon = icon as React.ComponentType<{ className?: string }>;
  const renderedIcon = React.isValidElement(icon) ? icon
    : (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && '$$typeof' in icon))
      ? <Icon className={cn('h-6 w-6 stroke-[1.8]', iconClassName)} /> : icon;
  return <button
    {...props}
    type={props.type ?? 'button'}
    disabled={disabled || isLoading}
    aria-busy={isLoading}
    aria-label={ariaLabel ?? (typeof title === 'string' ? title : undefined)}
    data-tone={variant}
    data-aspect={aspectRatio}
    className={cn('action-tile', className)}
    onClick={event => {
      if (disabled || isLoading) return;
      impact('light');
      onClick?.(event);
    }}
  >
    <span className="action-tile-top">
      <span aria-hidden="true" className="action-tile-icon">
        {isLoading ? <Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none" /> : renderedIcon}
      </span>
      {badge && <span className="action-tile-badge" data-tone={badgeVariant ?? variant}>{badge}</span>}
    </span>
    <span className="action-tile-copy">
      <span className="action-tile-title">{isLoading && loadingText ? loadingText : title}</span>
      {subtitle && <span className="action-tile-subtitle">{subtitle}</span>}
    </span>
  </button>;
};
