import { z } from 'zod';

/** Format date ISO officiel YYYY-MM-DD avec contrôle de cohérence calendrier. */
export const ISODateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format date invalide (attendu YYYY-MM-DD)')
  .refine(value => {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year
      && date.getUTCMonth() === month - 1
      && date.getUTCDate() === day;
  }, 'Date calendaire inexistante');

/** Langues prises en charge par l\'application. */
export const AppLocaleSchema = z.enum(['fr', 'ar', 'en']);

/** Natures de devoirs officiels reconnus. */
export const AssessmentTypeSchema = z.enum([
  'controle',
  'controle_court',
  'controle_global',
  'oral',
  'maison',
  'colle',
]);

/** Natures d\'activités et d\'événements pédagogiques. */
export const PedagogicalEventTypeSchema = z.enum([
  'evaluation_diagnostic',
  'olympiade',
  'concours',
  'soutien',
  'remediation',
  'examen_blanc',
  'rattrapage',
  'controle_cahiers',
  'correction_controle_continu',
  'autre',
]);

/** Cycles scolaires officiels marocains. */
export const CycleSchema = z.enum(['college', 'lycee', 'prepa']);

/** Document pédagogique (sujet, corrigé, fiche) avec horodatage. */
export const ContentDocumentSchema = z.object({
  source: z.string(),
  updatedAt: z.string(),
});

/** Créneau d\'emploi du temps d\'une classe. */
export const ScheduleSlotSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  sessions: z.number().int().min(1).max(12).default(1),
});

/** Roster étudiant (liste d'élèves consignée). */
export const StudentRosterSchema = z.object({
  names: z.array(z.string().trim().min(1).max(120)).max(200),
  updatedAt: z.string().refine(val => Number.isFinite(Date.parse(val)), 'Horodatage invalide'),
});
