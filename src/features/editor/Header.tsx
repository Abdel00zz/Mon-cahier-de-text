import React from 'react';
import { ClassInfo } from '@/types';
import { formatLocalizedClassDisplayName } from '@/constants';
import { School, User } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';
import { EditorBackButton } from './EditorBackButton';
import './header.css';

interface HeaderProps {
  classInfo: ClassInfo;
  establishmentName?: string;
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
      className={`inline-block min-w-0 max-w-full break-words -mx-1.5 rounded-[var(--radius-sm,0.375rem)] px-1.5 py-1 text-primary hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary/40 ${isArabic ? 'font-sans' : 'font-semibold tracking-tight'}`}
    >
      {displayValue}
    </span>
  );
};

export const Header: React.FC<HeaderProps> = React.memo(({ classInfo, establishmentName, teacherName, onClassInfoChange, onBack }) => {
  const { t, locale } = useLocale();

  return (
    <div className="rtl-flow relative mb-0 mt-0 px-1 pb-4 pt-2 sm:px-2 sm:pb-5 sm:pt-3">
      <div dir={locale === 'ar' ? 'rtl' : 'ltr'} className="flex items-center gap-4 sm:gap-5">
        {onBack && <EditorBackButton onBack={onBack} />}
        <header dir={locale === 'ar' ? 'rtl' : 'ltr'} className="min-w-0 flex-1 text-start">
          <h1 className="flex min-w-0 items-center justify-start overflow-visible text-start font-semibold tracking-tight text-base sm:text-lg lg:text-xl leading-[1.3] text-foreground">
            <EditableHeader
              value={classInfo.name}
              displayValue={formatLocalizedClassDisplayName(classInfo.name, locale)}
              locale={locale}
              onSave={(value) => onClassInfoChange({ name: value })}
            />
          </h1>

          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <div className="inline-flex min-w-0 max-w-full items-center gap-1.5">
              <User className="h-3.5 w-3.5 shrink-0 text-primary/80 stroke-[2.2]" aria-hidden />
              <span className="shrink-0 font-medium text-foreground/70">{t('editor.teacher')} :</span>
              <span className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-none">
                {teacherName?.trim() || classInfo.teacherName || t('editor.notProvided')}
              </span>
            </div>
            <span className="hidden sm:inline-block text-border/80 select-none" aria-hidden>|</span>
            <div className="inline-flex min-w-0 max-w-full items-center gap-1.5">
              <School className="h-3.5 w-3.5 shrink-0 text-primary/80 stroke-[2.2]" aria-hidden />
              <span className="shrink-0 font-medium text-foreground/70">{t('editor.establishment')} :</span>
              <span className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-none">
                {establishmentName || t('editor.notProvided')}
              </span>
            </div>
          </div>

        </header>
      </div>
    </div>
  );
});
