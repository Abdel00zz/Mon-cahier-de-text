import { HttpError } from './http';
import type { ClassInfo, LessonsData, TimetableEntry } from '../../types';

const MAX_BODY_BYTES = 950_000; // marge sous la limite ~1 MB des requêtes Upstash
const VALID_CYCLES = new Set(['college', 'lycee', 'prepa']);

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
    throw new HttpError(413, 'Données trop volumineuses pour la synchronisation (limite ~950 Ko par requête).');
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
): { classId: string; lessonsData: LessonsData; updatedAt: string }[] => {
  if (lessons === undefined) return [];
  if (!Array.isArray(lessons)) throw new HttpError(400, 'Cahiers synchronisés invalides.');
  if (lessons.length > validClassIds.size) throw new HttpError(400, 'Trop de cahiers dans la synchronisation.');

  return lessons.map(raw => {
    if (!raw || typeof raw !== 'object') throw new HttpError(400, 'Cahier invalide.');
    const entry = raw as { classId?: unknown; lessonsData?: unknown; updatedAt?: unknown };
    const classId = assertStringField(entry.classId, 'Classe du cahier', 120);
    if (!validClassIds.has(classId)) throw new HttpError(400, 'Cahier rattaché à une classe inconnue.');
    if (!Array.isArray(entry.lessonsData)) throw new HttpError(400, 'Données de cahier invalides.');
    return {
      classId,
      lessonsData: entry.lessonsData as LessonsData,
      updatedAt: typeof entry.updatedAt === 'string' && entry.updatedAt ? entry.updatedAt : new Date().toISOString(),
    };
  });
};
