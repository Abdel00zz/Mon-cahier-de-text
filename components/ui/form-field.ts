/* ── Variantes partagées des champs de formulaire ────────────────────────── */

import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Styles de base partagés par Input, Textarea et SelectTrigger.
 * Cohérence visuelle garantie : mêmes bordures, radius, transitions, focus.
 */
export const formFieldVariants = cva(
  [
    'flex w-full items-center border bg-input text-sm text-foreground',
    'transition-all duration-200',
    'placeholder:text-muted-foreground',
    'hover:border-primary/30',
    'focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      size: {
        default: 'h-[46px] rounded-xl px-4 py-2.5',
        sm: 'h-9 rounded-lg px-3 py-1.5 text-xs',
        lg: 'h-[50px] rounded-xl px-5 py-3 text-base',
      },
      variant: {
        default: 'border-border shadow-sm',
        filled: 'border-transparent bg-muted',
        ghost: 'border-transparent bg-transparent hover:bg-muted/50',
      },
    },
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
  }
);

export type FormFieldVariantProps = VariantProps<typeof formFieldVariants>;
