import { cva, type VariantProps } from 'class-variance-authority';

export const formFieldVariants = cva(
  [
    'flex w-full items-center border border-border bg-card text-base sm:text-sm text-foreground',
    'transition-all duration-200',
    'placeholder:text-muted-foreground/70',
    'hover:border-primary/50',
    'focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      size: {
        default: 'h-[42px] rounded-lg px-3 py-2',
        sm: 'h-8 rounded-md px-2 py-1 text-xs',
        lg: 'h-12 rounded-lg px-4 py-3 text-base',
      },
      variant: {
        default: 'shadow-2xs',
        filled: 'border-transparent bg-muted text-foreground',
        ghost: 'border-transparent bg-transparent hover:bg-muted text-foreground focus-visible:bg-transparent shadow-none',
      },
    },
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
  }
);

export type FormFieldVariantProps = VariantProps<typeof formFieldVariants>;
