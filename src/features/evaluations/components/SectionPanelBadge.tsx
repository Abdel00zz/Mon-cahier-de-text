import React from 'react';

export type SectionPanelTone = 'peach' | 'lavender' | 'green' | 'blue';
export type SectionPanelGlyphKind = 'loupe' | 'crayon' | 'maison' | 'livre';

const TONE_CYCLE: readonly SectionPanelTone[] = ['peach', 'lavender', 'green', 'blue'];
const GLYPH_CYCLE: readonly SectionPanelGlyphKind[] = ['loupe', 'crayon', 'maison', 'livre'];

/**
 * Associe chaque section de la fiche classe à l'un des 4 panneaux colorés
 * (pêche, lavande, vert, bleu) et à son icône (loupe, crayon, maison, livre).
 */
export function resolveSectionPanelVariant(kindType: string, index: number): {
  tone: SectionPanelTone;
  glyph: SectionPanelGlyphKind;
} {
  if (kindType === 'evaluation_diagnostic') {
    return { tone: 'peach', glyph: 'loupe' };
  }
  if (
    kindType === 'controle' ||
    kindType === 'controle_court' ||
    kindType === 'controle_global' ||
    kindType === 'correction_controle_continu' ||
    kindType === 'examen_blanc'
  ) {
    return { tone: 'lavender', glyph: 'crayon' };
  }
  if (kindType === 'maison') {
    return { tone: 'green', glyph: 'maison' };
  }
  if (
    kindType === 'controle_cahiers' ||
    kindType === 'soutien' ||
    kindType === 'remediation' ||
    kindType === 'rattrapage' ||
    kindType === 'olympiade' ||
    kindType === 'concours' ||
    kindType === 'oral' ||
    kindType === 'colle' ||
    kindType === 'autre'
  ) {
    return { tone: 'blue', glyph: 'livre' };
  }
  const slot = Math.abs(index) % 4;
  return { tone: TONE_CYCLE[slot], glyph: GLYPH_CYCLE[slot] };
}

/** Icône du panneau de section : loupe, crayon, maison ou livre (.ci). */
export const SectionPanelGlyph: React.FC<{ glyph: SectionPanelGlyphKind }> = ({ glyph }) => (
  <span className="ev-panel-glyph" data-glyph={glyph} aria-hidden="true">
    {glyph === 'loupe' && (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="6.5" />
        <path d="m20 20-4.35-4.35" />
      </svg>
    )}
    {glyph === 'crayon' && (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        <path d="m15 5 4 4" />
      </svg>
    )}
    {glyph === 'maison' && (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9.5" />
        <path d="M9.5 21v-6h5v6" />
      </svg>
    )}
    {glyph === 'livre' && (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a2.5 2.5 0 0 1 0-5H20" />
      </svg>
    )}
  </span>
);

/** Découpe une date ISO YYYY-MM-DD en { day: '14', monthYear: '09/2026' } pour la petite feuille de calendrier. */
export function parseCalendarSheetDate(iso: string, endDate?: string): { day: string; monthYear: string } | null {
  if (!iso) return null;
  const parts = iso.split('-');
  if (parts.length !== 3) return null;
  const [year, month, day] = parts;
  if (endDate && endDate !== iso) {
    const endParts = endDate.split('-');
    if (endParts.length === 3) {
      return {
        day: `${day}–${endParts[2]}`,
        monthYear: `${endParts[1]}/${endParts[0]}`,
      };
    }
  }
  return {
    day,
    monthYear: `${month}/${year}`,
  };
}

/** Petite feuille de calendrier (.lf) : le jour en grand, puis « 09/2026 » dessous. */
export const CalendarSheetVisual: React.FC<{ iso: string; endDate?: string }> = ({ iso, endDate }) => {
  const parsed = parseCalendarSheetDate(iso, endDate);
  if (!parsed) return null;
  return (
    <span className="ev-cal-sheet" aria-hidden="true" dir="ltr">
      <span className="ev-cal-sheet__day">{parsed.day}</span>
      <span className="ev-cal-sheet__my">{parsed.monthYear}</span>
    </span>
  );
};

/** Connecteur coudé arrondi continu (.tk.ch::before) reliant la correction du devoir au devoir. */
export const CorrectionCurveConnector: React.FC = () => (
  <span className="ev-correction-connector" aria-hidden="true" />
);
