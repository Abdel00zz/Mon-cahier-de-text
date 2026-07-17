import React from 'react';
import { ClassInfo } from '@/types';
import { formatClassDisplayName } from '@/constants';
import { School, User } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';

interface HeaderProps {
  classInfo: ClassInfo;
  establishmentName?: string;
  onClassInfoChange: (newInfo: Partial<ClassInfo>) => void;
}

const containsArabic = (text: string): boolean => /[\u0600-\u06FF]/.test(text || '');

const EditableHeader: React.FC<{ value: string; displayValue?: string; onSave: (value: string) => void }> = ({ value, displayValue = value, onSave }) => {
  const handleBlur = (event: React.FocusEvent<HTMLSpanElement>) => {
    const nextValue = (event.currentTarget.textContent || '').trim();
    onSave(nextValue);
    event.currentTarget.textContent = formatClassDisplayName(nextValue);
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.currentTarget.textContent = value;
      event.currentTarget.blur();
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
    }
  };
  const handleFocus = (event: React.FocusEvent<HTMLSpanElement>) => {
    event.currentTarget.textContent = value;
  };
  const isArabic = containsArabic(value);

  return (
    <span
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      className={`inline-block -mx-1.5 -my-0.5 rounded-md px-1.5 py-0.5 text-primary hover:bg-primary/5 focus:outline-none focus:ring-1 focus:ring-primary/40 ${isArabic ? 'font-ar' : 'font-display'}`}
    >
      {displayValue}
    </span>
  );
};

export const Header: React.FC<HeaderProps> = React.memo(({ classInfo, establishmentName, onClassInfoChange }) => {
  const { t } = useLocale();

  return (
    <div className="rtl-flow group relative mb-2 mt-1 px-0 py-2 sm:mt-2 sm:py-3">
      <div className="flex items-start gap-2.5 sm:gap-4">
        <header className="min-w-0 flex-1 text-left">
          <h1 className="flex min-w-0 items-center justify-start text-left font-display text-lg font-black leading-tight tracking-[-0.035em] text-foreground sm:text-2xl">
            <EditableHeader
              value={classInfo.name}
              displayValue={formatClassDisplayName(classInfo.name)}
              onSave={(value) => onClassInfoChange({ name: value })}
            />
          </h1>

          <div className="mt-2 flex flex-col items-start gap-1 text-[11px] text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-1.5 sm:text-xs">
            <span className="inline-flex min-w-0 items-center gap-2">
              <User className="h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden />
              <span className="truncate"><span className="font-semibold text-foreground/65">{t('editor.teacher')}</span> · {classInfo.teacherName || t('editor.notProvided')}</span>
            </span>
            <span className="inline-flex min-w-0 items-center gap-2">
              <School className="h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden />
              <span className="truncate"><span className="font-semibold text-foreground/65">{t('editor.establishment')}</span> · {establishmentName || t('editor.notProvided')}</span>
            </span>
          </div>

          <p className="mt-1.5 text-left text-[10px] font-medium text-muted-foreground/65 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
            {t('editor.editClass')}
          </p>
        </header>
      </div>
    </div>
  );
});
