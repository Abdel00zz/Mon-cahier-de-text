/**
 * Générateur automatisé des programmes scolaires officiels manquants
 * pour toutes les classes, niveaux et branches du système marocain.
 * 
 * Règle d'or : "ne pas toucher ce qui existe".
 */
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../public/contenus');
const manifestPath = resolve(root, 'manifest.json');

export const ch = (title, sections) => ({
  title,
  type: 'chapter',
  sections: sections.map(s => ({
    name: s.name,
    items: s.items.map(it => ({
      type: it.type || 'cours',
      title: it.title,
      description: it.description || ''
    }))
  }))
});

export const sec = (name, items) => ({ name, items });
export const it = (type, title, description = '') => ({ type, title, description });

export function writeCurriculumIfMissing(relPath, chapters) {
  const fullPath = resolve(root, relPath);
  if (existsSync(fullPath)) {
    console.log(`[PASS] Fichier déjà existant, conservé intact : ${relPath}`);
    return false;
  }
  writeFileSync(fullPath, JSON.stringify(chapters, null, 2), 'utf8');
  console.log(`[CREATE] Fichier créé avec succès : ${relPath} (${chapters.length} chapitres)`);
  return true;
}
