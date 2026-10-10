/** Accent/case/spacing insensitive matching, preserving original display names. */
export const establishmentKey = (name?: string): string => (name ?? '').normalize('NFKD')
  .replace(/\p{M}/gu, '').replace(/ـ/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('fr');

export const establishmentLabel = (name?: string): string => name?.replace(/\s+/g, ' ').trim() || 'Établissement non renseigné';

export function listEstablishments(teachers: readonly { establishmentName?: string }[]) {
  const schools = new Map<string, string>();
  for (const teacher of teachers) {
    const key = establishmentKey(teacher.establishmentName);
    if (!schools.has(key)) schools.set(key, establishmentLabel(teacher.establishmentName));
  }
  return [...schools].sort((a, b) => a[1].localeCompare(b[1], 'fr'));
}
