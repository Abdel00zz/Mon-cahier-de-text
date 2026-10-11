import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ATLAS_DIR = path.join(ROOT, 'screenshoot v2');

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

export function buildIndex() {
  const categories = ['pages', 'modales', 'fonctions', 'admin'];
  const items = [];

  for (const cat of categories) {
    const catDir = path.join(ATLAS_DIR, cat);
    if (!fs.existsSync(catDir)) continue;

    const files = fs.readdirSync(catDir).filter(f => f.endsWith('.png')).sort();
    for (const file of files) {
      const fullPath = path.join(catDir, file);
      const stats = fs.statSync(fullPath);
      const { width, height } = getPngDimensions(fullPath);

      // Parse naming convention: [label]-[lang]-[device].png
      // or [label]-[extra]-[lang]-[device].png
      const match = file.match(/^(.+?)-(ar|fr)(?:-([a-z0-9]+))?\.png$/i);
      let label = file.replace(/\.png$/, '');
      let lang = 'ar';
      let device = 'desktop';

      if (match) {
        label = match[1];
        lang = match[2];
        device = match[3] || 'desktop';
      } else {
        // Fallback checks
        if (file.includes('-fr-')) lang = 'fr';
        if (file.includes('-phone')) device = 'phone';
        else if (file.includes('-tablet')) device = 'tablet';
      }

      items.push({
        file: `${cat}/${file}`,
        category: cat,
        label,
        lang,
        device,
        width,
        height,
        sizeBytes: stats.size,
        updatedAt: stats.mtime.toISOString()
      });
    }
  }

  // Write index.json
  const jsonPath = path.join(ATLAS_DIR, 'index.json');
  fs.writeFileSync(jsonPath, JSON.stringify(items, null, 2), 'utf8');
  console.log(`Wrote index.json with ${items.length} captures.`);

  // Generate HTML
  const cardsHtml = items.map(item => {
    const safeTitle = item.label.replace(/-/g, ' ');
    const sizeKb = (item.sizeBytes / 1024).toFixed(0);
    const badgeLang = item.lang.toUpperCase();
    const badgeDevice = item.device === 'phone' ? '📱 Mobile' : item.device === 'tablet' ? '📟 Tablette' : '💻 Ordinateur';
    const badgeCat = item.category === 'pages' ? '📄 Page' : item.category === 'modales' ? '🪟 Modale' : item.category === 'fonctions' ? '⚙️ Fonction' : '🛡️ Admin';

    return `
      <article class="capture-card" 
        data-cat="${item.category}" 
        data-lang="${item.lang}" 
        data-device="${item.device}" 
        data-search="${safeTitle.toLowerCase()} ${item.category} ${item.lang} ${item.device}">
        <div class="thumb-wrapper" onclick="openLightbox('${item.file}', '${safeTitle}', '${badgeCat} · ${badgeLang} · ${badgeDevice} · ${item.width}×${item.height} px · ${sizeKb} Ko')">
          <img loading="lazy" src="${item.file}" alt="${safeTitle}" />
          <div class="thumb-overlay"><span>Agrandir</span></div>
        </div>
        <div class="card-info">
          <div class="card-badges">
            <span class="badge badge-cat">${badgeCat}</span>
            <span class="badge badge-lang">${badgeLang}</span>
            <span class="badge badge-device">${badgeDevice}</span>
          </div>
          <h2 title="${safeTitle}">${safeTitle}</h2>
          <div class="card-meta">
            <span>${item.width}×${item.height} px</span>
            <span>${sizeKb} Ko</span>
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
  <title>Screenshots V2 — Mon cahier de textes</title>
  <style>
    :root {
      --bg: #f7f5f0;
      --card-bg: #ffffff;
      --text: #2c2724;
      --text-muted: #746c64;
      --border: #e2ddd5;
      --primary: #9e472a;
      --primary-light: #fbeee9;
      --radius: 14px;
      --shadow: 0 4px 16px -2px rgba(44, 39, 36, 0.06), 0 2px 6px -1px rgba(44, 39, 36, 0.04);
      --shadow-hover: 0 12px 28px -4px rgba(44, 39, 36, 0.12), 0 4px 10px -2px rgba(44, 39, 36, 0.06);
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #1c1a18;
        --card-bg: #272421;
        --text: #ede7df;
        --text-muted: #a39b91;
        --border: #3d3833;
        --primary: #d4633f;
        --primary-light: #3a221b;
        --shadow: 0 4px 16px -2px rgba(0, 0, 0, 0.3);
        --shadow-hover: 0 12px 28px -4px rgba(0, 0, 0, 0.45);
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    header {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(247, 245, 240, 0.92);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border);
      padding: 16px 24px;
    }
    @media (prefers-color-scheme: dark) {
      header { background: rgba(28, 26, 24, 0.92); }
    }
    .header-content {
      max-width: 1440px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    h1 .badge-count {
      font-size: 13px;
      font-weight: 600;
      padding: 3px 10px;
      background: var(--primary-light);
      color: var(--primary);
      border-radius: 9999px;
    }
    .search-input {
      width: 100%;
      padding: 12px 18px;
      font-size: 15px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--card-bg);
      color: var(--text);
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .search-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(158, 71, 42, 0.15);
    }
    .filters-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .filter-group {
      display: inline-flex;
      background: rgba(0,0,0,0.04);
      padding: 3px;
      border-radius: 10px;
      border: 1px solid var(--border);
    }
    @media (prefers-color-scheme: dark) {
      .filter-group { background: rgba(255,255,255,0.04); }
    }
    .filter-btn {
      border: none;
      background: transparent;
      color: var(--text-muted);
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }
    .filter-btn:hover { color: var(--text); }
    .filter-btn.active {
      background: var(--card-bg);
      color: var(--text);
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      font-weight: 600;
    }
    main {
      max-width: 1440px;
      margin: 0 auto;
      padding: 24px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }
    .capture-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      box-shadow: var(--shadow);
      display: flex;
      flex-direction: column;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s;
    }
    .capture-card:hover {
      transform: translateY(-3px);
      box-shadow: var(--shadow-hover);
    }
    .thumb-wrapper {
      position: relative;
      height: 220px;
      background: #e9e5de;
      cursor: pointer;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    @media (prefers-color-scheme: dark) {
      .thumb-wrapper { background: #181614; }
    }
    .thumb-wrapper img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
      transition: transform 0.25s ease;
    }
    .thumb-wrapper:hover img {
      transform: scale(1.03);
    }
    .thumb-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.15s ease;
    }
    .thumb-wrapper:hover .thumb-overlay {
      opacity: 1;
    }
    .thumb-overlay span {
      background: #ffffff;
      color: #1a1816;
      font-size: 13px;
      font-weight: 600;
      padding: 6px 16px;
      border-radius: 9999px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    .card-info {
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
    }
    .card-badges {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 6px;
      background: rgba(0,0,0,0.05);
      color: var(--text-muted);
    }
    @media (prefers-color-scheme: dark) {
      .badge { background: rgba(255,255,255,0.08); }
    }
    .badge-cat {
      background: var(--primary-light);
      color: var(--primary);
    }
    .badge-lang {
      background: #e6f0fa;
      color: #1a56db;
    }
    @media (prefers-color-scheme: dark) {
      .badge-lang { background: #192a4a; color: #76a9fa; }
    }
    .card-info h2 {
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .card-meta {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: var(--text-muted);
      margin-top: auto;
    }
    .lightbox {
      position: fixed;
      inset: 0;
      z-index: 100;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      display: none;
      align-items: center;
      justify-content: center;
      padding: 24px;
      cursor: zoom-out;
    }
    .lightbox.active { display: flex; }
    .lightbox-content {
      max-width: 95vw;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      cursor: default;
    }
    .lightbox-content img {
      max-width: 100%;
      max-height: 82vh;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
      background: #fff;
    }
    .lightbox-caption {
      color: #fff;
      font-size: 14px;
      text-align: center;
      max-width: 800px;
    }
    .lightbox-close {
      position: absolute;
      top: 20px;
      right: 24px;
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: #fff;
      font-size: 24px;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
    }
    .lightbox-close:hover { background: rgba(255, 255, 255, 0.4); }
    [hidden] { display: none !important; }
  </style>
</head>
<body>
  <header>
    <div class="header-content">
      <div class="title-row">
        <h1>
          <span>Mon cahier de textes — Screenshots V2</span>
          <span class="badge-count" id="count-badge">${items.length} captures</span>
        </h1>
      </div>
      <input type="search" class="search-input" id="search-input" placeholder="Rechercher une capture : remark, classe, examen, mobile, ar, admin..." />
      <div class="filters-bar">
        <div class="filter-group" id="cat-filters">
          <button class="filter-btn active" data-filter="all">Toutes</button>
          <button class="filter-btn" data-filter="pages">Pages</button>
          <button class="filter-btn" data-filter="modales">Modales</button>
          <button class="filter-btn" data-filter="fonctions">Fonctions</button>
          <button class="filter-btn" data-filter="admin">Admin</button>
        </div>
        <div class="filter-group" id="lang-filters">
          <button class="filter-btn active" data-lang="all">Toutes langues</button>
          <button class="filter-btn" data-lang="ar">Arabe (AR)</button>
          <button class="filter-btn" data-lang="fr">Français (FR)</button>
        </div>
        <div class="filter-group" id="device-filters">
          <button class="filter-btn active" data-device="all">Tous appareils</button>
          <button class="filter-btn" data-device="desktop">💻 Desktop</button>
          <button class="filter-btn" data-device="phone">📱 Mobile</button>
          <button class="filter-btn" data-device="tablet">📟 Tablette</button>
        </div>
      </div>
    </div>
  </header>

  <main>
    <section class="grid" id="cards-grid">
      ${cardsHtml}
    </section>
  </main>

  <div class="lightbox" id="lightbox" onclick="closeLightbox(event)">
    <button class="lightbox-close" onclick="closeLightbox(event)">×</button>
    <div class="lightbox-content">
      <img id="lightbox-img" src="" alt="" />
      <div class="lightbox-caption" id="lightbox-caption"></div>
    </div>
  </div>

  <script>
    let activeCat = 'all';
    let activeLang = 'all';
    let activeDevice = 'all';
    let searchQuery = '';

    const cards = Array.from(document.querySelectorAll('.capture-card'));
    const countBadge = document.getElementById('count-badge');
    const searchInput = document.getElementById('search-input');

    function applyFilters() {
      let visible = 0;
      cards.forEach(card => {
        const matchesCat = (activeCat === 'all' || card.dataset.cat === activeCat);
        const matchesLang = (activeLang === 'all' || card.dataset.lang === activeLang);
        const matchesDevice = (activeDevice === 'all' || card.dataset.device === activeDevice);
        const matchesSearch = (!searchQuery || card.dataset.search.includes(searchQuery));

        const show = matchesCat && matchesLang && matchesDevice && matchesSearch;
        card.hidden = !show;
        if (show) visible++;
      });
      countBadge.textContent = visible + ' captures';
    }

    searchInput.addEventListener('input', e => {
      searchQuery = e.target.value.trim().toLowerCase();
      applyFilters();
    });

    function setupFilterButtons(groupId, callback) {
      const container = document.getElementById(groupId);
      container.addEventListener('click', e => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        callback(btn);
        applyFilters();
      });
    }

    setupFilterButtons('cat-filters', btn => { activeCat = btn.dataset.filter; });
    setupFilterButtons('lang-filters', btn => { activeLang = btn.dataset.lang; });
    setupFilterButtons('device-filters', btn => { activeDevice = btn.dataset.device; });

    // Lightbox
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');

    window.openLightbox = function(src, title, meta) {
      lightboxImg.src = src;
      lightboxCaption.innerHTML = '<strong>' + title + '</strong><br><small>' + meta + '</small>';
      lightbox.classList.add('active');
    };

    window.closeLightbox = function(e) {
      if (e.target === lightbox || e.target.classList.contains('lightbox-close')) {
        lightbox.classList.remove('active');
      }
    };

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') lightbox.classList.remove('active');
    });
  </script>
</body>
</html>`;

  const htmlPath = path.join(ATLAS_DIR, 'index.html');
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log(`Wrote index.html.`);

  // Write README.md
  const readme = `# Galerie UI — Mon cahier de textes (V2)

${items.length} captures d'écran vérifiées en haute résolution, avec un index interactif consultable dans **index.html** et un inventaire complet dans **index.json**.

## Répartition des captures

- **pages/** (${items.filter(x => x.category === 'pages').length} captures) :
  - Accueil (Landing page), authentification, inscription, intégration (onboarding complet).
  - Tableau de bord des classes (grille responsive, vue 1 ou 2 colonnes, thèmes clair et sombre).
  - Cahier de texte interactif (barre d'outils, formules mathématiques LaTeX/KaTeX, séances fusionnées, remarques et activités synchronisées).
  - Emploi du temps interactif, suivi des devoirs et contrôles, pilotage et alertes pédagogiques, aperçu d'impression.

- **modales/** (${items.filter(x => x.category === 'modales').length} captures) :
  - **Nouvelle modale Remarque de séance** avec *Action Dock* réactif et intégration des activités pédagogiques (*Devoir maison donné*, *Contrôle des cahiers*, *Remédiation*, *Soutien*, *Rattrapage*).
  - **Attribution et vérification de dates** (design neutre monochrome, en-tête resserré).
  - Création et modification de classe, ajout et édition de leçons.
  - Sauvegarde et transfert de données, analyse de progression, options d'impression.
  - Suivi des cahiers élèves (*Notebook review*), suivi de l'oral, absents aux devoirs, participants aux activités.
  - Palette de commandes (*Ctrl+K*), message de la direction, avertissements créneaux horaires.

- **fonctions/** (${items.filter(x => x.category === 'fonctions').length} captures) :
  - Tous les onglets des paramètres (*Profil*, *Horaires*, *Notifications*, *Certificats médicaux*, *Données*, *Apparence*).
  - Parcours d'onboarding par étape (*Cycles*, *Matières*, *Classes*, *Horaires*).
  - Les 19 chapitres du guide enseignant interactif.
  - Menus d'actions contextuels et sélecteurs de devoirs.

- **admin/** (${items.filter(x => x.category === 'admin').length} captures) :
  - Tableau de bord administrateur et fiche détaillée des professeurs.
  - Pilotage du calendrier scolaire et des vacances officielles.
  - Gestion du bulletin officiel et des créneaux horaires.
  - Import et publication des listes d'élèves (*Rosters*).

## Spécifications techniques
- **Format** : PNG non compressé sans artefact.
- **Résolutions** :
  - Bureau (*Desktop*) : 1280×880 px (ou taille native du composant).
  - Tablette (*Tablet*) : 820×1180 px.
  - Mobile (*Phone*) : 390×844 px.
- **Bilinguisme** : Captures complètes en arabe (RTL) et en français (LTR).
- **Navigation** : Ouvrir **index.html** dans un navigateur pour effectuer une recherche instantanée ou filtrer par catégorie, langue et appareil.
`;

  fs.writeFileSync(path.join(ATLAS_DIR, 'README.md'), readme, 'utf8');
  console.log(`Wrote README.md.`);
}

if (process.argv[1] && process.argv[1].endsWith('build-screenshoot-v2-index.mjs')) {
  buildIndex();
}
