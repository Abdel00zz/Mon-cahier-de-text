import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Briques communes des panneaux de réglages, dans l'esprit des réglages de Claude :
 * un titre de panneau, des sections à filet fin, des lignes « libellé à gauche,
 * contrôle à droite ». Pas de cartes encadrées : le filet suffit à séparer.
 * Tailles communes : titre 20 px, section 14 px, libellé 14 px, aide 13 px.
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
    "settings-section rounded-[18px] sm:rounded-2xl border border-border/70 bg-card/95 dark:bg-card/85 p-4 sm:p-5 md:p-6 shadow-xs backdrop-blur-sm space-y-3.5 sm:space-y-4 transition-shadow",
    className
  )}>
    {(title || action) && (
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pb-0.5">
        <div className="min-w-0 grow">
          <div className="flex items-center gap-2.5">
            {Icon && <Icon className="h-5 w-5 text-primary shrink-0 stroke-[1.75]" />}
            {title && <h3 className="text-[15px] sm:text-base font-semibold text-foreground tracking-tight">{title}</h3>}
          </div>
          {hint && <p className="mt-1 text-xs sm:text-[13px] leading-relaxed text-muted-foreground">{hint}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
    )}
    <div className={separators ? "settings-section__body divide-y divide-border/45" : "space-y-3.5 sm:space-y-4"}>
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
      <Label {...(htmlFor ? { htmlFor } : {})} className="block text-sm font-medium text-foreground">
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
    <div className={cn('flex min-h-[3rem] items-center justify-between gap-4 py-1.5 sm:py-2', className)}>
      {text}
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
};

/** Champ texte ou liste déroulante : même hauteur, mêmes rayons partout. */
export const settingsFieldClass =
  'h-11 w-full min-w-0 rounded-xl border border-border bg-background/90 px-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/60 transition-colors disabled:cursor-not-allowed disabled:opacity-50';

/** Puce ou bouton de choix (matière, cycle, thème, langue). */
export const settingsChoiceClass = (active: boolean): string => cn(
  'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
  active
    ? 'border-primary/70 bg-primary/10 text-primary shadow-xs font-semibold'
    : 'border-border/80 bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground',
);

/** Bouton discret des lignes de réglage (action secondaire, fond neutre). */
export const settingsButtonClass =
  'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border/80 bg-background px-3.5 text-sm font-medium text-foreground transition-all active:scale-[0.98] hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50';
