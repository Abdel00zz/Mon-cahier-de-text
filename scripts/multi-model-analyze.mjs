import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY is not set');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });
const dir = path.join(process.cwd(), 'public', 'doc_officiel');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png')).sort();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const PROMPT = `Tu es un inspecteur et expert pédagogique chevronné du Ministère de l'Éducation Nationale du Maroc.
Analyse méticuleusement cette photo/page de document officiel marocain.
Extraits et structure TOUTES les données essentielles avec une fidélité absolue :
1. Titre et type de document (Planification annuelle / التوزيع السنوي, Note ministérielle / مذكرة, Décision / مقرر, Arrêté, Tableau d'évaluation...).
2. Auteur, Références administratives et mentions légales (ex: Professeur, N° de note, Direction, Site de référence...).
3. Année scolaire concernée (ex: 2026-2027).
4. Cycle et Niveau(x) d'enseignement (ex: Collège 1AC/2AC/3AC, Lycée Tronc Commun Sc/Lettres, 1BAC Sc. Exp/Sc. Math, 2BAC...).
5. Matière(s) et Option (ex: Mathématiques BIOF / Arabe, Physique-Chimie, SVT...).
6. Tableau complet de progression pédagogique / Calendrier :
   - Semestres (S1 / S2)
   - Numéros de semaines, dates exactes (du ... au ...)
   - Intitulés des chapitres / leçons / unités
   - Volumes horaires prévus
   - Contrôles Continus (DS1, DS2, DS3...) : semaines de passation, durée (ex: 2h), semaines de correction (durée)
   - Devoirs Maison (DM1, DM2, DM3...) : semaines d'attribution et de correction
   - Vacances scolaires et jours fériés mentionnés
   - Dates d'examens (Régional 1BAC, National 2BAC, Examen unifié...)
   - Échéances Massar (saisie des notes, arrêt des notes, conseils de classe, remise des bulletins)
7. Synthèse opérationnelle pour l'application (Cahier de textes & Planificateur de devoirs).`;

const MODELS = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];

async function analyzeFile(file) {
  const filePath = path.join(dir, file);
  const buffer = fs.readFileSync(filePath);
  const base64Image = buffer.toString('base64');

  for (const model of MODELS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Trying file ${file} with model ${model} (attempt ${attempt})...`);
        const response = await ai.models.generateContent({
          model: model,
          contents: [
            {
              role: 'user',
              parts: [
                { text: PROMPT },
                { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
              ]
            }
          ]
        });
        if (response.text && response.text.length > 100) {
          console.log(`✓ Success for ${file} with ${model}! Length: ${response.text.length}`);
          return response.text;
        }
      } catch (err) {
        console.warn(`  [${model} attempt ${attempt}] error: ${err.message || err}`);
        await sleep(5000 * attempt);
      }
    }
  }
  throw new Error(`All models and attempts failed for ${file}`);
}

async function run() {
  const outDir = path.join(process.cwd(), 'scripts', 'analyses');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const safeName = `doc_${i + 1}_${file.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    const targetFile = path.join(outDir, safeName);

    if (fs.existsSync(targetFile)) {
      try {
        const c = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
        if (c.analysis && c.analysis.length > 200) {
          console.log(`[${i + 1}/${files.length}] Already analyzed: ${file}`);
          continue;
        }
      } catch (e) {}
    }

    console.log(`\n========================================`);
    console.log(`[${i + 1}/${files.length}] Processing ${file}`);
    console.log(`========================================`);

    try {
      const text = await analyzeFile(file);
      fs.writeFileSync(targetFile, JSON.stringify({ file, index: i + 1, analysis: text }, null, 2));
      console.log(`Saved analysis to ${safeName}`);
      console.log(`Waiting 8s before next file...`);
      await sleep(8000);
    } catch (err) {
      console.error(`Failed ${file}:`, err.message);
    }
  }

  console.log('\n========================================');
  console.log('ALL FILES PROCESSED! Merging summary...');
  console.log('========================================');

  const allAnalyses = [];
  const outFiles = fs.readdirSync(outDir).filter(f => f.endsWith('.json')).sort();
  for (const of of outFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(outDir, of), 'utf8'));
    allAnalyses.push(data);
  }

  fs.writeFileSync(
    path.join(process.cwd(), 'scripts', 'all_official_documents_analysis.json'),
    JSON.stringify(allAnalyses, null, 2)
  );
  console.log(`Saved merged report with ${allAnalyses.length} analyses to scripts/all_official_documents_analysis.json`);
}

run();
