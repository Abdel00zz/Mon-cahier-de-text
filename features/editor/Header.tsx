import React from 'react';
import { ClassInfo } from '@/types';
import { formatClassDisplayName } from '@/constants';
import { School, User } from '@/components/ui/icons';

interface HeaderProps {
  classInfo: ClassInfo;
  establishmentName?: string;
  onClassInfoChange: (newInfo: Partial<ClassInfo>) => void;
}

// Helper to detect Arabic characters in a string
const containsArabic = (text: string): boolean => /[\u0600-\u06FF]/.test(text || '');

const EditableHeader: React.FC<{ value: string; displayValue?: string; onSave: (value: string) => void }> = ({ value, displayValue = value, onSave }) => {
  const handleBlur = (e: React.FocusEvent<HTMLSpanElement>) => {
    const nextValue = (e.currentTarget.textContent || '').trim();
    onSave(nextValue);
    e.currentTarget.textContent = formatClassDisplayName(nextValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.currentTarget.textContent = value;
      e.currentTarget.blur();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLSpanElement>) => {
    // L'édition porte sur l'identifiant court historique afin de préserver les
    // correspondances avec le planning. Hors édition, le nom complet est lu.
    e.currentTarget.textContent = value;
  };

  const isArabic = containsArabic(value);

  return (
    <span
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      className={`inline-block px-1.5 py-0.5 -mx-1.5 -my-0.5 rounded-md text-primary hover:bg-primary/5 focus:outline-none focus:ring-1 focus:ring-primary/40 ${isArabic ? 'font-ar' : 'font-display'}`}
    >
      {displayValue}
    </span>
  );
};

export const Header: React.FC<HeaderProps> = React.memo(({ classInfo, establishmentName, onClassInfoChange }) => {
  return (
    <div className="group relative mb-2 mt-1 px-0 py-2 sm:mt-2 sm:py-3">
      <div className="flex items-start gap-2.5 sm:gap-4">
        <header className="min-w-0 flex-1 text-left">
          <h1 className="flex min-w-0 items-center justify-start text-left font-display text-lg font-black leading-tight tracking-[-0.035em] text-foreground sm:text-2xl">
            <EditableHeader
              value={classInfo.name}
              displayValue={formatClassDisplayName(classInfo.name)}
              onSave={(v) => onClassInfoChange({ name: v })}
            />
          </h1>

          <div className="mt-2 flex flex-col items-start gap-1 text-[11px] text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-1.5 sm:text-xs">
            <span className="inline-flex min-w-0 items-center gap-2">
              <User className="h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden />
              <span className="truncate"><span className="font-semibold text-foreground/65">Professeur</span> · {classInfo.teacherName || 'Non renseigné'}</span>
            </span>
            <span className="inline-flex min-w-0 items-center gap-2">
              <School className="h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden />
              <span className="truncate"><span className="font-semibold text-foreground/65">Établissement</span> · {establishmentName || 'Non renseigné'}</span>
            </span>
          </div>

          <p className="mt-1.5 text-left text-[10px] font-medium text-muted-foreground/65 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
            Cliquez sur le nom pour modifier
          </p>
        </header>

      </div>
    </div>
  );
});
