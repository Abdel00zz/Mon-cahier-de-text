import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareImportedLessons } from '../utils/importPipeline';
import { withStarterDiagnostic } from '../utils/starterDiagnostic';

interface ManifestEntry {
  niveau: string;
  matiere: string;
  titre: string;
  fichier: string;
}

interface ContentManifest {
  version: number;
  contenus: ManifestEntry[];
}

const root = fileURLToPath(new URL('../public/contenus/', import.meta.url));
const manifestPath = resolve(root, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as ContentManifest;
const subjectFolders: Record<string, string> = {
  'Mathématiques': 'mathematiques',
  'Physique-Chimie': 'physique-chimie',
  'Sciences de la Vie et de la Terre': 'svt',
};
const normalize = (value: string): string => value.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();
const folderFor = (subject: string): string => subjectFolders[subject]
  ?? normalize(subject).replace(/\s+/g, '-');

assert.equal(manifest.version, 2, 'Version du manifeste de contenus inconnue.');
assert.ok(Array.isArray(manifest.contenus) && manifest.contenus.length > 0, 'Manifeste de contenus vide.');

const references = new Set<string>();
const combinations = new Set<string>();
let chapterCount = 0;

for (const entry of manifest.contenus) {
  assert.ok(entry.niveau?.trim() && entry.matiere?.trim() && entry.titre?.trim() && entry.fichier?.trim(), 'Entrée de manifeste incomplète.');
  assert.equal(entry.fichier, basename(entry.fichier), `Chemin de fichier non local : ${entry.fichier}`);

  const combination = `${normalize(entry.niveau)}::${normalize(entry.matiere)}`;
  assert.ok(!combinations.has(combination), `Contenu dupliqué pour ${entry.niveau} · ${entry.matiere}`);
  combinations.add(combination);

  const folder = folderFor(entry.matiere);
  const filePath = resolve(root, folder, entry.fichier);
  assert.equal(dirname(filePath), resolve(root, folder), `Chemin hors dossier : ${entry.fichier}`);
  assert.ok(existsSync(filePath), `Fichier référencé introuvable : ${folder}/${entry.fichier}`);

  const payload = JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
  const prepared = prepareImportedLessons(payload);
  assert.ok(prepared.lessonsData.length > 0, `Contenu vide ou illisible : ${folder}/${entry.fichier}`);
  assert.ok(prepared.lessonsData.every(item => item.type && item.title?.trim()), `Chapitre invalide : ${folder}/${entry.fichier}`);
  assert.equal(withStarterDiagnostic(prepared.lessonsData, 'fr')[0]?.type, 'evaluation_diagnostic', `Diagnostic initial absent après import : ${entry.fichier}`);

  chapterCount += prepared.lessonsData.length;
  references.add(`${folder}/${entry.fichier}`.toLowerCase());
}

const unreferencedFiles: string[] = [];
for (const directory of readdirSync(root, { withFileTypes: true }).filter(item => item.isDirectory())) {
  for (const file of readdirSync(resolve(root, directory.name), { withFileTypes: true })) {
    if (!file.isFile() || !file.name.toLowerCase().endsWith('.json')) continue;
    const relativePath = `${directory.name}/${file.name}`.toLowerCase();
    if (!references.has(relativePath)) unreferencedFiles.push(`${directory.name}/${file.name}`);
  }
}

if (unreferencedFiles.length > 0) {
  console.warn(`JSON à réviser, non publiés par le manifeste : ${unreferencedFiles.join(', ')}`);
}
console.log(`${manifest.contenus.length} contenus prédéfinis vérifiés, ${chapterCount} blocs importables ; ${unreferencedFiles.length} fichier(s) en attente de révision.`);
