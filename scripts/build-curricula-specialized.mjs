import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { writeCurriculumIfMissing } from './curriculum-builder-helpers.mjs';

import { siTCT, si2BAC_SMB } from './data/curriculum-si.mjs';
import { eco1BAC, eco2BAC } from './data/curriculum-economie-gestion.mjs';
import { compta1BAC, compta2BAC, droit1BAC, droit2BAC } from './data/curriculum-comptabilite-droit.mjs';
import {
  traductionBAC,
  epsCollege,
  epsLycee,
  artsCollege,
  artsAppliquesLycee,
  amazigheCollege,
  espagnolLycee,
  allemandLycee,
  italienLycee
} from './data/curriculum-langues-arts-eps.mjs';
import {
  musiqueCollege,
  agro2BAC,
  ste1BAC,
  ste2BAC,
  stm1BAC,
  stm2BAC
} from './data/curriculum-technique-agro-musique.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../public/contenus');
const manifestPath = resolve(root, 'manifest.json');

console.log('=== Génération des programmes spécialisés marocains (toutes filières et matières) ===\n');

const folders = [
  'sciences-de-l-ingenieur',
  'sciences-economiques-et-gestion',
  'comptabilite-et-mathematiques-financieres',
  'droit',
  'traduction',
  'education-physique-et-sportive',
  'education-artistique',
  'arts-appliques',
  'langue-amazighe',
  'espagnol',
  'allemand',
  'italien',
  'education-musicale',
  'sciences-agronomiques',
  'sciences-et-technologies-electriques',
  'sciences-et-technologies-mecaniques'
];

for (const f of folders) {
  const dir = resolve(root, f);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    console.log(`[MKDIR] Dossier créé : ${f}/`);
  }
}

const filesToGenerate = [
  // Sciences de l'Ingénieur
  { path: 'sciences-de-l-ingenieur/tc-technologique-si.json', data: siTCT },
  { path: 'sciences-de-l-ingenieur/2bac-smb-si.json', data: si2BAC_SMB },

  // Sciences Économiques et Gestion
  { path: 'sciences-economiques-et-gestion/1bac-seg-economie.json', data: eco1BAC },
  { path: 'sciences-economiques-et-gestion/2bac-eco-economie.json', data: eco2BAC },

  // Comptabilité et Mathématiques Financières
  { path: 'comptabilite-et-mathematiques-financieres/1bac-seg-comptabilite.json', data: compta1BAC },
  { path: 'comptabilite-et-mathematiques-financieres/2bac-sgc-comptabilite.json', data: compta2BAC },

  // Droit
  { path: 'droit/1bac-seg-droit.json', data: droit1BAC },
  { path: 'droit/2bac-eco-droit.json', data: droit2BAC },

  // Traduction
  { path: 'traduction/1bac-traduction.json', data: traductionBAC },

  // Éducation Physique et Sportive (EPS)
  { path: 'education-physique-et-sportive/college-eps.json', data: epsCollege },
  { path: 'education-physique-et-sportive/lycee-eps.json', data: epsLycee },

  // Éducation Artistique
  { path: 'education-artistique/college-education-artistique.json', data: artsCollege },

  // Arts Appliqués
  { path: 'arts-appliques/lycee-arts-appliques.json', data: artsAppliquesLycee },

  // Langue Amazighe
  { path: 'langue-amazighe/college-langue-amazighe.json', data: amazigheCollege },

  // Langues Étrangères (Espagnol, Allemand, Italien)
  { path: 'espagnol/lycee-espagnol.json', data: espagnolLycee },
  { path: 'allemand/lycee-allemand.json', data: allemandLycee },
  { path: 'italien/lycee-italien.json', data: italienLycee },

  // Éducation Musicale
  { path: 'education-musicale/college-education-musicale.json', data: musiqueCollege },

  // Sciences Agronomiques
  { path: 'sciences-agronomiques/2bac-sciences-agronomiques.json', data: agro2BAC },

  // Sciences et Technologies Électriques
  { path: 'sciences-et-technologies-electriques/1bac-ste.json', data: ste1BAC },
  { path: 'sciences-et-technologies-electriques/2bac-ste.json', data: ste2BAC },

  // Sciences et Technologies Mécaniques
  { path: 'sciences-et-technologies-mecaniques/1bac-stm.json', data: stm1BAC },
  { path: 'sciences-et-technologies-mecaniques/2bac-stm.json', data: stm2BAC }
];

let createdCount = 0;
for (const file of filesToGenerate) {
  if (writeCurriculumIfMissing(file.path, file.data)) {
    createdCount++;
  }
}
console.log(`\n=> Nouveaux fichiers spécialisés créés : ${createdCount} / ${filesToGenerate.length}\n`);

// Mise à jour de manifest.json
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const normalize = (value) => value.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const existingKeys = new Set(manifest.contenus.map(c => `${normalize(c.niveau)}::${normalize(c.matiere)}`));

const newEntries = [
  // Sciences de l'Ingénieur
  { niveau: "Tronc Commun Technologique", matiere: "Sciences de l’Ingénieur", titre: "Programme officiel, Tronc Commun Technologique · Sciences de l’Ingénieur", fichier: "tc-technologique-si.json" },
  { niveau: "2ème Bac Sciences Mathématiques B", matiere: "Sciences de l’Ingénieur", titre: "Programme officiel, 2ème Bac Sciences Mathématiques B · Sciences de l’Ingénieur", fichier: "2bac-smb-si.json" },

  // Sciences Économiques et Gestion
  { niveau: "1er Bac Sciences Économiques et Gestion", matiere: "Sciences Économiques et Gestion", titre: "Programme officiel, 1er Bac Sciences Économiques et Gestion · Sciences Économiques et Gestion", fichier: "1bac-seg-economie.json" },
  { niveau: "2ème Bac Sciences Économiques", matiere: "Sciences Économiques et Gestion", titre: "Programme officiel, 2ème Bac Sciences Économiques · Sciences Économiques et Gestion", fichier: "2bac-eco-economie.json" },
  { niveau: "2ème Bac Sciences de Gestion Comptable", matiere: "Sciences Économiques et Gestion", titre: "Programme officiel, 2ème Bac Sciences de Gestion Comptable · Sciences Économiques et Gestion", fichier: "2bac-eco-economie.json" },

  // Comptabilité et Mathématiques Financières
  { niveau: "1er Bac Sciences Économiques et Gestion", matiere: "Comptabilité et Mathématiques Financières", titre: "Programme officiel, 1er Bac Sciences Économiques et Gestion · Comptabilité et Mathématiques Financières", fichier: "1bac-seg-comptabilite.json" },
  { niveau: "2ème Bac Sciences de Gestion Comptable", matiere: "Comptabilité et Mathématiques Financières", titre: "Programme officiel, 2ème Bac Sciences de Gestion Comptable · Comptabilité et Mathématiques Financières", fichier: "2bac-sgc-comptabilite.json" },
  { niveau: "2ème Bac Sciences Économiques", matiere: "Comptabilité et Mathématiques Financières", titre: "Programme officiel, 2ème Bac Sciences Économiques · Comptabilité et Mathématiques Financières", fichier: "2bac-sgc-comptabilite.json" },

  // Droit
  { niveau: "1er Bac Sciences Économiques et Gestion", matiere: "Droit", titre: "Programme officiel, 1er Bac Sciences Économiques et Gestion · Droit", fichier: "1bac-seg-droit.json" },
  { niveau: "2ème Bac Sciences Économiques", matiere: "Droit", titre: "Programme officiel, 2ème Bac Sciences Économiques · Droit", fichier: "2bac-eco-droit.json" },
  { niveau: "2ème Bac Sciences de Gestion Comptable", matiere: "Droit", titre: "Programme officiel, 2ème Bac Sciences de Gestion Comptable · Droit", fichier: "2bac-eco-droit.json" },

  // Traduction
  { niveau: "1er Bac Lettres et Sciences Humaines", matiere: "Traduction", titre: "Programme officiel, 1er Bac Lettres et Sciences Humaines · Traduction", fichier: "1bac-traduction.json" },
  { niveau: "2ème Bac Lettres", matiere: "Traduction", titre: "Programme officiel, 2ème Bac Lettres · Traduction", fichier: "1bac-traduction.json" },
  { niveau: "2ème Bac Sciences Humaines", matiere: "Traduction", titre: "Programme officiel, 2ème Bac Sciences Humaines · Traduction", fichier: "1bac-traduction.json" },

  // Éducation Physique et Sportive
  { niveau: "1AC", matiere: "Éducation Physique et Sportive", titre: "Programme officiel, 1AC · Éducation Physique et Sportive", fichier: "college-eps.json" },
  { niveau: "2AC", matiere: "Éducation Physique et Sportive", titre: "Programme officiel, 2AC · Éducation Physique et Sportive", fichier: "college-eps.json" },
  { niveau: "3AC", matiere: "Éducation Physique et Sportive", titre: "Programme officiel, 3AC · Éducation Physique et Sportive", fichier: "college-eps.json" },
  { niveau: "Tronc Commun Scientifique", matiere: "Éducation Physique et Sportive", titre: "Programme officiel, Tronc Commun Scientifique · Éducation Physique et Sportive", fichier: "lycee-eps.json" },
  { niveau: "Tronc Commun Lettres et Sciences Humaines", matiere: "Éducation Physique et Sportive", titre: "Programme officiel, Tronc Commun Lettres et Sciences Humaines · Éducation Physique et Sportive", fichier: "lycee-eps.json" },
  { niveau: "Tronc Commun Technologique", matiere: "Éducation Physique et Sportive", titre: "Programme officiel, Tronc Commun Technologique · Éducation Physique et Sportive", fichier: "lycee-eps.json" },
  { niveau: "1er Bac Sciences Expérimentales", matiere: "Éducation Physique et Sportive", titre: "Programme officiel, 1er Bac Sciences Expérimentales · Éducation Physique et Sportive", fichier: "lycee-eps.json" },
  { niveau: "2ème Bac Sciences Physiques", matiere: "Éducation Physique et Sportive", titre: "Programme officiel, 2ème Bac Sciences Physiques · Éducation Physique et Sportive", fichier: "lycee-eps.json" },

  // Éducation Artistique
  { niveau: "1AC", matiere: "Éducation Artistique", titre: "Programme officiel, 1AC · Éducation Artistique", fichier: "college-education-artistique.json" },
  { niveau: "2AC", matiere: "Éducation Artistique", titre: "Programme officiel, 2AC · Éducation Artistique", fichier: "college-education-artistique.json" },
  { niveau: "3AC", matiere: "Éducation Artistique", titre: "Programme officiel, 3AC · Éducation Artistique", fichier: "college-education-artistique.json" },

  // Arts Appliqués
  { niveau: "Tronc Commun Technologique", matiere: "Arts Appliqués", titre: "Programme officiel, Tronc Commun Technologique · Arts Appliqués", fichier: "lycee-arts-appliques.json" },
  { niveau: "1er Bac Lettres et Sciences Humaines", matiere: "Arts Appliqués", titre: "Programme officiel, 1er Bac Lettres et Sciences Humaines · Arts Appliqués", fichier: "lycee-arts-appliques.json" },
  { niveau: "2ème Bac Lettres", matiere: "Arts Appliqués", titre: "Programme officiel, 2ème Bac Lettres · Arts Appliqués", fichier: "lycee-arts-appliques.json" },

  // Langue Amazighe
  { niveau: "1AC", matiere: "Langue Amazighe", titre: "Programme officiel, 1AC · Langue Amazighe", fichier: "college-langue-amazighe.json" },
  { niveau: "2AC", matiere: "Langue Amazighe", titre: "Programme officiel, 2AC · Langue Amazighe", fichier: "college-langue-amazighe.json" },
  { niveau: "3AC", matiere: "Langue Amazighe", titre: "Programme officiel, 3AC · Langue Amazighe", fichier: "college-langue-amazighe.json" },

  // Espagnol
  { niveau: "Tronc Commun Lettres et Sciences Humaines", matiere: "Espagnol", titre: "Programme officiel, Tronc Commun Lettres et Sciences Humaines · Espagnol", fichier: "lycee-espagnol.json" },
  { niveau: "1er Bac Lettres et Sciences Humaines", matiere: "Espagnol", titre: "Programme officiel, 1er Bac Lettres et Sciences Humaines · Espagnol", fichier: "lycee-espagnol.json" },
  { niveau: "2ème Bac Lettres", matiere: "Espagnol", titre: "Programme officiel, 2ème Bac Lettres · Espagnol", fichier: "lycee-espagnol.json" },
  { niveau: "2ème Bac Sciences Humaines", matiere: "Espagnol", titre: "Programme officiel, 2ème Bac Sciences Humaines · Espagnol", fichier: "lycee-espagnol.json" },

  // Allemand
  { niveau: "Tronc Commun Lettres et Sciences Humaines", matiere: "Allemand", titre: "Programme officiel, Tronc Commun Lettres et Sciences Humaines · Allemand", fichier: "lycee-allemand.json" },
  { niveau: "1er Bac Lettres et Sciences Humaines", matiere: "Allemand", titre: "Programme officiel, 1er Bac Lettres et Sciences Humaines · Allemand", fichier: "lycee-allemand.json" },
  { niveau: "2ème Bac Lettres", matiere: "Allemand", titre: "Programme officiel, 2ème Bac Lettres · Allemand", fichier: "lycee-allemand.json" },
  { niveau: "2ème Bac Sciences Humaines", matiere: "Allemand", titre: "Programme officiel, 2ème Bac Sciences Humaines · Allemand", fichier: "lycee-allemand.json" },

  // Italien
  { niveau: "Tronc Commun Lettres et Sciences Humaines", matiere: "Italien", titre: "Programme officiel, Tronc Commun Lettres et Sciences Humaines · Italien", fichier: "lycee-italien.json" },
  { niveau: "1er Bac Lettres et Sciences Humaines", matiere: "Italien", titre: "Programme officiel, 1er Bac Lettres et Sciences Humaines · Italien", fichier: "lycee-italien.json" },
  { niveau: "2ème Bac Lettres", matiere: "Italien", titre: "Programme officiel, 2ème Bac Lettres · Italien", fichier: "lycee-italien.json" },
  { niveau: "2ème Bac Sciences Humaines", matiere: "Italien", titre: "Programme officiel, 2ème Bac Sciences Humaines · Italien", fichier: "lycee-italien.json" },

  // Éducation Musicale
  { niveau: "1AC", matiere: "Éducation Musicale", titre: "Programme officiel, 1AC · Éducation Musicale", fichier: "college-education-musicale.json" },
  { niveau: "2AC", matiere: "Éducation Musicale", titre: "Programme officiel, 2AC · Éducation Musicale", fichier: "college-education-musicale.json" },
  { niveau: "3AC", matiere: "Éducation Musicale", titre: "Programme officiel, 3AC · Éducation Musicale", fichier: "college-education-musicale.json" },

  // Sciences Agronomiques
  { niveau: "2ème Bac Sciences de la Vie et de la Terre", matiere: "Sciences Agronomiques", titre: "Programme officiel, 2ème Bac · Sciences Agronomiques", fichier: "2bac-sciences-agronomiques.json" },

  // Sciences et Technologies Électriques
  { niveau: "Tronc Commun Technologique", matiere: "Sciences et Technologies Électriques", titre: "Programme officiel, Tronc Commun Technologique · Sciences et Technologies Électriques", fichier: "1bac-ste.json" },
  { niveau: "1er Bac Sciences Mathématiques", matiere: "Sciences et Technologies Électriques", titre: "Programme officiel, 1er Bac · Sciences et Technologies Électriques", fichier: "1bac-ste.json" },
  { niveau: "2ème Bac Sciences Mathématiques B", matiere: "Sciences et Technologies Électriques", titre: "Programme officiel, 2ème Bac · Sciences et Technologies Électriques", fichier: "2bac-ste.json" },

  // Sciences et Technologies Mécaniques
  { niveau: "Tronc Commun Technologique", matiere: "Sciences et Technologies Mécaniques", titre: "Programme officiel, Tronc Commun Technologique · Sciences et Technologies Mécaniques", fichier: "1bac-stm.json" },
  { niveau: "1er Bac Sciences Expérimentales", matiere: "Sciences et Technologies Mécaniques", titre: "Programme officiel, 1er Bac · Sciences et Technologies Mécaniques", fichier: "1bac-stm.json" },
  { niveau: "2ème Bac Sciences Mathématiques B", matiere: "Sciences et Technologies Mécaniques", titre: "Programme officiel, 2ème Bac · Sciences et Technologies Mécaniques", fichier: "2bac-stm.json" }
];

let addedCount = 0;
for (const entry of newEntries) {
  const key = `${normalize(entry.niveau)}::${normalize(entry.matiere)}`;
  if (!existingKeys.has(key)) {
    manifest.contenus.push(entry);
    existingKeys.add(key);
    addedCount++;
  } else {
    console.log(`[SKIP] Entrée manifest déjà présente : ${entry.niveau} × ${entry.matiere}`);
  }
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
console.log(`\n=> Entrées ajoutées au manifest.json : ${addedCount}`);
console.log(`=> Nombre total d'entrées au manifest : ${manifest.contenus.length}`);
