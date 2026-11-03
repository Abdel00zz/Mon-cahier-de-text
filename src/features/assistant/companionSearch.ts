import type { AppLocale, ClassInfo } from '../../types';
import type { GuideChapter, GuideReference } from '../../constants/guide/model';
import { normalizeGuideSearch } from '../../constants/guide/searchText';
import { guidanceAction, type GuidanceAction } from '../../domain/assistant/classGuidance';
import type { PedagogicalTask } from '../../domain/assistant/pedagogicalTasks';
import { companionClassName } from './companionClassName';
import { classGuidanceMessage } from './companionCopy';

type Destination = { kind: 'class' | 'finding'; action: GuidanceAction } | { kind: 'guide'; reference: GuideReference };
type Entry = { id: string; title: string; hint: string; destination: Destination; terms: string[]; titles: string[] };
const words = (value: string) => normalizeGuideSearch(value)
  .replace(/[٠-٩]/g, char => String(char.charCodeAt(0) - 0x660)).match(/[\p{L}\p{N}]+/gu) ?? [];
const filler = new Set(words('comment puis je puis-je est ce que pour les des de la le mon ma mes un une du au aux quel quelle quels quelles how do i my the to for of a an in كيف هل من في عن ما هو هي'));

/** Search identifiers are never inferred. Every result carries a current class ID or a real guide anchor. */
export function indexCompanionResources(classes: readonly ClassInfo[], tasks: readonly PedagogicalTask[], chapters: readonly GuideChapter[], locale: AppLocale) {
  const entries: Entry[] = [];
  const add = (id: string, title: string, hint: string, keywords: string, destination: Destination) => {
    entries.push({ id, title, hint, destination, titles: words(title), terms: words(`${title} ${hint} ${keywords}`) });
  };
  const byId = new Map(classes.map(c => [c.id, c]));
  for (const { id, guidance } of tasks) {
    if (!('classId' in guidance) || !byId.has(guidance.classId)) continue;
    const msg = classGuidanceMessage(guidance, locale);
    const target = byId.get(guidance.classId)!;
    add(`task:${id}`, msg.title, msg.detail, `${target.name} ${target.subject} ${msg.action ?? ''}`, { kind: 'finding', action: guidanceAction(guidance) });
  }
  for (const c of classes) {
    const name = companionClassName(c.name, locale);
    add(`class:${c.id}`, name, c.subject, `${c.name} cahier classe notebook class دفتر قسم`, { kind: 'class', action: { type: 'open-class', classId: c.id } });
  }
  for (const c of chapters) {
    add(`guide:${c.id}`, c.title, c.summary, `${c.id} ${c.keywords} ${c.sections.map(section => section.title).join(' ')}`, { kind: 'guide', reference: { chapterId: c.id } });
  }
  return entries;
}

/** Conjunctive matching: a missing class number never falls back to another group. */
export function findCompanionResources(entries: readonly Entry[], query: string, limit = 5) {
  const tokens = [...new Set(words(query).filter(word => !filler.has(word)))];
  if (!tokens.length) return query.trim() ? [] : entries.slice(0, limit);
  const weight = (needle: string, hay: string) => hay === needle ? 3 : needle.length >= 3 && /^\p{L}+$/u.test(needle) && hay.startsWith(needle) ? 1 : 0;
  return entries.map(entry => {
    let score = 0;
    for (const token of tokens) {
      const match = entry.terms.reduce((best, term) => Math.max(best, weight(token, term)), 0);
      if (!match) return { entry, score: 0 };
      score += match + (entry.titles.some(term => term === token) ? 6 : 0);
    }
    return { entry, score };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map(item => item.entry);
}
