import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-sans font-medium transition-all duration-200 cursor-pointer select-none rounded-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none';

  const sizeClasses = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-9 px-4 text-sm gap-2',
    lg: 'h-11 px-6 text-base gap-2.5',
  }[size];

  const variantClasses = {
    primary: 'bg-[#1a73e8] text-white hover:bg-[#1557b0] hover:shadow-md',
    ghost: 'bg-transparent text-[#5f6368] dark:text-[#e8eaed] hover:bg-slate-100 dark:hover:bg-[#3c4043]',
    secondary: 'bg-transparent border border-[#e0e0e0] dark:border-[#5f6368] text-[#5f6368] dark:text-[#e8eaed] hover:bg-slate-50 dark:hover:bg-[#3c4043]',
    danger: 'bg-red-600 text-white hover:bg-red-700 hover:shadow-md',
  }[variant];

  return (
    <button
      className={cn(baseClasses, sizeClasses, variantClasses, className)}
      {...props}
    >
      {children}
    </button>
  );
};
