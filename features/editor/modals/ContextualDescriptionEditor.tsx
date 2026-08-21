import React, { useCallback, useRef, useState } from 'react';
import { Bold, Braces, Italic, List, ListOrdered, Underline } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useLocale } from '@/i18n/LocaleProvider';

type FormatAction = 'bold' | 'italic' | 'underline' | 'bullets' | 'numbered' | 'math';

interface SelectionRange {
  start: number;
  end: number;
}

interface ContextualDescriptionEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

const ACTIONS: Array<{ action: FormatAction; icon: React.ComponentType<{ className?: string }>; labelKey: string }> = [
  { action: 'bold', icon: Bold, labelKey: 'editContent.formatBold' },
  { action: 'italic', icon: Italic, labelKey: 'editContent.formatItalic' },
  { action: 'underline', icon: Underline, labelKey: 'editContent.formatUnderline' },
  { action: 'bullets', icon: List, labelKey: 'editContent.formatBullets' },
  { action: 'numbered', icon: ListOrdered, labelKey: 'editContent.formatNumbered' },
  { action: 'math', icon: Braces, labelKey: 'editContent.formatMath' },
];

const formatSelection = (action: FormatAction, selectedText: string): { value: string; inset: number } => {
  if (action === 'bullets') {
    return {
      value: selectedText.split('\n').map(line => `- ${line.replace(/^\s*(?:[-*]|\d+[.)])\s+/, '')}`).join('\n'),
      inset: 0,
    };
  }
  if (action === 'numbered') {
    return {
      value: selectedText.split('\n').map((line, index) => `${index + 1}. ${line.replace(/^\s*(?:[-*]|\d+[.)])\s+/, '')}`).join('\n'),
      inset: 0,
    };
  }
  const markers: Record<Exclude<FormatAction, 'bullets' | 'numbered'>, [string, string]> = {
    bold: ['**', '**'],
    italic: ['*', '*'],
    underline: ['++', '++'],
    math: ['$', '$'],
  };
  const [before, after] = markers[action];
  return { value: `${before}${selectedText}${after}`, inset: before.length };
};

export const ContextualDescriptionEditor: React.FC<ContextualDescriptionEditorProps> = ({ value, onChange, placeholder }) => {
  const { t } = useLocale();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selection, setSelection] = useState<SelectionRange | null>(null);

  const readSelection = useCallback((textarea: HTMLTextAreaElement) => {
    const next = textarea.selectionEnd > textarea.selectionStart
      ? { start: textarea.selectionStart, end: textarea.selectionEnd }
      : null;
    setSelection(next);
  }, []);

  const applyFormat = useCallback((action: FormatAction, range = selection) => {
    if (!range || range.end <= range.start) return;
    const selectedText = value.slice(range.start, range.end);
    const formatted = formatSelection(action, selectedText);
    const nextValue = `${value.slice(0, range.start)}${formatted.value}${value.slice(range.end)}`;
    onChange(nextValue);

    const nextStart = range.start + formatted.inset;
    const nextEnd = action === 'bullets' || action === 'numbered'
      ? range.start + formatted.value.length
      : nextStart + selectedText.length;
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextStart, nextEnd);
      setSelection({ start: nextStart, end: nextEnd });
    });
  }, [onChange, selection, value]);

  return (
    <div className="relative">
      {selection && (
        <div
          role="toolbar"
          aria-label={t('editContent.formatSelection')}
          className="absolute end-2 top-2 z-20 flex items-center gap-0.5 rounded-xl border border-white/10 bg-slate-950/95 p-1 text-white shadow-xl shadow-slate-950/20 backdrop-blur-md animate-fade-in"
        >
          {ACTIONS.map(({ action, icon: Icon, labelKey }) => (
            <button
              key={action}
              type="button"
              onPointerDown={event => {
                event.preventDefault();
                applyFormat(action);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white/75 transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              aria-label={t(labelKey)}
              title={t(labelKey)}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      )}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={event => onChange(event.target.value)}
        onSelect={event => readSelection(event.currentTarget)}
        onMouseUp={event => readSelection(event.currentTarget)}
        onKeyUp={event => readSelection(event.currentTarget)}
        onBlur={() => window.setTimeout(() => setSelection(null), 0)}
        onKeyDown={event => {
          if (!(event.ctrlKey || event.metaKey)) return;
          const action = event.key.toLowerCase() === 'b'
            ? 'bold'
            : event.key.toLowerCase() === 'i'
              ? 'italic'
              : event.key.toLowerCase() === 'u'
                ? 'underline'
                : null;
          if (!action || event.currentTarget.selectionEnd <= event.currentTarget.selectionStart) return;
          event.preventDefault();
          applyFormat(action, { start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd });
        }}
        rows={10}
        className="min-h-[230px] resize-y rounded-2xl border-border/75 bg-background px-4 py-4 text-start text-sm leading-7 shadow-sm focus-visible:ring-2 focus-visible:ring-primary/20"
        placeholder={placeholder}
        spellCheck
      />
    </div>
  );
};
