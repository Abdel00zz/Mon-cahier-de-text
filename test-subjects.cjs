const fs = require('fs');
const content = fs.readFileSync('constants/subjects.ts', 'utf8');

const getKeys = (regex) => {
  const match = content.match(regex);
  if (!match) return [];
  const lines = match[0].split('\n').slice(1, -1);
  return lines.map(line => {
    const keyMatch = line.match(/^\s*'([^']+)':/);
    return keyMatch ? keyMatch[1] : null;
  }).filter(Boolean);
};

const subjectsMatch = content.match(/export const SUBJECTS = \[([\s\S]*?)\] as const;/);
const subjects = subjectsMatch[1].split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(Boolean);

const keysAR = getKeys(/const SUBJECT_DISPLAY_NAMES_AR: Readonly<Record<string, string>> = \{[\s\S]*?\};/);

const missingInAR = subjects.filter(s => !keysAR.includes(s));
console.log('Missing subjects in AR:', missingInAR);
