import React, { useState } from 'react';
import { AppConfig } from '../../types';
import { TYPE_MAP, BADGE_TEXT_MAP, BADGE_COLOR_MAP, BADGE_TOOLTIP_MAP } from '../../constants';
import { ChevronDown, ChevronUp } from '../ui/icons';

type VisibilityContext = 'screen' | 'print';
type DescriptionMode = 'all' | 'none' | 'custom';

interface DescriptionVisibilityControlProps {
  config: AppConfig;
  context: VisibilityContext;
  onChange: (patch: Partial<AppConfig>) => void;
  title?: string;
  compact?: boolean;
}

const uniqueTypes = () => Array.from(new Set(Object.values(TYPE_MAP)));
const defaultSelected = ['exemple', 'application'];

const contextKeys = (context: VisibilityContext) => ({
  modeKey: `${context}DescriptionMode` as const,
  typesKey: `${context}DescriptionTypes` as const,
});

export const DescriptionVisibilityControl: React.FC<DescriptionVisibilityControlProps> = ({
  config,
  context,
  onChange,
  title,
  compact = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const { modeKey, typesKey } = contextKeys(context);
  const mode = (config[modeKey] || 'custom') as DescriptionMode;
  const selectedTypes = (config[typesKey] || []) as string[];
  const allTypes = uniqueTypes();

  const setMode = (nextMode: DescriptionMode) => {
    const nextTypes = nextMode === 'all'
      ? allTypes
      : nextMode === 'none'
        ? []
        : (selectedTypes.length > 0 ? selectedTypes : defaultSelected);

    onChange({
      [modeKey]: nextMode,
      [typesKey]: nextTypes,
    } as Partial<AppConfig>);
    setExpanded(nextMode === 'custom');
  };

  const toggleType = (type: string) => {
    const nextTypes = selectedTypes.includes(type)
      ? selectedTypes.filter(item => item !== type)
      : [...selectedTypes, type];

    onChange({
      [typesKey]: nextTypes,
      [modeKey]: nextTypes.length === 0 ? 'none' : nextTypes.length === allTypes.length ? 'all' : 'custom',
    } as Partial<AppConfig>);
  };

  return (
    <div className={`rounded-2xl border border-border/70 bg-card ${compact ? 'p-3' : 'p-4'} space-y-3`}>
      {title && <h3 className="text-sm font-extrabold text-foreground font-display">{title}</h3>}

      <div className="grid grid-cols-3 gap-1 rounded-xl border border-border/70 bg-secondary/50 p-1">
        {(['all', 'none', 'custom'] as const).map(item => (
          <button
            key={item}
            type="button"
            onClick={() => setMode(item)}
            aria-pressed={mode === item}
            className={`min-h-9 rounded-lg px-2 text-[11px] font-bold transition-colors ${
              mode === item
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-card hover:text-foreground'
            }`}
          >
            {item === 'all' && 'Tout'}
            {item === 'none' && 'Aucune'}
            {item === 'custom' && 'Sélection'}
          </button>
        ))}
      </div>

      {mode === 'custom' && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setExpanded(value => !value)}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-left text-xs font-bold text-muted-foreground transition-colors hover:bg-secondary/40"
          >
            Types sélectionnés ({selectedTypes.length})
            {expanded ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-primary" />}
          </button>

          {expanded && (
            <div className="space-y-2 animate-in fade-in duration-200">
              <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-background p-2">
                {allTypes.map(type => {
                  const isSelected = selectedTypes.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleType(type)}
                      className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all ${
                        isSelected
                          ? `${BADGE_COLOR_MAP[type] || 'bg-muted text-foreground'} ring-1 ring-border`
                          : 'border border-border/60 bg-secondary/40 text-muted-foreground hover:bg-secondary'
                      }`}
                      title={BADGE_TOOLTIP_MAP[type] || type}
                    >
                      {BADGE_TEXT_MAP[type] || type}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between px-1 text-[10px] font-bold text-primary">
                <button type="button" onClick={() => setMode('all')} className="hover:underline">Tout sélectionner</button>
                <span className="text-border">|</span>
                <button type="button" onClick={() => setMode('none')} className="hover:underline">Tout désélectionner</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
