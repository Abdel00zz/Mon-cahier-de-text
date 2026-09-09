import React from 'react';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import type { SettingsData } from '../types';

interface AppearanceTabProps {
  appearance: SettingsData['appearance'];
  onChange: (updatedAppearance: SettingsData['appearance']) => void;
}

const THEME_MODES: { id: SettingsData['appearance']['themeMode']; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'warm', label: 'Beige Écrémé', desc: 'Warm Sand doux pour les yeux', icon: Sun },
  { id: 'dark', label: 'Sombre Épuré', desc: 'Contraste reposant pour la nuit', icon: Moon },
  { id: 'system', label: 'Système', desc: 'Suit les réglages de l’appareil', icon: Laptop },
];

const ACCENT_COLORS = [
  { id: '#C85A32', name: 'Terracotta', bg: 'bg-[#C85A32]' },
  { id: '#C25E00', name: 'Ocre Doré', bg: 'bg-[#C25E00]' },
  { id: '#2563EB', name: 'Bleu Royal', bg: 'bg-[#2563EB]' },
  { id: '#059669', name: 'Émeraude', bg: 'bg-[#059669]' },
  { id: '#7C3AED', name: 'Violet Doux', bg: 'bg-[#7C3AED]' },
  { id: '#4F46E5', name: 'Indigo', bg: 'bg-[#4F46E5]' },
];

const BORDER_RADII: { id: SettingsData['appearance']['borderRadius']; label: string; previewClass: string }[] = [
  { id: 'sharp', label: 'Droit (0px)', previewClass: 'rounded-none' },
  { id: 'standard', label: 'Standard (8px)', previewClass: 'rounded-lg' },
  { id: 'rounded', label: 'Arrondi (14px)', previewClass: 'rounded-2xl' },
];

export const AppearanceTab: React.FC<AppearanceTabProps> = ({ appearance, onChange }) => {
  return (
    <div className="space-y-4">
      {/* Mode Visuel */}
      <div>
        <label className="block text-xs font-bold text-espresso-900 dark:text-foreground mb-2">
          Mode d'affichage / وضع العرض
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {THEME_MODES.map(mode => {
            const isSelected = appearance.themeMode === mode.id;
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => onChange({ ...appearance, themeMode: mode.id })}
                className={`touch-target flex items-center gap-3 rounded-xl border p-3 text-start transition-all ${
                  isSelected
                    ? 'border-terracotta-500 bg-terracotta-500/10 dark:bg-primary/20 shadow-xs'
                    : 'border-cream-300 dark:border-border bg-cream-50 dark:bg-card hover:bg-cream-100 dark:hover:bg-muted'
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    isSelected
                      ? 'bg-terracotta-500 text-white dark:bg-primary'
                      : 'bg-cream-200 text-espresso-800 dark:bg-muted dark:text-muted-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-espresso-900 dark:text-foreground">{mode.label}</div>
                  <div className="text-[10px] text-muted-foreground line-clamp-1">{mode.desc}</div>
                </div>
                {isSelected && <Check className="h-4 w-4 text-terracotta-600 dark:text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Couleur d'accentuation (Color Swatches) */}
      <div>
        <label className="block text-xs font-bold text-espresso-900 dark:text-foreground mb-2">
          Couleur d'accentuation / لون التمييز
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {ACCENT_COLORS.map(color => {
            const isSelected = appearance.accentColor.toLowerCase() === color.id.toLowerCase();
            return (
              <button
                key={color.id}
                type="button"
                onClick={() => onChange({ ...appearance, accentColor: color.id })}
                className={`touch-target flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all ${
                  isSelected
                    ? 'border-espresso-900 dark:border-primary bg-cream-200/50 dark:bg-muted font-bold'
                    : 'border-cream-300 dark:border-border bg-cream-50 dark:bg-card hover:bg-cream-100'
                }`}
              >
                <span className={`h-6 w-6 rounded-full shadow-inner flex items-center justify-center ${color.bg}`}>
                  {isSelected && <Check className="h-3 w-3 text-white stroke-[3]" />}
                </span>
                <span className="text-[10px] text-espresso-800 dark:text-foreground">{color.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Style des coins (Border Radius) */}
      <div>
        <label className="block text-xs font-bold text-espresso-900 dark:text-foreground mb-2">
          Style des bordures / نمط الحواف
        </label>
        <div className="grid grid-cols-3 gap-2">
          {BORDER_RADII.map(radius => {
            const isSelected = appearance.borderRadius === radius.id;
            return (
              <button
                key={radius.id}
                type="button"
                onClick={() => onChange({ ...appearance, borderRadius: radius.id })}
                className={`touch-target flex flex-col items-center justify-center gap-1.5 border p-3 text-center transition-all ${radius.previewClass} ${
                  isSelected
                    ? 'border-terracotta-500 bg-terracotta-500/10 font-bold text-terracotta-700 dark:text-primary'
                    : 'border-cream-300 dark:border-border bg-cream-50 dark:bg-card text-espresso-800 dark:text-muted-foreground hover:bg-cream-100'
                }`}
              >
                <span className="text-xs">{radius.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
