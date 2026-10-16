import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bold,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Palette,
  Sigma,
  Underline,
  X,
} from '@/components/ui/icons';
import { Textarea } from '@/components/ui/textarea';
import { useLocale } from '@/i18n/LocaleProvider';
import { cn } from '@/lib/utils';
import { useTextHistory } from '@/hooks/useTextHistory';
import { findHighlightClose, highlightOpenAt, toggleHighlight } from '@/lib/text/highlightMarkers';

type FormatAction = 'bold' | 'italic' | 'underline' | 'bullets' | 'numbered' | 'math';

interface ContextualDescriptionEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows?: number;
  className?: string;
  dir?: 'ltr' | 'rtl' | 'auto';
  externalRef?: React.RefObject<HTMLTextAreaElement | null>;
}

const TEXT_ACTIONS: Array<{
  action: FormatAction;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  shortcut?: string;
}> = [
  { action: 'bold', icon: Bold, labelKey: 'editContent.formatBold', shortcut: 'Ctrl+B' },
  { action: 'italic', icon: Italic, labelKey: 'editContent.formatItalic', shortcut: 'Ctrl+I' },
  { action: 'underline', icon: Underline, labelKey: 'editContent.formatUnderline', shortcut: 'Ctrl+U' },
];

const LIST_ACTIONS: Array<{
  action: FormatAction;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
}> = [
  { action: 'bullets', icon: List, labelKey: 'editContent.formatBullets' },
  { action: 'numbered', icon: ListOrdered, labelKey: 'editContent.formatNumbered' },
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
  const unwrapped = selectedText.replace(/^\[color:[^\]]+\]([\s\S]*)\[\/color\]$/, '$1');
  // Un surlignage qui enveloppe toute la sélection se retire avec l'ancienne couleur (les `==` isolés restent du texte).
  const stripped = highlightOpenAt(unwrapped, 0) && findHighlightClose(unwrapped, 2) === unwrapped.length - 2 ? unwrapped.slice(2, -2) : unwrapped;

  if (colorId === 'clear') {
    return { value: stripped, inset: 0, coreLength: stripped.length };
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
  externalRef,
}) => {
  const { t } = useLocale();
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalRef ?? internalRef;
  const colorMenuRef = useRef<HTMLDivElement>(null);

  // Annuler / rétablir sans bouton : l'historique conserve chaque frappe et mise en forme.
  const history = useTextHistory({ value, setValue: onChange, textareaRef });
  const [showColorMenu, setShowColorMenu] = useState(false);

  // Fermer le menu des couleurs au clic externe ou sur Échap
  useEffect(() => {
    if (!showColorMenu) return;
    const handleOutside = (e: MouseEvent) => {
      if (colorMenuRef.current && !colorMenuRef.current.contains(e.target as Node)) {
        setShowColorMenu(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowColorMenu(false);
    };
    document.addEventListener('pointerdown', handleOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showColorMenu]);

  const applyFormat = useCallback((action: FormatAction) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const hasSelection = end > start;

    if (!hasSelection) {
      if (action === 'bullets' || action === 'numbered') {
        const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
        const lineEndIdx = value.indexOf('\n', start);
        const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
        const currentLine = value.slice(lineStart, lineEnd);
        const prefix = action === 'bullets' ? '- ' : '1. ';
        const cleanedLine = currentLine.replace(/^\s*(?:[-*]|\d+[.)])\s+/, '');
        const nextLine = currentLine.startsWith(prefix) ? cleanedLine : `${prefix}${cleanedLine}`;
        const nextValue = `${value.slice(0, lineStart)}${nextLine}${value.slice(lineEnd)}`;
        onChange(nextValue);
        const nextCursor = lineStart + nextLine.length;
        window.requestAnimationFrame(() => {
          textarea?.focus();
          textarea?.setSelectionRange(nextCursor, nextCursor);
        });
        return;
      }
      const formatted = formatSelection(action, '');
      const nextValue = `${value.slice(0, start)}${formatted.value}${value.slice(start)}`;
      onChange(nextValue);
      const nextCursor = start + formatted.inset;
      window.requestAnimationFrame(() => {
        textarea?.focus();
        textarea?.setSelectionRange(nextCursor, nextCursor);
      });
      return;
    }

    const selectedText = value.slice(start, end);
    const formatted = formatSelection(action, selectedText);
    const nextValue = `${value.slice(0, start)}${formatted.value}${value.slice(end)}`;
    onChange(nextValue);

    const nextStart = start + formatted.inset;
    const nextEnd = action === 'bullets' || action === 'numbered'
      ? start + formatted.value.length
      : nextStart + selectedText.length;
    window.requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(nextStart, nextEnd);
    });
  }, [onChange, textareaRef, value]);

  const applyColor = useCallback((colorId: string) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const hasSelection = end > start;

    if (!hasSelection) {
      if (colorId === 'clear') return;
      const before = colorId === 'highlight' ? '==' : `[color:${colorId}]`;
      const after = colorId === 'highlight' ? '==' : '[/color]';
      const nextValue = `${value.slice(0, start)}${before}${after}${value.slice(start)}`;
      onChange(nextValue);
      const nextCursor = start + before.length;
      window.requestAnimationFrame(() => {
        textarea?.focus();
        textarea?.setSelectionRange(nextCursor, nextCursor);
      });
      return;
    }

    if (colorId === 'highlight') {
      const edit = toggleHighlight(value, start, end);
      if (edit.value === value) return;
      onChange(edit.value);
      window.requestAnimationFrame(() => {
        textarea?.focus();
        textarea?.setSelectionRange(edit.start, edit.end);
      });
      return;
    }

    const selectedText = value.slice(start, end);
    const formatted = formatColorSelection(colorId, selectedText);
    const nextValue = `${value.slice(0, start)}${formatted.value}${value.slice(end)}`;
    onChange(nextValue);

    const nextStart = start + formatted.inset;
    const nextEnd = nextStart + formatted.coreLength;

    window.requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(nextStart, nextEnd);
    });
  }, [onChange, textareaRef, value]);

  return (
    <div className="editor rounded-[14px] overflow-hidden bg-white dark:bg-[#1c1c1a] shadow-[0_0_0_1px_#e4e4e0] dark:shadow-[0_0_0_1px_#2e2e28] transition-shadow duration-200 focus-within:shadow-[0_0_0_2px_hsl(var(--primary))]">
      {/* Barre d'outils cohérente inspirée du prototype */}
      <div
        role="toolbar"
        aria-label={t('editContent.formatSelection')}
        className="toolbar flex items-center justify-between gap-1 flex-wrap px-3 py-2 bg-[#f0f0ec] dark:bg-[#1e1e1b] border-b border-[#e4e4e0] dark:border-[#2e2e28] select-none"
      >
        <div className="flex items-center gap-1 flex-wrap">
          {/* Mode toggle TeX · MD */}
          <div className="mode-toggle inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-white dark:bg-[#282824] shadow-[0_0_0_1px_#e4e4e0] dark:shadow-[0_0_0_1px_#383832] text-[12px] font-semibold text-[#5e5e5a] dark:text-[#a8a8a2] me-1">
            <span>TeX</span>
            <span className="opacity-35">·</span>
            <span>MD</span>
            <span className="mode-dot w-[7px] h-[7px] rounded-full bg-[#34d399]" />
          </div>

          {/* Formule mathématique (Sigma) */}
          <button
            type="button"
            onPointerDown={event => {
              event.preventDefault();
              applyFormat('math');
            }}
            className="tool-btn w-9 h-9 border-none bg-transparent rounded-[9px] text-[#5e5e5a] dark:text-[#a8a8a2] flex items-center justify-center cursor-pointer transition-all duration-150 hover:bg-white hover:text-[#1c1c1a] hover:shadow-[0_0_0_1px_#e4e4e0] dark:hover:bg-[#2c2c28] dark:hover:text-white dark:hover:shadow-[0_0_0_1px_#383832] active:scale-95"
            aria-label={t('editContent.formatMath')}
            title={t('editContent.formatMath')}
          >
            <Sigma className="w-4 h-4 stroke-[1.8]" />
          </button>

          {/* Listes */}
          {LIST_ACTIONS.map(({ action, icon: Icon, labelKey }) => (
            <button
              key={action}
              type="button"
              onPointerDown={event => {
                event.preventDefault();
                applyFormat(action);
              }}
              className="tool-btn w-9 h-9 border-none bg-transparent rounded-[9px] text-[#5e5e5a] dark:text-[#a8a8a2] flex items-center justify-center cursor-pointer transition-all duration-150 hover:bg-white hover:text-[#1c1c1a] hover:shadow-[0_0_0_1px_#e4e4e0] dark:hover:bg-[#2c2c28] dark:hover:text-white dark:hover:shadow-[0_0_0_1px_#383832] active:scale-95"
              aria-label={t(labelKey)}
              title={t(labelKey)}
            >
              <Icon className="w-4 h-4 stroke-[1.8]" />
            </button>
          ))}

          <span className="tool-sep w-px h-4 bg-[#e4e4e0] dark:bg-[#34342e] mx-1 shrink-0" aria-hidden="true" />

          {/* Typographie : Souligné, Italique, Gras */}
          {TEXT_ACTIONS.map(({ action, icon: Icon, labelKey, shortcut }) => (
            <button
              key={action}
              type="button"
              onPointerDown={event => {
                event.preventDefault();
                applyFormat(action);
              }}
              className="tool-btn w-9 h-9 border-none bg-transparent rounded-[9px] text-[#5e5e5a] dark:text-[#a8a8a2] flex items-center justify-center cursor-pointer transition-all duration-150 hover:bg-white hover:text-[#1c1c1a] hover:shadow-[0_0_0_1px_#e4e4e0] dark:hover:bg-[#2c2c28] dark:hover:text-white dark:hover:shadow-[0_0_0_1px_#383832] active:scale-95"
              aria-label={`${t(labelKey)}${shortcut ? ` (${shortcut})` : ''}`}
              title={`${t(labelKey)}${shortcut ? ` (${shortcut})` : ''}`}
            >
              <Icon className="w-4 h-4 stroke-[1.8]" />
            </button>
          ))}

          <span className="tool-sep w-px h-4 bg-[#e4e4e0] dark:bg-[#34342e] mx-1 shrink-0" aria-hidden="true" />

          {/* Surlignage rapide */}
          <button
            type="button"
            onPointerDown={event => {
              event.preventDefault();
              applyColor('highlight');
            }}
            className="tool-btn w-9 h-9 border-none bg-transparent rounded-[9px] text-amber-600 dark:text-amber-400 flex items-center justify-center cursor-pointer transition-all duration-150 hover:bg-amber-50 hover:text-amber-700 hover:shadow-[0_0_0_1px_rgba(217,119,6,0.3)] dark:hover:bg-amber-950/40 dark:hover:text-amber-300 active:scale-95"
            aria-label={t('editContent.formatHighlight')}
            title={t('editContent.formatHighlight')}
          >
            <Highlighter className="w-4 h-4 stroke-[1.8]" />
          </button>

          {/* Palette de couleurs */}
          <div ref={colorMenuRef} className="relative">
            <button
              type="button"
              onPointerDown={event => {
                event.preventDefault();
                setShowColorMenu(prev => !prev);
              }}
              className={cn(
                'tool-btn w-9 h-9 border-none rounded-[9px] flex items-center justify-center cursor-pointer transition-all duration-150 active:scale-95',
                showColorMenu
                  ? 'bg-white text-[#1c1c1a] shadow-[0_0_0_1px_#e4e4e0] dark:bg-[#2c2c28] dark:text-white dark:shadow-[0_0_0_1px_#383832]'
                  : 'bg-transparent text-[#5e5e5a] dark:text-[#a8a8a2] hover:bg-white hover:text-[#1c1c1a] hover:shadow-[0_0_0_1px_#e4e4e0] dark:hover:bg-[#2c2c28] dark:hover:text-white',
              )}
              aria-label={t('editContent.formatColor')}
              title={t('editContent.formatColor')}
              aria-haspopup="true"
              aria-expanded={showColorMenu}
            >
              <Palette className="w-4 h-4 stroke-[1.8]" />
            </button>

            {/* Menu des couleurs */}
            {showColorMenu && (
              <div
                role="menu"
                aria-label={t('editContent.formatColor')}
                className="absolute start-0 sm:start-auto sm:end-0 top-[calc(100%+6px)] z-30 flex items-center gap-1 rounded-[12px] border border-[#e4e4e0] dark:border-[#2e2e28] bg-white dark:bg-[#1e1e1b] p-1.5 shadow-xl backdrop-blur-xl animate-fade-in"
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
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-[#5e5e5a] transition hover:bg-[#f2f2ef] dark:hover:bg-[#282824] active:scale-90"
                    aria-label={t(nameKey)}
                    title={t(nameKey)}
                  >
                    <span className={cn('h-3.5 w-3.5 rounded-full ring-1 ring-black/10 dark:ring-white/20', dotColor)} />
                  </button>
                ))}

                <span className="tool-sep w-px h-4 bg-[#e4e4e0] dark:bg-[#34342e] mx-0.5" aria-hidden="true" />

                <button
                  type="button"
                  role="menuitem"
                  onPointerDown={event => {
                    event.preventDefault();
                    applyColor('clear');
                    setShowColorMenu(false);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#5e5e5a] transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 active:scale-90"
                  aria-label={t('editContent.colorClear')}
                  title={t('editContent.colorClear')}
                >
                  <X className="w-3.5 h-3.5 stroke-[2]" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor Body */}
      <div className="editor-body p-3.5 sm:p-4 bg-[#fafaf8] dark:bg-[#141412]">
        <Textarea
          ref={textareaRef}
          id={id}
          value={value}
          dir={dir}
          onChange={event => onChange(event.target.value)}
          onKeyDown={event => {
            history.onKeyDown(event);
            if (event.defaultPrevented || !(event.ctrlKey || event.metaKey)) return;
            const action = event.key.toLowerCase() === 'b'
              ? 'bold'
              : event.key.toLowerCase() === 'i'
                ? 'italic'
                : event.key.toLowerCase() === 'u'
                  ? 'underline'
                  : null;
            if (!action) return;
            event.preventDefault();
            applyFormat(action);
          }}
          rows={rows}
          className={cn(
            'w-full min-h-[120px] border-none bg-transparent p-0 text-start text-[15px] leading-[1.65] text-[#1c1c1a] dark:text-[#f0f0ec] placeholder:text-[#9b9b96] focus:outline-none focus-visible:ring-0 shadow-none resize-none',
            className,
          )}
          placeholder={placeholder}
          spellCheck
        />
      </div>
    </div>
  );
};
