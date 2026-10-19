import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'public', 'guide', 'current');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://localhost:3000';

const specs = [
  { key: 'classes', size: [1120, 260], url: lang => `${BASE_URL}/scripts/guide-preview/index.html?screen=classes&lang=${lang}`, w: 1200, h: 600 },
  { key: 'schedule', size: [1120, 620], url: lang => `${BASE_URL}/scripts/guide-preview/index.html?screen=schedule&lang=${lang}`, w: 1200, h: 850 },
  { key: 'editor', size: [1120, 920], url: lang => `${BASE_URL}/scripts/guide-preview/index.html?screen=editor&lang=${lang}`, w: 1200, h: 950 },
  { key: 'add', size: [1120, 940], url: lang => `${BASE_URL}/scripts/guide-preview/index.html?screen=add&lang=${lang}`, w: 1200, h: 950 },
  { key: 'dates', size: [704, 880], url: lang => `${BASE_URL}/scripts/guide-preview/index.html?screen=dates&lang=${lang}`, w: 1200, h: 950 },
  { key: 'notifications', size: [1140, 910], url: lang => `${BASE_URL}/scripts/guide-preview/index.html?screen=notifications&lang=${lang}`, w: 1200, h: 900 },
  { key: 'appearance', size: [1060, 500], url: lang => `${BASE_URL}/scripts/guide-preview/index.html?screen=appearance&lang=${lang}`, w: 1200, h: 700 },
  { key: 'assessments', size: [1120, 460], url: lang => `${BASE_URL}/scripts/guide-preview/index.html?screen=evaluations&fixture=student-followup&lang=${lang}`, w: 1200, h: 700 },
  { key: 'print', size: [930, 900], url: lang => `${BASE_URL}/scripts/guide-preview/index.html?screen=print&lang=${lang}`, w: 1200, h: 950 },
  { key: 'students', size: [800, 760], url: lang => `${BASE_URL}/scripts/guide-preview/index.html?screen=students&lang=${lang}`, w: 1200, h: 950 },
];

const BG_COLOR = { r: 250, g: 249, b: 245, alpha: 1 }; // #FAF9F5

async function main() {
  console.log(`Starting generation of ${specs.length * 2} WebP guide screenshots...`);
  const captureSizesMap = {};

  for (const spec of specs) {
    const [targetW, targetH] = spec.size;
    captureSizesMap[spec.key] = spec.size;

    for (const lang of ['fr', 'ar']) {
      const filename = `${spec.key}-${lang}.webp`;
      const outPath = path.join(OUTPUT_DIR, filename);
      const tmpPng = path.join(OUTPUT_DIR, `tmp-${spec.key}-${lang}.png`);

      const targetUrl = spec.url(lang);
      const res = spawnSync(EDGE_PATH, [
        '--headless=new',
        '--disable-gpu',
        '--virtual-time-budget=3500',
        `--window-size=${spec.w},${spec.h}`,
        `--screenshot=${tmpPng}`,
        targetUrl,
      ]);

      if (res.status !== 0 || !fs.existsSync(tmpPng)) {
        console.error(`FAILED capture for ${filename}:`, res.stderr?.toString());
        continue;
      }

      // Trim outer margin, then fit inside exact target dimensions with canvas background
      const trimmedBuffer = await sharp(tmpPng).trim().toBuffer();
      const webpBuffer = await sharp(trimmedBuffer)
        .resize(targetW, targetH, { fit: 'contain', background: BG_COLOR })
        .webp({ quality: 86, effort: 6 })
        .toBuffer();

      fs.writeFileSync(outPath, webpBuffer);
      fs.unlinkSync(tmpPng);

      // Verify WebP properties
      const sig = webpBuffer.toString('ascii', 8, 12);
      const format = webpBuffer.toString('ascii', 12, 16);
      const w = webpBuffer.readUInt16LE(26) & 0x3fff;
      const h = webpBuffer.readUInt16LE(28) & 0x3fff;
      const kb = (webpBuffer.length / 1024).toFixed(1);

      console.log(`✓ ${filename.padEnd(24)} ${w}x${h} | ${format.trim()} | ${kb} KB`);
    }
  }

  console.log('\n--- captureSizes configuration for GuideFigure.tsx ---');
  console.log(JSON.stringify(captureSizesMap, null, 2));
}

main().catch(console.error);
