import { HttpError } from './http.js';
import { latestClassOpening } from '../../utils/classOpening.js';
import type { AppConfig, ClassInfo, ContentDirection, LessonsData, TimetableEntry } from '../../types.js';

const MAX_BODY_BYTES = 950_000; // marge sous la limite ~1 MB des requêtes Upstash
const VALID_CYCLES = new Set(['college', 'lycee', 'prepa']);
const VALID_ASSESSMENT_TYPES = new Set(['controle', 'controle_court', 'controle_global', 'oral', 'maison']);
const VALID_PEDAGOGICAL_TYPES = new Set(['evaluation_diagnostic', 'olympiade', 'concours', 'soutien', 'remediation', 'examen_blanc', 'rattrapage', 'autre']);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const normalizePhone = (value: unknown): string => {
  if (typeof value !== 'string') {
    throw new HttpError(400, 'Numéro de téléphone manquant.');
  }
  const digits = value.replace(/[^\d]/g, '').replace(/^00/, '');
  if (digits.length < 8 || digits.length > 15) {
    throw new HttpError(400, 'Numéro de téléphone invalide (8 à 15 chiffres attendus).');
  }
  return digits;
};

export const assertName = (value: unknown, label: string): string => {
  if (typeof value !== 'string') throw new HttpError(400, `${label} manquant.`);
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > 60) {
    throw new HttpError(400, `${label} invalide (1 à 60 caractères).`);
  }
  return trimmed;
};

export const assertPassword = (value: unknown): string => {
  if (typeof value !== 'string' || value.length < 8) {
    throw new HttpError(400, 'Le mot de passe doit contenir au moins 8 caractères.');
  }
  if (value.length > 128) {
    throw new HttpError(400, 'Mot de passe trop long (128 caractères max).');
  }
  return value;
};

export const assertBodySize = (body: unknown): void => {
  const size = typeof body === 'string'
    ? Buffer.byteLength(body, 'utf8')
    : Buffer.byteLength(JSON.stringify(body ?? {}), 'utf8');
  if (size > MAX_BODY_BYTES) {
    throw new HttpError(413, 'Données trop volumineuses (limite cloud d’environ 950 Ko par requête).');
  }
};

const assertStringField = (value: unknown, label: string, max = 120): string => {
  if (typeof value !== 'string') throw new HttpError(400, `${label} invalide.`);
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) throw new HttpError(400, `${label} invalide.`);
  return trimmed;
};

export const assertValidClasses = (classes: unknown): ClassInfo[] => {
  if (!Array.isArray(classes)) throw new HttpError(400, 'Liste des classes manquante.');
  if (classes.length > 120) throw new HttpError(400, 'Trop de classes dans la synchronisation.');

  const seen = new Set<string>();
  return classes.map(raw => {
    if (!raw || typeof raw !== 'object') throw new HttpError(400, 'Classe invalide.');
    const item = raw as Partial<ClassInfo>;
    const id = assertStringField(item.id, 'Identifiant de classe', 120);
    if (seen.has(id)) throw new HttpError(400, 'Identifiants de classes dupliqués.');
    seen.add(id);
    return {
      id,
      name: assertStringField(item.name, 'Nom de classe', 120),
      teacherName: typeof item.teacherName === 'string' ? item.teacherName.slice(0, 120) : '',
      subject: assertStringField(item.subject, 'Matière', 120),
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
      lastOpenedAt: latestClassOpening(item.lastOpenedAt),
      color: typeof item.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(item.color) ? item.color : '#3b82f6',
      cycle: VALID_CYCLES.has(item.cycle as string) ? item.cycle : undefined,
    };
  });
};

export const assertValidTimetable = (timetable: unknown, validClassIds: Set<string>): TimetableEntry[] | undefined => {
  if (timetable === undefined) return undefined;
  if (!Array.isArray(timetable)) throw new HttpError(400, 'Emploi du temps invalide.');
  if (timetable.length > 600) throw new HttpError(400, 'Emploi du temps trop volumineux.');
  return timetable.map(raw => {
    if (!raw || typeof raw !== 'object') throw new HttpError(400, 'Créneau invalide.');
    const entry = raw as Partial<TimetableEntry>;
    if (typeof entry.day !== 'number' || entry.day < 0 || entry.day > 6) throw new HttpError(400, 'Jour de créneau invalide.');
    if (typeof entry.slot !== 'number' || entry.slot < 0 || entry.slot > 12) throw new HttpError(400, 'Heure de créneau invalide.');
    const classId = assertStringField(entry.classId, 'Classe du créneau', 120);
    if (!validClassIds.has(classId)) throw new HttpError(400, 'Créneau rattaché à une classe inconnue.');
    return {
      day: entry.day,
      slot: entry.slot,
      classId,
      room: typeof entry.room === 'string' ? entry.room.slice(0, 80) : undefined,
    };
  });
};

export const assertValidLessonsPayload = (
  lessons: unknown,
  validClassIds: Set<string>
): { classId: string; lessonsData: LessonsData; contentDirection?: ContentDirection; updatedAt: string }[] => {
  if (lessons === undefined) return [];
  if (!Array.isArray(lessons)) throw new HttpError(400, 'Cahiers synchronisés invalides.');
  if (lessons.length > validClassIds.size) throw new HttpError(400, 'Trop de cahiers dans la synchronisation.');

  return lessons.map(raw => {
    if (!raw || typeof raw !== 'object') throw new HttpError(400, 'Cahier invalide.');
    const entry = raw as { classId?: unknown; lessonsData?: unknown; contentDirection?: unknown; updatedAt?: unknown };
    const classId = assertStringField(entry.classId, 'Classe du cahier', 120);
    if (!validClassIds.has(classId)) throw new HttpError(400, 'Cahier rattaché à une classe inconnue.');
    if (!Array.isArray(entry.lessonsData)) throw new HttpError(400, 'Données de cahier invalides.');
    const contentDirection: ContentDirection | undefined =
      entry.contentDirection === 'rtl' || entry.contentDirection === 'ltr'
        ? entry.contentDirection
        : undefined;
    let updatedAt = new Date().toISOString();
    if (typeof entry.updatedAt === 'string' && entry.updatedAt) {
      const timestamp = Date.parse(entry.updatedAt);
      if (!Number.isFinite(timestamp)) throw new HttpError(400, 'Horodatage de cahier invalide.');
      updatedAt = new Date(timestamp).toISOString();
    }
    return {
      classId,
      lessonsData: entry.lessonsData as LessonsData,
      ...(contentDirection ? { contentDirection } : {}),
      updatedAt,
    };
  });
};

/** Validation ciblée des données d'évaluation transportées dans le blob de réglages. */
export const assertValidSyncSettings = (settings: unknown, validClassIds: Set<string>): Record<string, unknown> | undefined => {
  if (settings === undefined) return undefined;
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new HttpError(400, 'Réglages synchronisés invalides.');
  const result = { ...(settings as Record<string, unknown>) };
  const classRecord = (key: string): Record<string, unknown> | undefined => {
    const value = result[key];
    if (value === undefined) return undefined;
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, `${key} invalide.`);
    const record = value as Record<string, unknown>;
    if (Object.keys(record).length > validClassIds.size) throw new HttpError(400, `${key} contient trop de classes.`);
    for (const classId of Object.keys(record)) if (!validClassIds.has(classId)) throw new HttpError(400, `${key} référence une classe inconnue.`);
    return record;
  };

  for (const key of ['assessmentDates'] as const) {
    const record = classRecord(key);
    for (const [classId, raw] of Object.entries(record ?? {})) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new HttpError(400, `${key}.${classId} invalide.`);
      const entries = Object.entries(raw as Record<string, unknown>);
      if (entries.length > 300) throw new HttpError(400, `${key}.${classId} est trop volumineux.`);
      for (const [id, date] of entries) {
        if (!id || id.length > 180 || typeof date !== 'string' || !ISO_DATE.test(date)) throw new HttpError(400, `Date d'évaluation invalide pour ${classId}.`);
      }
    }
  }

  const absences = classRecord('assessmentAbsences');
  for (const [classId, raw] of Object.entries(absences ?? {})) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new HttpError(400, `assessmentAbsences.${classId} invalide.`);
    const entries = Object.entries(raw as Record<string, unknown>);
    if (entries.length > 300) throw new HttpError(400, `assessmentAbsences.${classId} est trop volumineux.`);
    for (const [assessmentId, candidate] of entries) {
      const value = candidate as { names?: unknown; updatedAt?: unknown };
      if (!assessmentId || assessmentId.length > 180 || !value || !Array.isArray(value.names) || value.names.length > 200) throw new HttpError(400, 'Liste d’absences invalide.');
      if (value.names.some(name => typeof name !== 'string' || !name.trim() || name.length > 120)) throw new HttpError(400, 'Nom d’élève absent invalide.');
      if (typeof value.updatedAt !== 'string' || !Number.isFinite(Date.parse(value.updatedAt))) throw new HttpError(400, 'Horodatage d’absences invalide.');
    }
  }

  const manual = classRecord('manualAssessments');
  for (const [classId, raw] of Object.entries(manual ?? {})) {
    if (!Array.isArray(raw) || raw.length > 300) throw new HttpError(400, `manualAssessments.${classId} invalide.`);
    for (const item of raw) {
      const value = item as Partial<NonNullable<AppConfig['manualAssessments']>[string][number]>;
      if (!value || typeof value !== 'object' || typeof value.id !== 'string' || !value.id || value.id.length > 180) throw new HttpError(400, 'Identifiant de devoir manuel invalide.');
      if (!VALID_ASSESSMENT_TYPES.has(value.type as string) || !Number.isInteger(value.num) || Number(value.num) < 1 || Number(value.num) > 50) throw new HttpError(400, 'Type ou numéro de devoir manuel invalide.');
      if (typeof value.dateISO !== 'string' || !ISO_DATE.test(value.dateISO) || (value.semestre !== 1 && value.semestre !== 2)) throw new HttpError(400, 'Date ou semestre de devoir manuel invalide.');
      if (value.schoolYear !== undefined && (typeof value.schoolYear !== 'string' || !/^\d{4}-\d{4}$/.test(value.schoolYear))) throw new HttpError(400, 'Année scolaire de devoir manuel invalide.');
    }
  }

  const events = classRecord('pedagogicalEvents');
  for (const [classId, raw] of Object.entries(events ?? {})) {
    if (!Array.isArray(raw) || raw.length > 500) throw new HttpError(400, `pedagogicalEvents.${classId} invalide.`);
    for (const item of raw) {
      const value = item as Record<string, unknown>;
      if (!value || typeof value.id !== 'string' || !value.id || !VALID_PEDAGOGICAL_TYPES.has(value.type as string)) throw new HttpError(400, 'Activité pédagogique invalide.');
      if (typeof value.title !== 'string' || !value.title.trim() || value.title.length > 300 || typeof value.date !== 'string' || !ISO_DATE.test(value.date)) throw new HttpError(400, 'Titre ou date d’activité invalide.');
      if (value.status !== 'planned' && value.status !== 'done') throw new HttpError(400, 'Statut d’activité invalide.');
    }
  }

  for (const key of ['removedAssessments', 'assessmentOrder'] as const) {
    const record = classRecord(key);
    for (const [classId, raw] of Object.entries(record ?? {})) {
      if (!Array.isArray(raw) || raw.length > 500 || raw.some(id => typeof id !== 'string' || !id || id.length > 180)) {
        throw new HttpError(400, `${key}.${classId} invalide.`);
      }
    }
  }
  return result;
};
