import type { GuideChapter, GuideReference } from './model';

/** Invalid or retired anchors fall back to a real chapter, never a blank reader. */
export function resolveGuideReference(entries: readonly GuideChapter[], reference: GuideReference) {
  const chapter = entries.find(entry => entry.id === reference.chapterId)
    ?? entries.find(entry => entry.id === 'start') ?? entries[0];
  const section = chapter?.sections.find(item => item.id === reference.sectionId) ?? chapter?.sections[0];
  return { chapter, section };
}
