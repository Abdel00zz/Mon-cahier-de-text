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
    <div className="editor-zone-box group relative flex flex-col rounded-xl border border-zinc-300/85 dark:border-zinc-800 bg-background shadow-xs transition-colors duration-150 focus-within:ring-2 focus-within:ring-primary/25 focus-within:border-primary overflow-hidden">
      {/* Barre d'outils intégrée directement dans la zone - Style noir / obsidian élégant */}
      <div
        role="toolbar"
        aria-label={t('editContent.formatSelection')}
        className="editor-zone-toolbar relative z-10 flex items-center justify-between gap-1 border-b border-zinc-800/90 bg-[#0d0d10] dark:bg-black px-2.5 py-1.5 text-zinc-200 select-none shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
      >
        <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto scrollbar-none py-0.5">
          {/* Groupe typographie : Gras, Italique, Souligné */}
          <div className="flex items-center gap-0.5">
            {TEXT_ACTIONS.map(({ action, icon: Icon, labelKey, shortcut }) => (
              <button
                key={action}
                type="button"
                onPointerDown={event => {
                  event.preventDefault();
                  applyFormat(action);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-all duration-150 hover:bg-zinc-800/90 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 active:scale-90 active:bg-zinc-700/80"
                aria-label={`${t(labelKey)}${shortcut ? ` (${shortcut})` : ''}`}
                title={`${t(labelKey)}${shortcut ? ` (${shortcut})` : ''}`}
              >
                <Icon className="h-3.5 w-3.5 stroke-[2.2]" />
              </button>
            ))}
          </div>

          <span className="mx-1 h-3.5 w-px bg-zinc-800/80 select-none shrink-0" aria-hidden="true" />

          {/* Groupe listes : Puces, Numérotée */}
          <div className="flex items-center gap-0.5">
            {LIST_ACTIONS.map(({ action, icon: Icon, labelKey }) => (
              <button
                key={action}
                type="button"
                onPointerDown={event => {
                  event.preventDefault();
                  applyFormat(action);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-all duration-150 hover:bg-zinc-800/90 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 active:scale-90 active:bg-zinc-700/80"
                aria-label={t(labelKey)}
                title={t(labelKey)}
              >
                <Icon className="h-3.5 w-3.5 stroke-[2.2]" />
              </button>
            ))}
          </div>

          <span className="mx-1 h-3.5 w-px bg-zinc-800/80 select-none shrink-0" aria-hidden="true" />

          {/* Formule mathématique TeX / KaTeX (Sigma) */}
          <button
            type="button"
            onPointerDown={event => {
              event.preventDefault();
              applyFormat('math');
            }}
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-all duration-150 hover:bg-zinc-800/90 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 active:scale-90 active:bg-zinc-700/80"
            aria-label={t('editContent.formatMath')}
            title={t('editContent.formatMath')}
          >
            <Sigma className="h-3.5 w-3.5 stroke-[2.2]" />
          </button>

          <span className="mx-1 h-3.5 w-px bg-zinc-800/80 select-none shrink-0" aria-hidden="true" />

          {/* Surlignage rapide */}
          <button
            type="button"
            onPointerDown={event => {
              event.preventDefault();
              applyColor('highlight');
            }}
            className="flex h-7 w-7 items-center justify-center rounded-md text-amber-400 transition-all duration-150 hover:bg-amber-400/15 hover:text-amber-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400 active:scale-90"
            aria-label={t('editContent.formatHighlight')}
            title={t('editContent.formatHighlight')}
          >
            <Highlighter className="h-3.5 w-3.5 stroke-[2.2]" />
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
                'flex h-7 w-7 items-center justify-center rounded-md transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 active:scale-90',
                showColorMenu
                  ? 'bg-zinc-800 text-white shadow-xs'
                  : 'text-zinc-400 hover:bg-zinc-800/90 hover:text-white',
              )}
              aria-label={t('editContent.formatColor')}
              title={t('editContent.formatColor')}
              aria-haspopup="true"
              aria-expanded={showColorMenu}
            >
              <Palette className="h-3.5 w-3.5 stroke-[2.2]" />
            </button>

            {/* Menu déroulant des couleurs en noir obsidian */}
            {showColorMenu && (
              <div
                role="menu"
                aria-label={t('editContent.formatColor')}
                className="absolute start-0 sm:start-auto sm:end-0 top-[calc(100%+6px)] z-30 flex items-center gap-1 rounded-xl border border-zinc-800 bg-[#0d0d10] p-1.5 text-zinc-100 shadow-2xl backdrop-blur-xl animate-fade-in"
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
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 active:scale-90"
                    aria-label={t(nameKey)}
                    title={t(nameKey)}
                  >
                    <span className={cn('h-3.5 w-3.5 rounded-full ring-1 ring-white/20', dotColor)} />
                  </button>
                ))}

                <span className="mx-0.5 h-4 w-px bg-zinc-800 select-none" aria-hidden="true" />

                <button
                  type="button"
                  role="menuitem"
                  onPointerDown={event => {
                    event.preventDefault();
                    applyColor('clear');
                    setShowColorMenu(false);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-rose-500/20 hover:text-rose-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-400 active:scale-90"
                  aria-label={t('editContent.colorClear')}
                  title={t('editContent.colorClear')}
                >
                  <X className="h-3.5 w-3.5 stroke-[2.2]" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Badge innovant KaTeX / Markdown */}
        <div className="hidden sm:flex items-center gap-2 pe-1 text-[11px] font-mono text-zinc-400 select-none">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            TeX · MD
          </span>
        </div>
      </div>

      {/* Zone de texte intégrée directement */}
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
          'w-full flex-1 resize-y border-0 bg-transparent px-3.5 py-3 text-start text-sm leading-6 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus-visible:ring-0 focus-visible:border-0 shadow-none rounded-none',
          className,
        )}
        placeholder={placeholder}
        spellCheck
      />
    </div>
  );
};
