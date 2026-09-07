import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCurriculumCatalog } from '../utils/officialCurriculum';

const directory = fileURLToPath(new URL('../public/doc_officiel/', import.meta.url));
const catalog = validateCurriculumCatalog(JSON.parse(readFileSync(resolve(directory, 'curriculum.json'), 'utf8')));
const images = readdirSync(directory).filter(file => /\.(jpe?g|png|webp|pdf)$/i.test(file));
assert.deepEqual([...images].sort(), catalog.documents.map(doc => doc.file).sort(), 'Document ajouté ou supprimé : lecture et transcription requises.');
for (const doc of catalog.documents) {
  assert.equal(doc.file, doc.file.split(/[\\/]/).pop(), 'Nom de source non local');
  const digest = createHash('sha256').update(readFileSync(resolve(directory, doc.file))).digest('hex');
  assert.equal(digest, doc.sha256, `${doc.file} a changé : relire le document, actualiser la transcription puis son empreinte.`);
  if (doc.duplicateOf) assert.ok(catalog.documents.some(candidate => candidate.id === doc.duplicateOf), 'Doublon sans source');
}
console.log(`${images.length} documents vérifiés, ${catalog.plans.length} répartitions distinctes ; aucune source nouvelle ou modifiée non relue.`);
