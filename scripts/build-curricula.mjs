import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { writeCurriculumIfMissing } from './curriculum-builder-helpers.mjs';
import { physique1AC, physique2AC, physique3AC } from './data/curriculum-physique-college.mjs';
import { physiqueTCS, physique1BAC_SE, physique2BAC_SVT, physique2BAC_SMA } from './data/curriculum-physique-lycee.mjs';
import { physiqueCpge1stYear, physiqueCpge2ndYear } from './data/curriculum-physique-cpge.mjs';
import { svtTCS, svt1BAC_SE, svt2BAC_PC, svt2BAC_SMA } from './data/curriculum-svt-lycee.mjs';
import { mathsTCT, maths1BAC_ECO, maths1BAC_LSH, maths2BAC_ECO, maths2BAC_LETTRES } from './data/curriculum-maths-lycee.mjs';
import { mathsCpge1stYear, mathsCpge2ndYear, mathsCpgeCommercial } from './data/curriculum-maths-cpge.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../public/contenus');
const manifestPath = resolve(root, 'manifest.json');

console.log('=== Démarrage de la génération des programmes scolaires ===\n');

// 1. Écriture des fichiers JSON (ne touche jamais aux fichiers existants)
const filesToGenerate = [
  // Physique-Chimie Collège
  { path: 'physique-chimie/1ac-physique-chimie.json', data: physique1AC },
  { path: 'physique-chimie/2ac-physique-chimie.json', data: physique2AC },
  { path: 'physique-chimie/3ac-physique-chimie.json', data: physique3AC },

  // Physique-Chimie Lycée
  { path: 'physique-chimie/tc-sciences-physique-chimie.json', data: physiqueTCS },
  { path: 'physique-chimie/tc-technologique-physique-chimie.json', data: physiqueTCS },
  { path: 'physique-chimie/1bac-se-physique-chimie.json', data: physique1BAC_SE },
  { path: 'physique-chimie/1bac-sm-physique-chimie.json', data: physique1BAC_SE },
  { path: 'physique-chimie/2bac-svt-physique-chimie.json', data: physique2BAC_SVT },
  { path: 'physique-chimie/2bac-sma-physique-chimie.json', data: physique2BAC_SMA },

  // Physique-Chimie CPGE
  { path: 'physique-chimie/cpge-mpsi-physique-chimie.json', data: physiqueCpge1stYear },
  { path: 'physique-chimie/cpge-pcsi-physique-chimie.json', data: physiqueCpge1stYear },
  { path: 'physique-chimie/cpge-tsi1-physique-chimie.json', data: physiqueCpge1stYear },
  { path: 'physique-chimie/cpge-mp-physique-chimie.json', data: physiqueCpge2ndYear },
  { path: 'physique-chimie/cpge-psi-physique-chimie.json', data: physiqueCpge2ndYear },
  { path: 'physique-chimie/cpge-tsi2-physique-chimie.json', data: physiqueCpge2ndYear },

  // SVT Lycée
  { path: 'svt/tc-sciences-svt.json', data: svtTCS },
  { path: 'svt/1bac-se-svt.json', data: svt1BAC_SE },
  { path: 'svt/1bac-sm-svt.json', data: svt1BAC_SE },
  { path: 'svt/2bac-pc-svt.json', data: svt2BAC_PC },
  { path: 'svt/2bac-sma-svt.json', data: svt2BAC_SMA },

  // Mathématiques Lycée
  { path: 'mathematiques/tc-technologique-mathematiques.json', data: mathsTCT },
  { path: 'mathematiques/1bac-eco-mathematiques.json', data: maths1BAC_ECO },
  { path: 'mathematiques/1bac-lettres-mathematiques.json', data: maths1BAC_LSH },
  { path: 'mathematiques/2bac-eco-mathematiques.json', data: maths2BAC_ECO },
  { path: 'mathematiques/2bac-sgc-mathematiques.json', data: maths2BAC_ECO },
  { path: 'mathematiques/2bac-lettres-mathematiques.json', data: maths2BAC_LETTRES },

  // Mathématiques CPGE
  { path: 'mathematiques/cpge-mpsi-mathematiques.json', data: mathsCpge1stYear },
  { path: 'mathematiques/cpge-pcsi-mathematiques.json', data: mathsCpge1stYear },
  { path: 'mathematiques/cpge-tsi1-mathematiques.json', data: mathsCpge1stYear },
  { path: 'mathematiques/cpge-ecs1-mathematiques.json', data: mathsCpgeCommercial },
  { path: 'mathematiques/cpge-ect1-mathematiques.json', data: mathsCpgeCommercial },
  { path: 'mathematiques/cpge-mp-mathematiques.json', data: mathsCpge2ndYear },
  { path: 'mathematiques/cpge-psi-mathematiques.json', data: mathsCpge2ndYear },
  { path: 'mathematiques/cpge-tsi2-mathematiques.json', data: mathsCpge2ndYear },
  { path: 'mathematiques/cpge-ecs2-mathematiques.json', data: mathsCpgeCommercial },
  { path: 'mathematiques/cpge-ect2-mathematiques.json', data: mathsCpgeCommercial },
];

let createdCount = 0;
for (const file of filesToGenerate) {
  if (writeCurriculumIfMissing(file.path, file.data)) {
    createdCount++;
  }
}
console.log(`\n=> Total fichiers nouveaux créés : ${createdCount} / ${filesToGenerate.length}\n`);

// 2. Mise à jour sécurisée de manifest.json
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const normalize = (value) => value.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const existingKeys = new Set(manifest.contenus.map(c => `${normalize(c.niveau)}::${normalize(c.matiere)}`));

const newEntries = [
  // Collège Physique-Chimie
  { niveau: "1AC", matiere: "Physique-Chimie", titre: "Programme officiel, 1AC · Physique-Chimie", fichier: "1ac-physique-chimie.json" },
  { niveau: "2AC", matiere: "Physique-Chimie", titre: "Programme officiel, 2AC · Physique-Chimie", fichier: "2ac-physique-chimie.json" },
  { niveau: "3AC", matiere: "Physique-Chimie", titre: "Programme officiel, 3AC · Physique-Chimie", fichier: "3ac-physique-chimie.json" },

  // Tronc Commun
  { niveau: "Tronc Commun Scientifique", matiere: "Physique-Chimie", titre: "Programme officiel, Tronc Commun Scientifique · Physique-Chimie", fichier: "tc-sciences-physique-chimie.json" },
  { niveau: "Tronc Commun Scientifique", matiere: "Sciences de la Vie et de la Terre", titre: "Programme officiel, Tronc Commun Scientifique · SVT", fichier: "tc-sciences-svt.json" },
  { niveau: "Tronc Commun Technologique", matiere: "Mathématiques", titre: "Programme officiel, Tronc Commun Technologique · Mathématiques", fichier: "tc-technologique-mathematiques.json" },
  { niveau: "Tronc Commun Technologique", matiere: "Physique-Chimie", titre: "Programme officiel, Tronc Commun Technologique · Physique-Chimie", fichier: "tc-technologique-physique-chimie.json" },

  // 1er Bac
  { niveau: "1er Bac Sciences Expérimentales", matiere: "Physique-Chimie", titre: "Programme officiel, 1er Bac Sciences Expérimentales · Physique-Chimie", fichier: "1bac-se-physique-chimie.json" },
  { niveau: "1er Bac Sciences Expérimentales", matiere: "Sciences de la Vie et de la Terre", titre: "Programme officiel, 1er Bac Sciences Expérimentales · SVT", fichier: "1bac-se-svt.json" },
  { niveau: "1er Bac Sciences Mathématiques", matiere: "Physique-Chimie", titre: "Programme officiel, 1er Bac Sciences Mathématiques · Physique-Chimie", fichier: "1bac-sm-physique-chimie.json" },
  { niveau: "1er Bac Sciences Mathématiques", matiere: "Sciences de la Vie et de la Terre", titre: "Programme officiel, 1er Bac Sciences Mathématiques · SVT", fichier: "1bac-sm-svt.json" },
  { niveau: "1er Bac Sciences Économiques et Gestion", matiere: "Mathématiques", titre: "Programme officiel, 1er Bac Sciences Économiques et Gestion · Mathématiques", fichier: "1bac-eco-mathematiques.json" },
  { niveau: "1er Bac Lettres et Sciences Humaines", matiere: "Mathématiques", titre: "Programme officiel, 1er Bac Lettres et Sciences Humaines · Mathématiques", fichier: "1bac-lettres-mathematiques.json" },

  // 2ème Bac
  { niveau: "2ème Bac Sciences de la Vie et de la Terre", matiere: "Physique-Chimie", titre: "Programme officiel, 2ème Bac Sciences de la Vie et de la Terre · Physique-Chimie", fichier: "2bac-svt-physique-chimie.json" },
  { niveau: "2ème Bac Sciences Physiques", matiere: "Sciences de la Vie et de la Terre", titre: "Programme officiel, 2ème Bac Sciences Physiques · SVT", fichier: "2bac-pc-svt.json" },
  { niveau: "2ème Bac Sciences Mathématiques A", matiere: "Physique-Chimie", titre: "Programme officiel, 2ème Bac Sciences Mathématiques A · Physique-Chimie", fichier: "2bac-sma-physique-chimie.json" },
  { niveau: "2ème Bac Sciences Mathématiques A", matiere: "Sciences de la Vie et de la Terre", titre: "Programme officiel, 2ème Bac Sciences Mathématiques A · SVT", fichier: "2bac-sma-svt.json" },
  { niveau: "2ème Bac Sciences Mathématiques B", matiere: "Physique-Chimie", titre: "Programme officiel, 2ème Bac Sciences Mathématiques B · Physique-Chimie", fichier: "2bac-sma-physique-chimie.json" },
  { niveau: "2ème Bac Sciences Économiques", matiere: "Mathématiques", titre: "Programme officiel, 2ème Bac Sciences Économiques · Mathématiques", fichier: "2bac-eco-mathematiques.json" },
  { niveau: "2ème Bac Sciences de Gestion Comptable", matiere: "Mathématiques", titre: "Programme officiel, 2ème Bac Sciences de Gestion Comptable · Mathématiques", fichier: "2bac-sgc-mathematiques.json" },
  { niveau: "2ème Bac Lettres", matiere: "Mathématiques", titre: "Programme officiel, 2ème Bac Lettres · Mathématiques", fichier: "2bac-lettres-mathematiques.json" },

  // CPGE 1re année
  { niveau: "1re année MPSI", matiere: "Mathématiques", titre: "Programme officiel, 1re année MPSI · Mathématiques", fichier: "cpge-mpsi-mathematiques.json" },
  { niveau: "1re année MPSI", matiere: "Physique-Chimie", titre: "Programme officiel, 1re année MPSI · Physique-Chimie", fichier: "cpge-mpsi-physique-chimie.json" },
  { niveau: "1re année PCSI", matiere: "Mathématiques", titre: "Programme officiel, 1re année PCSI · Mathématiques", fichier: "cpge-pcsi-mathematiques.json" },
  { niveau: "1re année PCSI", matiere: "Physique-Chimie", titre: "Programme officiel, 1re année PCSI · Physique-Chimie", fichier: "cpge-pcsi-physique-chimie.json" },
  { niveau: "1re année TSI", matiere: "Mathématiques", titre: "Programme officiel, 1re année TSI · Mathématiques", fichier: "cpge-tsi1-mathematiques.json" },
  { niveau: "1re année TSI", matiere: "Physique-Chimie", titre: "Programme officiel, 1re année TSI · Physique-Chimie", fichier: "cpge-tsi1-physique-chimie.json" },
  { niveau: "1re année ECS", matiere: "Mathématiques", titre: "Programme officiel, 1re année ECS · Mathématiques", fichier: "cpge-ecs1-mathematiques.json" },
  { niveau: "1re année ECT", matiere: "Mathématiques", titre: "Programme officiel, 1re année ECT · Mathématiques", fichier: "cpge-ect1-mathematiques.json" },

  // CPGE 2e année
  { niveau: "2e année MP", matiere: "Mathématiques", titre: "Programme officiel, 2e année MP · Mathématiques", fichier: "cpge-mp-mathematiques.json" },
  { niveau: "2e année MP", matiere: "Physique-Chimie", titre: "Programme officiel, 2e année MP · Physique-Chimie", fichier: "cpge-mp-physique-chimie.json" },
  { niveau: "2e année PSI", matiere: "Mathématiques", titre: "Programme officiel, 2e année PSI · Mathématiques", fichier: "cpge-psi-mathematiques.json" },
  { niveau: "2e année PSI", matiere: "Physique-Chimie", titre: "Programme officiel, 2e année PSI · Physique-Chimie", fichier: "cpge-psi-physique-chimie.json" },
  { niveau: "2e année TSI", matiere: "Mathématiques", titre: "Programme officiel, 2e année TSI · Mathématiques", fichier: "cpge-tsi2-mathematiques.json" },
  { niveau: "2e année TSI", matiere: "Physique-Chimie", titre: "Programme officiel, 2e année TSI · Physique-Chimie", fichier: "cpge-tsi2-physique-chimie.json" },
  { niveau: "2e année ECS", matiere: "Mathématiques", titre: "Programme officiel, 2e année ECS · Mathématiques", fichier: "cpge-ecs2-mathematiques.json" },
  { niveau: "2e année ECT", matiere: "Mathématiques", titre: "Programme officiel, 2e année ECT · Mathématiques", fichier: "cpge-ect2-mathematiques.json" },
];

let addedCount = 0;
for (const entry of newEntries) {
  const key = `${normalize(entry.niveau)}::${normalize(entry.matiere)}`;
  if (!existingKeys.has(key)) {
    manifest.contenus.push(entry);
    existingKeys.add(key);
    addedCount++;
  } else {
    console.log(`[PASS] Entrée manifeste déjà présente : ${entry.niveau} · ${entry.matiere}`);
  }
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
console.log(`\n=> Manifeste mis à jour : ${addedCount} nouvelles entrées ajoutées (${manifest.contenus.length} entrées au total).`);
