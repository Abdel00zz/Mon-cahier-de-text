import React, { useCallback, useRef, useState } from 'react';
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
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import './contextualDescriptionEditor.css';
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
  const colorSelection = useRef<{ start: number; end: number } | null>(null);
  const colorApplied = useRef(false);

  // Annuler / rétablir sans bouton : l'historique conserve chaque frappe et mise en forme.
  const history = useTextHistory({ value, setValue: onChange, textareaRef });
  const [showColorMenu, setShowColorMenu] = useState(false);

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
    const start = colorSelection.current?.start ?? textarea?.selectionStart ?? value.length;
    const end = colorSelection.current?.end ?? textarea?.selectionEnd ?? value.length;
    const hasSelection = end > start;

    if (!hasSelection) {
      if (colorId === 'clear') {
        window.requestAnimationFrame(() => {
          textarea?.focus();
          textarea?.setSelectionRange(start, start);
        });
        return;
      }
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
    <div className="content-composer">
      <div role="toolbar" aria-label={t('editContent.formatSelection')} className="content-composer__toolbar">
        <div role="group" aria-label={t('editContent.formatSelection')} className="content-composer__group">
          {TEXT_ACTIONS.map(({ action, icon: Icon, labelKey, shortcut }) => (
            <button key={action} type="button" className="content-composer__tool"
              onMouseDown={event => event.preventDefault()} onClick={() => applyFormat(action)}
              aria-label={t(labelKey)} title={`${t(labelKey)} (${shortcut})`}>
              <Icon />
            </button>
          ))}
        </div>
        <span className="content-composer__separator" aria-hidden="true" />
        <div role="group" aria-label={t('editContent.formatBullets')} className="content-composer__group">
          {LIST_ACTIONS.map(({ action, icon: Icon, labelKey }) => (
            <button key={action} type="button" className="content-composer__tool"
              onMouseDown={event => event.preventDefault()} onClick={() => applyFormat(action)}
              aria-label={t(labelKey)} title={t(labelKey)}><Icon /></button>
          ))}
        </div>
        <span className="content-composer__separator" aria-hidden="true" />
        <div className="content-composer__group">
          <button type="button" className="content-composer__tool"
            onMouseDown={event => event.preventDefault()} onClick={() => applyFormat('math')}
            aria-label={t('editContent.formatMath')} title={t('editContent.formatMath')}><Sigma /></button>
          <button type="button" className="content-composer__tool content-composer__highlight"
            onMouseDown={event => event.preventDefault()} onClick={() => applyColor('highlight')}
            aria-label={t('editContent.formatHighlight')} title={t('editContent.formatHighlight')}><Highlighter /></button>
          <DropdownMenu modal={false} open={showColorMenu} onOpenChange={open => {
            if (open) {
              const textarea = textareaRef.current;
              colorSelection.current = { start: textarea?.selectionStart ?? value.length, end: textarea?.selectionEnd ?? value.length };
              colorApplied.current = false;
            } else {
              colorSelection.current = null;
            }
            setShowColorMenu(open);
          }}>
            <DropdownMenuTrigger asChild>
              <button type="button" className="content-composer__tool" aria-label={t('editContent.formatColor')}
                title={t('editContent.formatColor')}><Palette /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="content-composer__palette"
              aria-label={t('editContent.formatColor')}
              onCloseAutoFocus={event => {
                if (colorApplied.current) event.preventDefault();
              }}>
              <DropdownMenuLabel className="content-composer__palette-label">{t('editContent.formatColor')}</DropdownMenuLabel>
              <div className="content-composer__swatches">
                {COLOR_OPTIONS.map(({ id: colorId, nameKey, dotColor }) => (
                  <DropdownMenuItem key={colorId} className="content-composer__color" onSelect={() => {
                    colorApplied.current = true;
                    applyColor(colorId);
                  }}>
                    <span className={cn('content-composer__swatch', dotColor)} aria-hidden="true" />
                    <span>{t(nameKey)}</span>
                  </DropdownMenuItem>
                ))}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="content-composer__clear" onSelect={() => {
                colorApplied.current = true;
                applyColor('clear');
              }}><X /><span>{t('editContent.colorClear')}</span></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Editor Body */}
      <div className="content-composer__body">
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
            'content-composer__input w-full min-h-[120px] border-none bg-transparent p-0 text-start text-[15px] leading-[1.65] text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-0 shadow-none resize-none',
            className,
          )}
          placeholder={placeholder}
          spellCheck
        />
      </div>
    </div>
  );
};
