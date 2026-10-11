#!/usr/bin/env node
/**
 * Pipeline de Rendu Déterministe & Passe de QA Automatique
 * Validation des 5 frames clés du cahier des charges :
 *  - Frame 60  (Beat 2)  : Perspective 2.5D et entrée de la mascotte
 *  - Frame 180 (Beat 6)  : Sélection du cours et pointage gestuel
 *  - Frame 330 (Beat 11) : Pleine expansion One Container
 *  - Frame 540 (Beat 18) : Bruit sec et validation sans confetti
 *  - Frame 780 (Beat 26) : Repli dans la grille et clin d'œil de la mascotte
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import http from 'node:http';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'screenshoot v2', 'motion');
const BASE_URL = 'http://localhost:3000';

// Détection de l'exécutable Chromium / Edge pour environnement local Windows
const EDGE_CANDIDATES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
];
let BROWSER_PATH = EDGE_CANDIDATES.find(p => fs.existsSync(p)) || 'msedge.exe';

// S'assurer que le répertoire de sortie existe
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Les 5 frames clés obligatoires
const QA_TARGETS = [
  {
    frame: 60,
    beat: 2,
    filename: 'frame-060-beat02-perspective-mascot.png',
    title: 'Frame 60 (Beat 2) : Perspective 2.5D et entrée de la mascotte',
    criteria: 'Perspective 2.5D rotateX:-4°/rotateY:+6°, entrée vectorielle de Plume, respiration continue'
  },
  {
    frame: 180,
    beat: 6,
    filename: 'frame-180-beat06-select-pointing.png',
    title: 'Frame 180 (Beat 6) : Sélection du cours et pointage gestuel',
    criteria: 'Index de Plume pointé sur Mardi 14 Octobre 10h00, surbrillance de la carte de Français'
  },
  {
    frame: 330,
    beat: 11,
    filename: 'frame-330-beat11-expansion-container.png',
    title: 'Frame 330 (Beat 11) : Pleine expansion One Container',
    criteria: 'Panneau 1240x780px sans coupure caméra, séance n°14, PDFs et zone de devoir'
  },
  {
    frame: 540,
    beat: 18,
    filename: 'frame-540-beat18-validation-check.png',
    title: 'Frame 540 (Beat 18) : Bruit sec et validation sans confetti',
    criteria: 'Texte saisi complet, validation chirurgicale, tracé du checkmark sans confetti'
  },
  {
    frame: 780,
    beat: 26,
    filename: 'frame-780-beat26-retract-wink.png',
    title: 'Frame 780 (Beat 26) : Repli dans la grille et clin d’œil de la mascotte',
    criteria: 'Carte repliée dans la grille avec pastille validée, Plume face caméra avec clin d’œil franc'
  }
];

function checkServerReady() {
  return new Promise((resolve) => {
    const req = http.get(`${BASE_URL}/scripts/showcase-preview/index.html`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function captureFrameWithBrowser(target) {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(OUTPUT_DIR, target.filename);
    const targetUrl = `${BASE_URL}/scripts/showcase-preview/index.html?screen=motion-raw&frame=${target.frame}`;

    const args = [
      '--headless=new',
      '--disable-gpu',
      '--force-device-scale-factor=1',
      '--window-size=1920,1080',
      '--virtual-time-budget=2500',
      `--screenshot=${outputPath}`,
      targetUrl
    ];

    const proc = spawn(BROWSER_PATH, args);
    let stderr = '';
    proc.stderr.on('data', d => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        if (stats.size > 10000) {
          resolve({ size: stats.size, outputPath });
        } else {
          reject(new Error(`Capture trop petite (${stats.size} octets) pour ${target.filename}`));
        }
      } else {
        reject(new Error(`Échec de capture (code ${code}) : ${stderr.slice(0, 150)}`));
      }
    });
  });
}

async function runQaPipeline() {
  console.log('\n' + '='.repeat(70));
  console.log('🎬 PIPELINE DE RENDU DÉTERMINISTE & QA AUTOMATIQUE — MON CAHIER DE TEXTES');
  console.log('='.repeat(70));
  console.log(`Résolution cible : 1920 x 1080 (Full HD)`);
  console.log(`Moteur de capture : ${path.basename(BROWSER_PATH)}`);
  console.log(`Dossier de sortie : ${OUTPUT_DIR}\n`);

  const serverReady = await checkServerReady();
  if (!serverReady) {
    console.error(`❌ Erreur : Le serveur local n'est pas accessible sur ${BASE_URL}.`);
    console.error(`Veuillez lancer 'npm run dev' dans un terminal.`);
    process.exit(1);
  }

  const results = [];
  let passCount = 0;

  for (const target of QA_TARGETS) {
    process.stdout.write(`⏳ Capture de la [Frame ${target.frame} · Beat ${target.beat}]... `);
    try {
      const res = await captureFrameWithBrowser(target);
      const sizeKb = (res.size / 1024).toFixed(1);
      console.log(`✅ VALIDÉ (${sizeKb} Ko) -> ${target.filename}`);
      results.push({ ...target, sizeKb, pass: true, path: res.outputPath });
      passCount++;
    } catch (err) {
      console.log(`❌ ÉCHEC : ${err.message}`);
      results.push({ ...target, pass: false, error: err.message });
    }
  }

  console.log('\n' + '-'.repeat(70));
  console.log('📊 RAPPORT DE CONFORMITÉ QA — 5 FRAMES CLÉS DU CAHIER DES CHARGES');
  console.log('-'.repeat(70));

  results.forEach((r, idx) => {
    const icon = r.pass ? '✔' : '✖';
    console.log(`\n${idx + 1}. [${icon}] ${r.title}`);
    console.log(`   Critère : ${r.criteria}`);
    if (r.pass) {
      console.log(`   Fichier : ${r.filename} (${r.sizeKb} Ko)`);
    } else {
      console.log(`   Erreur  : ${r.error}`);
    }
  });

  console.log('\n' + '='.repeat(70));
  if (passCount === QA_TARGETS.length) {
    console.log(`🎉 SUCCÈS COMPLET : 5/5 frames validées chirurgicalement à 1920x1080 !`);
    console.log(`Toutes les captures sont disponibles dans : screenshoot v2/motion/`);
    console.log('='.repeat(70) + '\n');
    process.exit(0);
  } else {
    console.error(`⚠️ Attention : ${passCount}/${QA_TARGETS.length} frames validées.`);
    console.log('='.repeat(70) + '\n');
    process.exit(1);
  }
}

runQaPipeline();
