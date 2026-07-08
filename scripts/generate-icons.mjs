/**
 * Génère les icônes PWA (PNG) depuis public/icons/icon.svg :
 *   - icon-192.png / icon-512.png  (purpose "any")
 *   - icon-maskable-512.png        (fond plein bord à bord, motif dans la zone sûre 80 %)
 *   - apple-touch-icon.png (180)   (iOS ne supporte pas le SVG)
 *   - favicon-32.png / favicon-16.png
 *
 * Usage : node scripts/generate-icons.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const iconsDir = resolve(root, 'public/icons');
const baseSvg = readFileSync(resolve(iconsDir, 'icon.svg'), 'utf8');

/*
 * Variante maskable : le launcher Android peut rogner jusqu'à un cercle
 * inscrit — le fond doit couvrir TOUT le carré (pas de coins arrondis) et le
 * motif tenir dans ~80 % du centre. On ré-emballe le SVG de base : fond plein
 * + dessin original réduit à 78 % et centré.
 */
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#C96442"/>
  <g transform="translate(56.32 56.32) scale(0.78)">
    ${baseSvg.replace(/<svg[^>]*>/, '').replace('</svg>', '')}
  </g>
</svg>`;

const jobs = [
  { input: baseSvg, size: 192, out: 'icon-192.png' },
  { input: baseSvg, size: 512, out: 'icon-512.png' },
  { input: maskableSvg, size: 512, out: 'icon-maskable-512.png' },
  { input: baseSvg, size: 180, out: 'apple-touch-icon.png' },
  { input: baseSvg, size: 32, out: 'favicon-32.png' },
  { input: baseSvg, size: 16, out: 'favicon-16.png' },
];

for (const job of jobs) {
  const png = await sharp(Buffer.from(job.input), { density: 300 })
    .resize(job.size, job.size)
    .png()
    .toBuffer();
  writeFileSync(resolve(iconsDir, job.out), png);
  console.log(`✓ ${job.out} (${job.size}×${job.size}, ${(png.length / 1024).toFixed(1)} Ko)`);
}
console.log('Icônes générées dans public/icons/');
