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
  // Titre fixe en rouge moderne, independant de la couleur de classe.
  return (
    <div className="relative mb-3 flex items-center justify-center pb-2 group border-b border-slate-100">
      {onBack && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="absolute left-0 top-0 z-10 h-11 w-11 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          aria-label="Retour à Mes classes"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
      <div className="absolute right-0 top-0">
        <SyncStatusBadge />
      </div>
      <header className="relative w-full overflow-hidden px-12 text-center">
        {establishmentName && (
          <p className="relative mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-sans">{establishmentName}</p>
        )}
        <h1 className="relative mx-auto flex max-w-4xl items-center justify-center text-center text-xl font-bold leading-tight sm:text-2xl font-display text-slate-900">
          <EditableHeader value={classInfo.name} onSave={(v) => onClassInfoChange({ name: v })} />
        </h1>
        <p className="relative mt-0.5 text-[10px] font-medium text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          Cliquez sur le nom pour modifier
        </p>
      </header>
    </div>
  );
});
