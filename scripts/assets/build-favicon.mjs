// `index.html` déclare `/icons/favicon.ico` et les navigateurs demandent aussi
// `/favicon.ico` à la racine. Sans fichier, les deux requêtes tombaient sur la
// page HTML de secours : icône cassée et erreur dans le service worker.
//
// On fabrique donc un vrai ICO (une seule image PNG 32×32 embarquée — format
// accepté par tous les navigateurs modernes) à partir du PNG déjà versionné.
// Usage : node scripts/assets/build-favicon.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const source = readFileSync(resolve(root, 'public/icons/favicon-32.png'));

// ICO : en-tête 6 octets, un répertoire de 16 octets, puis l'image.
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);       // réservé
header.writeUInt16LE(1, 2);       // type 1 = icône
header.writeUInt16LE(1, 4);       // une seule image

const entry = Buffer.alloc(16);
entry.writeUInt8(32, 0);          // largeur
entry.writeUInt8(32, 1);          // hauteur
entry.writeUInt8(0, 2);           // couleurs de palette
entry.writeUInt8(0, 3);           // réservé
entry.writeUInt16LE(1, 4);        // plans
entry.writeUInt16LE(32, 6);       // bits par pixel
entry.writeUInt32LE(source.length, 8);
entry.writeUInt32LE(header.length + entry.length, 12);

const icon = Buffer.concat([header, entry, source]);
for (const target of ['public/icons/favicon.ico', 'public/favicon.ico']) {
    mkdirSync(dirname(resolve(root, target)), { recursive: true });
    writeFileSync(resolve(root, target), icon);
}
console.log(`favicon.ico : ${icon.length} octets (PNG 32×32 embarqué), écrit à la racine et dans /icons/.`);
