import assert from 'node:assert/strict';
import test from 'node:test';
import { renderKatexHtml } from '../src/config/katex';
import { detectTextDirection } from '../src/lib/text/textDirection';
import { detectContentDirection, titleDirection } from '../src/domain/notebook/contentDirection';

const math = (source: string) => renderKatexHtml(`$${source}$`);
test('LaTeX : les commandes de confort sont réellement développées, même imbriquées', () => {
  for (const [source, expected] of [
    [String.raw`\abs{x}`, String.raw`\left|x\right|`],
    [String.raw`\norme{\vect{u}}`, String.raw`\left\lVert \overrightarrow{u}\right\rVert`],
    [String.raw`\abs {\R}`, String.raw`\left|\mathbb{R}\right|`],
    [String.raw`\ang{30}`, String.raw`30^\circ`],
    [String.raw`\unit {5} {cm}`, String.raw`5\,\text{cm}`],
    [String.raw`\abs{\{x\}}`, String.raw`\left|\{x\}\right|`],
  ]) assert.equal(math(source), math(expected), source);
});

test('LaTeX : retours de matrice préservés, commande incomplète visible, aucun lien actif', () => {
  assert.match(math(String.raw`\begin{matrix}a\\b\end{matrix}`), /class="katex"/);
  assert.ok(math(String.raw`\abs{`).length > 0);
  assert.doesNotMatch(math(String.raw`\href{javascript:alert(1)}{x}`), /<a\b|href="javascript:/);
  const recursive = math(String.raw`\def\loop{\loop}\loop`);
  assert.match(recursive, /katex-error/);
});

test('orientation : la prose arabe garde sa direction malgré les balises et les formules', () => {
  for (const source of [String.raw`\textbf{الدوال العددية}`, '[color:red]تمرين[/color]',
    '<strong title="A > B">الدرس</strong>', String.raw`\textcolor{blue}{التمرين}`, String.raw`\begin{enumerate}\item احسب $x$\end{enumerate}`,
    String.raw`$\operatorname{arcsin} \frac{abcdefgh}{xyz}$ درس`]) {
    assert.equal(detectTextDirection(source), 'rtl', source);
    assert.equal(titleDirection(source), 'rtl', source);
    assert.equal(detectContentDirection([{ title: source }]).direction, 'rtl', source);
  }
  assert.equal(detectTextDirection(String.raw`\textbf{Fonctions} — الدوال`), 'ltr');
});

test('orientation : chiffres arabes, ponctuation, barèmes et formules seuls restent neutres', () => {
  for (const source of ['١٢٣٤', '،؛؟', '[[2pts]]', String.raw`$\frac{a}{b}$`]) {
    assert.equal(detectTextDirection(source), null, source);
    assert.equal(detectContentDirection([{ title: source }], 'ltr').detected, false, source);
  }
});
