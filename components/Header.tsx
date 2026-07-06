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
      className={`inline-block px-2 py-1 -mx-2 -my-1 rounded-lg hover:bg-[#F1DED2]/60 focus:outline-none focus:ring-2 focus:ring-[#C96442]/30 ${isArabic ? 'font-ar' : 'font-display'}`}
    >
      {value}
    </span>
  );
};

export const Header: React.FC<HeaderProps> = React.memo(({ classInfo, establishmentName, onClassInfoChange, onBack }) => {
  return (
    <div className="flex items-center justify-center relative mb-5 pb-4 group">
      <div className="absolute right-0 top-0">
        <SyncStatusBadge />
      </div>
      <header className="text-center">
        {establishmentName && (
          <p className="text-xs font-medium text-[#69604F] tracking-widest uppercase mb-1.5 font-mono">{establishmentName}</p>
        )}
        <h1 className="text-xl sm:text-2xl font-bold text-[#2B241D] font-display">
          <EditableHeader value={classInfo.name} onSave={(v) => onClassInfoChange({ name: v })} />
        </h1>
        <p className="text-sm text-[#A79C87] mt-1 italic opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          Cliquez sur le nom pour modifier
        </p>
      </header>
    </div>
  );
});