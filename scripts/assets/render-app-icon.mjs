/** Render the original optical notebook mark for web and Android from one SVG master.
 * Usage: node scripts/assets/render-app-icon.mjs <path-to-sharp-package>
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)(process.argv[2] || 'sharp');
const defs = `<defs>
<linearGradient id="shell" x2=".8" y2="1"><stop stop-color="#f7f9e6"/><stop offset=".52" stop-color="#cfe3a8"/><stop offset="1" stop-color="#86ae55"/></linearGradient>
<radialGradient id="sun" cx=".5" cy=".5" r=".5"><stop stop-color="#fff6cc" stop-opacity=".95"/><stop offset="1" stop-color="#fff6cc" stop-opacity="0"/></radialGradient><radialGradient id="light" cx=".2" cy=".1" r="1"><stop stop-color="#ffffff" stop-opacity=".9"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
<linearGradient id="paper" x2=".9" y2="1"><stop stop-color="#fffdf5"/><stop offset=".55" stop-color="#faf3df"/><stop offset="1" stop-color="#e6dab7"/></linearGradient>
<linearGradient id="blue" x2=".8" y2="1"><stop stop-color="#dcefb4"/><stop offset=".45" stop-color="#93c06a"/><stop offset="1" stop-color="#557f33"/></linearGradient>
<linearGradient id="edge" x2=".7" y2="1"><stop stop-color="#ffffff"/><stop offset=".45" stop-color="#ffffff" stop-opacity=".7"/><stop offset="1" stop-color="#d4c79f"/></linearGradient>
<filter id="shadow" x="-.4" y="-.3" width="1.8" height="1.8" color-interpolation-filters="sRGB"><feDropShadow dy="12" stdDeviation="9" flood-color="#4a5228" flood-opacity=".26"/><feDropShadow dy="2" stdDeviation="1.5" flood-color="#4a5228" flood-opacity=".12"/></filter>
</defs>`;
const mark = `<g filter="url(#shadow)">
<rect x="135" y="115" width="241" height="299" rx="35" fill="url(#blue)" transform="rotate(-8 255 260)"/>
<rect x="145" y="107" width="234" height="294" rx="33" fill="#cdbf95"/>
<rect x="142" y="101" width="234" height="294" rx="33" fill="url(#paper)" stroke="url(#edge)" stroke-width="3"/>
<path d="M171 110V385" fill="none" stroke="#e0d3ab" stroke-width="3"/>
<path d="M150 139Q150 109 177 109H341" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity=".9"/>
<path d="M312 103H345V179Q345 184 341 181L328.5 171L316 181Q312 184 312 179Z" fill="url(#blue)"/>
<path d="M207 204H315M207 246H315M207 288H282" stroke="#5f6b4a" stroke-width="12" stroke-linecap="round"/>
<path d="M345 118C372 96 402 100 414 112C392 128 366 132 345 118Z" fill="url(#blue)"/><path d="M349 117Q380 110 408 112" fill="none" stroke="#f3f7df" stroke-width="3" stroke-linecap="round" opacity=".8"/>
<path d="M207 337H249" stroke="#a9c27f" stroke-width="9" stroke-linecap="round"/>
</g>`;
const background = '<rect width="512" height="512" rx="112" fill="url(#shell)"/><rect x="2" y="2" width="508" height="508" rx="110" fill="url(#light)" stroke="url(#edge)" stroke-width="3"/><circle cx="396" cy="118" r="92" fill="url(#sun)"/>';
const frame = body => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${defs}${body}</svg>`;
const svg=frame(background+mark);
fs.writeFileSync('assets/branding/app-icon.svg',svg);
for(const[file,size]of Object.entries({'icon-192.png':192,'icon-512.png':512,'apple-touch-icon-180.png':180,'favicon-32.png':32,'favicon-16.png':16}))await sharp(Buffer.from(svg)).resize(size,size).png().toFile('public/icons/'+file);
// Maskable icons have an opaque full-bleed background; the notebook stays in the safe zone.
await sharp(Buffer.from(frame('<rect width="512" height="512" fill="url(#shell)"/>'+mark))).png().toFile('public/icons/icon-maskable-512.png');
await sharp(Buffer.from(svg)).resize(1024).png().toFile('assets/branding/app-icon-source.png');
const png=await sharp(Buffer.from(svg)).resize(32).png().toBuffer();const head=Buffer.alloc(22);head.writeUInt16LE(1,2);head.writeUInt16LE(1,4);head[6]=32;head[7]=32;head.writeUInt16LE(1,10);head.writeUInt16LE(32,12);head.writeUInt32LE(png.length,14);head.writeUInt32LE(22,18);fs.writeFileSync('public/icons/favicon.ico',Buffer.concat([head,png]));
const root='android/app/src/main/res/';fs.mkdirSync(root+'drawable-nodpi',{recursive:true});
await sharp(Buffer.from(frame(mark))).png().toFile(root+'drawable-nodpi/cahier_foreground.png');
await sharp(Buffer.from(svg)).png().toFile(root+'drawable-nodpi/cahier_launcher.png');
const bitmap=name=>`<?xml version="1.0" encoding="utf-8"?>\n<bitmap xmlns:android="http://schemas.android.com/apk/res/android" android:src="@drawable/${name}" android:gravity="fill" android:filter="true"/>\n`;
fs.writeFileSync(root+'drawable/ic_notebook_foreground.xml',bitmap('cahier_foreground'));
for(const name of ['ic_launcher.xml','ic_launcher_round.xml'])fs.writeFileSync(root+'mipmap-anydpi/'+name,bitmap('cahier_launcher'));
fs.writeFileSync(root+'values/ic_launcher_background.xml','<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="ic_launcher_background">#CFE3A8</color></resources>\n');
const symbol='M6 3.5H18Q20 3.5 20 5.5V18.5Q20 20.5 18 20.5H6Q4 20.5 4 18.5V5.5Q4 3.5 6 3.5ZM8 3.5V20.5M11 8H17M11 12H17M11 16H15';
const vector=(size,viewBox,group)=>`<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="${size}dp" android:height="${size}dp" android:viewportWidth="${viewBox}" android:viewportHeight="${viewBox}">${group}</vector>\n`;
const path=`<path android:fillColor="@android:color/transparent" android:strokeColor="#FFFFFFFF" android:strokeWidth="1.7" android:strokeLineCap="round" android:strokeLineJoin="round" android:pathData="${symbol}"/>`;
fs.writeFileSync(root+'drawable/ic_stat_notebook.xml',vector(24,24,path));
fs.writeFileSync(root+'drawable/ic_notebook_monochrome.xml',vector(108,108,`<group android:scaleX="2.8" android:scaleY="2.8" android:translateX="20.4" android:translateY="20.4">${path}</group>`));
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${symbol}" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`)).resize(96).png().toFile('public/icons/notification-badge-96.png');
console.log('Pistachio notebook: web, Android, maskable, favicon and notification assets regenerated.');
