import React from 'react';
import { ClassInfo } from '@/types';
import { formatLocalizedClassDisplayName } from '@/constants';
import { useLocale } from '@/i18n/LocaleProvider';
import './header.css';

interface HeaderProps {
  classInfo: ClassInfo;
  /** Nom d'usage du profil : prime sur le nom enregistré dans la classe. */
  teacherName?: string;
  onClassInfoChange: (newInfo: Partial<ClassInfo>) => void;
  onBack?: () => void;
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
    if (!nextValue || nextValue === value || nextValue === displayValue) {
      event.currentTarget.textContent = displayValue;
      return;
    }
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
    event.currentTarget.textContent = displayValue || value;
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
      className={`editor-title-editable inline-block min-w-0 max-w-full break-words -mx-1.5 rounded-[var(--radius-sm,0.375rem)] px-1.5 py-1 text-foreground hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary/40 ${isArabic ? 'font-sans' : 'font-semibold tracking-tight'}`}
    >
      {displayValue}
    </span>
  );
};

export const Header: React.FC<HeaderProps> = React.memo(({ classInfo, teacherName, onClassInfoChange }) => {
  const { locale } = useLocale();
  const resolvedTeacher = teacherName?.trim() || classInfo.teacherName;

  return (
    <div className="editor-heading rtl-flow relative mb-0 mt-0 px-1 pb-4 pt-2 sm:px-2 sm:pb-5 sm:pt-3" data-teacher-name={resolvedTeacher || undefined}>
      <div dir={locale === 'ar' ? 'rtl' : 'ltr'} className="flex items-start gap-3 sm:gap-4">
        <header dir={locale === 'ar' ? 'rtl' : 'ltr'} className="min-w-0 flex-1 text-start">
          <h1 className="editor-heading__title flex min-w-0 items-center justify-start overflow-visible text-start font-semibold tracking-tight leading-[1.3] text-foreground">
            <EditableHeader
              value={classInfo.name}
              displayValue={formatLocalizedClassDisplayName(classInfo.name, locale)}
              locale={locale}
              onSave={(value) => onClassInfoChange({ name: value })}
            />
          </h1>
        </header>
      </div>
    </div>
  );
});
Header.displayName = 'Header';