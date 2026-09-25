import React, { useCallback, useRef, useState } from 'react';
import {
  Bold,
  Braces,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Palette,
  Underline,
  X,
} from '@/components/ui/icons';
import { Textarea } from '@/components/ui/textarea';
import { useLocale } from '@/i18n/LocaleProvider';
import { cn } from '@/lib/utils';

type FormatAction = 'bold' | 'italic' | 'underline' | 'bullets' | 'numbered' | 'math';

interface SelectionRange {
  start: number;
  end: number;
}

interface ContextualDescriptionEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows?: number;
  className?: string;
  dir?: 'ltr' | 'rtl' | 'auto';
}

const ACTIONS: Array<{ action: FormatAction; icon: React.ComponentType<{ className?: string }>; labelKey: string }> = [
  { action: 'bold', icon: Bold, labelKey: 'editContent.formatBold' },
  { action: 'italic', icon: Italic, labelKey: 'editContent.formatItalic' },
  { action: 'underline', icon: Underline, labelKey: 'editContent.formatUnderline' },
  { action: 'bullets', icon: List, labelKey: 'editContent.formatBullets' },
  { action: 'numbered', icon: ListOrdered, labelKey: 'editContent.formatNumbered' },
  { action: 'math', icon: Braces, labelKey: 'editContent.formatMath' },
];

interface ColorOption {
  id: string;
  nameKey: string;
  dotColor: string;
}

const COLOR_OPTIONS: ColorOption[] = [
  { id: 'red', nameKey: 'editContent.colorRed', dotColor: 'bg-rose-500' },
  { id: 'blue', nameKey: 'editContent.colorBlue', dotColor: 'bg-sky-500' },
  { id: 'green', nameKey: 'editContent.colorGreen', dotColor: 'bg-emerald-500' },
  { id: 'amber', nameKey: 'editContent.colorAmber', dotColor: 'bg-amber-500' },
  { id: 'purple', nameKey: 'editContent.colorPurple', dotColor: 'bg-purple-500' },
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

const formatColorSelection = (colorId: string, selectedText: string): { value: string; inset: number; coreLength: number } => {
  const stripped = selectedText
    .replace(/^\[color:[^\]]+\]([\s\S]*)\[\/color\]$/, '$1')
    .replace(/^==([\s\S]*)==$/, '$1');

  if (colorId === 'clear') {
    return { value: stripped, inset: 0, coreLength: stripped.length };
  }
  if (colorId === 'highlight') {
    if (selectedText.startsWith('==') && selectedText.endsWith('==') && selectedText.length >= 4) {
      return { value: stripped, inset: 0, coreLength: stripped.length };
    }
    return { value: `==${stripped}==`, inset: 2, coreLength: stripped.length };
  }
  const before = `[color:${colorId}]`;
  const after = `[/color]`;
  return { value: `${before}${stripped}${after}`, inset: before.length, coreLength: stripped.length };
};

export const ContextualDescriptionEditor: React.FC<ContextualDescriptionEditorProps> = ({
  id,
  value,
  onChange,
  placeholder,
  rows = 10,
  className,
  dir,
}) => {
  const { t } = useLocale();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selection, setSelection] = useState<SelectionRange | null>(null);
  const [showColorMenu, setShowColorMenu] = useState(false);

  const readSelection = useCallback((textarea: HTMLTextAreaElement) => {
    const next = textarea.selectionEnd > textarea.selectionStart
      ? { start: textarea.selectionStart, end: textarea.selectionEnd }
      : null;
    setSelection(next);
    if (!next) setShowColorMenu(false);
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

  const applyColor = useCallback((colorId: string, range = selection) => {
    if (!range || range.end <= range.start) return;
    const selectedText = value.slice(range.start, range.end);
    const formatted = formatColorSelection(colorId, selectedText);
    const nextValue = `${value.slice(0, range.start)}${formatted.value}${value.slice(range.end)}`;
    onChange(nextValue);

    const nextStart = range.start + formatted.inset;
    const nextEnd = nextStart + formatted.coreLength;

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
          className="absolute end-2 top-2 z-20 flex items-center gap-0.5 rounded-xl border border-border/80 dark:border-white/10 bg-popover/95 dark:bg-card/95 p-1 text-foreground shadow-xl ring-1 ring-black/5 dark:ring-white/10 backdrop-blur-xl animate-fade-in"
        >
          {ACTIONS.map(({ action, icon: Icon, labelKey }) => (
            <button
              key={action}
              type="button"
              onPointerDown={event => {
                event.preventDefault();
                applyFormat(action);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95"
              aria-label={t(labelKey)}
              title={t(labelKey)}
            >
              <Icon className="h-3.5 w-3.5 stroke-[2.2]" />
            </button>
          ))}

          {/* Séparateur élégant */}
          <span className="mx-0.5 h-4 w-px bg-border select-none" aria-hidden="true" />

          {/* Bouton couleur du même style */}
          <div className="relative">
            <button
              type="button"
              onPointerDown={event => {
                event.preventDefault();
                setShowColorMenu(prev => !prev);
              }}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95',
                showColorMenu ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
              aria-label={t('editContent.formatColor')}
              title={t('editContent.formatColor')}
              aria-haspopup="true"
              aria-expanded={showColorMenu}
            >
              <Palette className="h-3.5 w-3.5 stroke-[2.2]" />
            </button>

            {/* Menu déroulant des couleurs avec boutons du même style */}
            {showColorMenu && (
              <div
                role="menu"
                aria-label={t('editContent.formatColor')}
                className="absolute end-0 top-[calc(100%+6px)] z-30 flex items-center gap-0.5 rounded-xl border border-border/80 dark:border-white/10 bg-popover/95 dark:bg-card/95 p-1 text-foreground shadow-xl ring-1 ring-black/5 dark:ring-white/10 backdrop-blur-xl animate-fade-in"
              >
                {COLOR_OPTIONS.map(({ id, nameKey, dotColor }) => (
                  <button
                    key={id}
                    type="button"
                    role="menuitem"
                    onPointerDown={event => {
                      event.preventDefault();
                      applyColor(id);
                      setShowColorMenu(false);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95"
                    aria-label={t(nameKey)}
                    title={t(nameKey)}
                  >
                    <span className={cn('h-3.5 w-3.5 rounded-full ring-1 ring-black/10 dark:ring-white/30', dotColor)} />
                  </button>
                ))}

                <span className="mx-0.5 h-4 w-px bg-border select-none" aria-hidden="true" />

                <button
                  type="button"
                  role="menuitem"
                  onPointerDown={event => {
                    event.preventDefault();
                    applyColor('highlight');
                    setShowColorMenu(false);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95"
                  aria-label={t('editContent.formatHighlight')}
                  title={t('editContent.formatHighlight')}
                >
                  <Highlighter className="h-3.5 w-3.5 stroke-[2.2] text-amber-500 dark:text-amber-400" />
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onPointerDown={event => {
                    event.preventDefault();
                    applyColor('clear');
                    setShowColorMenu(false);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/60 transition hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 active:scale-95"
                  aria-label={t('editContent.colorClear')}
                  title={t('editContent.colorClear')}
                >
                  <X className="h-3.5 w-3.5 stroke-[2.2]" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <Textarea
        ref={textareaRef}
        id={id}
        value={value}
        dir={dir}
        onChange={event => onChange(event.target.value)}
        onSelect={event => readSelection(event.currentTarget)}
        onMouseUp={event => readSelection(event.currentTarget)}
        onKeyUp={event => readSelection(event.currentTarget)}
        onBlur={() => window.setTimeout(() => {
          setSelection(null);
          setShowColorMenu(false);
        }, 150)}
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
        rows={rows}
        className={cn(
          'min-h-[230px] resize-y rounded-xl border border-border bg-background text-foreground px-4 py-4 text-start text-sm leading-7 shadow-xs focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary',
          className,
        )}
        placeholder={placeholder}
        spellCheck
      />
    </div>
  );
};
