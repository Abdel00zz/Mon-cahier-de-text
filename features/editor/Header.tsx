import React from 'react';
import { ClassInfo } from '@/types';
import { formatLocalizedClassDisplayName } from '@/constants';
import { School, User } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';

interface HeaderProps {
  classInfo: ClassInfo;
  establishmentName?: string;
  onClassInfoChange: (newInfo: Partial<ClassInfo>) => void;
}

const containsArabic = (text: string): boolean => /[\u0600-\u06FF]/.test(text || '');

const EditableHeader: React.FC<{
  value: string;
  displayValue?: string;
  locale: 'fr' | 'en' | 'ar';
  onSave: (value: string) => void;
}> = ({ value, displayValue = value, locale, onSave }) => {
  const handleBlur = (event: React.FocusEvent<HTMLSpanElement>) => {
    const nextValue = (event.currentTarget.textContent || '').trim();
    onSave(nextValue);
    event.currentTarget.textContent = formatLocalizedClassDisplayName(nextValue, locale);
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.currentTarget.textContent = displayValue;
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
  const isArabic = containsArabic(displayValue);

  return (
    <span
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      dir={isArabic ? 'rtl' : 'ltr'}
      className={`inline-block -mx-1.5 rounded-md px-1.5 py-1 text-primary hover:bg-primary/5 focus:outline-none focus:ring-1 focus:ring-primary/40 ${isArabic ? 'font-sans' : 'font-bold tracking-tight'}`}
    >
      {displayValue}
    </span>
  );
};

export const Header: React.FC<HeaderProps> = React.memo(({ classInfo, establishmentName, onClassInfoChange }) => {
  const { t, locale } = useLocale();

  return (
    <div className="rtl-flow group relative mb-1.5 mt-0.5 px-0 pb-1.5 pt-1 sm:mt-1 sm:pb-2.5 sm:pt-2">
      <div className="flex items-start gap-2 sm:gap-3">
        <header className="min-w-0 flex-1 text-start">
          <h1 className="flex min-w-0 items-center justify-start overflow-visible text-start font-bold tracking-tight text-base sm:text-lg lg:text-xl leading-[1.3] text-foreground">
            <EditableHeader
              value={classInfo.name}
              displayValue={formatLocalizedClassDisplayName(classInfo.name, locale)}
              locale={locale}
              onSave={(value) => onClassInfoChange({ name: value })}
            />
          </h1>

          <div className="mt-1 flex flex-col items-start gap-1 text-[10px] sm:text-[11px] text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-1">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <User className="h-3 w-3 shrink-0 text-primary/70" aria-hidden />
              <span className="truncate">
                <span className="font-semibold text-foreground/65">{t('editor.teacher')}</span> ·{' '}
                <span className="font-itim text-primary font-bold text-xs sm:text-sm">{classInfo.teacherName || t('editor.notProvided')}</span>
              </span>
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <School className="h-3 w-3 shrink-0 text-primary/70" aria-hidden />
              <span className="truncate"><span className="font-semibold text-foreground/65">{t('editor.establishment')}</span> · {establishmentName || t('editor.notProvided')}</span>
            </span>
          </div>

        </header>
      </div>
    </div>
  );
});
