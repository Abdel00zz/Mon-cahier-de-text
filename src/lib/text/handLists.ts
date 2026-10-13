/*
 * LISTES TAPÉES À LA MAIN, AVEC LEURS SOUS-QUESTIONS.
 *
 * Un énoncé ou un corrigé s'écrit naturellement avec l'indentation :
 *
 *   1.
 *      a. Premier calcul.
 *
 *         Suite du raisonnement, sur une ligne à part.
 *
 *      b. Second calcul :
 *         - cas 1
 *         - cas 2
 *   2. Question suivante.
 *
 * Ce module lit cette structure (marqueur `1.` / `a.` / `-`, indentation, lignes de suite) et la réécrit
 * en environnements de liste que le moteur sait déjà composer (`\begin{enumerate}`, `\item[a.]`…).
 * Les marqueurs tapés sont CONSERVÉS tels quels (1., 4., a., b., •) : le professeur garde la main sur la
 * numérotation, comme avec la liste à plat.
 *
 * Prudence : un groupe sans sous-structure (aucune sous-liste, aucune suite après une ligne vide, aucune
 * lettre) est laissé intact — la liste à plat du moteur le traite comme avant. Module pur, sans React.
 */

type Kind = 'ordered' | 'bullet';
type Part = string | ListNode;
interface ListNode { kind: Kind; items: ItemNode[] }
interface ItemNode { label: string; parts: Part[] }

interface Marker { indent: number; kind: Kind; label: string; content: string; letter: boolean }

const MARKER = /^([ \t]*)(?:(\d+|[\u0660-\u0669\u06F0-\u06F9]+)[.)]|([a-z])[.)]|([-+]))(?:[ \t]+(.*))?$/u;
/** Une ligne qui peut contenir un marqueur indenté ou une tête de question vide : sinon, rien à faire. */
const WORTH_PARSING = /^[ \t]+(?:\d+[.)]|[-+]|[a-z][.)])[ \t]|^\d+[.)][ \t]*$/m;

const STRUCTURAL_LINE = /^[ \t]*(?:#{1,3}[ \t]+\S|\\(?:begin|end|item)\b)/;
const indentOf = (whitespace: string): number => [...whitespace].reduce((total, char) => total + (char === '\t' ? 4 : 1), 0);

function parseMarker(line: string): Marker | null {
  const match = MARKER.exec(line);
  if (!match) return null;
  const [, space, digits, letter, bullet, rest = ''] = match;
  const content = rest.trim();
  if (bullet && !content) return null; // « - » seul : un tiret, pas une puce
  if (digits) return { indent: indentOf(space), kind: 'ordered', label: `${digits}.`, content, letter: false };
  if (letter) return content ? { indent: indentOf(space), kind: 'ordered', label: `${letter}.`, content, letter: true } : null;
  return { indent: indentOf(space), kind: 'bullet', label: '•', content, letter: false };
}

interface OpenItem { list: ListNode; item: ItemNode; indent: number; container: Part[] }

/** Analyse un groupe à partir de `start` ; renvoie l'arbre, la fin du groupe et s'il porte une vraie structure. */
function parseGroup(lines: string[], start: number): { root: Part[]; end: number; structured: boolean } | null {
  const first = parseMarker(lines[start]);
  if (!first || first.letter) return null;
  const root: Part[] = [];
  const stack: OpenItem[] = [];
  let structured = false;
  let blankPending = false;
  let cursor = start;

  const open = (marker: Marker, container: Part[]) => {
    const item: ItemNode = { label: marker.label, parts: marker.content ? [marker.content] : [] };
    const last = container[container.length - 1];
    const list: ListNode = typeof last === 'object' && last.kind === marker.kind && stack.length === 0 ? last : { kind: marker.kind, items: [] };
    if (list !== last) container.push(list);
    list.items.push(item);
    stack.push({ list, item, indent: marker.indent, container });
  };

  for (; cursor < lines.length; cursor += 1) {
    const line = lines[cursor];
    if (!line.trim()) { blankPending = true; continue; }
    const marker = parseMarker(line);
    const indent = indentOf(/^[ \t]*/.exec(line)![0]);

    if (marker && (!marker.letter || (stack.length > 0 && marker.indent > stack[0].indent))) {
      // Une tête vide (« 1. ») n'est une tête que si une sous-question suit.
      if (!marker.content && marker.kind === 'ordered' && !marker.letter) {
        const next = lines.slice(cursor + 1).find(candidate => candidate.trim());
        const nextMarker = next ? parseMarker(next) : null;
        if (!nextMarker || nextMarker.indent <= marker.indent) {
          if (stack.length === 0) return null;
          // Ligne « 3. » isolée au milieu d'un texte : une ligne de suite ordinaire.
          stack[stack.length - 1].item.parts.push(line.trim());
          continue;
        }
      }
      if (marker.letter) structured = true;
      while (stack.length > 0 && stack[stack.length - 1].indent > marker.indent) stack.pop();
      const top = stack[stack.length - 1];
      if (top && top.indent === marker.indent) {
        // Frère : même liste si même nature, sinon une nouvelle liste à ce niveau.
        const { container } = top;
        stack.pop();
        const sibling: Marker = marker;
        const previous = container[container.length - 1];
        if (typeof previous === 'object' && previous.kind === sibling.kind) {
          const item: ItemNode = { label: sibling.label, parts: sibling.content ? [sibling.content] : [] };
          previous.items.push(item);
          stack.push({ list: previous, item, indent: sibling.indent, container });
        } else {
          open(sibling, container);
        }
      } else if (top) {
        structured = true; // sous-liste
        open(marker, top.item.parts);
      } else {
        open(marker, root);
      }
      blankPending = false;
      continue;
    }

    // Ligne de texte.
    // Un titre ou une commande de structure ferme toujours le groupe, collés ou non à la liste.
    if (STRUCTURAL_LINE.test(line)) break;
    if (stack.length === 0) break;
    const outermost = stack[0].indent;
    if (indent <= outermost && blankPending) break; // retour au texte courant : fin du groupe
    if (indent <= outermost && !blankPending) {
      // Suite « paresseuse » collée à l'item (comme la liste à plat) : elle lui appartient.
      stack[stack.length - 1].item.parts.push(line.trim());
      continue;
    }
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
    const target = stack[stack.length - 1].item;
    if (blankPending) { target.parts.push(''); structured = true; }
    target.parts.push(line.trim());
    blankPending = false;
  }
  // La fin de groupe ne mange pas les lignes vides qui la précèdent.
  return { root, end: cursor, structured };
}

function emitList(list: ListNode): string {
  const environment = list.kind === 'ordered' ? 'enumerate' : 'itemize';
  const body = list.items.map(item => {
    const parts: string[] = [];
    item.parts.forEach(part => parts.push(typeof part === 'string' ? part : emitList(part)));
    // Tête de question vide (« 1. » puis sous-questions) : la sous-liste démarre sur la ligne suivante.
    const headIsText = typeof item.parts[0] === 'string';
    const [head, rest] = headIsText ? [parts[0], parts.slice(1)] : ['', parts];
    const lines = [`\\item[${item.label}] ${head}`.trimEnd(), ...rest];
    // Une ligne vide en queue ne sert à rien : le moteur retire les blancs de bord.
    while (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
    return lines.join('\n');
  });
  return `\\begin{${environment}}\n${body.join('\n')}\n\\end{${environment}}`;
}

/** Réécrit les groupes de liste à sous-structure en environnements de liste ; le reste est inchangé. */
export function nestHandTypedLists(source: string): string {
  if (!WORTH_PARSING.test(source)) return source;
  const lines = source.split('\n');
  const out: string[] = [];
  for (let index = 0; index < lines.length;) {
    const group = parseMarker(lines[index]) ? parseGroup(lines, index) : null;
    if (!group || !group.structured) {
      out.push(lines[index]);
      index += 1;
      continue;
    }
    out.push(...group.root.map(part => (typeof part === 'string' ? part : emitList(part))).join('\n').split('\n'));
    // Les lignes vides qui séparaient le groupe du texte suivant sont conservées.
    index = group.end;
    if (index < lines.length) out.push('');
  }
  return out.join('\n');
}
