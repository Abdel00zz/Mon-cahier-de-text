import { useState } from 'react';
import type { AppLocale } from '../../types';
import { PEDAGOGICAL_TIPS, pedagogicalTipForDay } from '../../constants/pedagogicalTips';
import { CompanionText } from './CompanionText';

export function AssistantTips({ locale, day, initiallyOpen = false }: { locale: AppLocale; day: string; initiallyOpen?: boolean }) {
  const [offset, setOffset] = useState(0);
  const tip = pedagogicalTipForDay(day, offset);
  const copy = tip.copy[locale];
  const label = locale === 'ar' ? 'هل تعلم؟' : locale === 'en' ? 'Did you know?' : 'Le saviez-vous ?';
  const text = <CompanionText text={copy.text} highlights={[copy.keyword]} />;
  return <details className="assistant-tips" open={initiallyOpen || undefined}>
    <summary>{label}</summary>
    <div className="assistant-tips__body">
      <p className="assistant-panel__detail">{copy.quotation ? <q>{text}</q> : text}</p>
      <a href={tip.source.url} target="_blank" rel="noopener noreferrer" className="assistant-tips__source" dir="auto">{tip.source.label}</a>
      <button type="button" className="assistant-panel__help" onClick={() => setOffset(value => (value + 1) % PEDAGOGICAL_TIPS.length)}>
        {locale === 'ar' ? 'فكرة أخرى' : locale === 'en' ? 'Another idea' : 'Une autre idée'}
      </button>
    </div>
  </details>;
}
