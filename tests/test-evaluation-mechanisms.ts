import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { useEvaluationActions } from '../src/features/evaluations/hooks/useEvaluationActions';
import type { AppConfig, LessonsData } from '../src/types';
import { assignHomeworkPatch, homeworkAssessmentId } from '../src/domain/evaluations/sessionRemarkChanges';
import { buildSessionActivityRemarks } from '../src/domain/evaluations/sessionActivityRemarks';
import { isKindOffered } from '../src/domain/evaluations/kindAvailability';
import { documentRequirementForEvent } from '../src/domain/evaluations/documentRequirement';
import { translateLocaleMessage } from '../src/i18n/messages';
import {
  hasOnlyPristineStarterDiagnostic, withStarterDiagnostic, withoutPristineStarterDiagnostic, createStarterDiagnostic,
} from '../src/domain/notebook/starterDiagnostic';

/*
 * LES MÉCANISMES DU CONTRÔLE CONTINU — des règles pures, vérifiables.
 * Attribution du devoir maison par ses deux portes, diagnostic de départ selon
 * le choix du professeur, natures proposées selon le niveau de la classe.
 */

test('devoir maison : la carte et la pastille partagent une seule écriture', () => {
  const config = { manualAssessments: {}, assessmentDates: {}, removedAssessments: { c: ['2026-2027:s1-maison2'] } } as unknown as AppConfig;
  const patch = assignHomeworkPatch(config, 'c', '2026-10-14', 2);
  const id = homeworkAssessmentId('2026-10-14', 2);
  assert.equal(id, '2026-2027:s1-maison2', 'même identité que la réconciliation du cahier');
  assert.deepEqual(patch.manualAssessments?.c?.[0], { id, schoolYear: '2026-2027', type: 'maison', num: 2, dateISO: '2026-10-14', semestre: 1 });
  assert.equal(patch.assessmentDates?.c?.[id], '2026-10-14');
  assert.deepEqual(patch.removedAssessments?.c, [], 'une attribution supprimée puis reposée renaît');
  // L'annotation de séance est projetée, sans aucun bloc dans le cahier.
  const lessons: LessonsData = [{ type: 'chapter', title: 'Ch', items: [{ type: 'cours', title: 'L', date: '2026-10-14' }] }];
  const translate = (key: string, values: Record<string, string | number> = {}) => translateLocaleMessage('fr', key, values);
  const remarks = buildSessionActivityRemarks({ ...config, ...patch } as AppConfig, 'c', translate, ' · ', lessons);
  assert.match(remarks.get('2026-10-14') ?? '', /Devoir à la maison 2/, 'la séance porte l’annotation, sans bloc dans le cahier');
  assert.deepEqual(assignHomeworkPatch(config, 'c', 'pas une date', 2), {}, 'date invalide : aucune écriture');
  assert.equal(homeworkAssessmentId('2027-03-02', 1), '2026-2027:s2-maison1', 'le second semestre a sa propre série');
});

test('diagnostic de départ : imposé à un programme existant, jamais à un contenu personnel', () => {
  const program: LessonsData = [{ type: 'chapter', title: 'Nombres' }];
  assert.equal(withStarterDiagnostic(program, 'fr')[0].type, 'evaluation_diagnostic', 'un programme commence par son diagnostic');
  assert.deepEqual(withStarterDiagnostic([], 'fr'), [], 'un cahier vierge reste vierge');
  const freeOnly = [{ type: 'free', title: 'Note' }] as unknown as LessonsData;
  assert.equal(withStarterDiagnostic(freeOnly, 'fr'), freeOnly, 'des lignes libres ne sont pas un programme');

  // Ancien cahier : seul le gabarit vierge posé d'office ; le premier contenu personnel le retire.
  const legacy: LessonsData = [createStarterDiagnostic('fr'), { type: 'chapter', title: 'Mon chapitre' }];
  assert.deepEqual(withoutPristineStarterDiagnostic(legacy).map(item => item.title), ['Mon chapitre']);
  const dated: LessonsData = [{ ...createStarterDiagnostic('fr'), date: '2026-09-10' }, { type: 'chapter', title: 'X' }];
  assert.equal(withoutPristineStarterDiagnostic(dated), dated, 'un diagnostic daté est un vrai diagnostic : il reste');

  // Un titre renommé n'est plus un gabarit : il reste visible.
  assert.equal(hasOnlyPristineStarterDiagnostic([{ ...createStarterDiagnostic('fr'), title: 'Évaluation diagnostique 1' }]), true);
  assert.equal(hasOnlyPristineStarterDiagnostic([{ ...createStarterDiagnostic('fr'), title: 'Évaluation diagnostique 1 — Algèbre' }]), false);
});

test('fenêtres des éléments : la colle a son suivi, une liste vidée ne laisse rien', () => {
  let patch: Partial<AppConfig> = {};
  const config = { assessmentParticipants: { c: { colle1: { names: ['Amine'], oralOutcomes: { Amine: 'mastered' }, oralGrades: { Amine: '15' }, updatedAt: 'x' } } } } as unknown as AppConfig;
  const actions = useEvaluationActions('c', config, next => { patch = next; });
  actions.saveOral('colle1', [], {}, {});
  assert.deepEqual(patch.assessmentParticipants?.c, {}, 'vider la liste efface le suivi, comme pour la remise d’un devoir');
  actions.saveOral('colle1', ['Amine'], { Amine: 'developing' }, { Amine: '12' });
  assert.equal(patch.assessmentParticipants?.c?.colle1?.oralGrades?.Amine, '12');

  const modals = readFileSync('src/features/evaluations/components/DevoirsModals.tsx', 'utf8');
  assert.match(modals, /oralFor\?\.planned\.type === 'colle' \? 'evaluations\.colle\.title' : 'evaluations\.oral\.title'/, 'la fenêtre de la colle porte son nom');
  assert.match(modals, /context=\{submissionsFor \? `\$\{selectedClassDisplayName\} · \$\{submissionsLabel\}`/, 'la remise nomme son devoir maison');
  const editor = readFileSync('src/features/evaluations/components/ManualAssessmentEditor.tsx', 'utf8');
  assert.match(editor, /if \(derived && !semesterTouched\) setSemestre\(derived\)/, 'le semestre suit la date tant qu’il n’est pas choisi à la main');
  assert.match(editor, /item\.type === type && item\.num === numValue && item\.semestre === semestre/, 'un numéro ne se répète pas dans un semestre');
  const view = readFileSync('src/features/evaluations/DevoirsView.tsx', 'utf8');
  assert.match(view, /a\.type === 'colle'\s*\? <Presentation/, 'la ligne de colle n’affiche plus le micro');
});

test('natures proposées : la colle en prépa, l’examen blanc aux années d’examen', () => {
  assert.equal(isKindOffered('colle', { cycle: 'prepa' }), true);
  assert.equal(isKindOffered('colle', { cycle: 'lycee', level: '2ème Bac Sciences Physiques' }), false);
  assert.equal(isKindOffered('examen_blanc', { cycle: 'college', level: '3AC' }), true);
  assert.equal(isKindOffered('examen_blanc', { cycle: 'college', level: '1AC' }), false);
  assert.equal(isKindOffered('examen_blanc', { cycle: 'lycee', level: 'Tronc Commun Scientifique' }), false);
  assert.equal(isKindOffered('examen_blanc', { cycle: 'lycee', level: '1er Bac Sciences Mathématiques' }), true);
  assert.equal(isKindOffered('examen_blanc', { cycle: 'college', level: 'Groupe A' }), true, 'niveau inconnu : on propose');
  assert.equal(isKindOffered('olympiade', { cycle: 'prepa' }), false);
  assert.equal(isKindOffered('controle_cahiers', { cycle: 'prepa' }), false);
  assert.equal(isKindOffered('controle', { cycle: 'prepa' }), true);
  assert.equal(documentRequirementForEvent('controle_cahiers'), 'none');
});
