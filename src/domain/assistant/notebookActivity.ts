export type NotebookActivityKind = 'content' | 'dates' | 'order';
export interface NotebookActivity { kind: NotebookActivityKind; at: number }

/** Session memory of confirmed saves, not analytics or inferred teaching achievements. */
export function createNotebookActivityMemory() {
  const entries = new Map<string, NotebookActivity & { scope: string; revision: string }>();
  return {
    record(scope: string, classId: string, revision: string, operation: string | undefined, historyAction: string, now: number) {
      if (historyAction !== 'edit' || !operation || !revision) { entries.delete(classId); return; }
      const kind: NotebookActivityKind | undefined = operation === 'assign-date' ? 'dates'
        : /^(?:move|reorder)(?:-|$)/.test(operation) ? 'order'
          : /^(add-|edit-)/.test(operation) || operation === 'manage-lessons' ? 'content' : undefined;
      if (!kind) { entries.delete(classId); return; }
      const previous = entries.get(classId);
      if (previous?.scope === scope && previous.revision === revision) return;
      entries.delete(classId);
      entries.set(classId, { kind, at: now, scope, revision });
      if (entries.size > 24) entries.delete(entries.keys().next().value!);
    },
    read(scope: string, classId: string, revision: string | undefined, now: number): NotebookActivity | undefined {
      const entry = entries.get(classId);
      if (!entry) return;
      if (entry.scope !== scope || entry.revision !== revision || now < entry.at || now - entry.at > 30 * 60_000) {
        entries.delete(classId); return;
      }
      return { kind: entry.kind, at: entry.at };
    },
  };
}
