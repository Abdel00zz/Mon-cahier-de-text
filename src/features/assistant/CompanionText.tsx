import { uniq } from 'es-toolkit';

/** Literal highlights only: no HTML/Markdown parsing, including class names supplied by users. */
export function companionTextParts(text: string, highlights: readonly string[]) {
  const terms = uniq(highlights.filter(Boolean)).sort((a, b) => b.length - a.length);
  const parts: { text: string; strong: boolean }[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    let at = -1, term = '';
    for (const value of terms) {
      const index = text.indexOf(value, cursor);
      if (index >= 0 && (at < 0 || index < at)) { at = index; term = value; }
    }
    if (at < 0) { parts.push({ text: text.slice(cursor), strong: false }); break; }
    if (at > cursor) parts.push({ text: text.slice(cursor, at), strong: false });
    parts.push({ text: term, strong: true }); cursor = at + term.length;
  }
  return parts;
}

export function CompanionText({ text, highlights = [] }: { text: string; highlights?: readonly string[] }) {
  return <>{companionTextParts(text, highlights).map((part, i) => part.strong
    ? <strong key={i} className="assistant-panel__emphasis"><bdi>{part.text}</bdi></strong> : part.text)}</>;
}
