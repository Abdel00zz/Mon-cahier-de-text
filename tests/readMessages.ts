import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const walk = (directory: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith('.ts')) out.push(full);
  }
  return out;
};

/** Toutes les tables i18n (barrel, domaines et fichiers par locale). */
export const readMessageSource = (): string =>
  walk('src/i18n').map(file => readFileSync(file, 'utf8')).join('\n');
