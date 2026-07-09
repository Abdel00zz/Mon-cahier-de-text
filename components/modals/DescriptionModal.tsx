import React, { FC, useEffect, useRef, useState, useMemo } from 'react';
import { Modal } from '../ui/modal';
import { Trash2, Save, Sigma } from '../ui/icons';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { MathJax } from 'better-react-mathjax';

interface DescriptionModalProps {
  isOpen: boolean;
  title: string;
  initialValue: string;
  onClose: () => void;
  onSave: (value: string) => void;
}

const hasMathSyntax = (value: unknown): boolean => {
  if (!value || typeof value !== 'string') return false;
  return /\$\$?[^$]+\$\$?|\\\(|\\\[|\\begin\{/.test(value);
};

export const DescriptionModal: FC<DescriptionModalProps> = ({
  isOpen,
  title,
  initialValue,
  onClose,
  onSave,
}) => {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setValue(initialValue);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [isOpen, initialValue]);

  const hasMath = useMemo(() => {
    return hasMathSyntax(value);
  }, [value]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description="Édition de la description détaillée du contenu"
      maxWidth="lg"
      footer={
        <div className="flex justify-between w-full">
          <Button
            type="button"
            variant="destructive"
            onClick={() => onSave('')}
            disabled={!initialValue}
            className="rounded-xl"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Effacer
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose} className="rounded-xl">
              Annuler
            </Button>
            <Button 
              type="button" 
              onClick={() => onSave(value)}
              className="rounded-xl bg-primary hover:bg-primary/90 font-semibold px-4 shadow-sm"
            >
              <Save className="mr-1.5 h-3.5 w-3.5" /> Enregistrer
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <Textarea
          ref={inputRef}
          value={value}
          onChange={event => setValue(event.target.value)}
          rows={6}
          className="w-full min-h-[140px] rounded-xl border-border"
          placeholder="Saisissez la description détaillée de votre séance (LaTeX supporté)..."
        />

        {/* Real-time LaTeX Preview Area */}
        {hasMath && (
          <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-1.5 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                <Sigma className="h-3 w-3" />
                <span>Aperçu LaTeX en temps réel</span>
              </span>
              <span className="text-[9px] text-muted-foreground/60 font-medium">Auto-généré</span>
            </div>
            <div className="bg-card/95 p-3 rounded-lg border border-primary/10 shadow-inner text-xs text-foreground leading-relaxed overflow-x-auto min-h-[45px] max-h-[150px] overflow-y-auto">
              <MathJax hideUntilTypeset="first">
                <div className="whitespace-pre-wrap break-words">
                  {value}
                </div>
              </MathJax>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
