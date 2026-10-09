import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useLocale } from '@/i18n/LocaleProvider';
import { conflictMessage, detectEvaluationConflicts, type EvaluationSlot } from '@/domain/evaluations/evaluationConflicts';

/** Confirmation belongs to the exact snapshot reviewed, never to a stale cloud copy. */
export function useEvaluationConflictGuard(slots: EvaluationSlot[], revision: unknown) {
  const { t, locale } = useLocale();
  const latest = useRef(revision);
  latest.current = revision;
  const [pending, setPending] = useState<{ message: string; commit: () => void } | null>(null);
  const run = (candidate: EvaluationSlot, commit: () => void, editingId?: string) => {
    const mirrors = editingId ? slots.filter(slot => slot.id === editingId && slot.family === candidate.family) : [];
    if (mirrors.length > 1) {
      toast.error(conflictMessage({ kind: 'binding', candidate, existing: mirrors[0] }, locale));
      return;
    }
    const conflicts = detectEvaluationConflicts({ ...candidate, key: `candidate:${candidate.key}` }, slots.filter(slot => !(editingId && slot.id === editingId && slot.family === candidate.family)));
    const duplicate = conflicts.find(conflict => conflict.kind === 'identity' || conflict.kind === 'binding');
    if (duplicate) { toast.error(conflictMessage(duplicate, locale)); return; }
    if (!conflicts.length) { commit(); return; }
    setPending({
      message: [...new Set(conflicts.map(conflict => conflictMessage(conflict, locale)))].join('\n'),
      commit: () => {
        if (latest.current !== revision) { toast.info(t('evaluations.conflict.stale')); return; }
        commit();
      },
    });
  };
  const dialog = <ConfirmDialog open={!!pending} onOpenChange={open => { if (!open) setPending(null); }}
    title={t('evaluations.conflict.title')} description={pending?.message ?? ''} variant="default"
    confirmLabel={t('evaluations.conflict.keep')} cancelLabel={t('evaluations.conflict.modify')}
    onConfirm={() => pending?.commit()} />;
  return { run, dialog };
}
