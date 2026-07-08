import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title: string;
  label: string;
}

export const PromptModal: React.FC<PromptModalProps> = ({ isOpen, onClose, onConfirm, title, label }) => {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setValue('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onConfirm(value.trim());
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="md"
      footer={
        <>
          <Button type="button" onClick={onClose} variant="secondary">
            Annuler
          </Button>
          <Button type="submit" form="prompt-form" variant="default" disabled={!value.trim()}>
            Confirmer
          </Button>
        </>
      }
    >
      <form id="prompt-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="prompt-input" className="text-sm font-medium text-slate-700 block">
            {label}
          </label>
          <Input
            ref={inputRef}
            type="text"
            id="prompt-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
            className="w-full"
          />
        </div>
      </form>
    </Modal>
  );
};