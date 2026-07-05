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
      className={`inline-block px-2 py-1 -mx-2 -my-1 rounded-lg hover:bg-[#F5EDE8] focus:outline-none focus:ring-2 focus:ring-[#C96442]/30 ${isArabic ? 'font-ar' : 'font-slab'}`}
    >
      {value}
    </span>
  );
};

export const Header: React.FC<HeaderProps> = React.memo(({ classInfo, establishmentName, onClassInfoChange, onBack }) => {
  return (
    <div className="flex items-center justify-center relative mb-5 pb-4 group">
      {onBack && (
        <div className="absolute left-0">
          <Button 
            variant="icon" 
            size="md" 
            onClick={onBack} 
            data-tippy-content="Retour au tableau de bord"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
      )}
      <div className="absolute right-0 top-0">
        <SyncStatusBadge />
      </div>
      <header className="text-center">
        {establishmentName && (
          <p className="text-xs font-medium text-[#9D9490] tracking-widest uppercase mb-1.5">{establishmentName}</p>
        )}
        <h1 className="text-xl sm:text-2xl font-bold text-[#1A1817] font-slab">
          <EditableHeader value={classInfo.name} onSave={(v) => onClassInfoChange({ name: v })} />
        </h1>
        <p className="text-sm text-[#9D9490] mt-1 italic opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          Cliquez sur le nom pour modifier
        </p>
      </header>
    </div>
  );
});