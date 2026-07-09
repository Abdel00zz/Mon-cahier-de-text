import React from 'react';
import { ClassInfo } from '../types';
import { Button } from './ui/button';
import { SyncStatusBadge } from './ui/SyncStatusBadge';
import { ArrowLeft } from './ui/icons';

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
    if (e.key === 'Enter' || e.key === 'Escape') {
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
      className={`inline-block px-2 py-0.5 -mx-2 -my-0.5 rounded-xl text-primary hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-ring/30 ${isArabic ? 'font-ar' : 'font-display'}`}
    >
      {value}
    </span>
  );
};

export const Header: React.FC<HeaderProps> = React.memo(({ classInfo, establishmentName, onClassInfoChange, onBack }) => {
  // Titre fixe en rouge moderne, independant de la couleur de classe.
  return (
    <div className="relative mb-3 flex items-center justify-center pb-2 group">
      <div className="absolute right-0 top-0">
        <SyncStatusBadge />
      </div>
      <header className="relative w-full overflow-hidden text-center">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-16 w-56 -translate-x-1/2 rounded-full bg-destructive/5 blur-2xl" />
        {establishmentName && (
          <p className="relative mb-1 text-[11px] font-semibold uppercase text-muted-foreground/75 font-sans">{establishmentName}</p>
        )}
        <h1 className="relative mx-auto flex max-w-4xl items-center justify-center text-center text-[1.75rem] font-black leading-tight sm:text-[2.2rem] font-display">
          <EditableHeader value={classInfo.name} onSave={(v) => onClassInfoChange({ name: v })} />
        </h1>
        <p className="relative mt-0.5 text-xs text-muted-foreground/55 italic opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          Cliquez sur le nom pour modifier
        </p>
      </header>
    </div>
  );
});
