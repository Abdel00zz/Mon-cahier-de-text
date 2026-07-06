import React, { useState, useEffect, useRef } from 'react';

interface EditableCellProps {
  value: string;
  onSave: (value: string) => void;
  className?: string;
  multiline?: boolean;
  placeholder?: string;
  /** terme de recherche à surligner dans l'affichage (jamais en mode édition) */
  highlight?: string;
}

/** Découpe le texte et enveloppe chaque occurrence (insensible à la casse) dans <mark>. */
export const highlightMatches = (text: string, query?: string): React.ReactNode => {
  const q = (query || '').trim();
  if (!q || !text) return text;
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let hit = lower.indexOf(needle);
  while (hit !== -1) {
    if (hit > cursor) parts.push(text.slice(cursor, hit));
    parts.push(
      <mark key={hit} className="rounded-sm bg-[#B8935A]/30 px-0.5 text-inherit">
        {text.slice(hit, hit + needle.length)}
      </mark>
    );
    cursor = hit + needle.length;
    hit = lower.indexOf(needle, cursor);
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
};

export const EditableCell: React.FC<EditableCellProps> = ({ value, onSave, className = '', multiline = false, placeholder = "Cliquer pour éditer", highlight }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);
  
  // Update internal state if external value changes while not editing
  useEffect(() => {
    if (!isEditing) {
      setCurrentValue(value);
    }
  }, [value, isEditing]);


  const handleSave = () => {
    setIsEditing(false);
    // Only save if the value has actually changed
    if (currentValue !== value) {
      onSave(currentValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || (!multiline && !e.shiftKey))) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setCurrentValue(value); // Revert changes
    }
  };

  const commonInputProps = {
    ref: inputRef as any,
    value: currentValue,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setCurrentValue(e.target.value),
    onBlur: handleSave,
    onKeyDown: handleKeyDown,
    placeholder: placeholder,
    className: `w-full h-full p-2 bg-white border-2 border-primary rounded-md shadow-inner z-10 focus:outline-none focus:ring-2 focus:ring-primary/20 ${className}`
  };

  if (isEditing) {
    return multiline ? (
      <textarea {...commonInputProps} rows={3} />
    ) : (
      <input type="text" {...commonInputProps} />
    );
  }

  return (
    <div
      onDoubleClick={() => setIsEditing(true)}
      className={`min-h-[1.5rem] focus:bg-white rounded break-words whitespace-pre-wrap ${className}`}
      title="Double-cliquez pour modifier"
    >
      {value ? highlightMatches(value, highlight) : <span className="text-slate-400 italic">{placeholder}</span>}
    </div>
  );
};
