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
  const baseClasses = 'paper-button inline-flex touch-manipulation items-center justify-center font-sans font-medium transition-[transform,background-color,box-shadow] duration-200 cursor-pointer select-none rounded-xl active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

  const sizeClasses = {
    sm: 'min-h-11 px-3 py-2 text-xs gap-1.5',
    md: 'min-h-11 px-4 py-2 text-sm gap-2',
    lg: 'min-h-12 px-6 py-2.5 text-base gap-2.5',
  }[size];

  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:brightness-110 active:brightness-90 shadow-sm',
    ghost: 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted active:brightness-95',
    secondary: 'bg-card border border-border text-foreground hover:bg-muted active:brightness-95 shadow-2xs',
    danger: 'bg-destructive text-destructive-foreground hover:brightness-110 active:brightness-90 shadow-sm',
  }[variant];

  return (
    <button
      type="button"
      data-variant={variant === 'primary' ? 'default' : variant === 'danger' ? 'destructive' : variant}
      className={cn(baseClasses, sizeClasses, variantClasses, className)}
      {...props}
    >
      {children}
    </button>
  );
};
