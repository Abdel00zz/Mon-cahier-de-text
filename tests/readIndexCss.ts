import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const STYLES_DIR = resolve('src/styles');

const MODULAR_IMPORTS = new Set([
  './theme-tokens.css',
  './theme-palette.css',
  './theme-base.css',
  './editor-surface.css',
  './workspace-shell.css',
  './settings-hubShell.css',
  './settings-hub.css',
  './class-tones.css',
  './document-sheet.css',
  './admin-workspace.css',
]);

/**
 * Lit `src/styles/index.css` en résolvant les sous-modules CSS issus du découpage
 * modulaire (`theme-tokens.css`, `editor-surface.css`, `workspace-shell.css`,
 * `settings-hub.css`, `class-tones.css`, `document-sheet.css`, `admin-workspace.css`)
 * afin que les tests d'architecture et de contraste inspectent l'intégralité du socle.
 */
export function readIndexCss(): string {
  const indexPath = resolve(STYLES_DIR, 'index.css');
  const raw = readFileSync(indexPath, 'utf8');
  return raw.replace(/@import\s+["'](\.\/[^"']+\.css)["'];/g, (statement, relPath: string) => {
    if (!MODULAR_IMPORTS.has(relPath)) return statement;
    return readFileSync(resolve(STYLES_DIR, relPath), 'utf8');
  });
}
