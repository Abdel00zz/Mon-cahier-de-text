import React, { useEffect, useState } from 'react';
import { TYPE_MAP, BADGE_TEXT_MAP, BADGE_COLOR_MAP, BADGE_TOOLTIP_MAP } from '@/constants';
import { ChevronUp, ChevronDown } from '@/components/ui/icons';

export type DescriptionMode = 'all' | 'none' | 'custom';

interface DescriptionVisibilityControlProps {
  /** adapte les libellés : réglage à l'écran vs dans le PDF */
  context: 'screen' | 'print';
  mode: DescriptionMode;
  types: string[];
  onChange: (next: { mode: DescriptionMode; types: string[] }) => void;
}

/** types de contenu descriptibles (dédupliqués depuis TYPE_MAP) */
const getUniqueTypes = (): string[] => Array.from(new Set(Object.values(TYPE_MAP)));

/** sélection par défaut lorsqu'on bascule en mode « Sélection » sans choix préalable */
const DEFAULT_SELECTED = ['exemple', 'application'];

const LABELS = {
  screen: {
    title: "Descriptions à l'écran",
    hint: "Permet de masquer ou filtrer les descriptions de cours sur l'écran d'édition.",
  },
  print: {
    title: 'Descriptions dans le PDF',
    hint: 'Permet de masquer ou filtrer les descriptions de cours dans le fichier PDF imprimé.',
  },
} as const;

/**
 * Contrôle COMPLET de visibilité des descriptions (Afficher / Masquer / Sélection par type).
 * Composant contrôlé : le parent détient la valeur et décide de la persistance
 * (live pour l'impression, au Save pour la gestion des chapitres).
 */
export const DescriptionVisibilityControl: React.FC<DescriptionVisibilityControlProps> = ({
  context,
  mode,
  types,
  onChange,
}) => {
  const [showTypes, setShowTypes] = useState(mode === 'custom');
  const uniqueTypes = getUniqueTypes();
  const labels = LABELS[context];

  // Le mode peut changer depuis le parent (chargement des préférences,
  // synchronisation cloud ou changement de classe) : le panneau interne doit
  // rester aligné avec la valeur contrôlée.
  useEffect(() => {
    setShowTypes(mode === 'custom');
  }, [mode]);

  const handleModeChange = (next: DescriptionMode) => {
    const nextTypes =
      next === 'all' ? uniqueTypes : next === 'none' ? [] : types.length > 0 ? types : DEFAULT_SELECTED;
    setShowTypes(next === 'custom');
    onChange({ mode: next, types: nextTypes });
  };

  const handleTypeToggle = (type: string) => {
    const nextTypes = types.includes(type) ? types.filter(t => t !== type) : [...types, type];
    const nextMode: DescriptionMode =
      nextTypes.length === 0 ? 'none' : nextTypes.length === uniqueTypes.length ? 'all' : 'custom';
    onChange({ mode: nextMode, types: nextTypes });
  };

  return (
    <div className="space-y-2 rounded-xl border border-border bg-secondary/50 p-3">
      <span className="text-xs font-semibold text-foreground/80">{labels.title}</span>

      {/* Segmenté 3 états */}
      <div className="flex gap-1 rounded-lg border border-border/60 bg-card p-1">
        {(['all', 'none', 'custom'] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => handleModeChange(m)}
            aria-pressed={mode === m}
            className={`flex-1 rounded-md py-1.5 text-[11px] font-bold transition-all ${
              mode === m ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary/40'
            }`}
          >
            {m === 'all' ? 'Afficher' : m === 'none' ? 'Masquer' : 'Sélection'}
          </button>
        ))}
      </div>

      {/* Sélection par type (mode custom) */}
      {mode === 'custom' && (
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => setShowTypes(v => !v)}
            className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-left transition-colors hover:bg-secondary/40"
          >
            <span className="text-xs font-bold text-muted-foreground">Types sélectionnés ({types.length})</span>
            {showTypes ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-primary" />}
          </button>

          {showTypes && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-card p-2">
                {uniqueTypes.map(type => {
                  const isSelected = types.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleTypeToggle(type)}
                      title={BADGE_TOOLTIP_MAP[type] || type}
                      className={`rounded-lg px-2.5 py-1 text-[10px] font-bold tracking-wide transition-all ${
                        isSelected
                          ? `${BADGE_COLOR_MAP[type] || 'bg-muted text-foreground'} ring-1 ring-border`
                          : 'border border-border/60 bg-secondary/40 text-muted-foreground hover:bg-secondary'
                      }`}
                    >
                      {BADGE_TEXT_MAP[type] || type}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between px-1 text-[10px] font-bold text-primary">
                <button type="button" onClick={() => onChange({ mode: 'all', types: uniqueTypes })} className="hover:underline">
                  Tout sélectionner
                </button>
                <span>|</span>
                <button type="button" onClick={() => onChange({ mode: 'none', types: [] })} className="hover:underline">
                  Tout désélectionner
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] leading-snug text-muted-foreground/60">{labels.hint}</p>
    </div>
  );
};
