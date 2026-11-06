import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isTeachingSubject,
  isClassStream,
  subjectFromStreamMistake,
  streamLabelForMistake,
  normalizeSubjectKey,
} from '../src/domain/classes/subjectPolicy';
import { SUBJECTS, formatLocalizedSubjectDisplayName } from '../src/constants/subjects';
import { readStoredClasses, CLASS_STORAGE_KEY } from '../src/infrastructure/storage/localClassStorage';

test('normalizeSubjectKey unifie accents, espaces et variantes graphiques arabes', () => {
  assert.equal(normalizeSubjectKey(' Mathématiques '), 'mathematiques');
  assert.equal(normalizeSubjectKey('الآداب والعلوم الإنسانية'), normalizeSubjectKey('الاداب والعلوم الانسانية'));
  assert.equal(normalizeSubjectKey('العلوم والتكنولوجيات الكهربائية'), normalizeSubjectKey('العلوم والتكنولوجيات الكهربائيه'));
});

test('SUBJECTS canonique ne contient plus les filières STE et STM', () => {
  assert.ok(SUBJECTS.includes('Sciences de l’Ingénieur'));
  assert.ok(!SUBJECTS.includes('Sciences et Technologies Électriques' as any));
  assert.ok(!SUBJECTS.includes('Sciences et Technologies Mécaniques' as any));
  assert.ok(!SUBJECTS.includes('Lettres et Sciences Humaines' as any));
});

test('isTeachingSubject identifie les matières valides et rejette les filières', () => {
  // Matières valides
  assert.ok(isTeachingSubject('Mathématiques'));
  assert.ok(isTeachingSubject('mathématiques'));
  assert.ok(isTeachingSubject('Physique-Chimie'));
  assert.ok(isTeachingSubject('Sciences de l’Ingénieur'));
  assert.ok(isTeachingSubject('Français'));
  assert.ok(isTeachingSubject('Arabe'));
  assert.ok(isTeachingSubject('EPS')); // alias conservé

  // Filières : ne sont JAMAIS des matières
  assert.equal(isTeachingSubject('Lettres et Sciences Humaines'), false);
  assert.equal(isTeachingSubject('LSH'), false);
  assert.equal(isTeachingSubject('TC-L'), false);
  assert.equal(isTeachingSubject('Sciences et Technologies Électriques'), false);
  assert.equal(isTeachingSubject('Sciences et Technologies Mécaniques'), false);
  assert.equal(isTeachingSubject('STE'), false);
  assert.equal(isTeachingSubject('STM'), false);
  assert.equal(isTeachingSubject('Sciences Expérimentales'), false);
  assert.equal(isTeachingSubject('الآداب والعلوم الإنسانية'), false);
  assert.equal(isTeachingSubject('العلوم والتكنولوجيات الكهربائية'), false);

  // Valeurs vides ou nulles
  assert.equal(isTeachingSubject(''), false);
  assert.equal(isTeachingSubject('   '), false);
  assert.equal(isTeachingSubject(null), false);
  assert.equal(isTeachingSubject(undefined), false);
});

test('isClassStream détecte les erreurs courantes de filière enregistrée comme matière', () => {
  assert.ok(isClassStream('Lettres et Sciences Humaines'));
  assert.ok(isClassStream('LSH'));
  assert.ok(isClassStream('الآداب والعلوم الإنسانية'));
  assert.ok(isClassStream('Sciences et Technologies Électriques'));
  assert.ok(isClassStream('STE'));
  assert.ok(isClassStream('Sciences et Technologies Mécaniques'));
  assert.ok(isClassStream('Sciences Expérimentales'));

  // Une vraie matière n'est pas une filière
  assert.equal(isClassStream('Mathématiques'), false);
  assert.equal(isClassStream('Sciences de l’Ingénieur'), false);
  assert.equal(isClassStream('Informatique'), false);
});

test('subjectFromStreamMistake déduit la matière avec certitude pour STE/STM, mais attend le choix pour LSH', () => {
  // STE / STM -> Sciences de l'Ingénieur (matière unique enseignée en SI)
  assert.equal(subjectFromStreamMistake('Sciences et Technologies Électriques'), 'Sciences de l’Ingénieur');
  assert.equal(subjectFromStreamMistake('STE'), 'Sciences de l’Ingénieur');
  assert.equal(subjectFromStreamMistake('Sciences et Technologies Mécaniques'), 'Sciences de l’Ingénieur');
  assert.equal(subjectFromStreamMistake('STM'), 'Sciences de l’Ingénieur');
  assert.equal(subjectFromStreamMistake('العلوم والتكنولوجيات الكهربائية'), 'Sciences de l’Ingénieur');

  // LSH -> null : plusieurs matières possibles (Arabe, Français, Histoire-Géo, Philo...), choix requis
  assert.equal(subjectFromStreamMistake('Lettres et Sciences Humaines'), null);
  assert.equal(subjectFromStreamMistake('LSH'), null);
  assert.equal(subjectFromStreamMistake('الآداب والعلوم الإنسانية'), null);
  assert.equal(subjectFromStreamMistake('Sciences Expérimentales'), null);
});

test('streamLabelForMistake fournit un libellé clair dans chaque langue', () => {
  assert.equal(streamLabelForMistake('Lettres et Sciences Humaines', 'ar'), 'الآداب والعلوم الإنسانية');
  assert.equal(streamLabelForMistake('Lettres et Sciences Humaines', 'fr'), 'Lettres et Sciences Humaines');
  assert.equal(streamLabelForMistake('Lettres et Sciences Humaines', 'en'), 'Literature and Humanities');
  assert.equal(streamLabelForMistake('STE', 'ar'), 'العلوم والتكنولوجيات الكهربائية');
});

test('formatLocalizedSubjectDisplayName traduit proprement les anciens libellés et filières', () => {
  assert.equal(formatLocalizedSubjectDisplayName('Mathématiques', 'ar'), 'الرياضيات');
  assert.equal(formatLocalizedSubjectDisplayName('Sciences de l’Ingénieur', 'ar'), 'علوم المهندس');
  assert.equal(formatLocalizedSubjectDisplayName('Lettres et Sciences Humaines', 'ar'), 'الآداب والعلوم الإنسانية');
  assert.equal(formatLocalizedSubjectDisplayName('Sciences et Technologies Électriques', 'ar'), 'العلوم والتكنولوجيات الكهربائية');
});

test('readStoredClasses répare STE/STM silencieusement et préserve LSH pour invite utilisateur', () => {
  const json = JSON.stringify([
    {
      id: 'c1',
      name: '2 Bac STE 1',
      subject: 'Sciences et Technologies Électriques',
      color: '#3b82f6',
    },
    {
      id: 'c2',
      name: 'TC Lettres 1',
      subject: 'Lettres et Sciences Humaines',
      color: '#ef4444',
    },
    {
      id: 'c3',
      name: '1 Bac SM',
      subject: 'Mathématiques',
      color: '#10b981',
    },
  ]);

  const mockStorage = {
    getItem: (key: string) => (key === CLASS_STORAGE_KEY ? json : null),
  };

  const classes = readStoredClasses(mockStorage);
  assert.equal(classes.length, 3);
  // STE est réparée de manière déterministe
  assert.equal(classes[0].subject, 'Sciences de l’Ingénieur');
  // LSH est préservée pour que CreateClassModal puisse guider l'enseignant sans perte
  assert.equal(classes[1].subject, 'Lettres et Sciences Humaines');
  // Mathématiques reste intacte
  assert.equal(classes[2].subject, 'Mathématiques');
});

test('ClassEvaluationsSheet et composants garantissent la sécurité visuelle', () => {
  const rootDir = fileURLToPath(new URL('..', import.meta.url));
  const sheetPath = resolve(rootDir, 'src/features/evaluations/ClassEvaluationsSheet.tsx');
  const sheetSrc = readFileSync(sheetPath, 'utf8');
  assert.ok(sheetSrc.includes('evaluation-reference'), 'La modale doit porter la classe evaluation-reference');
  assert.ok(sheetSrc.includes('formatLocalizedSubjectDisplayName'), 'Le sous-titre doit localiser la matière');

  const badgePath = resolve(rootDir, 'src/features/evaluations/components/SectionPanelBadge.tsx');
  const badgeSrc = readFileSync(badgePath, 'utf8');
  assert.ok(badgeSrc.includes('size-[38px]'), 'Le conteneur de glyph doit avoir une taille bornée');
  assert.ok(badgeSrc.includes('size-[18px]'), 'Le SVG doit avoir une taille bornée 18px');

  const cssSrc = [
    'src/features/evaluations/evaluationReferenceBase.css',
    'src/features/evaluations/evaluationReferenceCore.css',
    'src/features/evaluations/evaluationReference.css',
  ].map(path => readFileSync(resolve(rootDir, path), 'utf8')).join('\n');
  assert.ok(cssSrc.includes('.ev-panel-glyph svg'), 'Le CSS doit borner le SVG .ev-panel-glyph');
});

