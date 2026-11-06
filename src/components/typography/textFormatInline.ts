import React from 'react';
import { findHighlightClose, findHighlightOpen } from '../../lib/text/highlightMarkers';
import { textDirectionAttribute } from '../../lib/text/textDirection';

export const HEADING_LINE = /^(#{1,3})[ \t]+(\S.*)$/;

/** Barème posé par l'auteur : `[[2pts]]` (alias LaTeX `\bareme{2pts}`). */
const BAREME_MARK = /\[\[([^\]\n]{1,24})\]\]/g;

/** Nombre de teintes qui se relaient sur les barres d'exercice. */
const HEADING_TONES = 4;

const ARABIC_INDIC = /[\u0660-\u0669]/g;
const EXTENDED_ARABIC_INDIC = /[\u06F0-\u06F9]/g;

/**
 * Teinte d'une barre : c'est le NUMÉRO de l'exercice qui la décide, jamais son
 * rang de passage. Deux conséquences voulues : « Exercice 3 » garde la même
 * couleur dans un énoncé et dans son corrigé, et un document recomposé couleur
 * par couleur reste stable — sans état à mémoriser entre deux rendus.
 * Les numéros écrits en chiffres arabo-indiens comptent comme les autres.
 */
function headingTone(text: string): number {
  const found = text.match(/[0-9\u0660-\u0669\u06F0-\u06F9]+/);
  if (!found) return 1;
  const number = Number(found[0]
    .replace(ARABIC_INDIC, digit => String(digit.charCodeAt(0) - 0x0660))
    .replace(EXTENDED_ARABIC_INDIC, digit => String(digit.charCodeAt(0) - 0x06F0)));
  if (!Number.isFinite(number) || number < 1) return 1;
  return ((number - 1) % HEADING_TONES) + 1;
}

/**
 * Sépare le texte d'une ligne de ses barèmes : « Question 2 : … [[3pts]] »
 * donne le texte à composer et la valeur à poser en bout de ligne.
 * Les barèmes sont rendus APRÈS le texte, alignés sur le bord de lecture —
 * c'est la convention d'un énoncé, et elle survit à la traduction (le bord
 * suit `dir`, aucune règle de langue).
 */
export function splitBareme(line: string): { text: string; baremes: string[] } {
  const baremes: string[] = [];
  const text = line.replace(BAREME_MARK, (_match, value: string) => {
    baremes.push(value.trim());
    return '';
  });
  return { text: baremes.length ? text.trimEnd() : line, baremes };
}

function baremeNode(value: string, key: string): React.ReactNode {
  return React.createElement('span', { key, className: 'doc-bareme' }, value);
}

/**
 * Une ligne de la feuille : son texte, et le barème poussé au bord de lecture.
 * La ligne devient une RANGÉE (texte souple + points fixes) : les points se
 * lisent à la hauteur de la question qu'ils notent, comme sur un énoncé
 * imprimé, et le texte se replie seul quand il est long.
 */
export function renderLine(text: string, baremes: string[], key: string): React.ReactNode[] {
  const body = applyInlineFormatting(text, `${key}-text`);
  const dir = textDirectionAttribute(text);
  if (baremes.length === 0) return dir ? [React.createElement('bdi', { key, dir }, ...body)] : body;
  return [React.createElement(
    'span',
    { key, className: 'doc-line', dir },
    React.createElement('span', { key: `${key}-body`, className: 'doc-line__text' }, ...body),
    ...baremes.map((value, position) => baremeNode(value, `${key}-b${position}`))
  )];
}

/*
 * Les deux points d'un titre principal (`#` titre, `##` barre d'exercice) : « Devoir surveillé 3 : ».
 * Ajoutés à l'affichage, jamais dans le texte saisi. Rien n'est ajouté derrière une ponctuation finale ni
 * derrière une formule (un titre qui s'achève sur une formule se lit comme une phrase). Typographie : une
 * espace insécable avant « : » en français, aucune en arabe ni en anglais.
 */
const TITLE_END_PUNCTUATION = /[:：.!?؟…;،,)\]\uE001\uE002]\s*$/u;
const ARABIC_LETTER = /[\u0600-\u06FF\u0750-\u077F]/u;
function titleColon(text: string): string {
  const trimmed = text.trimEnd();
  if (!trimmed || TITLE_END_PUNCTUATION.test(trimmed)) return '';
  const lastLetter = [...trimmed].reverse().find(char => /\p{L}|\p{N}/u.test(char)) ?? '';
  const english = typeof document !== 'undefined' && document.documentElement.lang === 'en';
  return ARABIC_LETTER.test(lastLetter) || english ? ':' : '\u00A0:';
}

/** Un titre : la classe porte le rôle, le niveau de `#` la nature. */
export function renderHeading(level: number, text: string, key: string): React.ReactNode[] {
  const className = level === 1 ? 'doc-title' : level === 2 ? 'doc-heading' : 'doc-subheading';
  return [React.createElement(
    'span',
    {
      key,
      className,
      dir: textDirectionAttribute(text),
      ...(level === 2 ? { 'data-tone': String(headingTone(text)) } : {}),
    },
    ...applyInlineFormatting(level <= 2 ? text.trimEnd() + titleColon(text) : text, `${key}-text`)
  )];
}

const INLINE_MARKERS = ['***', '**', '++', '==', '*'] as const;

/* Surlignage qui n'entoure que des formules affichées : le surlignage est porté par chaque formule (CSS), la balise s'efface. */
const DISPLAY_ONLY_TOKENS = /^\s*(?:\uE000+\d+\uE002\s*)+$/;

function getColorClass(color: string): string {
  const c = color.toLowerCase();
  switch (c) {
    case 'red':
    case 'rouge':
    case 'rose':
      return 'text-rose-600 dark:text-rose-400 font-medium';
    case 'blue':
    case 'bleu':
    case 'sky':
      return 'text-sky-600 dark:text-sky-400 font-medium';
    case 'green':
    case 'vert':
    case 'emerald':
      return 'text-emerald-600 dark:text-emerald-400 font-medium';
    case 'amber':
    case 'orange':
    case 'jaune':
      return 'text-amber-600 dark:text-amber-400 font-medium';
    case 'purple':
    case 'violet':
      return 'text-purple-600 dark:text-purple-400 font-medium';
    case 'gray':
    case 'gris':
      return 'text-stone-500 dark:text-stone-400';
    default:
      return '';
  }
}

type InlineMatch =
  | { type: 'marker'; index: number; marker: typeof INLINE_MARKERS[number]; openLen: number; closeTag: string }
  | { type: 'color'; index: number; color: string; openLen: number; closeTag: string };

function findNextInlineOpen(segment: string, from: number): InlineMatch | null {
  let best: InlineMatch | null = null;

  for (const marker of INLINE_MARKERS) {
    // == ne s'ouvre que s'il est seul et colle au texte : x == y et  === b restent du texte.
    const idx = marker === '==' ? findHighlightOpen(segment, from) : segment.indexOf(marker, from);
    if (idx < 0) continue;
    if (!best || idx < best.index || (idx === best.index && marker.length > best.openLen)) {
      best = { type: 'marker', index: idx, marker, openLen: marker.length, closeTag: marker };
    }
  }

  const colorOpenIdx = segment.indexOf('[color:', from);
  if (colorOpenIdx >= 0) {
    const bracketClose = segment.indexOf(']', colorOpenIdx + 7);
    if (bracketClose > colorOpenIdx + 7 && bracketClose - colorOpenIdx <= 30) {
      const colorVal = segment.slice(colorOpenIdx + 7, bracketClose).trim();
      const openLen = bracketClose + 1 - colorOpenIdx;
      if (!best || colorOpenIdx < best.index) {
        best = { type: 'color', index: colorOpenIdx, color: colorVal, openLen, closeTag: '[/color]' };
      }
    }
  }

  return best;
}

function applyInlineFormatting(segment: string, keyBase: string): React.ReactNode[] {
  if (!segment) return [];
  const out: React.ReactNode[] = [];
  let cursor = 0;

  while (cursor < segment.length) {
    const opening = findNextInlineOpen(segment, cursor);

    if (!opening) {
      out.push(segment.slice(cursor));
      break;
    }

    const closingIndex = opening.type === 'marker' && opening.marker === '=='
      ? findHighlightClose(segment, opening.index + opening.openLen)
      : segment.indexOf(opening.closeTag, opening.index + opening.openLen);
    if (closingIndex < 0) {
      out.push(segment.slice(cursor, opening.index + opening.openLen));
      cursor = opening.index + opening.openLen;
      continue;
    }

    if (opening.index > cursor) out.push(segment.slice(cursor, opening.index));
    const inner = segment.slice(opening.index + opening.openLen, closingIndex);
    const children = applyInlineFormatting(inner, `${keyBase}-${opening.index}`);
    const key = `${keyBase}-${opening.index}-${closingIndex}`;

    if (opening.type === 'color') {
      const isHex = opening.color.startsWith('#');
      const cls = getColorClass(opening.color);
      out.push(
        React.createElement(
          'span',
          {
            key,
            className: cls || undefined,
            style: isHex ? { color: opening.color } : undefined,
          },
          ...children,
        ),
      );
    } else if (opening.marker === '***') {
      out.push(React.createElement('strong', { key }, React.createElement('em', null, ...children)));
    } else if (opening.marker === '**') {
      out.push(React.createElement('strong', { key }, ...children));
    } else if (opening.marker === '++') {
      out.push(React.createElement('u', { key, className: 'decoration-current underline-offset-2' }, ...children));
    } else if (opening.marker === '==') {
      out.push(React.createElement('mark', { key, className: DISPLAY_ONLY_TOKENS.test(inner) ? 'doc-hl doc-hl--display' : 'doc-hl' }, ...children));
    } else {
      out.push(React.createElement('em', { key }, ...children));
    }
    cursor = closingIndex + opening.closeTag.length;
  }

  return out;
}

/**
 * Détecte si un texte contient principalement des caractères arabes.
 */
export function isArabicText(text: string | null | undefined): boolean {
  if (!text) return false;
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

