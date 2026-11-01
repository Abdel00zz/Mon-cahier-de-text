/**
 * Utilitaires d'extraction de dates et de plages à partir des cellules du cahier.
 */

/**
 * Extrait la première date ISO (YYYY-MM-DD) trouvée dans une chaîne quelconque.
 */
export function extractEarliestDate(rawDate: string | undefined): string | undefined {
  if (!rawDate) return undefined;
  const isoMatch = rawDate.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (isoMatch) return isoMatch[0];
  const ddmmyyyyMatch = rawDate.match(/\b\d{1,2}[/.-]\d{1,2}[/.-]\d{4}\b/);
  if (ddmmyyyyMatch) {
    const parts = ddmmyyyyMatch[0].split(/[/.-]/);
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return rawDate.trim() || undefined;
}

/**
 * Extrait les dates ISO de début et de fin d'une cellule date (simple ou plage avec 'et' ou 'Du...au').
 */
export function extractDateRange(rawDate: string | undefined): { startDate?: string; endDate?: string } {
  if (!rawDate) return {};
  const isoMatches = rawDate.match(/\b\d{4}-\d{2}-\d{2}\b/g);
  if (isoMatches && isoMatches.length > 0) {
    return {
      startDate: isoMatches[0],
      endDate: isoMatches.length > 1 && isoMatches.at(-1) !== isoMatches[0] ? isoMatches.at(-1) : undefined,
    };
  }
  const ddmmyyyyMatches = rawDate.match(/\b\d{1,2}[/.-]\d{1,2}[/.-]\d{4}\b/g);
  if (ddmmyyyyMatches && ddmmyyyyMatches.length > 0) {
    const toIso = (s: string) => {
      const parts = s.split(/[/.-]/);
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    };
    return {
      startDate: toIso(ddmmyyyyMatches[0]),
      endDate: ddmmyyyyMatches.length > 1 && ddmmyyyyMatches.at(-1) !== ddmmyyyyMatches[0] ? toIso(ddmmyyyyMatches.at(-1)!) : undefined,
    };
  }
  const single = extractEarliestDate(rawDate);
  return { startDate: single };
}
