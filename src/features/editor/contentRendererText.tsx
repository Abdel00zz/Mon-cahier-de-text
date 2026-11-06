import React from 'react';
import { splitMathText } from '@/lib/text/math';
import { MathText } from '@/components/ui/math-text';
import { renderKatexHtml } from '@/config/katex';
import { toDisplayText } from '@/lib/text/textValue';
import { textDirectionAttribute } from '@/lib/text/textDirection';

type DisplayTextFields = { title?: unknown; description?: unknown; page?: unknown; number?: unknown };

/**
 * Ramène UNE fois pour toutes les champs texte d'un contenu à du texte
 * affichable : un titre d'objet ne doit pas finir en « [object Object] » dans
 * le cahier, ni un numéro non textuel faire planter React. Les valeurs vides
 * restent vides (falsy), donc les replis existants (placeholder, page absente)
 * continuent de fonctionner à l'identique.
 */
export const withDisplayText = <T extends DisplayTextFields>(item: T): T & Record<keyof DisplayTextFields, string> => ({
  ...item,
  title: toDisplayText(item.title),
  description: toDisplayText(item.description),
  page: toDisplayText(item.page),
  number: toDisplayText(item.number),
});

export const MaybeKaTeX: React.FC<{ children: React.ReactNode; mathSource: unknown; cacheKey: string }> = ({ children, mathSource, cacheKey }) => (
  <MathText source={mathSource} cacheKey={cacheKey}>{children}</MathText>
);

const HighlightedPlainText: React.FC<{ text: string; query?: string }> = ({ text, query }) => {
  const needle = query?.trim();
  if (!needle) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  const source = text.toLocaleLowerCase();
  const target = needle.toLocaleLowerCase();
  let cursor = 0;
  let match = source.indexOf(target);
  while (match >= 0) {
    if (match > cursor) parts.push(text.slice(cursor, match));
    parts.push(<mark key={`${match}-${target}`} className="rounded-sm bg-warning/30 px-0.5 text-inherit">{text.slice(match, match + needle.length)}</mark>);
    cursor = match + needle.length;
    match = source.indexOf(target, cursor);
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
};

/**
 * Surlignage de recherche SANS perdre les formules : un segment mathématique
 * est composé par KaTeX, le reste passe par le surlignage habituel. Avant,
 * le segment était recopié en texte brut — d'où les `$…$` visibles dans les
 * titres de chapitres, de blocs et d'items.
 */
export const HighlightedText: React.FC<{ text?: unknown; query?: string }> = ({ text, query }) => (
  <>
    {splitMathText(text).map((part, index) => (part.math ? (
      <span
        key={index}
        className="math-text"
        dangerouslySetInnerHTML={{ __html: renderKatexHtml(part.text) }}
      />
    ) : (
      <HighlightedPlainText key={index} text={part.text} query={query} />
    )))}
  </>
);

const renderChapterLabel = (input: unknown) => {
  const label = toDisplayText(input);
  const parts = label.split(/([0-9\u0660-\u0669]+(?:er|ere|eme|ère|ème|st|nd|rd|th)?)/gi);
  return parts.map((part, idx) => {
    if (!part) return null;
    const matchOrdinal = part.match(/^([0-9\u0660-\u0669]+)(er|ere|eme|ère|ème|st|nd|rd|th)$/i);
    if (matchOrdinal) {
      const num = matchOrdinal[1];
      const suf = matchOrdinal[2];
      return (
        <span key={idx} className="inline-block">
          <span>{num}</span>
          <sup className="relative -top-[0.45em] text-[0.6em] font-semibold">{suf}</sup>
        </span>
      );
    }
    return <span key={idx}>{part}</span>;
  });
};

export const renderChapterTitleStyled = (text: string) => {
  const trimmed = text.trim();
  const match = trimmed.match(
    /^(Chapitre\s+[^:\-–—\n]+|Chapter\s+[^:\-–—\n]+|الفصل\s+[^:\-–—\n]+|الباب\s+[^:\-–—\n]+|الوحدة\s+[^:\-–—\n]+|الدرس\s+[^:\-–—\n]+|المحور\s+[^:\-–—\n]+)(?:\s*([:\-–—])\s*(.*))?$/i
  );

  if (match) {
    const chapterPrefix = match[1].trim();
    const separator = match[2];
    const restTitle = match[3]?.trim();

    return (
      <span dir={textDirectionAttribute(trimmed)} className="inline-flex flex-wrap items-center justify-center gap-x-2 text-center leading-snug">
        <span dir={textDirectionAttribute(chapterPrefix)} className="text-[1em] font-bold text-inherit tracking-tight">
          {renderChapterLabel(chapterPrefix)}
          {separator ? <span className="ms-1 opacity-80">{separator}</span> : null}
        </span>
        {restTitle ? (
          <span dir={textDirectionAttribute(restTitle)} className="text-[0.94em] font-semibold text-inherit">
            {restTitle}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <span dir={textDirectionAttribute(trimmed)} className="text-[1em] font-bold text-inherit">
      {text}
    </span>
  );
};
