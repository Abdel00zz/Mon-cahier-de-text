/**
 * Commandes de mise en page LaTeX d'un texte courant : la sortie est aux
 * marqueurs natifs du moteur, donc KaTeX n'en voit jamais un seul. Les
 * variantes \text… sont listées AVANT le \text{…} générique pour ne pas être
 * avalées par lui.
 */
const LATEX_TEXT_COMMANDS: ReadonlyArray<readonly [RegExp, string]> = [
  // Barème : `\bareme{2pts}` écrit comme en LaTeX, traduit vers le marqueur
  // natif `[[2pts]]` — une seule forme à analyser ensuite.
  [/\\bareme\{([^{}]*)\}/g, '[[$1]]'],
  [/\\textbf\{([^{}]*)\}/g, '**$1**'],
  [/\\textit\{([^{}]*)\}/g, '*$1*'],
  [/\\textsl\{([^{}]*)\}/g, '*$1*'],
  [/\\emph\{([^{}]*)\}/g, '*$1*'],
  [/\\underline\{([^{}]*)\}/g, '++$1++'],
  [/\\textsc\{([^{}]*)\}/g, '$1'],
  // Générique : les suffixes déjà traités ci-dessus (it, bf) en sont EXCLUS,
  // sinon il avale leurs marqueurs à la passe suivante — cas mesuré :
  // \textbf{\emph{X}} perdait le gras et ne gardait que l'italique.
  [/\\text(?:rm|sf|tt|up|md|normal)?\{([^{}]*)\}/g, '$1'],
  [/\\mbox\{([^{}]*)\}/g, '$1'],
];

export function expandLatexTextCommands(source: string): string {
  let out = source;
  // Stop as soon as stable; cap malformed/deep nesting without losing the source.
  for (let pass = 0; pass < 32; pass += 1) {
    const previous = out;
    for (const [pattern, replacement] of LATEX_TEXT_COMMANDS) {
      out = out.replace(pattern, replacement);
    }
    if (out === previous) break;
  }
  out = out
    // Fins de ligne (\\ ou \\[2mm]) et paragraphes.
    .replace(/\\\\(?:\s*\[[^\]]*\])?/g, '\n')
    .replace(/\\(?:newline|linebreak)\b/g, '\n')
    .replace(/\\(?:par|bigskip|medskip)\b/g, '\n\n')
    .replace(/\\smallskip\b/g, '\n')
    // Espacements : une respiration verticale ou une espace insécable.
    .replace(/\\vspace\*?\{[^{}]*\}/g, '\n')
    .replace(/\\hspace\*?\{[^{}]*\}/g, '\u00A0')
    .replace(/~/g, '\u00A0')
    // Commandes sans équivalent en texte courant : retirées, pas imprimées.
    .replace(/\\(?:noindent|centering|raggedright|raggedleft|newpage|clearpage|pagebreak|nopagebreak|columnbreak|vfill|hfill)\b/g, '')
    // Les listes ne sont PAS traitées ici : l'analyseur structurel (parseBlocks)
    // les reconnaît avant la mise en page, imbrications comprises, et sans
    // exiger la moindre ligne vide.
    // Échappements LaTeX, espaces fines et accolades vides ({ } de garde).
    .replace(/\\([%&_#{}])/g, '$1')
    .replace(/\\[,;:!]/g, ' ')
    .replace(/\{\}/g, '')
    // Symboles fréquents.
    .replace(/\\(?:ldots|dots|textellipsis)\b/g, '…')
    .replace(/\\textendash\b/g, '–')
    .replace(/\\textemdash\b/g, '—')
    .replace(/\\guillemotleft\b/g, '«')
    .replace(/\\guillemotright\b/g, '»')
    .replace(/\\textbullet\b/g, '•');
  // Aucun rognage ici : cette passe s'applique FRAGMENT par fragment, rogner
  // les '\n' de tête supprimerait le saut de ligne qui suit une formule.
  return out;
}
