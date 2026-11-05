import { useCallback, useEffect, useRef, useState, FC } from 'react';
import type { ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';
import { GuideModal } from './GuideModal';
import type { GuideReference } from '@/constants/guide/model';

const SHEET_EXIT_DURATION_MS = 230;

export interface GuidePageProps {
  onBack?: () => void;
  onClose?: () => void;
  initialReference?: GuideReference;
  mobileNavigation?: ReactNode;
}

export const GuidePage: FC<GuidePageProps> = ({ onBack, onClose, initialReference, mobileNavigation }) => {
  const reducedMotion = useReducedMotion();
  const [isSheetOpen, setIsSheetOpen] = useState(true);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
  }, []);

  const finishClose = useCallback(() => {
    if (onBack) {
      onBack();
      return;
    }
    if (onClose) {
      onClose();
      return;
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    }
  }, [onBack, onClose]);

  const requestClose = useCallback(() => {
    if (closeTimerRef.current !== null) return;
    if (reducedMotion || typeof window === 'undefined') {
      finishClose();
      return;
    }
    setIsSheetOpen(false);
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      finishClose();
    }, SHEET_EXIT_DURATION_MS);
  }, [finishClose, reducedMotion]);

  return (
    <GuideModal
      isOpen={isSheetOpen}
      onClose={requestClose}
      mobileNavigation={mobileNavigation}
      initialReference={initialReference}
    />
  );
};
