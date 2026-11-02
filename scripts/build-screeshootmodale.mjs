import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'screeshootmodale');
const V2_MODALES_DIR = path.join(ROOT, 'screenshoot v2', 'modales');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://localhost:3000';
const TEMP_PROFILE_BASE = path.join(ROOT, 'tmp', 'modal-capture-profile');

// Ensure output and temp dirs exist
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(TEMP_PROFILE_BASE, { recursive: true });

// Read PNG dimensions directly from header
function getPngDimensions(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(24);
    fs.readSync(fd, buffer, 0, 24, 0);
    fs.closeSync(fd);
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
  } catch {
    return { width: 0, height: 0 };
  }
}

// 1. Copy all existing modal screenshots from "screenshoot v2/modales" to "screeshootmodale"
if (fs.existsSync(V2_MODALES_DIR)) {
  const existingFiles = fs.readdirSync(V2_MODALES_DIR).filter(f => f.endsWith('.png'));
  console.log(`Copying ${existingFiles.length} existing modal screenshots from screenshoot v2/modales...`);
  for (const f of existingFiles) {
    const src = path.join(V2_MODALES_DIR, f);
    const dest = path.join(OUTPUT_DIR, f);
    fs.copyFileSync(src, dest);
  }
}

// 2. Define all targets to capture freshly via Edge
const modalTargets = [
  // Core application modals
  { label: 'session-remark', page: 'session-remark', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'cahier' },
  { label: 'assign-date', page: 'assign-date', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'cahier' },
  { label: 'create-class', page: 'create-class', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'classes' },
  { label: 'edit-class', page: 'edit-class', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'classes' },
  { label: 'add-content', page: 'add-content', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'cahier' },
  { label: 'edit-content', page: 'edit-content', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'cahier' },
  { label: 'manage-lessons', page: 'manage-lessons', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'cahier' },
  { label: 'analysis', page: 'analysis', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'pilotage' },
  { label: 'print-options', page: 'print-options', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'cahier' },
  { label: 'date-review', page: 'date-review', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'cahier' },
  { label: 'data-transfer', page: 'data-transfer', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'reglages' },
  { label: 'platform-import', page: 'platform-import', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'reglages' },
  { label: 'guide', page: 'guide', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'aide' },
  { label: 'settings', page: 'settings', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'reglages' },
  { label: 'timetable-nudge', page: 'timetable-nudge', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'emploi' },
  { label: 'assessment-document', page: 'assessment-document', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'evaluations' },
  { label: 'notebook-review', page: 'notebook-review', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'evaluations' },
  { label: 'oral-review', page: 'oral-review', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'evaluations' },
  { label: 'assessment-absences', page: 'assessment-absences', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'evaluations' },
  { label: 'activity-participants', page: 'activity-participants', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'evaluations' },
  { label: 'admin-message', page: 'admin-message', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'admin' },
  { label: 'admin-roster-modal', page: 'admin-roster-modal', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'admin' },
  { label: 'admin-json-import', page: 'admin-json-import', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'admin' },
  { label: 'admin-document-preview', page: 'admin-document-preview', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'admin' },
  { label: 'command-palette', page: 'command-palette', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'outils' },
  { label: 'delete-confirmation', page: 'delete-confirmation', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'dialogues' },

  // Brand-new modals added in refactoring
  { label: 'event-date', page: 'event-date', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'evaluations' },
  { label: 'event-date-range', page: 'event-date-range', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'evaluations' },
  { label: 'pwa-install', page: 'pwa-install', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'outils' },
  { label: 'teacher-conversation', page: 'teacher-conversation', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'dialogues' },
  { label: 'edit-manual-assessment', page: 'edit-manual-assessment', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'evaluations' },
  { label: 'evaluation-kind-picker', page: 'evaluation-kind-picker', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'evaluations' },
  { label: 'class-evaluations-direct', page: 'class-evaluations-direct', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'evaluations' },

  // Admin modules
  { label: 'admin-clock', page: 'admin-clock', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'admin' },
  { label: 'admin-calendar', page: 'admin-calendar', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'admin' },
  { label: 'admin-bulletin', page: 'admin-bulletin', screen: 'gallery', langs: ['ar', 'fr'], devices: ['desktop', 'phone'], cat: 'admin' },
];

// Dictionary of French and Arabic titles and descriptions for all modals
const MODAL_DESCRIPTIONS = {
  'session-remark': { fr: 'Remarque de séance & Action Dock', ar: 'ملاحظة الحصة وشريط الإجراءات والأنشطة' },
  'assign-date': { fr: 'Attribution de date de cours', ar: 'تخصيص وتحديد تواريخ الحصص' },
  'create-class': { fr: 'Création d’une nouvelle classe', ar: 'إحداث وتخصيص قسم دراسي جديد' },
  'edit-class': { fr: 'Modification des paramètres de la classe', ar: 'تعديل بيانات وإعدادات القسم الدراسي' },
  'add-content': { fr: 'Ajout de contenu pédagogique (Cours, Exercice)', ar: 'إضافة درس أو محتوى تربوي جديد' },
  'edit-content': { fr: 'Édition de contenu contextuel avec KaTeX', ar: 'تعديل المحتوى التربوي وصيغ الرياضيات' },
  'manage-lessons': { fr: 'Gestion et réorganisation des leçons', ar: 'تدبير وإعادة ترتيب الدروس والمحاور' },
  'analysis': { fr: 'Analyse de progression & Alertes du programme', ar: 'تحليل تقدم البرنامج الدراسي والتنبيهات' },
  'print-options': { fr: 'Options d’impression du cahier de textes', ar: 'خيارات وتخصيص طباعة دفتر النصوص' },
  'date-review': { fr: 'Validation des dates hors emploi du temps', ar: 'التحقق من التواريخ خارج جدول الحصص' },
  'data-transfer': { fr: 'Sauvegarde, export et import de données', ar: 'حفظ ونقل البيانات واستيرادها' },
  'platform-import': { fr: 'Importation depuis Massar / Plateformes', ar: 'استيراد البيانات من منظومة مسار' },
  'guide': { fr: 'Guide d’utilisation interactif bilingue', ar: 'دليل الاستعمال التفاعلي المزدوج' },
  'settings': { fr: 'Paramètres généraux et personnalisation', ar: 'الإعدادات العامة والتخصيص' },
  'timetable-nudge': { fr: 'Alerte de configuration d’emploi du temps', ar: 'تنبيه إعداد وتثبيت استعمال الزمن' },
  'assessment-document': { fr: 'Sujet et énoncé de devoir (KaTeX / Markdown)', ar: 'نص ومستند الفرض بصيغة KaTeX / Markdown' },
  'notebook-review': { fr: 'Suivi de la tenue des cahiers élèves', ar: 'مراقبة وتتبع دفاتر نصوص التلاميذ' },
  'oral-review': { fr: 'Suivi de l’évaluation et participation orale', ar: 'تتبع التقويم والمشاركة الشفهية' },
  'assessment-absences': { fr: 'Relevé des élèves absents au devoir', ar: 'تسجيل التلاميذ الغائبين عن الفرض' },
  'activity-participants': { fr: 'Relevé des participants aux activités', ar: 'المشاركون في الأنشطة التربوية والدعم' },
  'admin-message': { fr: 'Message officiel de l’administration', ar: 'بلاغ رسمي وتذكير من الإدارة التربوية' },
  'admin-roster-modal': { fr: 'Gestion de la liste des élèves (Roster)', ar: 'لائحة تلاميذ القسم (الإدارة)' },
  'admin-json-import': { fr: 'Importation administrative JSON de classe', ar: 'استيراد ملف القسم بصيغة JSON' },
  'admin-document-preview': { fr: 'Aperçu administratif de document de devoir', ar: 'معاينة وثيقة الفرض لدى الإدارة' },
  'command-palette': { fr: 'Palette de commandes rapides (Ctrl+K)', ar: 'لوحة الأوامر السريعة (Ctrl+K)' },
  'delete-confirmation': { fr: 'Boîte de dialogue de confirmation', ar: 'تأكيد إجراء الحذف' },
  'event-date': { fr: 'Sélection de date avec calendrier (DayPicker)', ar: 'اختيار وتحديد تاريخ الفرض بالتقويم' },
  'event-date-range': { fr: 'Sélection de période de dates (Plage)', ar: 'تحديد فترة زمنية متعددة الأيام' },
  'pwa-install': { fr: 'Installation de l’application PWA Hors-ligne', ar: 'تثبيت التطبيق للعمل بدون اتصال' },
  'teacher-conversation': { fr: 'Échange pédagogique avec la direction', ar: 'مراسلة وتواصل تربوي مع الإدارة' },
  'edit-manual-assessment': { fr: 'Éditeur de devoir manuel & coefficient', ar: 'محرر الفرض والتقويم اليدوي والمعامل' },
  'evaluation-kind-picker': { fr: 'Sélecteur de la nature de l’évaluation', ar: 'اختيار نوع التقويم أو الفرض' },
  'class-evaluations-direct': { fr: 'Feuille complète des évaluations de classe', ar: 'لوحة قيادة الفروض والمراقبة المستمرة للقسم' },
  'admin-clock': { fr: 'Gestionnaire des créneaux horaires', ar: 'تدبير الفترات الزمنية وجدول الحصص' },
  'admin-calendar': { fr: 'Calendrier scolaire et vacances officielles', ar: 'التقويم السنوي والعطل الرسمية' },
  'admin-bulletin': { fr: 'Bulletin officiel et programmes ministériels', ar: 'المقررات والمذكرات الوزارية الرسمية' },
  'create-catch-up': { fr: 'Création d’une séance de rattrapage', ar: 'إحداث وبرمجة حصة استدراكية' },
  'create-competition': { fr: 'Création d’un concours ou compétition', ar: 'إحداث مسابقة أو منافسة تربوية' },
  'create-diagnostic-assessment': { fr: 'Création d’une évaluation diagnostique', ar: 'إحداث تقويم تشخيصي' },
  'create-global-test': { fr: 'Création d’un contrôle commun / global', ar: 'إحداث فرض مشترك أو موحد' },
  'create-homework-correction': { fr: 'Programmation correction de devoir maison', ar: 'برمجة تصحيح واجب منزلي' },
  'create-mock-exam': { fr: 'Création d’un examen blanc', ar: 'إحداث امتحان تجريبي' },
  'create-notebook-check': { fr: 'Programmation contrôle des cahiers', ar: 'برمجة مراقبة وتفتيش الدفاتر' },
  'create-olympiad': { fr: 'Création d’une épreuve d’olympiades', ar: 'إحداث أولمبياد مدرسية' },
  'create-oral-assessment': { fr: 'Programmation d’une évaluation orale', ar: 'برمجة تقويم شفهي' },
  'create-other-activity': { fr: 'Création d’une activité pédagogique libre', ar: 'إحداث نشاط تربوي تكميلي' },
  'create-remediation': { fr: 'Programmation d’une séance de remédiation', ar: 'برمجة حصة معالجة التعثرات' },
  'create-short-test': { fr: 'Création d’un test court / interrogation', ar: 'إحداث اختبار كتابي قصير' },
  'create-supervised-test': { fr: 'Création d’un devoir surveillé', ar: 'إحداث وبرمجة فرض محروس' },
  'create-support': { fr: 'Programmation d’une séance de soutien', ar: 'برمجة حصة دعم وتثبيت' },
  'create-test-correction': { fr: 'Programmation correction de devoir surveillé', ar: 'برمجة تصحيح فرض محروس' },
};

function buildQueue() {
  const queue = [];
  for (const item of modalTargets) {
    for (const lang of item.langs) {
      for (const device of item.devices) {
        let width = 1280;
        let height = 880;
        let deviceQuery = '';
        if (device === 'phone') {
          width = 390;
          height = 844;
          deviceQuery = '&portrait';
        }

        let url = `${BASE_URL}/scripts/showcase-preview/index.html?lang=${lang}&screen=${item.screen}&page=${item.page}${deviceQuery}`;
        const filename = `${item.label}-${lang}-${device}.png`;
        const outputPath = path.join(OUTPUT_DIR, filename);

        queue.push({
          label: item.label,
          cat: item.cat,
          lang,
          device,
          width,
          height,
          url,
          filename,
          outputPath
        });
      }
    }
  }
  return queue;
}

function captureJob(job, workerIndex) {
  return new Promise((resolve, reject) => {
    const workerProfile = path.join(TEMP_PROFILE_BASE, `worker-${workerIndex}`);
    fs.mkdirSync(workerProfile, { recursive: true });

    const args = [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      `--user-data-dir=${workerProfile}`,
      '--virtual-time-budget=3500',
      `--window-size=${job.width},${job.height}`,
      `--screenshot=${job.outputPath}`,
      job.url
    ];

    const proc = spawn(EDGE_PATH, args, { windowsHide: true });
    let stderr = '';
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('close', code => {
      if (code === 0 && fs.existsSync(job.outputPath)) {
        const stats = fs.statSync(job.outputPath);
        if (stats.size > 3000) {
          resolve(stats.size);
        } else {
          reject(new Error(`Screenshot too small (${stats.size}b) for ${job.filename}`));
        }
      } else {
        reject(new Error(`Process exit code ${code} for ${job.filename}: ${stderr.slice(0, 150)}`));
      }
    });
  });
}

async function runQueue(queue, concurrency = 3) {
  console.log(`Starting headless Edge capture for ${queue.length} modal views (concurrency: ${concurrency})...`);
  const results = [];
  let index = 0;

  async function worker(workerId) {
    while (index < queue.length) {
      const currentIndex = index++;
      const job = queue[currentIndex];
      try {
        const t0 = Date.now();
        const size = await captureJob(job, workerId);
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`[${currentIndex + 1}/${queue.length}] ✓ ${job.filename} (${(size / 1024).toFixed(0)} KB, ${elapsed}s)`);
        results.push({ job, ok: true, size });
      } catch (err) {
        console.warn(`[${currentIndex + 1}/${queue.length}] ✗ ${job.filename}: ${err.message}`);
        results.push({ job, ok: false, error: err.message });
      }
    }
  }

  const workers = Array.from({ length: concurrency }, (_, i) => worker(i + 1));
  await Promise.all(workers);
  return results;
}

// 3. Generate HTML Gallery Viewer & Manifest
function generateGalleryAndManifest() {
  console.log('\nIndexing all images in screeshootmodale and generating HTML viewer & manifest...');
  const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.png')).sort();
  const manifest = [];

  for (const file of files) {
    const fullPath = path.join(OUTPUT_DIR, file);
    const stats = fs.statSync(fullPath);
    const { width, height } = getPngDimensions(fullPath);

    // Parsing naming convention: [label]-[lang]-[device].png
    const match = file.match(/^(.+?)-(ar|fr)(?:-([a-z0-9]+))?\.png$/i);
    let label = file.replace(/\.png$/, '');
    let lang = 'fr';
    let device = 'desktop';

    if (match) {
      label = match[1];
      lang = match[2];
      device = match[3] || 'desktop';
    } else {
      if (file.includes('-ar-') || file.includes('-ar.')) lang = 'ar';
      if (file.includes('-phone')) device = 'phone';
    }

    const meta = MODAL_DESCRIPTIONS[label] || {
      fr: label.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      ar: label.replace(/-/g, ' ')
    };

    manifest.push({
      file,
      label,
      titleFr: meta.fr,
      titleAr: meta.ar,
      lang,
      device,
      width,
      height,
      sizeBytes: stats.size,
      updatedAt: stats.mtime.toISOString()
    });
  }

  // Write manifest.json
  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`Wrote manifest.json with ${manifest.length} modal captures.`);

  // Write index.html
  const cardsHtml = manifest.map(item => {
    const sizeKb = (item.sizeBytes / 1024).toFixed(0);
    const badgeLang = item.lang.toUpperCase();
    const badgeDevice = item.device === 'phone' ? '📱 Mobile' : '💻 Ordinateur';
    const langClass = item.lang === 'ar' ? 'badge-ar' : 'badge-fr';
    const deviceClass = item.device === 'phone' ? 'badge-phone' : 'badge-desktop';

    return `
      <article class="modal-card" 
        data-lang="${item.lang}" 
        data-device="${item.device}" 
        data-search="${item.label.toLowerCase()} ${item.titleFr.toLowerCase()} ${item.titleAr.toLowerCase()} ${item.lang} ${item.device}">
        <div class="thumb-container" onclick="openLightbox('${item.file}', '${escapeHtml(item.titleFr)}', '${escapeHtml(item.titleAr)}', '${badgeLang} · ${badgeDevice} · ${item.width}×${item.height} px · ${sizeKb} Ko')">
          <img loading="lazy" src="${item.file}" alt="${escapeHtml(item.titleFr)}" />
          <div class="thumb-overlay">
            <span class="zoom-btn">🔍 Agrandir / معاينة</span>
          </div>
        </div>
        <div class="card-details">
          <div class="card-badges">
            <span class="badge ${langClass}">${badgeLang}</span>
            <span class="badge ${deviceClass}">${badgeDevice}</span>
            <span class="badge badge-dim">${item.width}×${item.height}</span>
          </div>
          <h3 class="card-title-fr" title="${escapeHtml(item.titleFr)}">${escapeHtml(item.titleFr)}</h3>
          <p class="card-title-ar" dir="rtl" title="${escapeHtml(item.titleAr)}">${escapeHtml(item.titleAr)}</p>
          <div class="card-footer">
            <span class="card-slug">${item.label}</span>
            <span class="card-size">${sizeKb} Ko</span>
          </div>
        </div>
      </article>
    `;
  }).join('\n');

  const html = `<!doctype html>
<html lang="fr" dir="ltr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Galerie des Modales & Fenêtres — Mon cahier de textes</title>
  <style>
    :root {
      --bg: #faf7f2;
      --card-bg: #ffffff;
      --text: #2e2016;
      --text-muted: #6e5a49;
      --border: #e5ddd2;
      --primary: #b35230;
      --primary-hover: #9e472a;
      --primary-light: #fbeee9;
      --radius: 16px;
      --shadow-sm: 0 2px 8px rgba(46, 32, 22, 0.05);
      --shadow-md: 0 8px 24px rgba(46, 32, 22, 0.08);
      --shadow-lg: 0 16px 40px rgba(46, 32, 22, 0.14);
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #1c1a18;
        --card-bg: #272421;
        --text: #ede7df;
        --text-muted: #a39b91;
        --border: #3d3833;
        --primary: #d4633f;
        --primary-hover: #e07452;
        --primary-light: #3a221b;
        --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
        --shadow-md: 0 8px 24px rgba(0, 0, 0, 0.4);
        --shadow-lg: 0 16px 40px rgba(0, 0, 0, 0.6);
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      padding-bottom: 60px;
    }
    header {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(250, 247, 242, 0.94);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      padding: 16px 24px;
    }
    @media (prefers-color-scheme: dark) {
      header { background: rgba(28, 26, 24, 0.94); }
    }
    .header-content {
      max-width: 1540px;
      margin: 0 auto;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-icon {
      width: 44px;
      height: 44px;
      background: var(--primary-light);
      color: var(--primary);
      border-radius: 12px;
      display: grid;
      place-items: center;
      font-size: 22px;
    }
    .brand h1 {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .brand p {
      font-size: 13px;
      color: var(--text-muted);
    }
    .stats-bar {
      display: flex;
      gap: 16px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      padding: 6px 16px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
    }
    .stats-bar strong { color: var(--primary); }
    
    .toolbar-container {
      max-width: 1540px;
      margin: 20px auto;
      padding: 0 24px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .search-row {
      display: flex;
      gap: 12px;
    }
    .search-input {
      flex: 1;
      height: 46px;
      padding: 0 16px 0 44px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: var(--card-bg);
      color: var(--text);
      font-size: 15px;
      outline: none;
      transition: all 0.2s ease;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%236e5a49' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'%3E%3C/circle%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'%3E%3C/line%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: 14px center;
    }
    .search-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-light);
    }
    .filter-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .pill {
      background: var(--card-bg);
      color: var(--text-muted);
      border: 1px solid var(--border);
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      user-select: none;
    }
    .pill:hover {
      background: var(--primary-light);
      color: var(--primary);
      border-color: var(--primary);
    }
    .pill.active {
      background: var(--primary);
      color: #ffffff;
      border-color: var(--primary);
    }

    .gallery-grid {
      max-width: 1540px;
      margin: 0 auto;
      padding: 0 24px;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 22px;
    }

    .modal-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
    }
    .modal-card:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-md);
      border-color: var(--primary);
    }
    .thumb-container {
      position: relative;
      background: #ece7df;
      aspect-ratio: 16 / 10;
      overflow: hidden;
      cursor: pointer;
      display: grid;
      place-items: center;
    }
    @media (prefers-color-scheme: dark) {
      .thumb-container { background: #161413; }
    }
    .thumb-container img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      transition: transform 0.25s ease;
    }
    .modal-card:hover .thumb-container img {
      transform: scale(1.02);
    }
    .thumb-overlay {
      position: absolute;
      inset: 0;
      background: rgba(46, 32, 22, 0.45);
      backdrop-filter: blur(2px);
      opacity: 0;
      display: grid;
      place-items: center;
      transition: opacity 0.2s ease;
    }
    .thumb-container:hover .thumb-overlay {
      opacity: 1;
    }
    .zoom-btn {
      background: #ffffff;
      color: #2e2016;
      padding: 8px 16px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 4px 14px rgba(0,0,0,0.25);
    }
    .card-details {
      padding: 16px;
      display: flex;
      flex-direction: column;
      flex: 1;
      gap: 8px;
    }
    .card-badges {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 2px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-fr { background: #e8f0fe; color: #1a73e8; }
    .badge-ar { background: #e6f4ea; color: #137333; }
    .badge-desktop { background: #f1f3f4; color: #3c4043; }
    .badge-phone { background: #fef7e0; color: #b06000; }
    .badge-dim { background: transparent; color: var(--text-muted); border: 1px solid var(--border); }
    @media (prefers-color-scheme: dark) {
      .badge-fr { background: #172b4d; color: #82b1ff; }
      .badge-ar { background: #0e331e; color: #81c784; }
      .badge-desktop { background: #33302c; color: #d0c8be; }
      .badge-phone { background: #3d2a09; color: #ffb74d; }
    }
    .card-title-fr {
      font-size: 15px;
      font-weight: 700;
      color: var(--text);
      line-height: 1.35;
    }
    .card-title-ar {
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Tahoma, Arial, sans-serif;
      color: var(--text-muted);
      line-height: 1.4;
    }
    .card-footer {
      margin-top: auto;
      padding-top: 10px;
      border-top: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      color: var(--text-muted);
      font-family: monospace;
    }
    .card-slug {
      max-width: 220px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Lightbox Modal */
    .lightbox-overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(0, 0, 0, 0.88);
      backdrop-filter: blur(8px);
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      animation: fadeIn 0.2s ease;
    }
    .lightbox-overlay.open { display: flex; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .lightbox-header {
      width: 100%;
      max-width: 1400px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: #ffffff;
      margin-bottom: 12px;
    }
    .lightbox-titles h2 { font-size: 18px; font-weight: 700; }
    .lightbox-titles p { font-size: 13px; color: #c4b9ad; }
    .lightbox-close {
      background: rgba(255, 255, 255, 0.15);
      border: 0;
      color: #ffffff;
      width: 40px;
      height: 40px;
      border-radius: 999px;
      cursor: pointer;
      font-size: 20px;
      display: grid;
      place-items: center;
      transition: background 0.15s ease;
    }
    .lightbox-close:hover { background: rgba(255, 255, 255, 0.3); }
    .lightbox-img-wrapper {
      max-width: 1400px;
      max-height: 82vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: auto;
    }
    .lightbox-img-wrapper img {
      max-width: 100%;
      max-height: 82vh;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
    }
    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 60px 20px;
      color: var(--text-muted);
    }
  </style>
</head>
<body>

  <header>
    <div class="header-content">
      <div class="brand">
        <div class="brand-icon">🪟</div>
        <div>
          <h1>Galerie des Modales & Fenêtres</h1>
          <p>Mon cahier de textes — Captures d’écran exhaustives et vérifiées</p>
        </div>
      </div>
      <div class="stats-bar">
        <span>Total : <strong>${manifest.length}</strong></span>
        <span>•</span>
        <span>Desktop : <strong>${manifest.filter(i => i.device === 'desktop').length}</strong></span>
        <span>•</span>
        <span>Mobile : <strong>${manifest.filter(i => i.device === 'phone').length}</strong></span>
        <span>•</span>
        <span>FR : <strong>${manifest.filter(i => i.lang === 'fr').length}</strong></span>
        <span>•</span>
        <span>AR : <strong>${manifest.filter(i => i.lang === 'ar').length}</strong></span>
      </div>
    </div>
  </header>

  <div class="toolbar-container">
    <div class="search-row">
      <input type="text" id="searchInput" class="search-input" placeholder="Rechercher une modale par nom, libellé en français, en arabe..." oninput="applyFilters()" />
    </div>
    <div class="filter-pills">
      <button class="pill active" data-filter="all" onclick="setDeviceFilter('all', this)">Tous les appareils</button>
      <button class="pill" data-filter="desktop" onclick="setDeviceFilter('desktop', this)">💻 Ordinateur</button>
      <button class="pill" data-filter="phone" onclick="setDeviceFilter('phone', this)">📱 Mobile</button>
      <span style="border-left: 1px solid var(--border); margin: 0 4px;"></span>
      <button class="pill active" data-lang-filter="all" onclick="setLangFilter('all', this)">Toutes les langues</button>
      <button class="pill" data-lang-filter="fr" onclick="setLangFilter('fr', this)">🇫🇷 Français</button>
      <button class="pill" data-lang-filter="ar" onclick="setLangFilter('ar', this)">🇲🇦 العربية</button>
    </div>
  </div>

  <main class="gallery-grid" id="galleryGrid">
    ${cardsHtml}
  </main>

  <div class="lightbox-overlay" id="lightboxOverlay" onclick="closeLightbox(event)">
    <div class="lightbox-header">
      <div class="lightbox-titles">
        <h2 id="lightboxTitle"></h2>
        <p id="lightboxSubtitle"></p>
      </div>
      <button class="lightbox-close" onclick="closeLightbox(event)">✕</button>
    </div>
    <div class="lightbox-img-wrapper">
      <img id="lightboxImg" src="" alt="Capture zoomée" />
    </div>
  </div>

  <script>
    let activeDevice = 'all';
    let activeLang = 'all';

    function setDeviceFilter(device, el) {
      activeDevice = device;
      document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
      el.classList.add('active');
      applyFilters();
    }

    function setLangFilter(lang, el) {
      activeLang = lang;
      document.querySelectorAll('[data-lang-filter]').forEach(b => b.classList.remove('active'));
      el.classList.add('active');
      applyFilters();
    }

    function applyFilters() {
      const q = document.getElementById('searchInput').value.trim().toLowerCase();
      const cards = document.querySelectorAll('.modal-card');
      let visibleCount = 0;

      cards.forEach(card => {
        const device = card.dataset.device;
        const lang = card.dataset.lang;
        const search = card.dataset.search;

        const matchDevice = (activeDevice === 'all' || device === activeDevice);
        const matchLang = (activeLang === 'all' || lang === activeLang);
        const matchSearch = (!q || search.includes(q));

        if (matchDevice && matchLang && matchSearch) {
          card.style.display = 'flex';
          visibleCount++;
        } else {
          card.style.display = 'none';
        }
      });
    }

    function openLightbox(src, titleFr, titleAr, meta) {
      document.getElementById('lightboxImg').src = src;
      document.getElementById('lightboxTitle').textContent = titleFr + ' · ' + titleAr;
      document.getElementById('lightboxSubtitle').textContent = meta;
      document.getElementById('lightboxOverlay').classList.add('open');
    }

    function closeLightbox(e) {
      if (e.target.id === 'lightboxOverlay' || e.target.classList.contains('lightbox-close')) {
        document.getElementById('lightboxOverlay').classList.remove('open');
      }
    }

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        document.getElementById('lightboxOverlay').classList.remove('open');
      }
    });
  </script>
</body>
</html>`;

  const htmlPath = path.join(OUTPUT_DIR, 'index.html');
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log(`Generated index.html viewer at ${htmlPath}`);

  // Write README.md
  const readme = `# Galerie Exhaustive des Modales — Mon cahier de textes

Ce dossier \`screeshootmodale\` rassemble l’intégralité des captures d’écran des modales, fenêtres de dialogue et panneaux interactifs de l'application.

## Sommaire
- **Total de captures :** ${manifest.length} images PNG non compressées
- **Formats supportés :**
  - **Ordinateur (Desktop) :** 1280 × 880 px
  - **Mobile (Phone) :** 390 × 844 px
- **Bilinguisme :** Chaque modale est capturée en français (LTR) et en arabe (RTL).
- **Index interactif :** Ouvrez \`index.html\` pour filtrer par appareil, par langue ou rechercher instantanément une modale.
- **Manifeste JSON :** L'inventaire complet avec dimensions et métadonnées est accessible dans \`manifest.json\`.

## Liste des modales capturées
${Array.from(new Set(manifest.map(m => m.label))).sort().map(l => {
  const d = MODAL_DESCRIPTIONS[l];
  return `- **\`${l}\`** : ${d ? d.fr + ' (' + d.ar + ')' : l}`;
}).join('\n')}
`;
  fs.writeFileSync(path.join(OUTPUT_DIR, 'README.md'), readme, 'utf8');
  console.log(`Generated README.md at ${path.join(OUTPUT_DIR, 'README.md')}`);
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function main() {
  const queue = buildQueue();
  console.log(`Total modal targets queued for fresh headless Edge capture: ${queue.length}`);
  await runQueue(queue, 3);
  generateGalleryAndManifest();
  console.log(`\nAll done! You can open "screeshootmodale/index.html" to explore all captured modals.`);
}

main().catch(console.error);
