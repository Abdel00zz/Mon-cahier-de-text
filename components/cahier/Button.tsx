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
  const baseClasses = 'inline-flex items-center justify-center font-sans font-medium transition-all duration-200 cursor-pointer select-none rounded-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50 disabled:pointer-events-none';

  const sizeClasses = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-9 px-4 text-sm gap-2',
    lg: 'h-11 px-6 text-base gap-2.5',
  }[size];

  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:brightness-110 active:brightness-90 shadow-sm',
    ghost: 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted active:brightness-95',
    secondary: 'bg-card border border-border text-foreground hover:bg-muted active:brightness-95 shadow-2xs',
    danger: 'bg-destructive text-destructive-foreground hover:brightness-110 active:brightness-90 shadow-sm',
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
