/*
 * JOURNAL DE L'ADMINISTRATION — qui a changé quoi, et quand.
 *
 * Chaque action d'écriture de la console (bloquer un compte, supprimer, envoyer un message, publier une
 * politique…) laisse une ligne courte : l'heure, l'action, l'enseignant concerné et un détail lisible.
 * Le journal est borné (les 300 dernières lignes) et ne contient JAMAIS de contenu : ni le texte d'un
 * message, ni un cahier, ni un nom d'élève — seulement sa taille ou son nombre.
 *
 * Module pur et sans dépendance : chargé par l'API (imports relatifs avec extension, voir `check:api`)
 * comme par la console.
 */
export interface AdminAuditEntry {
  id: string;
  /** Instant de l'action, ISO. */
  at: string;
  action: string;
  /** Enseignant concerné, quand l'action en vise un. */
  phone?: string;
  /** Résumé lisible, sans contenu. */
  detail?: string;
}

export const MAX_AUDIT_ENTRIES = 300;

/** Actions d'écriture journalisées, avec le libellé que lit la direction. */
export const AUDIT_LABELS: Readonly<Record<string, string>> = {
  blockTeacher: 'Accès du compte',
  deleteTeacher: 'Suppression du compte',
  notifyTeacher: 'Message envoyé',
  saveCalendar: 'Calendrier des vacances',
  saveTimetableClock: 'Horaires des séances',
  saveEvaluationPolicy: 'Contrôle continu',
  saveOfficialEvents: 'Bulletin officiel',
  saveAssessmentDate: 'Date de devoir imposée',
  saveClassRoster: 'Liste d’élèves',
  upsertTeacherClass: 'Classe créée ou modifiée',
  deleteTeacherClass: 'Classe supprimée',
  importClassLessons: 'Cahier importé',
};

export const isAuditedAction = (action: unknown): action is string =>
  typeof action === 'string' && Object.hasOwn(AUDIT_LABELS, action);

const str = (value: unknown): string => (typeof value === 'string' ? value : '');

/** Résumé d'une action, calculé depuis la requête. Aucune donnée de contenu n'y passe. */
export const auditDetailFor = (action: string, body: Record<string, unknown>): string | undefined => {
  switch (action) {
    case 'blockTeacher': return body.blocked === true ? 'Compte bloqué' : 'Compte débloqué';
    case 'deleteTeacher': return 'Compte et cahiers supprimés';
    case 'notifyTeacher': return `Message de ${str(body.message).trim().length} caractères`;
    case 'saveEvaluationPolicy': return str(body.phone) ? 'Politique du compte' : 'Politique générale';
    case 'saveTimetableClock': return str(body.phone) ? 'Horaires du compte' : 'Horaires généraux';
    case 'saveAssessmentDate': return str(body.date) ? `Date fixée au ${str(body.date).split('-').reverse().join('/')}` : 'Date retirée';
    case 'saveClassRoster': return `${Array.isArray(body.studentNames) ? body.studentNames.length : 0} élève(s)`;
    case 'importClassLessons': return body.importMode === 'replace' ? 'Remplacement du cahier' : 'Ajout au cahier';
    default: return undefined;
  }
};

/** Ajoute une ligne en tête et garde les plus récentes. */
export const appendAudit = (entries: readonly AdminAuditEntry[], entry: AdminAuditEntry): AdminAuditEntry[] =>
  [entry, ...entries].slice(0, MAX_AUDIT_ENTRIES);

/** Relit un journal stocké : tout ce qui n'est pas une ligne valide est écarté, jamais une erreur. */
export const normalizeAudit = (raw: unknown): AdminAuditEntry[] => {
  if (!Array.isArray(raw)) return [];
  const entries: AdminAuditEntry[] = [];
  for (const candidate of raw) {
    if (!candidate || typeof candidate !== 'object') continue;
    const value = candidate as Record<string, unknown>;
    if (typeof value.id !== 'string' || typeof value.action !== 'string' || typeof value.at !== 'string'
      || !Number.isFinite(Date.parse(value.at))) continue;
    entries.push({
      id: value.id.slice(0, 80),
      at: value.at,
      action: value.action.slice(0, 60),
      ...(typeof value.phone === 'string' && value.phone ? { phone: value.phone.slice(0, 80) } : {}),
      ...(typeof value.detail === 'string' && value.detail ? { detail: value.detail.slice(0, 160) } : {}),
    });
    if (entries.length >= MAX_AUDIT_ENTRIES) break;
  }
  return entries;
};
