import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/admin/components/TeacherDetail.tsx', 'utf8');
test('la direction utilise le formulaire enseignant et affecte son résultat au professeur sélectionné', () => {
  assert.match(source, /import \{ CreateClassModal \} from .*dashboard\/modals\/CreateClassModal/);
  assert.match(source, /<CreateClassModal[\s\S]*?existingClasses=\{classes\}[\s\S]*?onCreate=\{details => handleSaveClass\(details\)\}/);
  assert.match(source, /upsertTeacherClass\(phone, \{/);
  assert.match(source, /activeTeacherRef\.current !== phone/);
  assert.doesNotMatch(source, /setClassName|setClassSubject|setClassCycle/);
});
test('une erreur de création est propagée au formulaire partagé sans fermer la saisie', () => {
  assert.match(source, /if \(propagateError\) throw err/);
  assert.match(source, /Classe mise à jour\.[\s\S]*?\}, true\)/);
});
