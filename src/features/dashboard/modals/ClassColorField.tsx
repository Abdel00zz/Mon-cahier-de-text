import React from 'react';
import type { AppLocale } from '@/types';
import { useModalHaptics } from '@/hooks/useModalHaptics';

interface ClassColorOption {
  value: string;
  background: string;
  ink: string;
  label: Record<AppLocale, string>;
}

interface ClassColorFieldProps {
  value: string;
  options: ReadonlyArray<ClassColorOption>;
  locale: AppLocale;
  onChange: (value: string) => void;
}

/** Dernière section de la fiche : la couleur de la classe, son nom et ses pastilles. */
export const ClassColorField: React.FC<ClassColorFieldProps> = ({ value, options, locale, onChange }) => {
  const haptics = useModalHaptics();
  const label = locale === 'ar' ? 'اللون' : locale === 'en' ? 'Colour' : 'Couleur';
  const selected = options.find(option => option.value === value);

  return (
    <section className="class-color-field" aria-labelledby="class-color-label">
      <div className="class-color-field__head">
        <span id="class-color-label" className="class-color-field__label">{label}</span>
        <span className="class-color-field__value">{selected?.label[locale]}</span>
      </div>
      <div className="claude-swatches" role="group" aria-label={label}>
        {options.map(option => (
          <button
            key={option.value}
            type="button"
            title={option.label[locale]}
            aria-label={option.label[locale]}
            aria-pressed={value === option.value}
            data-selected={value === option.value ? 'true' : 'false'}
            onClick={() => { haptics.onSelect(); onChange(option.value); }}
            style={{ backgroundColor: option.background, color: option.background }}
            className="claude-swatch"
          />
        ))}
      </div>
    </section>
  );
};
