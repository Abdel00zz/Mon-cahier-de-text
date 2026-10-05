/** Génère toutes les icônes de l'application à partir de « public/icons/Spiral Notebook App Icon.png ».
 * Usage : node scripts/assets/render-app-icon.mjs <chemin-vers-sharp>
 *
 * 1. Le fond blanc est retiré par remplissage depuis les bords (l'étiquette crème du cahier,
 *    enfermée dans le dessin, reste intacte) et le liseré blanc des pixels de contour est nettoyé.
 * 2. Le cahier détouré est recadré, puis posé au centre d'un fond ivoire (#FAF9F5).
 * 3. Les couleurs orange-rouge du dessin ne sont jamais modifiées.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';

const USAGE = 'Usage : node scripts/assets/render-app-icon.mjs <chemin-vers-sharp>';
const SOURCE = 'public/icons/Spiral Notebook App Icon.png';
const GROUND = '#FAF9F5', GROUND_RGBA = { r: 250, g: 249, b: 245, alpha: 1 };

let sharp;
try {
  sharp = createRequire(import.meta.url)(process.argv[2] || 'sharp');
} catch {
  console.error(`Le paquet « sharp » est introuvable. ${USAGE}`);
  process.exit(1);
}
if (!fs.existsSync(SOURCE)) {
  console.error(`Image source introuvable : ${SOURCE}`);
  process.exit(1);
}

/** Retire le fond blanc connecté aux bords et nettoie le contour. */
async function cutout() {
  const { data, info } = await sharp(SOURCE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const N = W * H;
  const near = i => data[i * 4] >= 238 && data[i * 4 + 1] >= 238 && data[i * 4 + 2] >= 238;
  const bg = new Uint8Array(N);
  const stack = [];
  const push = i => { if (!bg[i] && near(i)) { bg[i] = 1; stack.push(i); } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  while (stack.length) {
    const i = stack.pop(), x = i % W, y = (i / W) | 0;
    if (x > 0) push(i - 1);
    if (x < W - 1) push(i + 1);
    if (y > 0) push(i - W);
    if (y < H - 1) push(i + W);
  }
  const touches = (i, mask) => {
    const x = i % W, y = (i / W) | 0;
    return (x > 0 && mask[i - 1]) || (x < W - 1 && mask[i + 1]) || (y > 0 && mask[i - W]) || (y < H - 1 && mask[i + W]);
  };
  // Deux anneaux de contour : pixels mélangés au blanc, dont on retrouve couleur et opacité.
  const ring1 = new Uint8Array(N), ring2 = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (!bg[i] && touches(i, bg)) ring1[i] = 1;
  for (let i = 0; i < N; i++) if (!bg[i] && !ring1[i] && touches(i, ring1)) ring2[i] = 1;
  for (let i = 0; i < N; i++) {
    const o = i * 4;
    if (bg[i]) { data[o + 3] = 0; continue; }
    if (!ring1[i] && !ring2[i]) continue;
    const alpha = Math.min(1, Math.max(0, (255 - Math.min(data[o], data[o + 1], data[o + 2])) / 235));
    if (alpha < 0.04) { data[o + 3] = 0; continue; }
    for (let c = 0; c < 3; c++) data[o + c] = Math.min(255, Math.max(0, Math.round((data[o + c] - (1 - alpha) * 255) / alpha)));
    data[o + 3] = Math.round(alpha * 255);
  }
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let i = 0; i < N; i++) {
    if (data[i * 4 + 3] <= 8) continue;
    const x = i % W, y = (i / W) | 0;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const width = x1 - x0 + 1, height = y1 - y0 + 1;
  const buffer = await sharp(data, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: x0, top: y0, width, height }).png().toBuffer();
  // Rayon du pixel opaque le plus éloigné du centre : sert à tenir dans la zone sûre des icônes masquables.
  const cx = (width - 1) / 2, cy = (height - 1) / 2;
  let radius = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (data[(y * W + x) * 4 + 3] <= 8) continue;
    radius = Math.max(radius, Math.hypot(x - x0 - cx, y - y0 - cy));
  }
  return { buffer, width, height, radius };
}

const book = await cutout();

/** Place le cahier au centre d'un canevas carré. `fraction` : part du côté occupée par le plus grand côté du cahier ;
 * `safe` : tenir dans le disque de 66 % du canevas (icônes masquables et adaptatives). */
async function layer(size, { fraction = 0.72, safe = false } = {}) {
  const scale = safe ? (0.33 * size * 0.99) / book.radius : (fraction * size) / Math.max(book.width, book.height);
  const w = Math.max(1, Math.round(book.width * scale)), h = Math.max(1, Math.round(book.height * scale));
  const input = await sharp(book.buffer).resize(w, h, { kernel: 'lanczos3' }).png().toBuffer();
  return { input, left: Math.round((size - w) / 2), top: Math.round((size - h) / 2), w, h };
}
const roundedGround = size => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${(size * 112) / 512}" fill="${GROUND}"/></svg>`);

/** `round` : coins arrondis transparents ; `plain` : fond ivoire plein cadre ; `transparent` : cahier seul. */
async function icon(size, kind, options) {
  const { input, left, top } = await layer(size, options);
  if (kind === 'transparent') {
    return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input, left, top }]).png();
  }
  if (kind === 'plain') {
    return sharp({ create: { width: size, height: size, channels: 4, background: GROUND_RGBA } }).composite([{ input, left, top }]).png();
  }
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: roundedGround(size), left: 0, top: 0 }, { input, left, top }]).png();
}

const written = [];
const save = async (image, file) => { await image.toFile(file); written.push(file); };
const write = (file, content) => { fs.writeFileSync(file, content); written.push(file); };

for (const [file, size] of Object.entries({ 'icon-192.png': 192, 'icon-512.png': 512 })) {
  await save(await icon(size, 'round', { fraction: 0.74 }), 'public/icons/' + file);
}
for (const [file, size] of Object.entries({ 'favicon-32.png': 32, 'favicon-16.png': 16 })) {
  await save(await icon(size, 'round', { fraction: 0.9 }), 'public/icons/' + file);
}
await save(await icon(180, 'plain', { fraction: 0.7 }), 'public/icons/apple-touch-icon-180.png');
await save(await icon(512, 'plain', { safe: true }), 'public/icons/icon-maskable-512.png');
await save(await icon(1024, 'round', { fraction: 0.74 }), 'assets/branding/app-icon-source.png');

const faviconPng = await (await icon(32, 'round', { fraction: 0.9 })).toBuffer();
const head = Buffer.alloc(22);
head.writeUInt16LE(1, 2); head.writeUInt16LE(1, 4); head[6] = 32; head[7] = 32; head.writeUInt16LE(1, 10);
head.writeUInt16LE(32, 12); head.writeUInt32LE(faviconPng.length, 14); head.writeUInt32LE(22, 18);
write('public/icons/favicon.ico', Buffer.concat([head, faviconPng]));

// SVG de référence : fond ivoire vectoriel + cahier détouré (512 × 512).
const svgLayer = await layer(512, { fraction: 0.74 });
write('assets/branding/app-icon.svg', `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="${GROUND}"/><image x="${svgLayer.left}" y="${svgLayer.top}" width="${svgLayer.w}" height="${svgLayer.h}" href="data:image/png;base64,${svgLayer.input.toString('base64')}"/></svg>\n`);

const root = 'android/app/src/main/res/';
fs.mkdirSync(root + 'drawable-nodpi', { recursive: true });
await save(await icon(512, 'transparent', { safe: true }), root + 'drawable-nodpi/cahier_foreground.png');
await save(await icon(512, 'round', { fraction: 0.74 }), root + 'drawable-nodpi/cahier_launcher.png');
const bitmap = name => `<?xml version="1.0" encoding="utf-8"?>\n<bitmap xmlns:android="http://schemas.android.com/apk/res/android" android:src="@drawable/${name}" android:gravity="fill" android:filter="true"/>\n`;
write(root + 'drawable/ic_notebook_foreground.xml', bitmap('cahier_foreground'));
for (const name of ['ic_launcher.xml', 'ic_launcher_round.xml']) write(root + 'mipmap-anydpi/' + name, bitmap('cahier_launcher'));
write(root + 'values/ic_launcher_background.xml', `<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="ic_launcher_background">${GROUND}</color></resources>\n`);

// Pictogrammes blancs (notification, icône monochrome) : inchangés, régénérés à l'identique.
const symbol = 'M6 3.5H18Q20 3.5 20 5.5V18.5Q20 20.5 18 20.5H6Q4 20.5 4 18.5V5.5Q4 3.5 6 3.5ZM8 3.5V20.5M11 8H17M11 12H17M11 16H15';
const vector = (size, viewBox, group) => `<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="${size}dp" android:height="${size}dp" android:viewportWidth="${viewBox}" android:viewportHeight="${viewBox}">${group}</vector>\n`;
const path = `<path android:fillColor="@android:color/transparent" android:strokeColor="#FFFFFFFF" android:strokeWidth="1.7" android:strokeLineCap="round" android:strokeLineJoin="round" android:pathData="${symbol}"/>`;
write(root + 'drawable/ic_stat_notebook.xml', vector(24, 24, path));
write(root + 'drawable/ic_notebook_monochrome.xml', vector(108, 108, `<group android:scaleX="2.8" android:scaleY="2.8" android:translateX="20.4" android:translateY="20.4">${path}</group>`));
await save(sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${symbol}" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`)).resize(96).png(), 'public/icons/notification-badge-96.png');

console.log('Fichiers régénérés :\n' + written.map(file => ' - ' + file).join('\n'));
