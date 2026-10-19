import type { GuideChapter } from './guide/model';
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

const chapters = [start, profile, schedule, classes, students, content, editor, types, dates, math, curriculum, legal, assessments, notifications, appearance, print, devices, backup, troubleshooting];

export const GUIDE_FR: GuideChapter[] = chapters.map(entry => entry.fr);
export const GUIDE_AR: GuideChapter[] = chapters.map(entry => entry.ar);

export const normalizeGuideSearch = (text: string): string => text.normalize('NFD')
  .replace(/[\u0300-\u036f\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g, '')
  .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ـ/g, '').toLowerCase();

/** Every query word must occur; accents and Arabic harakat do not block matches. */
export function searchGuide(entries: GuideChapter[], query: string): GuideChapter[] {
  const words = normalizeGuideSearch(query).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return entries;
  return entries.filter(entry => {
    const text = normalizeGuideSearch([
      entry.title, entry.summary, entry.keywords, entry.tip,
      ...entry.sections.flatMap(section => [section.title, section.body, ...(section.steps ?? []),
        ...(section.items ?? []).flatMap(item => [item.term, item.detail])]),
    ].filter(Boolean).join(' '));
    return words.every(word => text.includes(word));
  });
}
