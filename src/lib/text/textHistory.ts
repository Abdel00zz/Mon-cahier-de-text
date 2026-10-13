/*
 * HISTORIQUE INTERNE D'UN CHAMP DE TEXTE — annuler / rétablir sans bouton.
 *
 * Le champ est piloté par React : chaque valeur posée par le code (insertion, mise en forme, rechargement)
 * efface la pile native du navigateur, et sur téléphone elle n'existe pas du tout. Cette pile est donc tenue ici,
 * identique partout, et se commande au clavier (Ctrl/Cmd + Z, Ctrl/Cmd + Maj + Z, Ctrl + Y) ou par les
 * commandes d'édition du système (`historyUndo` / `historyRedo`).
 *
 * Une série de frappes ou de suppressions rapprochées, collées au curseur, ne fait qu'UNE étape (par mot) ;
 * un collage, une mise en forme ou une pause ouvrent une nouvelle étape. La pile est bornée en nombre d'étapes
 * ET en caractères, donc un long document ne gonfle jamais la mémoire.
 *
 * Module pur : aucune dépendance à React ni au DOM.
 */

export interface TextSnapshot { value: string; start: number; end: number }

interface Change { prefix: number; removed: string; inserted: string }

/** Plus petite zone modifiée entre deux textes (préfixe et suffixe communs retirés). */
function diff(before: string, after: string): Change {
  const shortest = Math.min(before.length, after.length);
  let prefix = 0;
  while (prefix < shortest && before.charCodeAt(prefix) === after.charCodeAt(prefix)) prefix += 1;
  let suffix = 0;
  while (suffix < shortest - prefix && before.charCodeAt(before.length - 1 - suffix) === after.charCodeAt(after.length - 1 - suffix)) suffix += 1;
  return { prefix, removed: before.slice(prefix, before.length - suffix), inserted: after.slice(prefix, after.length - suffix) };
}

type RunKind = 'insert' | 'delete';

const isSpace = (char: string | undefined): boolean => char !== undefined && /\s/u.test(char);

export class TextHistory {
  private states: TextSnapshot[];
  private index = 0;
  private runKind: RunKind | null = null;
  private runAt = 0;
  private characters = 0;

  constructor(initial: string | TextSnapshot, private readonly limit = 400, private readonly budget = 3_000_000, private readonly mergeMs = 900) {
    const snapshot = typeof initial === 'string' ? { value: initial, start: initial.length, end: initial.length } : initial;
    this.states = [snapshot];
    this.characters = snapshot.value.length;
  }

  get canUndo(): boolean { return this.index > 0; }
  get canRedo(): boolean { return this.index < this.states.length - 1; }
  /** Le texte courant de la pile. */
  get current(): string { return this.states[this.index].value; }

  reset(initial: string | TextSnapshot): void {
    const snapshot = typeof initial === 'string' ? { value: initial, start: initial.length, end: initial.length } : initial;
    this.states = [snapshot];
    this.index = 0;
    this.runKind = null;
    this.characters = snapshot.value.length;
  }

  /** Note la valeur courante du champ et la sélection qui l'accompagne. */
  record(next: TextSnapshot, now: number = Date.now()): void {
    const current = this.states[this.index];
    if (next.value === current.value) {
      this.states[this.index] = { ...current, start: next.start, end: next.end };
      return;
    }
    const change = diff(current.value, next.value);
    const kind: RunKind | null = change.removed === '' && change.inserted.length <= 2 && !change.inserted.includes('\n') ? 'insert'
      : change.inserted === '' && change.removed.length <= 2 ? 'delete' : null;
    const continuesRun = this.index > 0 && kind !== null && kind === this.runKind && now - this.runAt <= this.mergeMs
      && (kind === 'insert'
        // Frappe au curseur, sans commencer un nouveau mot (la lettre qui suit une espace ouvre une étape).
        ? change.prefix === current.start && !(!isSpace(change.inserted[0]) && isSpace(current.value[change.prefix - 1]))
        : change.prefix + change.removed.length === current.start || change.prefix === current.start);
    this.runAt = now;
    if (continuesRun) {
      this.characters += next.value.length - current.value.length;
      this.states[this.index] = next;
      return;
    }
    for (const dropped of this.states.splice(this.index + 1)) this.characters -= dropped.value.length;
    this.states.push(next);
    this.index += 1;
    this.characters += next.value.length;
    this.runKind = kind;
    while (this.states.length > 2 && (this.states.length > this.limit || this.characters > this.budget)) {
      this.characters -= this.states[0].value.length;
      this.states.shift();
      this.index -= 1;
    }
  }

  undo(): TextSnapshot | null {
    if (!this.canUndo) return null;
    const from = this.states[this.index];
    this.index -= 1;
    this.runKind = null;
    return this.landing(from, this.states[this.index]);
  }

  redo(): TextSnapshot | null {
    if (!this.canRedo) return null;
    const from = this.states[this.index];
    this.index += 1;
    this.runKind = null;
    return this.landing(from, this.states[this.index]);
  }

  /** Le curseur retombe à la fin de la zone qui vient de changer, là où le professeur regardait. */
  private landing(from: TextSnapshot, to: TextSnapshot): TextSnapshot {
    const change = diff(from.value, to.value);
    const caret = change.prefix + change.inserted.length;
    return { value: to.value, start: caret, end: caret };
  }
}
