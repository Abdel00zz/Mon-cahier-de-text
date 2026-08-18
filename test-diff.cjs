const fs = require('fs');
const content = fs.readFileSync('constants/class-levels.ts', 'utf8');

const getKeys = (regex) => {
  const match = content.match(regex);
  if (!match) return [];
  const lines = match[0].split('\n').slice(1, -1);
  return lines.map(line => {
    const keyMatch = line.match(/^\s*'([^']+)':/);
    return keyMatch ? keyMatch[1] : null;
  }).filter(Boolean);
};

const keysFR = getKeys(/CLASS_LEVEL_DISPLAY_NAMES: Readonly<Record<string, string>> = \{[\s\S]*?\};/);
const keysAR = getKeys(/CLASS_LEVEL_DISPLAY_NAMES_AR: Readonly<Record<string, string>> = \{[\s\S]*?\};/);

const missingInAR = keysFR.filter(k => !keysAR.includes(k));
console.log('Missing in AR:', missingInAR);
