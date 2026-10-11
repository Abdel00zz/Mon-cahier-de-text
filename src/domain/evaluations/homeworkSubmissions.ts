import type { HomeworkOutcome } from '../../types.js';

/*
 * REMISE DES DEVOIRS — le suivi que réclame le métier.
 *
 * Un devoir maison « donné » ne dit rien tant qu'on ne sait pas QUI l'a rendu.
 * On ne consigne que deux états, parce que ce sont les deux seuls que
 * l'enseignant peut constater : rendu, ou non rendu. L'absence n'est pas un
 * « non rendu » — un élève absent ce jour-là n'a pas failli ; elle se consigne
 * avec le bouton Absents, et les deux informations restent séparées pour que la
 * direction puisse les distinguer.
 *
 * Un élève sans état reste « à vérifier » : on ne préremplit jamais une remise
 * que le professeur n'a pas constatée.
 */

export const HOMEWORK_OUTCOMES: readonly HomeworkOutcome[] = ['given', 'missing'];

/** Ne conserve que les états des élèves encore présents dans la liste. */
export const retainHomeworkOutcomes = (names: readonly string[], values?: Record<string, HomeworkOutcome>): Record<string, HomeworkOutcome> =>
  Object.fromEntries(names
    .filter(name => values && Object.hasOwn(values, name) && HOMEWORK_OUTCOMES.includes(values[name]))
    .map(name => [name, values![name]]));

export interface HomeworkSummary {
  given: number;
  missing: number;
  /** Élèves dont la remise n'a pas encore été constatée. */
  pending: number;
}

export const countHomeworkOutcomes = (names: readonly string[], values?: Record<string, HomeworkOutcome>): HomeworkSummary => {
  let given = 0;
  let missing = 0;
  for (const name of names) {
    const value = values?.[name];
    if (value === 'given') given += 1;
    else if (value === 'missing') missing += 1;
  }
  return { given, missing, pending: names.length - given - missing };
};

/** Taux de remise constaté, en pourcentage ; `null` tant que rien n'est consigné. */
export const homeworkSubmissionRate = (summary: HomeworkSummary): number | null => {
  const observed = summary.given + summary.missing;
  return observed === 0 ? null : Math.round((summary.given / observed) * 100);
};
