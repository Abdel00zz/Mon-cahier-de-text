/** Stage serialized values before writing. localStorage has no transactions:
 * this rolls back synchronous write failures, but is not crash/multi-tab atomic. */
export function writeStorageBatch(entries: ReadonlyMap<string, string | null>, storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = localStorage): void {
  const previous = new Map([...entries.keys()].map(key => [key, storage.getItem(key)]));
  const changed: string[] = [];
  try {
    for (const [key, value] of entries) {
      if (previous.get(key) === value) continue;
      if (value === null) storage.removeItem(key); else storage.setItem(key, value);
      changed.push(key);
    }
  } catch (cause) {
    try {
      // Release new values first: the previous values already fitted in storage.
      for (const key of changed) storage.removeItem(key);
      for (const key of changed) {
        const value = previous.get(key);
        if (value !== null && value !== undefined) storage.setItem(key, value);
      }
    } catch {
      throw new Error('Restauration interrompue : le stockage est inaccessible. Conservez votre fichier de sauvegarde.', { cause });
    }
    throw new Error('Restauration annulée : écriture impossible. Les données précédentes ont été conservées.', { cause });
  }
}
