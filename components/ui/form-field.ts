/* ── Variantes partagées des champs de formulaire ────────────────────────── */

import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Styles de base partagés par Input, Textarea et SelectTrigger.
 * Cohérence visuelle garantie : mêmes bordures, radius, transitions, focus.
 */
export const formFieldVariants = cva(
  [
    'flex w-full items-center border border-slate-300/90 bg-white text-base sm:text-sm text-foreground dark:border-slate-700/80 dark:bg-slate-900/80',
    'transition-all duration-200',
    'placeholder:text-muted-foreground',
    'hover:border-cyan-500/55',
    'focus-visible:border-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/25',
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
        default: 'shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
        filled: 'border-slate-200/90 bg-slate-50 dark:border-slate-700/80 dark:bg-slate-900/70',
        ghost: 'border-transparent bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900/60',
      },
    },
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
  }
);

export type FormFieldVariantProps = VariantProps<typeof formFieldVariants>;
