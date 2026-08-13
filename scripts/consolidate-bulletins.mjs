// Consolide le bulletin officiel unique à partir de :
//   1. public/official-student-events.json  -> événements GÉNÉRAUX (hors compétitions)
//   2. public/bulletins_json_*_2026_2027/*.json -> COMPÉTITIONS par matière (taguées `matiere`)
// Une compétition présente chez plusieurs matières est considérée générale (sans `matiere`).
// Usage : node scripts/consolidate-bulletins.mjs

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, '..', 'public');

const FOLDERS = ['bulletins_json_college_2026_2027', 'bulletins_json_lycee_2026_2027'];

const SUBJECT_BY_SLUG = {
  'mathematiques': 'Mathématiques',
  'physique-chimie': 'Physique-Chimie',
  'svt': 'Sciences de la Vie et de la Terre',
  'langue-arabe': 'Arabe',
  'langue-francaise': 'Français',
  'langues-etrangeres-2': 'Anglais',
  'philosophie': 'Philosophie',
  'histoire-geographie': 'Histoire-Géographie',
  'education-islamique': 'Éducation Islamique',
  'matieres-islamiques-originel': 'Éducation Islamique',
  'education-physique-sportive': 'Éducation Physique et Sportive',
  'informatique': 'Informatique',
  'sciences-ingenieur': 'Sciences de l’Ingénieur',
  'sciences-economiques-gestion': 'Sciences Économiques et Gestion',
  'sciences-vegetales-animales': 'Sciences de la Vie et de la Terre',
  'arabe-litterature-originel': 'Arabe',
  'traduction': 'Français',
  'arts-appliques': 'Arts Appliqués',
  'documentation': 'Documentation',
  'sociales': 'Sciences Sociales',
  'education-familiale': 'Éducation Familiale',
  'technologie-industrielle': 'Informatique',
};

const slugOf = name => name.replace(/\.json$/, '');
const subjectOf = slug => SUBJECT_BY_SLUG[slug] ?? slug.replace(/-/g, ' ');

// 1. Événements généraux du bulletin de base (tout sauf compétitions).
const base = JSON.parse(readFileSync(join(PUBLIC, 'official-student-events.json'), 'utf8'));
const generalEvents = (base.events ?? []).filter(e => e.category !== 'competition');

// 2. Compétitions par matière.
const fingerprint = e =>
  [e.category, e.title, e.start, e.end ?? '', (e.levels ?? []).join('|'), e.dateKind].join('::');

const groups = new Map(); // fingerprint -> { event, subjects:Set, slugs:Set }
for (const folder of FOLDERS) {
  const dir = join(PUBLIC, folder);
  for (const file of readdirSync(dir).filter(f => f.endsWith('.json'))) {
    const slug = slugOf(file);
    const data = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    for (const event of data.events ?? []) {
      if (event.category !== 'competition') continue;
      const fp = fingerprint(event);
      if (!groups.has(fp)) groups.set(fp, { event, subjects: new Set(), slugs: new Set() });
      const g = groups.get(fp);
      g.subjects.add(subjectOf(slug));
      g.slugs.add(slug);
    }
  }
}

const competitions = [];
for (const g of groups.values()) {
  const isGeneral = g.subjects.size > 1;
  const { id } = g.event;
  const slug = [...g.slugs][0];
  const cleanId = isGeneral && id.startsWith(`${slug}-`) ? id.slice(slug.length + 1) : id;
  const event = { ...g.event, id: cleanId };
  if (!isGeneral) event.matiere = [...g.subjects][0];
  delete event._subject;
  competitions.push(event);
}

// 3. Fusion + tri.
const all = [...generalEvents, ...competitions]
  .sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));

// Dédup de sécurité par id.
const seen = new Set();
const events = all.filter(e => (seen.has(e.id) ? false : (seen.add(e.id), true)));

const bulletin = { ...base, events };
const outPath = join(PUBLIC, 'official-student-events.json');
writeFileSync(outPath, JSON.stringify(bulletin, null, 2) + '\n', 'utf8');

console.log(`Événements généraux : ${generalEvents.length}`);
console.log(`Compétitions : ${competitions.length} (dont ${competitions.filter(e => e.matiere).length} spécifiques)`);
console.log(`Total consolidé : ${events.length}`);
console.log(`Écrit : ${outPath}`);
