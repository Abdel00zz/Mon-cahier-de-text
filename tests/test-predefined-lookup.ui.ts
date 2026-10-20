import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { findPredefinedFor, setManifestCache } from '../src/domain/curriculum/predefinedContent';
import type { ClassInfo } from '../src/types';

// Charger le manifest réel du disque pour le test
const manifestPath = resolve(process.cwd(), 'public/contenus/manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const makeClass = (id: string, name: string, subject: string): ClassInfo => ({
  id,
  name,
  subject,
  teacherName: 'Professeur',
  createdAt: new Date().toISOString(),
  color: '#2563eb',
});

test.before(() => {
  setManifestCache(manifest);
});

test('findPredefinedFor : reconnaît les classes et matières en arabe et en français', async () => {
  // 1. 2ème Bac Sciences Physiques en arabe (avec "الرياضيات")
  const ar2BacPcMath = makeClass('c1', '2 باك علوم فيزيائية 1', 'الرياضيات');
  const entry1 = await findPredefinedFor(ar2BacPcMath);
  assert.ok(entry1, 'Doit trouver le programme de maths pour 2 باك علوم فيزيائية');
  assert.equal(entry1.fichier, '2bac-pc-mathematiques.json');
  assert.equal(entry1.matiere, 'Mathématiques');

  // 2. 2ème Bac Sciences Physiques en arabe avec matière "الفيزياء والكيمياء"
  const ar2BacPcPhysics = makeClass('c2', '2 باك علوم فيزيائية 2', 'الفيزياء والكيمياء');
  const entry2 = await findPredefinedFor(ar2BacPcPhysics);
  assert.ok(entry2, 'Doit trouver le programme de physique-chimie pour 2 باك علوم فيزيائية');
  assert.equal(entry2.fichier, '2bac-pc-physique-chimie.json');

  // 3. Tronc Commun Scientifique en arabe ("جذع مشترك علمي") avec "الرياضيات"
  const arTcMath = makeClass('c3', 'جذع مشترك علمي 3', 'الرياضيات');
  const entry3 = await findPredefinedFor(arTcMath);
  assert.ok(entry3, 'Doit trouver le programme de maths pour جذع مشترك علمي');
  assert.equal(entry3.fichier, 'tc-sciences-mathematiques.json');

  // 4. Collège 3AC en arabe ("الثالثة إعدادي") avec "علوم الحياة والأرض"
  const ar3AcSvt = makeClass('c4', 'الثالثة إعدادي 1', 'علوم الحياة والأرض');
  const entry4 = await findPredefinedFor(ar3AcSvt);
  assert.ok(entry4, 'Doit trouver le programme SVT pour 3AC en arabe');
  assert.equal(entry4.fichier, '3ac-svt.json');

  // 5. Sigles compacts français ("2BAC PC", "SVT")
  const fr2BacSvt = makeClass('c5', '2BAC SVT 1', 'SVT');
  const entry5 = await findPredefinedFor(fr2BacSvt);
  assert.ok(entry5, 'Doit trouver le programme SVT pour 2BAC SVT');
  assert.equal(entry5.fichier, '2bac-svt-svt.json');

  // 6. 1er Bac Sciences Expérimentales en arabe ("1 باك علوم تجريبية")
  const ar1BacSeMath = makeClass('c6', '1 باك علوم تجريبية 2', 'رياضيات');
  const entry6 = await findPredefinedFor(ar1BacSeMath);
  assert.ok(entry6, 'Doit trouver le programme de maths pour 1 باك علوم تجريبية');
  assert.equal(entry6.fichier, '1bac-se-mathematiques.json');

  // 7. Préfixe "قسم" en arabe
  const qismPrefixed = makeClass('c7', 'قسم 1 باك علوم رياضية 1', 'الرياضيات');
  const entry7 = await findPredefinedFor(qismPrefixed);
  assert.ok(entry7, 'Doit supporter le préfixe قسم');
  assert.equal(entry7.fichier, '1bac-sm-mathematiques.json');

  // 8. Collège 1AC Physique-Chimie en arabe ("الأولى إعدادي", "الفيزياء والكيمياء")
  const ar1AcPc = makeClass('c8', 'الأولى إعدادي 3', 'الفيزياء والكيمياء');
  const entry8 = await findPredefinedFor(ar1AcPc);
  assert.ok(entry8, 'Doit trouver le programme de physique-chimie pour 1AC');
  assert.equal(entry8.fichier, '1ac-physique-chimie.json');

  // 9. Tronc Commun Scientifique SVT en arabe ("جذع مشترك علمي", "علوم الحياة والأرض")
  const arTcSvt = makeClass('c9', 'جذع مشترك علمي 1', 'علوم الحياة والأرض');
  const entry9 = await findPredefinedFor(arTcSvt);
  assert.ok(entry9, 'Doit trouver le programme SVT pour Tronc Commun Scientifique');
  assert.equal(entry9.fichier, 'tc-sciences-svt.json');

  // 10. 1er Bac Sciences Économiques et Gestion Maths ("1er Bac Sciences Économiques et Gestion", "Mathématiques")
  const fr1BacEco = makeClass('c10', '1er Bac Sciences Économiques et Gestion 1', 'Mathématiques');
  const entry10 = await findPredefinedFor(fr1BacEco);
  assert.ok(entry10, 'Doit trouver le programme de maths pour 1er Bac Sciences Économiques et Gestion');
  assert.equal(entry10.fichier, '1bac-eco-mathematiques.json');

  // 11. CPGE 1re année MPSI Mathématiques
  const cpgeMpsiMath = makeClass('c11', '1re année MPSI 1', 'Mathématiques');
  const entry11 = await findPredefinedFor(cpgeMpsiMath);
  assert.ok(entry11, 'Doit trouver le programme de maths pour 1re année MPSI');
  assert.equal(entry11.fichier, 'cpge-mpsi-mathematiques.json');

  // 12. Classe sans correspondance (matière ou niveau hors catalogue)
  const unknown = makeClass('c12', 'Classe Musique libre', 'Musique');
  const entry12 = await findPredefinedFor(unknown);
  assert.equal(entry12, null, 'Doit retourner null pour une matière ou niveau non répertorié');
});
