import React, { useState, useEffect, useRef } from 'react';
import { MathText } from './math-text';

interface EditableTitleProps {
  value: string;
  onSave: (value: string) => void;
  className?: string;
}

export const EditableTitle: React.FC<EditableTitleProps> = ({ value, onSave, className = '' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);
  
  useEffect(() => {
    if (!isEditing) {
      setCurrentValue(value);
    }
  }, [value, isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    if (currentValue.trim() !== value) {
      onSave(currentValue.trim());
    } else {
      // If no change, revert to original to avoid triggering re-renders
      setCurrentValue(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setCurrentValue(value);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsEditing(true);
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={currentValue}
        onChange={(e) => setCurrentValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className={`bg-background text-foreground border-2 border-primary rounded-md shadow-inner z-10 focus:outline-none focus:ring-2 focus:ring-primary/20 text-center ${className}`}
      />
    );
  }

  return (
    <span
      onDoubleClick={handleDoubleClick}
      className={`px-2 py-1 -mx-2 -my-1 rounded-md break-words ${className}`}
      title="Double-cliquez pour modifier"
    >
      {/* le LaTeX du titre est rendu à l'affichage ; la source brute reste éditable */}
      <MathText source={value} cacheKey={value} inline>{value}</MathText>
    </span>
  );
};
