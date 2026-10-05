import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Briques communes des panneaux de réglages, dans l'esprit des réglages de Claude :
 * un titre de panneau, des sections à filet fin, des lignes « libellé à gauche,
 * contrôle à droite ». Pas de cartes encadrées : le filet suffit à séparer.
 * Tailles communes : titre 20 px, section 14 px, libellé 14 px, aide 13 px.
 */

export const SettingsPanel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-7">
    <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
    {children}
  </div>
);

interface SettingsSectionProps {
  title?: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({ title, hint, action, children }) => (
  <section className="space-y-1">
    {(title || action) && (
      <header className="flex items-end justify-between gap-3 pb-1.5">
        <div className="min-w-0">
          {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
          {hint && <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{hint}</p>}
        </div>
        {action}
      </header>
    )}
    <div className="divide-y divide-border/60 border-y border-border/60">{children}</div>
  </section>
);

interface SettingsRowProps {
  label: React.ReactNode;
  hint?: React.ReactNode;
  htmlFor?: string;
  /** Contrôle large (champ, puces) : affiché sous le libellé au lieu de la droite. */
  stacked?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({ label, hint, htmlFor, stacked = false, children, className }) => {
  const Label = htmlFor ? 'label' : 'div';
  const text = (
    <div className="min-w-0 flex-1">
      <Label {...(htmlFor ? { htmlFor } : {})} className="block text-sm font-medium text-foreground">{label}</Label>
      {hint && <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{hint}</p>}
    </div>
  );
  if (stacked) {
    return (
      <div className={cn('space-y-2.5 py-3.5', className)}>
        {text}
        {children}
      </div>
    );
  }
  return (
    <div className={cn('flex min-h-[3.5rem] items-center justify-between gap-4 py-3', className)}>
      {text}
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
};

/** Champ texte ou liste déroulante : même hauteur, mêmes rayons partout. */
export const settingsFieldClass =
  'h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50';

/** Puce ou bouton de choix (matière, cycle, thème, langue). */
export const settingsChoiceClass = (active: boolean): string => cn(
  'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
  active
    ? 'border-primary/60 bg-accent text-accent-foreground'
    : 'border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground',
);

/** Bouton discret des lignes de réglage (action secondaire, fond neutre). */
export const settingsButtonClass =
  'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-background px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50';
