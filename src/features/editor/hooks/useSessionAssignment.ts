import { useCallback, useRef, useState } from 'react';
import type { Draft } from 'immer';
import type { AppLocale, Indices, LessonsData } from '@/types';
import { applySessionEdit, readSessionSelection, type SessionPatch } from '@/domain/notebook/sessionEditing';
import { dateOrderWarnings, selectionDateOrder } from '@/domain/calendar/dateOrder';
import type { DateWarning } from '@/domain/calendar/dateValidation';
import type { HistoryEffects } from './useHistoryState';

export interface SessionEditorState {
  selection: NonNullable<ReturnType<typeof readSessionSelection>>;
  intent: 'date' | 'remark';
  patch?: SessionPatch;
  source: LessonsData;
}

interface Options {
  lessonsData: LessonsData;
  locale: AppLocale;
  setState: (recipe: (draft: Draft<LessonsData>) => void, action: string, effects?: HistoryEffects) => void;
  getDateWarnings: (date: string) => DateWarning[];
  getSelectionWarnings?: (source: LessonsData, targets: readonly Indices[], patch: SessionPatch) => DateWarning[];
  revision?: unknown;
  isActive: () => boolean;
  onOpen: () => void;
  onClose: () => void;
  onSaved: () => void;
  onActivityRemarks?: (patch: SessionPatch, session: SessionEditorState) => HistoryEffects | undefined;
  onStale: () => void;
}

/** One transaction for a session; review never writes a partial draft. */
export function useSessionAssignment(options: Options) {
  const latest = useRef(options);
  latest.current = options;
  const [editor, setEditor] = useState<SessionEditorState | null>(null);
  const [review, setReview] = useState<{ date: string; warnings: DateWarning[]; commit: () => void } | null>(null);

  const cancel = useCallback(() => { setEditor(null); setReview(null); }, []);
  const open = useCallback((targets: readonly Indices[], intent: 'date' | 'remark' = 'date') => {
    const { lessonsData, isActive, onOpen } = latest.current;
    if (!isActive()) return;
    const selection = readSessionSelection(lessonsData, targets);
    if (!selection) return;
    setEditor({ selection, intent, source: lessonsData });
    setReview(null);
    onOpen();
  }, []);

  const request = useCallback((session: SessionEditorState, patch: SessionPatch) => {
    const { getDateWarnings, locale, revision } = latest.current;
    setEditor({ ...session, patch });
    const commit = () => {
      const current = latest.current;
      if (!current.isActive() || current.lessonsData !== session.source || current.revision !== revision) {
        cancel();
        current.onClose();
        current.onStale();
        return;
      }
      const effects = current.onActivityRemarks?.(patch, session);
      current.setState(draft => { applySessionEdit(draft, session.selection.targets, patch); }, 'assign-date', effects);
      cancel();
      current.onSaved();
      current.onClose();
    };
    const warnings = patch.date ? [
      ...getDateWarnings(patch.date),
      ...dateOrderWarnings(patch.date, selectionDateOrder(session.source, session.selection.targets), locale),
      ...(latest.current.getSelectionWarnings?.(session.source, session.selection.targets, patch) ?? []),
    ] : [];
    if (warnings.length) {
      setReview({ date: patch.date!, warnings, commit });
      latest.current.onClose();
    } else commit();
  }, [cancel]);

  const apply = useCallback((patch: SessionPatch) => {
    if (editor) request(editor, patch);
  }, [editor, request]);

  const assignDate = useCallback((targets: readonly Indices[], date: string) => {
    const source = latest.current.lessonsData;
    const selection = readSessionSelection(source, targets);
    if (selection) request({ source, selection, intent: 'date' }, { date });
  }, [request]);

  const modify = useCallback(() => {
    setReview(null);
    latest.current.onOpen();
  }, []);
  const confirm = useCallback(() => { if (!review?.warnings.some(warning => warning.blocking)) review?.commit(); }, [review]);
  return { editor, review, open, apply, assignDate, modify, confirm, cancel };
}
