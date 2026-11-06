import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Shared settings hierarchy: section heading, label, supporting text and control.
 * Text wraps naturally without shrinking the touch targets.
 */

export const SettingsPanel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-4 sm:space-y-5 lg:space-y-6">
    {/* The active tab or modal header already names this panel visually. */}
    <h2 className="sr-only">{title}</h2>
    {children}
  </div>
);

interface SettingsSectionProps {
  title?: string;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  separators?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  hint,
  icon: Icon,
  action,
  children,
  separators = false,
  className,
}) => (
  <section className={cn(
    "settings-section rounded-2xl border border-border/60 bg-card p-4 sm:p-5 md:p-6 space-y-3.5 sm:space-y-4",
    className
  )}>
    {(title || action) && (
      <header className="settings-section__header flex flex-wrap items-start justify-between gap-x-3 gap-y-2 pb-0.5">
        <div className="min-w-0 grow">
          <div className="flex items-start gap-2.5">
            {Icon && <Icon className="h-5 w-5 text-primary shrink-0 stroke-[1.75]" />}
            {title && <h3 className="min-w-0 break-words text-[15px] sm:text-base font-semibold leading-snug text-foreground tracking-tight">{title}</h3>}
          </div>
          {hint && <p className="mt-1 text-xs sm:text-[13px] leading-relaxed text-muted-foreground">{hint}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
    )}
    <div className={cn('settings-section__body', separators ? 'divide-y divide-border/45' : 'space-y-3.5 sm:space-y-4')}>
      {children}
    </div>
  </section>
);

interface SettingsRowProps {
  label: React.ReactNode;
  hint?: React.ReactNode;
  htmlFor?: string;
  /** Contrôle large (champ, puces) : affiché sous le libellé au lieu de la droite. */
  stacked?: boolean;
  colon?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({
  label,
  hint,
  htmlFor,
  stacked = false,
  colon = true,
  children,
  className,
}) => {
  const Label = htmlFor ? 'label' : 'div';

  // Format label with colon if it's a string and does not end with one
  let formattedLabel = label;
  if (colon && typeof label === 'string') {
    const trimmed = label.trim();
    if (trimmed && !trimmed.endsWith(':') && !trimmed.endsWith('：')) {
      formattedLabel = `${trimmed} :`;
    }
  }

  const text = (
    <div className="min-w-0 flex-1">
      <Label {...(htmlFor ? { htmlFor } : {})} className="block break-words text-sm font-medium leading-normal text-foreground">
        {formattedLabel}
      </Label>
      {hint && <p className="mt-0.5 text-xs sm:text-[13px] leading-snug text-muted-foreground">{hint}</p>}
    </div>
  );
  if (stacked) {
    return (
      <div className={cn('space-y-2 py-0.5', className)}>
        {text}
        {children}
      </div>
    );
  }
  return (
    <div className={cn('settings-row flex min-h-[3rem] items-center justify-between gap-4 py-1.5 sm:py-2', className)}>
      {text}
      {children && <div className="settings-row__control flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
};

/** Champ texte ou liste déroulante : même hauteur, mêmes rayons partout. */
export const settingsFieldClass =
  'settings-field min-h-11 w-full min-w-0 rounded-xl border border-border bg-background/90 px-3.5 py-2 text-sm leading-normal text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/60 transition-colors disabled:cursor-not-allowed disabled:opacity-50';

/** Puce ou bouton de choix (matière, cycle, thème, langue). */
export const settingsChoiceClass = (active: boolean): string => cn(
  'settings-choice inline-flex min-h-11 max-w-full cursor-pointer items-center justify-center gap-2 whitespace-normal rounded-xl border px-3.5 py-2 text-center text-sm leading-snug font-medium transition-[color,background-color,border-color,transform] duration-200 motion-reduce:transition-none motion-reduce:transform-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
  active
    ? 'border-foreground/30 bg-foreground/5 text-foreground font-semibold'
    : 'border-border/80 bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground',
);

/** Bouton discret des lignes de réglage (action secondaire, fond neutre). */
export const settingsButtonClass =
  'settings-action inline-flex min-h-11 max-w-full cursor-pointer items-center justify-center gap-2 whitespace-normal rounded-xl border border-border/80 bg-background px-3.5 py-2 text-center text-sm leading-snug font-medium text-foreground transition-[color,background-color,border-color,transform] duration-200 motion-reduce:transition-none motion-reduce:transform-none active:scale-[0.98] hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50';
