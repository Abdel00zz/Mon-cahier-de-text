import { FC, useEffect, useRef, useState, useMemo } from 'react';
import { Modal } from '@/components/ui/modal';
import { FileText, Sigma, Trash2 } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MathJax } from 'better-react-mathjax';
import { hasMathSyntax } from '@/utils/math';
import { useLocale } from '@/i18n/LocaleProvider';

interface DescriptionModalProps {
  isOpen: boolean;
  title: string;
  initialValue: string;
  onClose: () => void;
  onSave: (value: string) => void;
}

export const DescriptionModal: FC<DescriptionModalProps> = ({
  isOpen,
  title,
  initialValue,
  onClose,
  onSave,
}) => {
  const { t } = useLocale();
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setValue(initialValue);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [isOpen, initialValue]);

  const hasMath = useMemo(() => {
    return hasMathSyntax(value);
  }, [value]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
            <FileText className="h-5 w-5 stroke-[2.2]" />
          </span>
          <span className="text-base sm:text-lg font-bold text-foreground truncate">
            {title}
          </span>
        </div>
      }
      description={t('descriptionModal.description')}
      maxWidth="xl"
      className="sm:max-w-2xl sm:rounded-[28px]"
      headerClassName="px-5 pt-5 pb-3.5 sm:px-7 sm:pt-6 sm:pb-4 border-b border-border/50 bg-card/60"
      bodyClassName="px-5 py-4 sm:px-7 sm:py-5"
      footerClassName="px-5 py-3.5 sm:px-7 sm:py-4 border-t border-border/50 bg-card/60"
      footer={
        <div className="flex items-center justify-between w-full gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onSave('')}
            disabled={!initialValue}
            className="rounded-xl font-bold h-10 px-3 text-xs sm:text-sm text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            <span>{t('descriptionModal.clear')}</span>
          </Button>
          <div className="flex items-center gap-2.5">
            <Button type="button" variant="secondary" onClick={onClose} className="rounded-xl h-10 px-4 text-xs font-semibold sm:text-sm">
              {t('common.cancel')}
            </Button>
            <Button 
              type="button" 
              onClick={() => onSave(value)}
              className="rounded-xl bg-primary hover:bg-primary/90 font-bold px-5 h-10 text-xs sm:text-sm shadow-sm text-primary-foreground"
            >
              {t('common.save')}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <Textarea
          ref={inputRef}
          value={value}
          onChange={event => setValue(event.target.value)}
          rows={6}
          className="w-full min-h-[160px] rounded-2xl border border-border/80 bg-background p-4 text-sm leading-relaxed focus:ring-2 focus:ring-primary/20 focus:border-primary"
          placeholder={t('descriptionModal.placeholder')}
        />

        {/* Real-time LaTeX Preview Area */}
        {hasMath && (
          <div className="p-4 rounded-2xl border border-border/70 bg-muted/40 space-y-2 animate-fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                <Sigma className="h-3.5 w-3.5 text-primary" />
                <span>{t('descriptionModal.preview')}</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">{t('descriptionModal.generated')}</span>
            </div>
            <div className="bg-card p-3.5 rounded-xl border border-border/80 shadow-2xs text-xs sm:text-sm text-foreground leading-relaxed overflow-x-auto min-h-[50px] max-h-[160px] overflow-y-auto overscroll-contain">
              <MathJax hideUntilTypeset="first">
                <div className="whitespace-pre-wrap break-words">
                  {value}
                </div>
              </MathJax>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
