import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

export interface AnimatedSubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  loadingLabel?: string;
  successLabel?: string;
  isSubmitting?: boolean;
  isSuccess?: boolean;
  icon?: React.ReactNode;
  onAction?: () => Promise<boolean | void> | boolean | void;
  className?: string;
  form?: string;
}

export const AnimatedSubmitButton: React.FC<AnimatedSubmitButtonProps> = ({
  label,
  loadingLabel = 'Enregistrement…',
  successLabel = 'Enregistré !',
  isSubmitting = false,
  isSuccess: controlledSuccess,
  icon,
  onAction,
  onClick,
  className,
  disabled,
  type = 'submit',
  form,
  ...props
}) => {
  const { impact, notification } = useHapticFeedback();
  const reducedMotion = useReducedMotion();
  const [internalSuccess, setInternalSuccess] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);

  const isSuccess = controlledSuccess ?? internalSuccess;
  const isLoading = isSubmitting || internalLoading;

  useEffect(() => {
    if (controlledSuccess) {
      notification('success');
    }
  }, [controlledSuccess, notification]);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    impact('medium');
    if (onClick) {
      onClick(e);
    }
    if (onAction) {
      e.preventDefault();
      try {
        setInternalLoading(true);
        const result = await onAction();
        setInternalLoading(false);
        if (result !== false) {
          setInternalSuccess(true);
          notification('success');
          setTimeout(() => {
            setInternalSuccess(false);
          }, 2000);
        }
      } catch {
        setInternalLoading(false);
        notification('error');
      }
    }
  };

  return (
    <motion.button
      data-variant="default"
      type={type}
      form={form}
      disabled={disabled || isLoading}
      onClick={handleClick}
      whileTap={reducedMotion ? undefined : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      className={cn(
        'paper-button relative inline-flex h-11 min-h-[44px] items-center justify-center gap-2 overflow-hidden rounded-xl px-5 text-xs sm:text-sm font-semibold transition-colors duration-200 motion-reduce:transition-none select-none cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        isSuccess
          ? 'border-success-strong/30 bg-success/10 text-success-strong shadow-xs'
          : 'bg-primary text-primary-foreground shadow-xs shadow-primary/20 hover:brightness-105 active:brightness-95',
        (disabled || isLoading) && 'opacity-60 cursor-not-allowed',
        className
      )}
      aria-busy={isLoading}
      aria-label={isLoading ? loadingLabel : isSuccess ? successLabel : label}
      {...(props as any)}
    >
      <span className="grid items-center justify-items-center">
        {/* Reserve every label's width so a save never shifts adjacent actions. */}
        {[label, loadingLabel, successLabel].map((text, index) => (
          <span key={index} aria-hidden="true" className="invisible col-start-1 row-start-1 inline-flex items-center gap-2">
            <span className="h-4 w-4 shrink-0" />{text}
          </span>
        ))}
        <span className="col-start-1 row-start-1 inline-flex items-center gap-2" role="status" aria-live="polite" aria-atomic="true">
          <motion.span
            key={isLoading ? 'loading' : isSuccess ? 'success' : 'idle'}
            initial={reducedMotion ? false : { opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reducedMotion ? 0 : 0.18 }}
            className="inline-flex shrink-0 items-center justify-center"
            aria-hidden="true"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
              : isSuccess ? <Check className="h-4 w-4 stroke-[3]" /> : icon}
          </motion.span>
          <span>{isLoading ? loadingLabel : isSuccess ? successLabel : label}</span>
        </span>
      </span>
    </motion.button>
  );
};
