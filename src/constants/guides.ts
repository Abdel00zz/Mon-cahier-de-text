import type { GuideChapter } from './guide/model';
import { normalizeGuideSearch } from './guide/searchText';
export { normalizeGuideSearch } from './guide/searchText';
export type { GuideChapter } from './guide/model';
import { start } from './guide/start';
import { profile } from './guide/profile';
import { schedule } from './guide/schedule';
import { classes } from './guide/classes';
import { students } from './guide/students';
import { content } from './guide/content';
import { editor } from './guide/editor';
import { types } from './guide/types';
import { dates } from './guide/dates';
import { math } from './guide/math';
import { curriculum } from './guide/curriculum';
import { legal } from './guide/legal';
import { assessments } from './guide/assessments';
import { notifications } from './guide/notifications';
import { appearance } from './guide/appearance';
import { print } from './guide/print';
import { devices } from './guide/devices';
import { backup } from './guide/backup';
import { troubleshooting } from './guide/troubleshooting';
import { about } from './guide/about';

const chapters = [start, profile, schedule, classes, students, content, editor, types, dates, math, curriculum, legal, assessments, notifications, appearance, print, devices, backup, troubleshooting, about];

export const GUIDE_FR: GuideChapter[] = chapters.map(entry => entry.fr);
export const GUIDE_AR: GuideChapter[] = chapters.map(entry => entry.ar);

/** Every query word must occur; accents and Arabic harakat do not block matches. */
export function createGuideSearch(entries: GuideChapter[]): (query: string) => GuideChapter[] {
  const index = entries.map(entry => ({
    entry,
    text: normalizeGuideSearch([
      entry.title, entry.summary, entry.keywords, entry.tip,
      ...entry.sections.flatMap(section => [section.title, section.body, ...(section.steps ?? []),
        ...(section.items ?? []).flatMap(item => [item.term, item.detail])]),
    ].filter(Boolean).join(' ')),
  }));
  return query => {
    const words = normalizeGuideSearch(query).trim().split(/\s+/).filter(Boolean);
    if (!words.length) return entries;
    return index.filter(({ text }) => words.every(word => text.includes(word))).map(({ entry }) => entry);
  };
}

export function searchGuide(entries: GuideChapter[], query: string): GuideChapter[] {
  return createGuideSearch(entries)(query);
}
