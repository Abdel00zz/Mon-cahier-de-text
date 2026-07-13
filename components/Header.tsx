import React from 'react';
import { ClassInfo } from '../types';
import { Button } from './ui/button';
import { ArrowLeft, School, User } from './ui/icons';

interface HeaderProps {
  classInfo: ClassInfo;
  establishmentName?: string;
  onClassInfoChange: (newInfo: Partial<ClassInfo>) => void;
  onBack?: () => void;
}

// Helper to detect Arabic characters in a string
const containsArabic = (text: string): boolean => /[\u0600-\u06FF]/.test(text || '');

const EditableHeader: React.FC<{ value: string; onSave: (value: string) => void }> = ({ value, onSave }) => {
  const handleBlur = (e: React.FocusEvent<HTMLSpanElement>) => {
    onSave(e.currentTarget.textContent || '');
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

  const isArabic = containsArabic(value);

  return (
    <span
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`inline-block px-1.5 py-0.5 -mx-1.5 -my-0.5 rounded-md text-primary hover:bg-primary/5 focus:outline-none focus:ring-1 focus:ring-primary/40 ${isArabic ? 'font-ar' : 'font-display'}`}
    >
      {value}
    </span>
  );
};

export const Header: React.FC<HeaderProps> = React.memo(({ classInfo, establishmentName, onClassInfoChange, onBack }) => {
  return (
    <div className="group relative mb-3 mt-2 px-1 py-3 sm:mt-3 sm:px-2 sm:py-4">
      <div className="flex items-start gap-2.5 sm:gap-4">
        {onBack ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="mt-0.5 h-10 w-10 shrink-0 rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
            aria-label="Retour à Mes classes"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </Button>
        ) : null}

        <header className="min-w-0 flex-1 text-left">
          <h1 className="flex min-w-0 items-center justify-start text-left font-display text-3xl font-black leading-none tracking-[-0.045em] text-foreground sm:text-4xl">
            <EditableHeader value={classInfo.name} onSave={(v) => onClassInfoChange({ name: v })} />
          </h1>

          <div className="mt-3 flex flex-col items-start gap-1.5 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-2">
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
