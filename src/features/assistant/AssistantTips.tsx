import { useEffect, useState } from 'react';
import type { AppLocale } from '../../types';
import { PEDAGOGICAL_TIPS, pedagogicalTipForDay } from '../../constants/pedagogicalTips';
import { CompanionText } from './CompanionText';

const DECK_STORAGE_KEY = 'cdt_pedagogical_tips_deck_v1';
let memoryDeck: number[] = [];
let lastPickedOffset: number | null = null;

function createShuffledDeck(total: number, avoidFirst?: number | null): number[] {
  const deck = Array.from({ length: total }, (_, i) => i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  if (avoidFirst !== null && avoidFirst !== undefined && deck.length > 1 && deck[0] === avoidFirst) {
    const swapIdx = 1 + Math.floor(Math.random() * (deck.length - 1));
    [deck[0], deck[swapIdx]] = [deck[swapIdx], deck[0]];
  }
  return deck;
}

function nextIntelligentOffset(currentOffset?: number): number {
  const total = PEDAGOGICAL_TIPS.length;
  if (total <= 1) return 0;

  let deck = memoryDeck;
  try {
    if (typeof sessionStorage !== 'undefined') {
      const raw = sessionStorage.getItem(DECK_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.every(n => typeof n === 'number' && n >= 0 && n < total)) {
          deck = parsed;
        }
      }
    }
  } catch {
    // Fallback to in-memory deck
  }

  if (deck.length === 0) {
    deck = createShuffledDeck(total, currentOffset ?? lastPickedOffset);
  }

  let next = deck.shift()!;
  if (currentOffset !== undefined && next === currentOffset) {
    if (deck.length === 0) {
      deck = createShuffledDeck(total, currentOffset);
    }
    const alt = deck.shift()!;
    deck.push(next);
    next = alt;
  }

  memoryDeck = deck;
  lastPickedOffset = next;
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(deck));
    }
  } catch {
    // Ignore storage quota errors
  }

  return next;
}

export function AssistantTips({ locale, day, initiallyOpen = false }: { locale: AppLocale; day: string; initiallyOpen?: boolean }) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    setOffset(current => nextIntelligentOffset(current));
  }, [day]);

  const tip = pedagogicalTipForDay(day, offset);
  const copy = tip.copy[locale];
  const label = locale === 'ar' ? 'هل تعلم؟' : locale === 'en' ? 'Did you know?' : 'Le saviez-vous ?';
  const text = <CompanionText text={copy.text} highlights={[copy.keyword]} />;
  return (
    <details
      className="assistant-tips"
      open={initiallyOpen || undefined}
      onToggle={event => {
        if ((event.currentTarget as HTMLDetailsElement).open) {
          setOffset(current => nextIntelligentOffset(current));
        }
      }}
    >
      <summary>{label}</summary>
      <div className="assistant-tips__body">
        <p className="assistant-panel__detail">{copy.quotation ? <q>{text}</q> : text}</p>
        <a href={tip.source.url} target="_blank" rel="noopener noreferrer" className="assistant-tips__source" dir="auto">{tip.source.label}</a>
        <button type="button" className="assistant-panel__help" onClick={() => setOffset(value => nextIntelligentOffset(value))}>
          {locale === 'ar' ? 'فكرة أخرى' : locale === 'en' ? 'Another idea' : 'Une autre idée'}
        </button>
      </div>
    </details>
  );
}
