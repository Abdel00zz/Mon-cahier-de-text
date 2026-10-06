import type { TimetableClockPolicy, TimetableEntry } from '../../types';
import { getDaySessionBlocks } from '../calendar/timetable';
import { FREE_TYPE } from './freeLineType';

/*
 * Absence justifiée → cahier : la ligne « certificat de maladie » naît dans le
 * cahier de chaque classe dont l'emploi du temps prévoit une séance pendant
 * l'absence, à sa place CHRONOLOGIQUE (juste après le dernier contenu daté au
 * plus tard à la date de l'absence). Un cahier sans aucune date reçoit la ligne
 * à sa fin.
 *
 * La réinjection est idempotente : une ligne de même nature, même date et même
 * intitulé n'est jamais ajoutée deux fois.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
/** Borne de sécurité : un certificat couvre des jours, pas une année entière. */
const MAX_RANGE_DAYS = 120;
const DAY_MS = 86_400_000;

/** Bornes d'une absence telles que saisies dans les Réglages. */
export interface AbsenceRange {
  debut: string;
  fin?: string;
}

/** Vue structurelle minimale : on ne touche qu'aux dates et aux listes d'enfants. */
interface NotebookNode {
  type?: string;
  title?: string;
  description?: string;
  date?: string;
  items?: NotebookNode[];
  sections?: NotebookNode[];
}

const isIsoDate = (value: unknown): value is string => typeof value === 'string' && ISO_DATE.test(value);

/** Dates ISO couvertes par l'absence (une seule si `fin` est absente ou antérieure). */
export const absenceDates = (period: AbsenceRange): string[] => {
  if (!isIsoDate(period.debut)) return [];
  const fin = isIsoDate(period.fin) && period.fin >= period.debut ? period.fin : period.debut;
  const dates: string[] = [];
  for (let time = Date.parse(`${period.debut}T12:00:00Z`); time <= Date.parse(`${fin}T12:00:00Z`) && dates.length < MAX_RANGE_DAYS; time += DAY_MS) {
    dates.push(new Date(time).toISOString().slice(0, 10));
  }
  return dates;
};

/** Classes dont l'emploi du temps prévoit au moins une séance pendant l'absence. */
export const classesWithSessionDuring = (
  timetable: TimetableEntry[] | undefined,
  clock: TimetableClockPolicy | undefined,
  period: AbsenceRange,
  classIds: string[],
): string[] => {
  const known = new Set(classIds);
  const found = new Set<string>();
  for (const date of absenceDates(period)) {
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    for (const block of getDaySessionBlocks(timetable, weekday, clock)) {
      if (known.has(block.classId)) found.add(block.classId);
    }
  }
  return [...found];
};

/**
 * Les VRAIES listes d'enfants d'un nœud — jamais des copies : l'insertion
 * chronologique doit modifier le tableau de l'arbre, pas un tableau jetable.
 */
const childLists = (node: NotebookNode): NotebookNode[][] =>
  [node.items, node.sections].filter((list): list is NotebookNode[] => Array.isArray(list));

/** Dernière ligne datée au plus tard à `date`, en ordre de lecture (items puis sections). */
const chronologicalAnchor = (rows: NotebookNode[], date: string): { list: NotebookNode[]; index: number } | null => {
  let best: { list: NotebookNode[]; index: number } | null = null;
  let bestDate = '';
  const visit = (list: NotebookNode[]) => {
    list.forEach((node, index) => {
      const value = isIsoDate(node.date) ? node.date : '';
      if (value && value <= date && value >= bestDate) {
        best = { list, index };
        bestDate = value;
      }
      childLists(node).forEach(visit);
    });
  };
  visit(rows);
  return best;
};

const holdsAnyDate = (rows: NotebookNode[]): boolean =>
  rows.some(node => isIsoDate(node.date) || childLists(node).some(holdsAnyDate));

const alreadyPresent = (rows: NotebookNode[], date: string, title: string): boolean =>
  rows.some(node => (node.type === FREE_TYPE && node.date === date && node.title === title)
    || childLists(node).some(list => alreadyPresent(list, date, title)));

export interface AbsenceLine {
  date: string;
  title: string;
  description?: string;
  /** Identité locale de la ligne, comme toute ligne libre créée à la main. */
  id: string;
}

/**
 * Insère la ligne libre datée à sa place chronologique.
 * Renvoie `null` quand elle est déjà là : l'appelant n'écrit alors aucun cahier.
 */
export const injectAbsenceLine = (lessonsData: unknown, line: AbsenceLine): NotebookNode[] | null => {
  if (!Array.isArray(lessonsData) || !isIsoDate(line.date)) return null;
  const rows = lessonsData as NotebookNode[];
  if (alreadyPresent(rows, line.date, line.title)) return null;
  const next = structuredClone(rows);
  const node: NotebookNode = { type: FREE_TYPE, title: line.title, description: line.description ?? '', date: line.date, _tempId: line.id } as NotebookNode;
  const anchor = chronologicalAnchor(next, line.date);
  if (anchor) anchor.list.splice(anchor.index + 1, 0, node);
  else if (holdsAnyDate(next)) next.unshift(node);
  else next.push(node);
  return next;
};
