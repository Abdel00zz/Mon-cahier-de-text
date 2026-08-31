import { cva, type VariantProps } from 'class-variance-authority';

export const formFieldVariants = cva(
  [
    'flex w-full items-center border border-[#e0e0e0] dark:border-[#5f6368] bg-white dark:bg-[#202124] text-base sm:text-sm text-[#202124] dark:text-[#e8eaed]',
    'transition-all duration-200',
    'placeholder:text-[#5f6368] dark:placeholder:text-[#9aa0a6]',
    'hover:border-blue-500/50',
    'focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/25',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      size: {
        default: 'h-[42px] rounded-md px-3 py-2',
        sm: 'h-8 rounded px-2 py-1 text-xs',
        lg: 'h-12 rounded-md px-4 py-3 text-base',
      },
      variant: {
        default: 'shadow-sm',
        filled: 'border-transparent bg-[#f1f3f4] dark:bg-[#3c4043]',
        ghost: 'border-transparent bg-transparent hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] focus-visible:bg-transparent shadow-none',
      },
    },
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
  }
);

export type FormFieldVariantProps = VariantProps<typeof formFieldVariants>;
