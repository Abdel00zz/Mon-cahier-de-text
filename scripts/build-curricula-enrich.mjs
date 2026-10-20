import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { info1AC, info2AC, info3AC, infoTC } from './data/curriculum-informatique.mjs';
import { philo1BAC, philo2BAC } from './data/curriculum-philosophie.mjs';
import { hg1AC, hg2AC, hg3AC, hg1BAC, hg2BAC } from './data/curriculum-histoire-geographie.mjs';
import { islam1AC, islam1BAC } from './data/curriculum-education-islamique.mjs';
import { francaisTC, francais1BAC, francais2BAC } from './data/curriculum-francais.mjs';
import { arabe1BAC, arabe2BAC } from './data/curriculum-arabe.mjs';
import { anglais1BAC, anglais2BAC } from './data/curriculum-anglais.mjs';
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

// Fichiers d'origine stricts à NE JAMAIS TOUCHER
const PROTECTED_ORIGINAL_FILES = new Set([
  'mathematiques/1ac-mathematiques.json',
  'mathematiques/2ac-mathematiques.json',
  'mathematiques/3ac-mathematiques.json',
  'mathematiques/tc-sciences-mathematiques.json',
  'mathematiques/tc-lettres-mathematiques.json',
  'mathematiques/1bac-se-mathematiques.json',
  'mathematiques/1bac-sm-mathematiques.json',
  'mathematiques/2bac-pc-mathematiques.json',
  'mathematiques/2bac-sm-mathematiques.json',
  'mathematiques/2bac-sh-mathematiques.json',
  'physique-chimie/2bac-sp-physique-chimie.json',
  'svt/1ac-svt.json',
  'svt/2ac-svt.json',
  'svt/3ac-svt.json',
  'svt/2bac-svt-svt.json'
]);

const filesToEnrich = [
  // Français
  { path: 'francais/tc-francais.json', data: francaisTC },
  { path: 'francais/1bac-francais.json', data: francais1BAC },
  { path: 'francais/2bac-francais.json', data: francais2BAC },

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

  // Informatique
  { path: 'informatique/1ac-informatique.json', data: info1AC },
  { path: 'informatique/2ac-informatique.json', data: info2AC },
  { path: 'informatique/3ac-informatique.json', data: info3AC },
  { path: 'informatique/tc-informatique.json', data: infoTC },

  // Arabe
  { path: 'arabe/1bac-lettres-arabe.json', data: arabe1BAC },
  { path: 'arabe/2bac-lettres-arabe.json', data: arabe2BAC },

  // Anglais
  { path: 'anglais/1bac-anglais.json', data: anglais1BAC },
  { path: 'anglais/2bac-anglais.json', data: anglais2BAC },

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

  // Langues Étrangères
  { path: 'espagnol/lycee-espagnol.json', data: espagnolLycee },
  { path: 'allemand/lycee-allemand.json', data: allemandLycee },
  { path: 'italien/lycee-italien.json', data: italienLycee },

  // Éducation Musicale
  { path: 'education-musicale/college-education-musicale.json', data: musiqueCollege },

  // Sciences Agronomiques
  { path: 'sciences-agronomiques/2bac-sciences-agronomiques.json', data: agro2BAC },

  // Sciences et Technologies Électriques (STE)
  { path: 'sciences-et-technologies-electriques/1bac-ste.json', data: ste1BAC },
  { path: 'sciences-et-technologies-electriques/2bac-ste.json', data: ste2BAC },

  // Sciences et Technologies Mécaniques (STM)
  { path: 'sciences-et-technologies-mecaniques/1bac-stm.json', data: stm1BAC },
  { path: 'sciences-et-technologies-mecaniques/2bac-stm.json', data: stm2BAC }
];

console.log('=== Écriture et enrichissement des programmes officiels marocains ===\n');

let totalWrittenLines = 0;
for (const file of filesToEnrich) {
  if (PROTECTED_ORIGINAL_FILES.has(file.path.replace(/\\/g, '/'))) {
    throw new Error(`VIOLATION DE PROTECTION : Tentative d'écriture sur un fichier original protégé : ${file.path}`);
  }
  const fullPath = resolve(root, file.path);
  const jsonContent = JSON.stringify(file.data, null, 2);
  const lineCount = jsonContent.split('\n').length;
  writeFileSync(fullPath, jsonContent, 'utf8');
  totalWrittenLines += lineCount;
  console.log(`[ENRICH] ${file.path} : ${file.data.length} chapitres, ${lineCount} lignes JSON`);
}

console.log(`\n=> Total des lignes de code JSON générées dans ces 41 fichiers enrichis : ${totalWrittenLines} lignes`);
