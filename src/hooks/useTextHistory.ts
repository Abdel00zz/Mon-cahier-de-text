import { useCallback, useEffect, useLayoutEffect, useRef, type KeyboardEvent, type RefObject } from 'react';
import { TextHistory, type TextSnapshot } from '@/lib/text/textHistory';

/*
 * Annuler / rétablir pour un champ de texte piloté, SANS bouton : Ctrl/Cmd + Z, Ctrl/Cmd + Maj + Z, Ctrl + Y,
 * et les commandes d'édition du système (menu du clavier, secousse sur iOS). Toute valeur qui change — frappe,
 * collage, mise en forme posée par le code — entre dans la pile ; annuler ou rétablir ne la remplit pas deux fois.
 */
interface Options {
  value: string;
  setValue: (value: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

export function useTextHistory({ value, setValue, textareaRef }: Options) {
  const history = useRef<TextHistory | null>(null);
  if (history.current === null) history.current = new TextHistory(value);
  const seen = useRef(value);
  const landing = useRef<TextSnapshot | null>(null);

  // Toute valeur nouvelle (frappe, collage, mise en forme) est notée avec la sélection du moment.
  useEffect(() => {
    if (value === seen.current) return;
    seen.current = value;
    const field = textareaRef.current;
    const focused = field !== null && field.ownerDocument.activeElement === field;
    history.current?.record({ value, start: focused ? field.selectionStart : value.length, end: focused ? field.selectionEnd : value.length });
  }, [value, textareaRef]);

  // Après un annuler / rétablir, le curseur retrouve sa place une fois la valeur posée.
  useLayoutEffect(() => {
    const target = landing.current;
    const field = textareaRef.current;
    if (!target || !field || field.value !== target.value) return;
    landing.current = null;
    field.setSelectionRange(target.start, target.end);
  });

  const apply = useCallback((snapshot: TextSnapshot | null) => {
    if (!snapshot) return;
    seen.current = snapshot.value;
    landing.current = snapshot;
    setValue(snapshot.value);
    const field = textareaRef.current;
    // Même valeur qu'avant (aucun rendu à venir) : la sélection se pose tout de suite.
    if (field && field.value === snapshot.value) { landing.current = null; field.setSelectionRange(snapshot.start, snapshot.end); }
  }, [setValue, textareaRef]);

  const undo = useCallback(() => apply(history.current?.undo() ?? null), [apply]);
  const redo = useCallback(() => apply(history.current?.redo() ?? null), [apply]);

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.nativeEvent.isComposing) return;
    const key = event.key.toLowerCase();
    if (key === 'z' && !event.shiftKey) { event.preventDefault(); undo(); }
    else if ((key === 'z' && event.shiftKey) || key === 'y') { event.preventDefault(); redo(); }
  }, [undo, redo]);

  // Commandes d'édition du système (`historyUndo` / `historyRedo`) : elles passent aussi par la pile interne.
  useEffect(() => {
    const field = textareaRef.current;
    if (!field) return undefined;
    const handle = (event: InputEvent) => {
      if (event.inputType === 'historyUndo') { event.preventDefault(); undo(); }
      else if (event.inputType === 'historyRedo') { event.preventDefault(); redo(); }
    };
    field.addEventListener('beforeinput', handle as EventListener);
    return () => field.removeEventListener('beforeinput', handle as EventListener);
  });

  /** Repart d'un texte neuf (autre document) : l'ancien historique ne s'applique pas à lui. */
  const reset = useCallback((next: string) => {
    seen.current = next;
    landing.current = null;
    history.current?.reset(next);
  }, []);

  return { onKeyDown, undo, redo, reset };
}
