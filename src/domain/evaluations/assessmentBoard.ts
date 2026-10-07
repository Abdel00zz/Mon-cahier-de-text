import type { AssessmentLink } from './assessmentSync';

export type AssessmentFilter = 'all' | 'attention' | 'upcoming' | 'done';
export type AssessmentFamily = 'all' | 'controls' | 'homework';

export function assessmentGroup(link: AssessmentLink): Exclude<AssessmentFilter, 'all'> {
  return link.status === 'missing' || link.status === 'mismatch' ? 'attention' : link.status;
}

export function summarizeAssessments(links: readonly AssessmentLink[]) {
  const counts = { attention: 0, upcoming: 0, done: 0 };
  for (const link of links) counts[assessmentGroup(link)] += 1;
  return counts;
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();

export function filterAssessmentBoard(
  links: readonly AssessmentLink[],
  status: AssessmentFilter,
  family: AssessmentFamily,
  query: string,
  label: (link: AssessmentLink) => string,
): AssessmentLink[] {
  const needle = normalize(query);
  const rank = { attention: 0, upcoming: 1, done: 2 };
  return links.filter(link =>
    (status === 'all' || assessmentGroup(link) === status)
    && (family === 'all' || (family === 'homework' ? link.planned.type === 'maison' : link.planned.type !== 'maison'))
    && (!needle || normalize(`${label(link)} ${link.planned.num} ${link.planned.dateISO}`).includes(needle))
  ).sort((a, b) => {
    const familyOrder = Number(a.planned.type === 'maison') - Number(b.planned.type === 'maison');
    const stateOrder = rank[assessmentGroup(a)] - rank[assessmentGroup(b)];
    const dateOrder = a.planned.dateISO.localeCompare(b.planned.dateISO);
    return familyOrder || stateOrder || (a.status === 'done' ? -dateOrder : dateOrder) || a.planned.num - b.planned.num;
  });
}
