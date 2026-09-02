import { HttpError } from './http.js';
import type {
  AppConfig,
  AppLocale,
  ClassInfo,
  ClassSnapshot,
  ContentDirection,
  LessonsData,
  ScheduleSlot,
  TeacherSnapshot,
  TimetableEntry,
} from '../../types.js';

const MAX_BODY_BYTES = 950_000; // marge sous la limite ~1 MB des requêtes Upstash
const VALID_CYCLES = new Set(['college', 'lycee', 'prepa']);
const VALID_ASSESSMENT_TYPES = new Set(['controle', 'controle_court', 'controle_global', 'oral', 'maison']);
const VALID_PEDAGOGICAL_TYPES = new Set(['evaluation_diagnostic', 'olympiade', 'concours', 'soutien', 'remediation', 'examen_blanc', 'rattrapage', 'autre']);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const validISODate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
};

const snapshotText = (value: unknown, label: string, max: number): string => {
  if (typeof value !== 'string') throw new HttpError(400, `${label} invalide.`);
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) throw new HttpError(400, `${label} invalide.`);
  return trimmed;
};

const snapshotInteger = (value: unknown, label: string, max: number): number => {
  if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > max) {
    throw new HttpError(400, `${label} invalide.`);
  }
  return Number(value);
};

const normalizeSnapshotSlots = (value: unknown, label: string): ScheduleSlot[] | undefined => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 14) throw new HttpError(400, `${label} invalide.`);
  const sessionsByWeekday = new Map<number, number>();
  for (const raw of value) {
    if (!isPlainObject(raw) || !Number.isInteger(raw.weekday) || Number(raw.weekday) < 0 || Number(raw.weekday) > 6) {
      throw new HttpError(400, `${label} contient un jour invalide.`);
    }
    const sessions = raw.sessions === undefined ? 1 : snapshotInteger(raw.sessions, `${label}.sessions`, 12);
    if (sessions < 1) throw new HttpError(400, `${label}.sessions invalide.`);
    const weekday = Number(raw.weekday);
    sessionsByWeekday.set(weekday, (sessionsByWeekday.get(weekday) ?? 0) + sessions);
  }
  return [...sessionsByWeekday.entries()]
    .sort(([left], [right]) => left - right)
    .map(([weekday, sessions]) => ({ weekday, sessions }));
};

export interface TeacherSnapshotValidationOptions {
  /** Horodatage autoritaire ajouté par `/api/sync`. Sans lui, la valeur stockée est contrôlée puis conservée. */
  syncedAt?: string;
  /** Empêche un snapshot de projeter une classe absente du blob synchronisé. */
  validClassIds?: Set<string>;
}

/**
 * Valide la frontière de confiance des snapshots. Le même validateur sert à
 * l'écriture et au cron afin qu'une ancienne valeur Redis endommagée soit
 * isolée à son utilisateur au lieu d'interrompre toute l'invocation.
 */
export const assertValidTeacherSnapshot = (
  value: unknown,
  phone: string,
  options: TeacherSnapshotValidationOptions = {},
): TeacherSnapshot => {
  if (!isPlainObject(value)) throw new HttpError(400, 'Snapshot enseignant invalide.');
  if (!Array.isArray(value.classes) || value.classes.length > 120) {
    throw new HttpError(400, 'Classes du snapshot invalides.');
  }

  const seen = new Set<string>();
  const classes: ClassSnapshot[] = value.classes.map((raw, index) => {
    if (!isPlainObject(raw)) throw new HttpError(400, `Classe du snapshot ${index + 1} invalide.`);
    const id = snapshotText(raw.id, 'Identifiant de classe du snapshot', 120);
    if (seen.has(id)) throw new HttpError(400, 'Classes du snapshot dupliquées.');
    if (options.validClassIds && !options.validClassIds.has(id)) {
      throw new HttpError(400, 'Le snapshot référence une classe inconnue.');
    }
    seen.add(id);

    if (!Array.isArray(raw.weekdays) || raw.weekdays.length > 14) {
      throw new HttpError(400, `Jours de la classe ${id} invalides.`);
    }
    const weekdays = [...new Set(raw.weekdays.map(day => {
      if (!Number.isInteger(day) || Number(day) < 0 || Number(day) > 6) {
        throw new HttpError(400, `Jour de la classe ${id} invalide.`);
      }
      return Number(day);
    }))].sort((left, right) => left - right);
    const scheduleSlots = normalizeSnapshotSlots(raw.scheduleSlots, `Créneaux de la classe ${id}`);
    const updatedAt = typeof raw.updatedAt === 'string' && Number.isFinite(Date.parse(raw.updatedAt))
      ? new Date(raw.updatedAt).toISOString()
      : (() => { throw new HttpError(400, `Horodatage de la classe ${id} invalide.`); })();
    const lastDate = raw.lastDate === null
      ? null
      : validISODate(raw.lastDate)
        ? raw.lastDate
        : (() => { throw new HttpError(400, `Dernière date de la classe ${id} invalide.`); })();
    const completionRate = snapshotInteger(raw.completionRate, `Progression de la classe ${id}`, 100);

    return {
      id,
      name: snapshotText(raw.name, 'Nom de classe du snapshot', 120),
      subject: snapshotText(raw.subject, 'Matière du snapshot', 120),
      cycle: VALID_CYCLES.has(raw.cycle as string) ? raw.cycle as ClassSnapshot['cycle'] : undefined,
      totalItems: snapshotInteger(raw.totalItems, `Total de la classe ${id}`, 10_000_000),
      plannedCount: snapshotInteger(raw.plannedCount, `Contenus planifiés de la classe ${id}`, 10_000_000),
      completionRate,
      sessionsCount: snapshotInteger(raw.sessionsCount, `Séances de la classe ${id}`, 10_000_000),
      lastDate,
      weekdays: scheduleSlots?.map(slot => slot.weekday) ?? weekdays,
      ...(scheduleSlots ? { scheduleSlots } : {}),
      sessionsPerWeek: scheduleSlots
        ? scheduleSlots.reduce((total, slot) => total + (slot.sessions ?? 1), 0)
        : snapshotInteger(raw.sessionsPerWeek, `Séances hebdomadaires de la classe ${id}`, 84),
      updatedAt,
    };
  });

  let notifyPrefs: TeacherSnapshot['notifyPrefs'];
  if (value.notifyPrefs !== undefined) {
    if (!isPlainObject(value.notifyPrefs)) throw new HttpError(400, 'Préférences de notification invalides.');
    const prefs = value.notifyPrefs;
    if (typeof prefs.quietDuringVacations !== 'boolean') throw new HttpError(400, 'Préférence vacances invalide.');
    if (prefs.enabled !== undefined && typeof prefs.enabled !== 'boolean') throw new HttpError(400, 'Activation des notifications invalide.');
    if (prefs.pushEnabled !== undefined && typeof prefs.pushEnabled !== 'boolean') throw new HttpError(400, 'Activation Push invalide.');
    notifyPrefs = {
      gapThreshold: snapshotInteger(prefs.gapThreshold, 'Seuil de retard', 100),
      inactivityThresholdDays: snapshotInteger(prefs.inactivityThresholdDays, 'Seuil d’inactivité', 365),
      quietDuringVacations: prefs.quietDuringVacations as boolean,
      ...(prefs.enabled !== undefined ? { enabled: prefs.enabled as boolean } : {}),
      ...(prefs.pushEnabled !== undefined ? { pushEnabled: prefs.pushEnabled as boolean } : {}),
    };
  }

  let absences: TeacherSnapshot['absences'];
  if (value.absences !== undefined) {
    if (!Array.isArray(value.absences) || value.absences.length > 200) throw new HttpError(400, 'Absences du snapshot invalides.');
    absences = value.absences.map(raw => {
      if (!isPlainObject(raw) || !validISODate(raw.debut) || !validISODate(raw.fin) || raw.fin < raw.debut) {
        throw new HttpError(400, 'Période d’absence du snapshot invalide.');
      }
      return {
        debut: raw.debut,
        fin: raw.fin,
        ...(typeof raw.motif === 'string' && raw.motif.trim() ? { motif: raw.motif.trim().slice(0, 240) } : {}),
      };
    });
  }

  const locale: AppLocale | undefined = value.applicationLocale === 'fr'
    || value.applicationLocale === 'en'
    || value.applicationLocale === 'ar'
    ? value.applicationLocale
    : undefined;
  const rawLastSyncAt = value.lastSyncAt;
  const lastSyncAt = options.syncedAt ?? (
    rawLastSyncAt === null
      ? null
      : typeof rawLastSyncAt === 'string' && Number.isFinite(Date.parse(rawLastSyncAt))
        ? new Date(rawLastSyncAt).toISOString()
        : (() => { throw new HttpError(400, 'Horodatage du snapshot invalide.'); })()
  );
  const schoolYearStart = value.schoolYearStart === undefined
    ? undefined
    : validISODate(value.schoolYearStart)
      ? value.schoolYearStart
      : (() => { throw new HttpError(400, 'Rentrée du snapshot invalide.'); })();

  return {
    phone,
    nom: snapshotText(value.nom, 'Nom du snapshot', 60),
    prenom: snapshotText(value.prenom, 'Prénom du snapshot', 60),
    ...(locale ? { applicationLocale: locale } : {}),
    lastSyncAt,
    ...(notifyPrefs ? { notifyPrefs } : {}),
    ...(absences?.length ? { absences } : {}),
    ...(schoolYearStart ? { schoolYearStart } : {}),
    classes,
  };
};

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
