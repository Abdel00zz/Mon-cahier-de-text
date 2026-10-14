import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from '@/components/ui/icons';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useLocale } from '@/i18n/LocaleProvider';
import './choiceSelect.css';

/*
 * LISTE DE CHOIX — le retour sur le travail d'un élève (acquis, remis, état du cahier…).
 *
 * Une seule liste déroulante à la place d'une rangée de pastilles : le champ montre le choix courant (icône,
 * mot, teinte), un appui ouvre la liste, qui s'anime en ressort et révèle ses choix l'un après l'autre.
 * Construite sur `@radix-ui/react-select` : navigation au clavier (flèches, Début/Fin, saisie d'une lettre),
 * lecteurs d'écran (rôles combobox/listbox), sens de lecture (RTL), repositionnement près des bords de l'écran.
 *
 *  - `value === null` : rien n'est encore choisi (« À vérifier »). Si `clearLabel` est fourni, un dernier choix
 *    permet de revenir à cet état — ce que des pastilles ne permettaient pas.
 *  - La teinte suit le choix (`data-tone`), jamais une couleur de marque : vert acquis, ambre en cours,
 *    bleu à accompagner, rouge non rendu.
 *  - Cibles de 44 px, `prefers-reduced-motion` respecté (aucun mouvement, la liste s'affiche d'un bloc).
 */
type IconComponent = React.ComponentType<{ size?: number | string; className?: string }>;

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  icon?: IconComponent;
  /** Teinte ; par défaut la valeur elle-même (`good`, `missing`…). */
  tone?: string;
}

interface ChoiceSelectProps<T extends string> {
  value: T | null;
  options: readonly ChoiceOption<T>[];
  onChange: (value: T | null) => void;
  /** Texte du champ quand rien n'est choisi. */
  placeholder: string;
  /** Dernier choix de la liste : revenir à « rien choisi ». Absent : la liste ne propose que `options`. */
  clearLabel?: string;
  ariaLabel: string;
  /** `field` : champ d'une ligne d'élève ; `filter` : filtre compact d'une barre d'outils. */
  variant?: 'field' | 'filter';
  className?: string;
  appearance?: 'oral';
}

/** Valeur interne du choix « rien » (Radix n'accepte pas de valeur vide pour un item). */
const NONE = '__none__';

export function ChoiceSelect<T extends string>({
  value, options, onChange, placeholder, clearLabel, ariaLabel, variant = 'field', className, appearance,
}: ChoiceSelectProps<T>) {
  const { isRtl } = useLocale();
  const { selection } = useHapticFeedback();
  const current = options.find(option => option.value === value);
  const CurrentIcon = current?.icon;
  const tone = current ? current.tone ?? current.value : 'none';

  return (
    <SelectPrimitive.Root
      dir={isRtl ? 'rtl' : 'ltr'}
      value={value ?? ''}
      onValueChange={next => {
        selection();
        onChange(next === NONE ? null : next as T);
      }}
    >
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        data-tone={tone}
        className={`choice-trigger choice-trigger--${variant}${className ? ` ${className}` : ''}`}
      >
        {/* La clé relance le petit rebond de l'icône à chaque nouveau choix. */}
        <span key={tone} className="choice-trigger__icon" aria-hidden="true">
          {CurrentIcon ? <CurrentIcon size={16} /> : <span className="choice-trigger__dot" />}
        </span>
        <span className="choice-trigger__label">
          <SelectPrimitive.Value placeholder={placeholder}>{current?.label}</SelectPrimitive.Value>
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronDown size={16} className="choice-trigger__chevron" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          collisionPadding={10}
          dir={isRtl ? 'rtl' : 'ltr'}
          className={`choice-content${appearance === 'oral' ? ' choice-content--oral' : ''}`}
        >
          <SelectPrimitive.Viewport className="choice-viewport">
            {options.map((option, index) => {
              const Icon = option.icon;
              return (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  data-tone={option.tone ?? option.value}
                  style={{ '--i': index } as React.CSSProperties}
                  className="choice-item"
                >
                  <span className="choice-item__icon" aria-hidden="true">{Icon ? <Icon size={16} /> : null}</span>
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="choice-item__check">
                    <Check size={16} />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              );
            })}
            {clearLabel && value !== null && (
              <SelectPrimitive.Item
                value={NONE}
                data-tone="none"
                style={{ '--i': options.length } as React.CSSProperties}
                className="choice-item choice-item--clear"
              >
                <span className="choice-item__icon" aria-hidden="true"><span className="choice-trigger__dot" /></span>
                <SelectPrimitive.ItemText>{clearLabel}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            )}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
