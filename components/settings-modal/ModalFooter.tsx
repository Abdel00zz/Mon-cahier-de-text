import React from 'react';
import { AnimatedSubmitButton } from '@/components/ui/animated-submit-button';

interface ModalFooterProps {
  onSave: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({
  onSave,
  onCancel,
  isSubmitting = false,
}) => {
  return (
    <div className="shrink-0 border-t border-border/60 bg-muted/20 dark:bg-muted/10 px-5 sm:px-7 py-3 sm:py-3.5 pb-[calc(0.95rem+env(safe-area-inset-bottom,0px))]">
      <div className="flex items-center justify-end gap-2.5">
        {/* Cancel Button */}
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="inline-flex h-10 min-h-[40px] items-center justify-center rounded-[10px] border border-border/80 bg-card px-4.5 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/60 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
        >
          <span>Annuler (إلغاء)</span>
        </button>

        {/* Multi-step Animated Save Button */}
        <AnimatedSubmitButton
          type="button"
          onClick={onSave}
          isSubmitting={isSubmitting}
          label="Enregistrer (حفظ التغييرات)"
          loadingLabel="Enregistrement…"
          successLabel="Enregistré !"
          className="flex-1 sm:flex-initial"
        />
      </div>
    </div>
  );
};
