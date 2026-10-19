import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'screenshoot v2');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://localhost:3000';

// Ensure output directories exist
for (const sub of ['pages', 'modales', 'fonctions', 'admin']) {
  fs.mkdirSync(path.join(OUTPUT_DIR, sub), { recursive: true });
}

// Full targets specification
const targets = [
  // --- PAGES ---
  { cat: 'pages', label: 'landing', screen: 'gallery', page: 'landing', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'pages', label: 'auth', screen: 'gallery', page: 'auth', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'pages', label: 'onboarding', screen: 'gallery', page: 'onboarding', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'pages', label: 'classes', screen: 'classes', langs: ['ar', 'fr'], devices: ['desktop', 'phone', 'tablet'] },
  { cat: 'pages', label: 'classes-dark', screen: 'classes', extra: '&dark', langs: ['ar', 'fr'], devices: ['desktop'] },
  { cat: 'pages', label: 'editor', screen: 'editor', extra: '&toolbar&activities&absences', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'pages', label: 'schedule', screen: 'schedule', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'pages', label: 'checks', screen: 'checks', extra: '&roster-live', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'pages', label: 'print', screen: 'print', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'pages', label: 'activities', screen: 'activities', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'pages', label: 'class-menu', screen: 'class-menu', extra: '&roster-live', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },

  // --- MODALES ---
  { cat: 'modales', label: 'session-remark', screen: 'gallery', page: 'session-remark', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'modales', label: 'assign-date', screen: 'gallery', page: 'assign-date', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'modales', label: 'create-class', screen: 'gallery', page: 'create-class', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'modales', label: 'edit-class', screen: 'gallery', page: 'edit-class', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'modales', label: 'add-content', screen: 'gallery', page: 'add-content', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'modales', label: 'edit-content', screen: 'gallery', page: 'edit-content', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'modales', label: 'manage-lessons', screen: 'gallery', page: 'manage-lessons', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'modales', label: 'analysis', screen: 'gallery', page: 'analysis', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'modales', label: 'print-options', screen: 'gallery', page: 'print-options', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'modales', label: 'date-review', screen: 'gallery', page: 'date-review', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'modales', label: 'data-transfer', screen: 'gallery', page: 'data-transfer', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'modales', label: 'platform-import', screen: 'gallery', page: 'platform-import', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'modales', label: 'guide', screen: 'gallery', page: 'guide', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'modales', label: 'settings', screen: 'gallery', page: 'settings', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'modales', label: 'timetable-nudge', screen: 'gallery', page: 'timetable-nudge', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'modales', label: 'assessment-document', screen: 'gallery', page: 'assessment-document', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'modales', label: 'notebook-review', screen: 'gallery', page: 'notebook-review', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'modales', label: 'oral-review', screen: 'gallery', page: 'oral-review', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'modales', label: 'assessment-absences', screen: 'gallery', page: 'assessment-absences', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'modales', label: 'activity-participants', screen: 'gallery', page: 'activity-participants', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'modales', label: 'admin-message', screen: 'gallery', page: 'admin-message', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'modales', label: 'admin-roster-modal', screen: 'gallery', page: 'admin-roster-modal', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'modales', label: 'admin-json-import', screen: 'gallery', page: 'admin-json-import', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'modales', label: 'admin-document-preview', screen: 'gallery', page: 'admin-document-preview', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'modales', label: 'command-palette', screen: 'gallery', page: 'command-palette', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'modales', label: 'delete-confirmation', screen: 'gallery', page: 'delete-confirmation', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },

  // --- ADMIN ---
  { cat: 'admin', label: 'admin-clock', screen: 'gallery', page: 'admin-clock', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'admin', label: 'admin-calendar', screen: 'gallery', page: 'admin-calendar', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'admin', label: 'admin-bulletin', screen: 'gallery', page: 'admin-bulletin', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
  { cat: 'admin', label: 'admin-roster', screen: 'admin-roster', langs: ['ar', 'fr'], devices: ['desktop', 'phone'] },
];

function buildQueue() {
  const queue = [];
  for (const item of targets) {
    for (const lang of item.langs) {
      for (const device of item.devices) {
        let width = 1280;
        let height = 880;
        let deviceQuery = '';
        if (device === 'phone') {
          width = 390;
          height = 844;
          deviceQuery = '&portrait';
        } else if (device === 'tablet') {
          width = 820;
          height = 1180;
          deviceQuery = '&portrait';
        }

        let url = `${BASE_URL}/scripts/showcase-preview/index.html?lang=${lang}&screen=${item.screen}`;
        if (item.page) url += `&page=${item.page}`;
        if (item.extra) url += item.extra;
        url += deviceQuery;

        const filename = `${item.label}-${lang}-${device}.png`;
        const relativePath = `${item.cat}/${filename}`;
        const outputPath = path.join(OUTPUT_DIR, relativePath);

        queue.push({
          cat: item.cat,
          label: item.label,
          lang,
          device,
          width,
          height,
          url,
          filename,
          relativePath,
          outputPath
        });
      }
    }
  }
  return queue;
}

function captureJob(job) {
  return new Promise((resolve, reject) => {
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--virtual-time-budget=3500',
      `--window-size=${job.width},${job.height}`,
      `--screenshot=${job.outputPath}`,
      job.url
    ];

    const proc = spawn(EDGE_PATH, args);
    let stderr = '';
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('close', code => {
      if (code === 0 && fs.existsSync(job.outputPath)) {
        const stats = fs.statSync(job.outputPath);
        if (stats.size > 5000) {
          resolve(stats.size);
        } else {
          reject(new Error(`Screenshot too small (${stats.size}b) for ${job.relativePath}`));
        }
      } else {
        reject(new Error(`Edge process failed with code ${code} for ${job.relativePath}: ${stderr.slice(0, 150)}`));
      }
    });
  });
}

async function runQueue(queue, concurrency = 4) {
  console.log(`Starting capture of ${queue.length} targets with concurrency ${concurrency}...`);
  const results = [];
  let index = 0;

  async function worker(workerId) {
    while (index < queue.length) {
      const currentIndex = index++;
      const job = queue[currentIndex];
      try {
        const t0 = Date.now();
        const size = await captureJob(job);
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`[${currentIndex + 1}/${queue.length}] ✓ ${job.relativePath} (${(size / 1024).toFixed(0)} KB, ${elapsed}s)`);
        results.push({ job, ok: true, size });
      } catch (err) {
        console.error(`[${currentIndex + 1}/${queue.length}] ✗ ${job.relativePath}: ${err.message}`);
        results.push({ job, ok: false, error: err.message });
      }
    }
  }

  const workers = Array.from({ length: concurrency }, (_, i) => worker(i + 1));
  await Promise.all(workers);
  return results;
}

const queue = buildQueue();
runQueue(queue, 4)
  .then(results => {
    const passed = results.filter(r => r.ok).length;
    console.log(`\nCapture completed: ${passed}/${results.length} succeeded.`);
  })
  .catch(console.error);
