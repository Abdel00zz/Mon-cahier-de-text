import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
      type={type}
      form={form}
      disabled={disabled || isLoading}
      onClick={handleClick}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      className={cn(
        'relative inline-flex h-10 min-h-[40px] items-center justify-center gap-2 overflow-hidden rounded-[10px] px-5 text-xs sm:text-sm font-semibold transition-colors duration-300 select-none cursor-pointer',
        isSuccess
          ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
          : 'bg-primary text-primary-foreground shadow-xs shadow-primary/20 hover:brightness-105 active:brightness-95',
        (disabled || isLoading) && 'opacity-60 cursor-not-allowed',
        className
      )}
      layout
      {...(props as any)}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2"
          >
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            >
              {loadingLabel}
            </motion.span>
          </motion.div>
        ) : isSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2"
          >
            <motion.div
              initial={{ rotate: -180, scale: 0.5 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="flex items-center justify-center shrink-0"
            >
              <Check className="h-4 w-4 stroke-[3]" />
            </motion.div>
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            >
              {successLabel}
            </motion.span>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2"
          >
            {icon ? (
              <span className="flex shrink-0 items-center justify-center">
                {icon}
              </span>
            ) : null}
            <span>{label}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};
