import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'public', 'guide', 'current');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://localhost:3000';

const specs = [
  { key: 'classes', size: [1280, 720], url: lang => `${BASE_URL}/scripts/guide-preview/index.html?screen=classes&lang=${lang}` },
  { key: 'schedule', size: [1280, 720], url: lang => `${BASE_URL}/scripts/guide-preview/index.html?screen=schedule&lang=${lang}` },
  { key: 'editor', size: [1280, 720], url: lang => `${BASE_URL}/scripts/guide-preview/index.html?screen=editor&lang=${lang}` },
  { key: 'add', size: [1280, 720], url: lang => `${BASE_URL}/scripts/guide-preview/index.html?screen=add&lang=${lang}` },
  { key: 'dates', size: [1280, 720], url: lang => `${BASE_URL}/scripts/guide-preview/index.html?screen=dates&lang=${lang}` },
  { key: 'notifications', size: [1280, 720], url: lang => `${BASE_URL}/scripts/guide-preview/index.html?screen=notifications&lang=${lang}` },
  { key: 'appearance', size: [1280, 720], url: lang => `${BASE_URL}/scripts/guide-preview/index.html?screen=appearance&lang=${lang}` },
  { key: 'assessments', size: [1280, 720], url: lang => `${BASE_URL}/scripts/guide-preview/index.html?screen=evaluations&lang=${lang}` },
  { key: 'print', size: [1280, 720], url: lang => `${BASE_URL}/scripts/guide-preview/index.html?screen=print&lang=${lang}` },
  { key: 'students', size: [1280, 720], url: lang => `${BASE_URL}/scripts/guide-preview/index.html?screen=students&lang=${lang}` },
];

async function main() {
  console.log(`Starting generation of ${specs.length * 2} WebP guide screenshots (16:9 Landscape 1280x720, Retina 2x)...`);
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
        '--force-device-scale-factor=2',
        '--hide-scrollbars',
        '--window-size=1280,720',
        '--virtual-time-budget=4000',
        `--screenshot=${tmpPng}`,
        targetUrl,
      ]);

      if (res.status !== 0 || !fs.existsSync(tmpPng)) {
        console.error(`FAILED capture for ${filename}:`, res.stderr?.toString());
        continue;
      }

      // Downscale 2x retina (2560x1440) directly to 1280x720 WebP with Lanczos3 anti-aliasing
      const webpBuffer = await sharp(tmpPng)
        .resize(targetW, targetH, { fit: 'fill', kernel: 'lanczos3' })
        .webp({ quality: 88, effort: 6 })
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
