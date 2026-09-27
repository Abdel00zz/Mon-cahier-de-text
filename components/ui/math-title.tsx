import { renderKatexHtml } from '@/config/katex';
import { splitMathText } from '@/utils/math';
import { titleDirection } from '@/utils/contentDirection';

const isDisplay = (formula: string): boolean =>
  formula.startsWith('$$') || formula.startsWith('\\[');

/** Titre court d'un portail : rendu synchrone, donc rien à démonter ni à annuler. */
export function MathTitle({ text }: { text?: unknown }) {
  return (
    <bdi dir={titleDirection(text)}>
      {splitMathText(text).map((part, index) => (part.math ? (
        <span
          key={`${index}:math`}
          className="math-text inline-block"
          dir="ltr"
          dangerouslySetInnerHTML={{ __html: renderKatexHtml(part.text, isDisplay(part.text)) }}
        />
      ) : (
        part.text
      )))}
    </bdi>
  );
}
