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

console.log(`Found ${files.length} images to analyze in ${dir}:`);
files.forEach((f, idx) => console.log(`  [${idx + 1}] ${f}`));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function analyzeWithRetry(file, base64Image, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Tu es un expert du système éducatif marocain (Ministère de l'Éducation Nationale, du Préscolaire et des Sports).
Analyse minutieusement cette image de document officiel marocain.
Extraits et structure TOUTES les données essentielles avec une précision chirurgicale :
1. Titre et type de document (Arrêté ministériel, Note ministérielle, Décision / المقرر الوزاري / المذكرة الوزارية, planning, tableau...).
2. Référence officielle / Numéro et date du document (رقم المقرر / المذكرة وتاريخه).
3. Année scolaire concernée (الموسم الدراسي).
4. Cycle(s) et niveaux concernés (Primaire, Collégial, Qualifiant / Lycée, filières, tronc commun, 1BAC, 2BAC...).
5. Matières concernées le cas échéant.
6. Toutes les dates, échéances et périodes clés (Contrôles continus / المراقبة المستمرة, Examens unifiés / الامتحانات الموحدة, Rentrée, Vacances, Saisie des notes sur Massar, Conseils de classe, Remise des bulletins...).
7. Durées, coefficients, périodicité ou règles spécifiques indiquées dans le tableau ou texte.
8. Retranscription fidèle du texte arabe et/ou français et des tableaux (colonnes, lignes, valeurs).
9. Résumé synthétique des points cruciaux pour l'enseignant et l'application (cahier de textes / planification).`
              },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: base64Image
                }
              }
            ]
          }
        ]
      });
      return response.text;
    } catch (err) {
      console.warn(`Attempt ${attempt} for ${file} failed: ${err.message}`);
      if (attempt < maxRetries) {
        console.log(`Waiting 25 seconds before retry...`);
        await sleep(25000);
      } else {
        throw err;
      }
    }
  }
}

async function run() {
  const results = {};
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const outputFile = path.join(process.cwd(), 'scripts', `analysis_${i + 1}.json`);
    
    // Check if already analyzed
    if (fs.existsSync(outputFile)) {
      try {
        const existing = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
        if (existing.analysis && existing.analysis.length > 200) {
          console.log(`[${i + 1}/${files.length}] Already analyzed: ${file}, skipping.`);
          results[file] = existing.analysis;
          continue;
        }
      } catch (e) {
        // re-run if corrupted
      }
    }

    console.log(`\n[${i + 1}/${files.length}] Analyzing: ${file}...`);
    const filePath = path.join(dir, file);
    const buffer = fs.readFileSync(filePath);
    const base64Image = buffer.toString('base64');

    try {
      const text = await analyzeWithRetry(file, base64Image);
      console.log(`✓ Analysis complete for ${file} (length: ${text.length})`);
      results[file] = text;
      fs.writeFileSync(outputFile, JSON.stringify({ file, analysis: text }, null, 2));
      // Respect rate limit (wait 15s between calls)
      console.log('Sleeping 15s to respect rate limits...');
      await sleep(15000);
    } catch (err) {
      console.error(`Failed to analyze ${file} after retries:`, err.message);
    }
  }

  fs.writeFileSync(path.join(process.cwd(), 'scripts', 'all_analyses.json'), JSON.stringify(results, null, 2));
  console.log('\nAll analyses finished and consolidated into scripts/all_analyses.json!');
}

run();
