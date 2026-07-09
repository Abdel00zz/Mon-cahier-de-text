/**
 * ══════════════════════════════════════════════════════════════════════════
 *  LE CERVEAU MÉTIER — point d'entrée unique des modules PURS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Ces modules ne contiennent QUE de la logique de calcul : aucun import de
 * React, du DOM ou de `logger`. C'est ce qui permet de les réutiliser à la
 * fois côté navigateur ET côté fonctions serverless (ex. le cron `api/notify`),
 * sans jamais dupliquer une règle métier.
 *
 * Carte du cerveau :
 *   • progression   — complétion %, séances, instantané enseignant
 *   • calendar      — année scolaire, jours fériés/vacances (multi-années)
 *   • lateness      — retard = séances attendues vs saisies
 *   • assessments   — planning officiel des devoirs (dates indicatives)
 *   • dateValidation— garde intelligente d'une date saisie
 *   • timetable     — grille emploi du temps → schedules dérivés
 *
 * Utilisez ce barrel pour importer la logique métier :
 *   import { computeLateness, validateSessionDate } from '@/utils/engine';
 */
export * from './progression.js';
export * from './calendar.js';
export * from './lateness.js';
export * from './assessments.js';
export * from './dateValidation.js';
export * from './timetable.js';
