import { useState, type MutableRefObject, type Ref } from 'react';
import { X } from 'lucide-react';
import './notebookTracking.css';
import './studentAdd.css';

/*
 * LA SAISIE D'UN NOM — un champ, et son bouton « + » À CÔTÉ (jamais dedans).
 *
 * Le brouillon vit ICI : taper une lettre ne refait pas le rendu de toute la liste d'élèves (un champ de
 * liste par élève). Le parent ne lit le brouillon qu'au moment d'enregistrer, par `draftRef`.
 * Entrée, virgule (latine ou arabe) ou collage d'une liste valident ; Échap efface, puis ferme.
 */
interface StudentAddFieldProps {
  draftRef: MutableRefObject<string>;
  placeholder: string;
  label: string;
  addLabel: string;
  /** Valide le texte : renvoie la nouvelle liste, ou `null` si elle est refusée (le brouillon est alors gardé). */
  onCommit: (raw: string) => string[] | null;
  variant?: 'entry' | 'inline';
  autoFocus?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  /** Variante en ligne : ferme la zone d'ajout. */
  onClose?: () => void;
  closeLabel?: string;
  /** Un nom resté dans le champ est validé en le quittant (liste simple des absents). */
  commitOnBlur?: boolean;
}

export function StudentAddField({
  draftRef, placeholder, label, addLabel, onCommit, variant = 'entry', autoFocus = false, inputRef, onClose, closeLabel, commitOnBlur = false,
}: StudentAddFieldProps) {
  const [value, setValue] = useState(draftRef.current);
  const update = (next: string) => { draftRef.current = next; setValue(next); };
  const commit = (raw: string) => { if (onCommit(raw)) update(''); };

  return (
    <div className={`student-add student-add--${variant}`}>
      <div className="student-add__field">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={event => update(event.target.value)}
          onKeyDown={event => {
            if (['Enter', ',', '،'].includes(event.key) && !event.nativeEvent.isComposing) {
              event.preventDefault();
              commit(value);
            } else if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
              if (value) { event.stopPropagation(); update(''); }
              else if (onClose) { event.stopPropagation(); onClose(); }
            }
          }}
          onPaste={event => {
            const text = event.clipboardData.getData('text');
            if (/[،؛,;\n]/.test(text)) {
              event.preventDefault();
              commit(text);
            }
          }}
          onBlur={commitOnBlur ? () => { if (value.trim()) commit(value); } : undefined}
          placeholder={placeholder}
          aria-label={label}
          dir="auto"
          autoFocus={autoFocus}
          enterKeyHint="done"
          autoComplete="off"
        />
      </div>
      <button type="button" onClick={() => commit(value)} disabled={!value.trim()} className="student-add__button" aria-label={addLabel} title={addLabel}>
        <span aria-hidden="true">+</span>
      </button>
      {onClose && (
        <button type="button" onClick={onClose} className="student-add__close" aria-label={closeLabel} title={closeLabel}>
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
