import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { writeCurriculumIfMissing } from './curriculum-builder-helpers.mjs';
import { info1AC, info2AC, info3AC, infoTC } from './data/curriculum-informatique.mjs';
import { philo1BAC, philo2BAC } from './data/curriculum-philosophie.mjs';
import { hg1AC, hg2AC, hg3AC, hg1BAC, hg2BAC } from './data/curriculum-histoire-geographie.mjs';
import { islam1AC, islam1BAC } from './data/curriculum-education-islamique.mjs';
import { francaisTC, francais1BAC, francais2BAC } from './data/curriculum-francais.mjs';
import { arabe1BAC, arabe2BAC } from './data/curriculum-arabe.mjs';
import { anglais1BAC, anglais2BAC } from './data/curriculum-anglais.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../public/contenus');
const manifestPath = resolve(root, 'manifest.json');

console.log('=== Génération des matières transversales marocaines ===\n');

// Création des dossiers si nécessaire
const folders = [
  'informatique',
  'philosophie',
  'histoire-geographie',
  'education-islamique',
  'francais',
  'arabe',
  'anglais'
];

for (const f of folders) {
  const dir = resolve(root, f);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    console.log(`[MKDIR] Dossier créé : ${f}/`);
  }
}

const filesToGenerate = [
  // Informatique
  { path: 'informatique/1ac-informatique.json', data: info1AC },
  { path: 'informatique/2ac-informatique.json', data: info2AC },
  { path: 'informatique/3ac-informatique.json', data: info3AC },
  { path: 'informatique/tc-informatique.json', data: infoTC },

  // Philosophie
  { path: 'philosophie/1bac-philosophie.json', data: philo1BAC },
  { path: 'philosophie/2bac-philosophie.json', data: philo2BAC },

  // Histoire-Géographie
  { path: 'histoire-geographie/1ac-histoire-geographie.json', data: hg1AC },
  { path: 'histoire-geographie/2ac-histoire-geographie.json', data: hg2AC },
  { path: 'histoire-geographie/3ac-histoire-geographie.json', data: hg3AC },
  { path: 'histoire-geographie/1bac-histoire-geographie.json', data: hg1BAC },
  { path: 'histoire-geographie/2bac-lettres-histoire-geographie.json', data: hg2BAC },

  // Éducation Islamique
  { path: 'education-islamique/1ac-education-islamique.json', data: islam1AC },
  { path: 'education-islamique/1bac-education-islamique.json', data: islam1BAC },

  // Français
  { path: 'francais/tc-francais.json', data: francaisTC },
  { path: 'francais/1bac-francais.json', data: francais1BAC },
  { path: 'francais/2bac-francais.json', data: francais2BAC },

  // Arabe
  { path: 'arabe/1bac-lettres-arabe.json', data: arabe1BAC },
  { path: 'arabe/2bac-lettres-arabe.json', data: arabe2BAC },

  // Anglais
  { path: 'anglais/1bac-anglais.json', data: anglais1BAC },
  { path: 'anglais/2bac-anglais.json', data: anglais2BAC },
];

let createdCount = 0;
for (const file of filesToGenerate) {
  if (writeCurriculumIfMissing(file.path, file.data)) {
    createdCount++;
  }
}
console.log(`\n=> Nouveaux fichiers de matières créés : ${createdCount} / ${filesToGenerate.length}\n`);

// Mise à jour de manifest.json
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const normalize = (value) => value.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const existingKeys = new Set(manifest.contenus.map(c => `${normalize(c.niveau)}::${normalize(c.matiere)}`));

const newEntries = [
  // Informatique
  { niveau: "1AC", matiere: "Informatique", titre: "Programme officiel, 1AC · Informatique", fichier: "1ac-informatique.json" },
  { niveau: "2AC", matiere: "Informatique", titre: "Programme officiel, 2AC · Informatique", fichier: "2ac-informatique.json" },
  { niveau: "3AC", matiere: "Informatique", titre: "Programme officiel, 3AC · Informatique", fichier: "3ac-informatique.json" },
  { niveau: "Tronc Commun Scientifique", matiere: "Informatique", titre: "Programme officiel, Tronc Commun Scientifique · Informatique", fichier: "tc-informatique.json" },
  { niveau: "Tronc Commun Technologique", matiere: "Informatique", titre: "Programme officiel, Tronc Commun Technologique · Informatique", fichier: "tc-informatique.json" },

  // Philosophie (Examen National 2BAC & 1BAC)
  { niveau: "1er Bac Lettres et Sciences Humaines", matiere: "Philosophie", titre: "Programme officiel, 1er Bac Lettres et Sciences Humaines · Philosophie", fichier: "1bac-philosophie.json" },
  { niveau: "2ème Bac Lettres", matiere: "Philosophie", titre: "Programme officiel, 2ème Bac Lettres · Philosophie", fichier: "2bac-philosophie.json" },
  { niveau: "2ème Bac Sciences Humaines", matiere: "Philosophie", titre: "Programme officiel, 2ème Bac Sciences Humaines · Philosophie", fichier: "2bac-philosophie.json" },
  { niveau: "2ème Bac Sciences Physiques", matiere: "Philosophie", titre: "Programme officiel, 2ème Bac Sciences Physiques · Philosophie", fichier: "2bac-philosophie.json" },
  { niveau: "2ème Bac Sciences de la Vie et de la Terre", matiere: "Philosophie", titre: "Programme officiel, 2ème Bac SVT · Philosophie", fichier: "2bac-philosophie.json" },
  { niveau: "2ème Bac Sciences Mathématiques A", matiere: "Philosophie", titre: "Programme officiel, 2ème Bac Sciences Mathématiques A · Philosophie", fichier: "2bac-philosophie.json" },
  { niveau: "2ème Bac Sciences Économiques", matiere: "Philosophie", titre: "Programme officiel, 2ème Bac Sciences Économiques · Philosophie", fichier: "2bac-philosophie.json" },

  // Histoire-Géographie
  { niveau: "1AC", matiere: "Histoire-Géographie", titre: "Programme officiel, 1AC · Histoire-Géographie", fichier: "1ac-histoire-geographie.json" },
  { niveau: "2AC", matiere: "Histoire-Géographie", titre: "Programme officiel, 2AC · Histoire-Géographie", fichier: "2ac-histoire-geographie.json" },
  { niveau: "3AC", matiere: "Histoire-Géographie", titre: "Programme officiel, 3AC · Histoire-Géographie", fichier: "3ac-histoire-geographie.json" },
  { niveau: "1er Bac Sciences Expérimentales", matiere: "Histoire-Géographie", titre: "Programme officiel, 1er Bac Sciences Expérimentales · Histoire-Géographie (Régional)", fichier: "1bac-histoire-geographie.json" },
  { niveau: "1er Bac Sciences Mathématiques", matiere: "Histoire-Géographie", titre: "Programme officiel, 1er Bac Sciences Mathématiques · Histoire-Géographie (Régional)", fichier: "1bac-histoire-geographie.json" },
  { niveau: "1er Bac Sciences Économiques et Gestion", matiere: "Histoire-Géographie", titre: "Programme officiel, 1er Bac Sciences Économiques et Gestion · Histoire-Géographie (Régional)", fichier: "1bac-histoire-geographie.json" },
  { niveau: "2ème Bac Lettres", matiere: "Histoire-Géographie", titre: "Programme officiel, 2ème Bac Lettres · Histoire-Géographie (National)", fichier: "2bac-lettres-histoire-geographie.json" },
  { niveau: "2ème Bac Sciences Humaines", matiere: "Histoire-Géographie", titre: "Programme officiel, 2ème Bac Sciences Humaines · Histoire-Géographie (National)", fichier: "2bac-lettres-histoire-geographie.json" },

  // Éducation Islamique
  { niveau: "1AC", matiere: "Éducation Islamique", titre: "Programme officiel, 1AC · Éducation Islamique", fichier: "1ac-education-islamique.json" },
  { niveau: "1er Bac Sciences Expérimentales", matiere: "Éducation Islamique", titre: "Programme officiel, 1er Bac Sciences Expérimentales · Éducation Islamique (Régional)", fichier: "1bac-education-islamique.json" },
  { niveau: "1er Bac Sciences Mathématiques", matiere: "Éducation Islamique", titre: "Programme officiel, 1er Bac Sciences Mathématiques · Éducation Islamique (Régional)", fichier: "1bac-education-islamique.json" },
  { niveau: "1er Bac Lettres et Sciences Humaines", matiere: "Éducation Islamique", titre: "Programme officiel, 1er Bac Lettres et Sciences Humaines · Éducation Islamique (Régional)", fichier: "1bac-education-islamique.json" },
  { niveau: "1er Bac Sciences Économiques et Gestion", matiere: "Éducation Islamique", titre: "Programme officiel, 1er Bac Sciences Économiques et Gestion · Éducation Islamique (Régional)", fichier: "1bac-education-islamique.json" },

  // Français
  { niveau: "Tronc Commun Scientifique", matiere: "Français", titre: "Programme officiel, Tronc Commun Scientifique · Français", fichier: "tc-francais.json" },
  { niveau: "Tronc Commun Lettres et Sciences Humaines", matiere: "Français", titre: "Programme officiel, Tronc Commun Lettres · Français", fichier: "tc-francais.json" },
  { niveau: "1er Bac Sciences Expérimentales", matiere: "Français", titre: "Programme officiel, 1er Bac Sciences Expérimentales · Français (Régional)", fichier: "1bac-francais.json" },
  { niveau: "1er Bac Sciences Mathématiques", matiere: "Français", titre: "Programme officiel, 1er Bac Sciences Mathématiques · Français (Régional)", fichier: "1bac-francais.json" },
  { niveau: "1er Bac Sciences Économiques et Gestion", matiere: "Français", titre: "Programme officiel, 1er Bac Sciences Économiques et Gestion · Français (Régional)", fichier: "1bac-francais.json" },
  { niveau: "2ème Bac Sciences Physiques", matiere: "Français", titre: "Programme officiel, 2ème Bac Sciences Physiques · Français", fichier: "2bac-francais.json" },
  { niveau: "2ème Bac Lettres", matiere: "Français", titre: "Programme officiel, 2ème Bac Lettres · Français", fichier: "2bac-francais.json" },

  // Arabe
  { niveau: "1er Bac Lettres et Sciences Humaines", matiere: "Arabe", titre: "Programme officiel, 1er Bac Lettres et Sciences Humaines · Langue Arabe", fichier: "1bac-lettres-arabe.json" },
  { niveau: "2ème Bac Lettres", matiere: "Arabe", titre: "Programme officiel, 2ème Bac Lettres · Langue Arabe (National)", fichier: "2bac-lettres-arabe.json" },
  { niveau: "2ème Bac Sciences Humaines", matiere: "Arabe", titre: "Programme officiel, 2ème Bac Sciences Humaines · Langue Arabe (National)", fichier: "2bac-lettres-arabe.json" },

  // Anglais
  { niveau: "1er Bac Lettres et Sciences Humaines", matiere: "Anglais", titre: "Programme officiel, 1er Bac Lettres et Sciences Humaines · Anglais", fichier: "1bac-anglais.json" },
  { niveau: "2ème Bac Lettres", matiere: "Anglais", titre: "Programme officiel, 2ème Bac Lettres · Anglais (National)", fichier: "2bac-anglais.json" },
  { niveau: "2ème Bac Sciences Physiques", matiere: "Anglais", titre: "Programme officiel, 2ème Bac Sciences Physiques · Anglais", fichier: "2bac-anglais.json" },
];

let addedCount = 0;
for (const entry of newEntries) {
  const key = `${normalize(entry.niveau)}::${normalize(entry.matiere)}`;
  if (!existingKeys.has(key)) {
    manifest.contenus.push(entry);
    existingKeys.add(key);
    addedCount++;
  } else {
    console.log(`[PASS] Entrée déjà présente : ${entry.niveau} · ${entry.matiere}`);
  }
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
console.log(`\n=> Manifeste final mis à jour : ${addedCount} nouvelles entrées ajoutées (${manifest.contenus.length} entrées au total).`);
