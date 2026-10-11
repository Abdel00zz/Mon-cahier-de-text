import * as React from 'react';
import { motion } from 'framer-motion';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { useModalHaptics } from '@/hooks/useModalHaptics';
import {
  contentContainerVariants,
  contentItemVariants,
} from './modal-animations';

interface ModalEmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  variant?: 'default' | 'destructive' | 'secondary' | 'outline' | 'ghost';
}

export interface ModalEmptyStateProps {
  icon?: React.ReactNode;
  illustration?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  primaryAction?: ModalEmptyStateAction;
  secondaryAction?: ModalEmptyStateAction;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Composant d'état vide premium pour modales.
 * Conforme à la règle UX "Jamais de surface vide passive".
 * Intègre les animations spring GPU, les micro-respirations et les retours haptiques.
 */
export function ModalEmptyState({
  icon,
  illustration,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
  children,
}: ModalEmptyStateProps) {
  const haptics = useModalHaptics();

  const handlePrimaryClick = () => {
    haptics.onConfirm();
    primaryAction?.onClick();
  };

  const handleSecondaryClick = () => {
    haptics.onSelect();
    secondaryAction?.onClick();
  };

  return (
    <motion.div
      variants={contentContainerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'flex flex-col items-center justify-center text-center px-4 py-8 sm:py-10',
        className
      )}
    >
      {/* Zone visuelle : Illustration ou Icône avec respiration douce */}
      <motion.div
        variants={contentItemVariants}
        className="relative mb-5 flex items-center justify-center"
      >
        {illustration ? (
          <div className="relative flex items-center justify-center">
            {illustration}
          </div>
        ) : icon ? (
          <div className="relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5 text-primary shadow-[0_8px_24px_-6px_hsla(var(--primary),0.15)] ring-4 ring-primary/10">
            {icon}
          </div>
        ) : null}
      </motion.div>

      {/* Titre */}
      <motion.h3
        variants={contentItemVariants}
        className="text-base sm:text-lg font-bold tracking-tight text-foreground max-w-md"
      >
        {title}
      </motion.h3>

      {/* Description orientée action & bienveillance */}
      {description && (
        <motion.p
          variants={contentItemVariants}
          className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-sm"
        >
          {description}
        </motion.p>
      )}

      {/* Contenu additionnel optionnel */}
      {children && (
        <motion.div variants={contentItemVariants} className="mt-4 w-full">
          {children}
        </motion.div>
      )}

      {/* Boutons d'action contextuels (CTA) */}
      {(primaryAction || secondaryAction) && (
        <motion.div
          variants={contentItemVariants}
          className="mt-6 flex flex-col-reverse sm:flex-row items-center gap-2.5 w-full max-w-xs"
        >
          {secondaryAction && (
            <Button
              type="button"
              variant={secondaryAction.variant ?? 'outline'}
              disabled={secondaryAction.disabled}
              onClick={handleSecondaryClick}
              className="w-full min-h-11 rounded-xl text-xs sm:text-sm font-semibold"
            >
              {secondaryAction.icon && (
                <span className="me-2 inline-flex shrink-0">{secondaryAction.icon}</span>
              )}
              {secondaryAction.label}
            </Button>
          )}

          {primaryAction && (
            <Button
              type="button"
              variant={primaryAction.variant ?? 'default'}
              disabled={primaryAction.disabled}
              onClick={handlePrimaryClick}
              className="w-full min-h-11 rounded-xl text-xs sm:text-sm font-bold shadow-sm glow-pulse-primary"
            >
              {primaryAction.icon && (
                <span className="me-2 inline-flex shrink-0">{primaryAction.icon}</span>
              )}
              {primaryAction.label}
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
