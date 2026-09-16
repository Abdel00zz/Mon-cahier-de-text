import React from 'react';
import { Check, Loader2 } from 'lucide-react';

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

        {/* Save Button */}
        <button
          type="button"
          onClick={onSave}
          disabled={isSubmitting}
          className="inline-flex h-10 min-h-[40px] flex-1 sm:flex-initial items-center justify-center gap-2 rounded-[10px] bg-primary hover:brightness-105 active:brightness-95 px-5 text-xs sm:text-sm font-semibold text-primary-foreground shadow-xs shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Enregistrement...</span>
            </>
          ) : (
            <>
              <Check className="h-4 w-4 stroke-[2.5]" />
              <span>Enregistrer (حفظ التغييرات)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
