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
    <div className="shrink-0 border-t border-cream-300/80 dark:border-border/70 bg-cream-100/90 dark:bg-card/90 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] backdrop-blur-md">
      <div className="flex items-center justify-end gap-2.5">
        {/* Cancel Button */}
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="touch-target inline-flex h-11 items-center justify-center rounded-xl border border-cream-300 dark:border-border bg-cream-50 dark:bg-card px-4 text-xs font-semibold text-espresso-800 dark:text-muted-foreground hover:bg-cream-200 dark:hover:bg-muted active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
        >
          <span>Annuler (إلغاء)</span>
        </button>

        {/* Save Button */}
        <button
          type="button"
          onClick={onSave}
          disabled={isSubmitting}
          className="touch-target inline-flex h-11 flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl bg-terracotta-500 hover:bg-terracotta-600 dark:bg-primary dark:hover:bg-primary/90 px-5 text-xs font-bold text-white shadow-sm active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
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
