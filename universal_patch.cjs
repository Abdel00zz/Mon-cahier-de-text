const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

function patchFile(filepath) {
    if (!filepath.endsWith('.tsx')) return;
    let code = fs.readFileSync(filepath, 'utf8');
    let original = code;

    code = code.replace(/text-\[#6B6255\]/g, 'text-[#5f6368] dark:text-[#9aa0a6]');
    code = code.replace(/text-\[#2B2620\]/g, 'text-[#202124] dark:text-[#e8eaed]');
    code = code.replace(/bg-\[#EDE5D0\]\/20/g, 'bg-slate-50 dark:bg-[#3c4043]');
    code = code.replace(/bg-\[#EDE5D0\]\/30/g, 'bg-slate-50 dark:bg-[#3c4043]');
    code = code.replace(/bg-\[#EDE5D0\]\/40/g, 'bg-slate-50 dark:bg-[#3c4043]');
    code = code.replace(/bg-\[#EDE5D0\]\/50/g, 'bg-slate-100 dark:bg-[#3c4043]');
    code = code.replace(/bg-\[#EDE5D0\]\/60/g, 'bg-slate-100 dark:bg-[#3c4043]');
    code = code.replace(/bg-\[#EDE5D0\]\/70/g, 'bg-slate-100 dark:bg-[#3c4043]');
    code = code.replace(/bg-\[#EDE5D0\]/g, 'bg-[#f1f3f4] dark:bg-[#3c4043]');
    code = code.replace(/hover:bg-\[#EDE5D0\]\/40/g, 'hover:bg-slate-200 dark:hover:bg-[#5f6368]');
    code = code.replace(/hover:bg-\[#EDE5D0\]\/60/g, 'hover:bg-slate-200 dark:hover:bg-[#5f6368]');
    code = code.replace(/hover:bg-\[#EDE5D0\]/g, 'hover:bg-slate-200 dark:hover:bg-[#5f6368]');
    
    code = code.replace(/border-\[#D9CFB6\]\/50/g, 'border-[#e0e0e0] dark:border-[#5f6368]');
    code = code.replace(/border-\[#D9CFB6\]\/60/g, 'border-[#e0e0e0] dark:border-[#5f6368]');
    code = code.replace(/border-\[#D9CFB6\]/g, 'border-[#e0e0e0] dark:border-[#5f6368]');
    code = code.replace(/divide-\[#D9CFB6\]\/50/g, 'divide-[#e0e0e0] dark:divide-[#5f6368]');
    code = code.replace(/focus-visible:ring-\[#D9CFB6\]\/40/g, 'focus-visible:ring-blue-500/40');
    
    code = code.replace(/bg-\[#F6F1E4\]/g, 'bg-white dark:bg-[#202124]');
    code = code.replace(/border-\[#2B2620\]\/30/g, 'border-transparent');
    code = code.replace(/border-\[#2B2620\]/g, 'border-[#e0e0e0] dark:border-[#5f6368]');
    code = code.replace(/bg-\[#2B2620\]\/40/g, 'bg-slate-300 dark:bg-slate-600');
    code = code.replace(/bg-\[#2B2620\]\/70/g, 'bg-slate-400 dark:bg-slate-500');
    code = code.replace(/focus-visible:ring-\[#2B2620\]\/30/g, 'focus-visible:ring-blue-500/30');
    
    // TabBar specific
    code = code.replace(/bg-\[#2D251D\]/g, 'bg-slate-100 dark:bg-[#3c4043]');
    code = code.replace(/border-\[#352D24\]/g, 'border-[#e0e0e0] dark:border-[#5f6368]');
    code = code.replace(/hover:bg-\[#352D24\]/g, 'hover:bg-slate-200 dark:hover:bg-[#5f6368]');
    code = code.replace(/text-\[#C2A888\]/g, 'text-blue-500');

    code = code.replace(/shadow-cahier-rest/g, 'shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] dark:shadow-[0_1px_3px_1px_rgba(255,255,255,0.15)]');
    code = code.replace(/shadow-cahier-hover/g, 'shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] dark:shadow-[0_1px_3px_1px_rgba(255,255,255,0.15)]');
    
    code = code.replace(/font-caveat/g, 'font-sans font-medium');
    code = code.replace(/font-space-grotesk/g, 'font-sans');
    code = code.replace(/font-lateef/g, 'font-sans');

    if (code !== original) {
        fs.writeFileSync(filepath, code, 'utf8');
        console.log('Patched', filepath);
    }
}

walkDir('./components', patchFile);
walkDir('./features', patchFile);

console.log('Universal Patch Success');
