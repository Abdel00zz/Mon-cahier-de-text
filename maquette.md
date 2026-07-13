# Maquette HTML statique — Cahier de textes interactif

Ce document est le cahier de reconstruction visuelle de l’application. Il permet de recréer tous les écrans, états importants et modales avec du HTML/CSS simple, sans authentification réelle, sans synchronisation, sans base de données et sans logique pédagogique. La maquette sert aux revues visuelles, aux tests responsive et à la transmission du design.

## 1. Périmètre

Une version directement ouvrable est fournie dans [`maquette/maquette.html`](maquette/maquette.html), avec ses styles et son JavaScript dans le même dossier. Elle est volontairement statique : elle sert à valider la hiérarchie, les états mobiles et les enchaînements de modales avant de toucher aux données réelles.

La maquette doit représenter :

- la connexion enseignant ;
- l’accueil « Mes classes » ;
- la recherche ouverte et ses résultats ;
- un cahier de classe avec son tableau ;
- la vue d’impression ;
- les paramètres ;
- les évaluations liées à une classe ;
- le guide en français et en arabe ;
- tous les dialogues, panneaux et états vides ;
- les écrans d’administration.

Les boutons peuvent être de simples liens `href="#..."`. Les fenêtres peuvent être affichées directement avec `<dialog open>` ou en retirant manuellement l’attribut `hidden`. Aucun JavaScript métier n’est nécessaire.

## 2. Arborescence conseillée

```text
maquette/
├── maquette.html              # Parcours statique complet, dashboard + cahier
├── styles.css                 # Tokens, composants, modales et responsive
└── script.js                  # Interactions de démonstration sans données réelles
```

## 3. Identité visuelle

### Typographies

- **Interface et textes** : Fira Sans, puis Arial, sans-serif.
- **Titres importants** : Roboto Slab, puis Georgia, serif.
- **Libellés compacts et tableaux** : Fira Sans Condensed.
- **Arabe** : IBM Plex Sans Arabic, avec `direction: rtl`.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fira+Sans+Condensed:wght@500;600;700&family=Fira+Sans:wght@400;500;600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Roboto+Slab:wght@600;700;800&display=swap" rel="stylesheet">
```

### Variables CSS

```css
:root {
  --page: #fbfcff;
  --surface: #ffffff;
  --surface-soft: #f5f8fc;
  --ink: #17203a;
  --muted: #63708a;
  --line: #d9e1ec;
  --line-strong: #c4cfdd;
  --blue: #1d9bf0;
  --blue-deep: #0b72c9;
  --blue-soft: #eaf6ff;
  --green: #00b87a;
  --amber: #f59e0b;
  --red: #ed3e55;
  --paper: #fff8dc;
  --paper-strong: #f8edc5;
  --radius: 12px;
  --shadow: 0 8px 24px rgb(33 54 91 / 8%);
  --font-ui: "Fira Sans", Arial, sans-serif;
  --font-display: "Roboto Slab", Georgia, serif;
  --font-compact: "Fira Sans Condensed", Arial, sans-serif;
  --font-ar: "IBM Plex Sans Arabic", Arial, sans-serif;
}

* { box-sizing: border-box; }
html { color-scheme: light; }
body {
  margin: 0;
  min-width: 320px;
  background: var(--page);
  color: var(--ink);
  font-family: var(--font-ui);
}
button, input, select, textarea { font: inherit; }
button, a { -webkit-tap-highlight-color: transparent; }
.container { width: min(100% - 32px, 1540px); margin-inline: auto; }
.display { font-family: var(--font-display); }
.compact { font-family: var(--font-compact); }
.arabic { direction: rtl; text-align: right; font-family: var(--font-ar); }
```

### Règles générales

- Pas de barre latérale.
- Le bleu est réservé à l’action, à la sélection et à la progression.
- Les cartes ont un contour complet, visible sur les quatre côtés.
- Rayon modéré : 10 à 14 px, jamais excessivement arrondi.
- Cible tactile minimale : 44 × 44 px.
- Icônes SVG ou Font Awesome ; une icône doit toujours avoir un libellé accessible.
- Les alertes de non-conformité importantes sont des dialogues, pas des toasts temporaires.
- Les modales n’utilisent pas de bouton « X » : elles finissent par **Fermer**, **Annuler**, **Appliquer** ou une action précise.

## 4. Carte des écrans

| Fichier statique | Écran | Contenu obligatoire |
|---|---|---|
| `connexion.html` | Connexion | Logo, téléphone/identifiant, mot de passe ou code, action principale, aide |
| `index.html` | Mes classes | Salutation, date, Guide, Paramètres, recherche extensible, briefing, titre et nombre de classes, cartes, création |
| `classe.html` | Cahier | Identité classe/professeur/lycée, synchronisation, barre d’outils, tableau date/contenu/remarque, actions flottantes |
| `impression.html` | Impression | En-tête académique, informations classe, tableau nettoyé, pied de page |
| `parametres.html` | Paramètres | Profil, emploi du temps, notifications, données, compte |
| `admin.html` | Administration | Connexion, liste enseignants, détail, vacances, bulletin officiel JSON |
| `modales.html` | Catalogue | Toutes les modales en état ouvert, version téléphone et ordinateur |

## 5. Accueil « Mes classes »

### Hiérarchie

1. Salutation et date à gauche.
2. Rangée d’actions à droite : Guide, Paramètres, recherche.
3. La recherche est d’abord un bouton bleu de 44 px. Ouverte, elle s’élargit dans la même rangée et repousse les actions sans chevauchement.
4. Briefing du jour : quatre informations maximum.
5. Titre **Mes classes** suivi immédiatement du badge **4 classes**, sans sous-titre et sans soulignement.
6. Grille de cartes.

```html
<header class="home-header container">
  <div>
    <h1 class="display">Bonsoir, <span class="accent">Prof Dev</span></h1>
    <p>lundi 13 juillet 2026 · Vos cahiers de classes, prêts à ouvrir.</p>
  </div>
  <nav class="header-actions" aria-label="Actions principales">
    <a class="button" href="modales.html#guide">Guide</a>
    <a class="button" href="parametres.html">Paramètres</a>
    <form class="search search--open" role="search">
      <input aria-label="Rechercher" placeholder="Classe, chapitre, contenu, remarque…">
      <button class="icon-button icon-button--blue" aria-label="Lancer la recherche">⌕</button>
    </form>
  </nav>
</header>

<main class="container">
  <section class="briefing" aria-label="Situation du jour">
    <div><strong>Vacances d’été 2026 en cours</strong><span>Reprise lundi 7 septembre</span></div>
    <dl class="briefing-stats">
      <div><dt>Progression</dt><dd>1%</dd></div>
      <div><dt>Séances</dt><dd>3</dd></div>
      <div><dt>À traiter</dt><dd>0</dd></div>
    </dl>
  </section>

  <div class="section-heading">
    <h2 class="display">Mes classes</h2>
    <span class="count">4 classes</span>
  </div>

  <section class="class-grid" aria-label="Liste des classes">
    <article class="class-card">
      <span class="subject">Mathématiques</span>
      <div class="class-card__main">
        <span class="class-icon" aria-hidden="true">◆</span>
        <h3>2e année collégiale · Gr. 3</h3>
      </div>
      <footer class="class-card__footer">
        <span><small>Prochaine séance</small><strong>Année scolaire terminée</strong></span>
        <span><small>Mise à jour</small><time>13 juil.</time></span>
      </footer>
    </article>

    <a class="class-card class-card--new" href="#creation-classe">
      <span aria-hidden="true">＋</span><strong>Nouveau cahier</strong><small>Créer un cahier de textes</small>
    </a>
  </section>
</main>
```

### Dimensions de l’accueil

```css
.home-header { display: flex; justify-content: space-between; gap: 24px; padding-block: 20px 30px; }
.home-header h1 { margin: 0; font-size: clamp(28px, 3vw, 42px); }
.home-header p { margin: 6px 0 0; color: var(--muted); }
.accent { color: var(--blue); }
.header-actions { display: flex; align-items: flex-start; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
.button, .icon-button { min-height: 44px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); }
.button { display: inline-flex; align-items: center; padding: 0 16px; border-radius: 10px; text-decoration: none; font-weight: 700; }
.icon-button { width: 44px; border-radius: 10px; }
.icon-button--blue { border-color: var(--blue); background: var(--blue); color: white; }
.search { display: flex; width: 44px; transition: width .24s ease; }
.search--open { width: min(340px, 42vw); }
.search input { min-width: 0; flex: 1; border: 1px solid var(--line); border-right: 0; border-radius: 10px 0 0 10px; padding: 0 14px; }
.search .icon-button { border-radius: 0 10px 10px 0; }
.section-heading { display: flex; align-items: center; gap: 12px; margin: 28px 0 18px; }
.section-heading h2 { margin: 0; font-size: clamp(28px, 3vw, 32px); line-height: 1; }
.count { border: 1px solid var(--line); border-radius: 999px; padding: 5px 10px; color: var(--muted); font: 700 12px var(--font-compact); }
.class-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
.class-card { position: relative; min-height: 238px; overflow: hidden; border: 1.5px solid var(--line-strong); border-radius: var(--radius); background: var(--surface); color: inherit; text-decoration: none; box-shadow: 0 2px 5px rgb(33 54 91 / 5%); }
.subject { position: absolute; top: 12px; left: 12px; border: 1px solid var(--line); border-radius: 6px; background: var(--surface-soft); padding: 4px 8px; color: var(--muted); font: 700 10px var(--font-compact); text-transform: uppercase; letter-spacing: .06em; }
.class-card__main { display: grid; min-height: 174px; place-items: center; align-content: center; gap: 14px; padding: 44px 20px 20px; text-align: center; }
.class-card__main h3 { margin: 0; font-family: var(--font-display); font-size: 17px; }
.class-icon { display: grid; width: 58px; height: 58px; place-items: center; border: 1px solid #b8dcff; border-radius: 14px; background: var(--blue-soft); color: var(--blue); font-size: 24px; }
.class-card__footer { display: flex; justify-content: space-between; gap: 16px; border-top: 1.5px solid var(--line); background: var(--surface-soft); padding: 13px 16px; }
.class-card__footer span { display: grid; gap: 3px; }
.class-card__footer span:last-child { text-align: right; }
.class-card__footer small { color: #8b99b2; font: 700 10px var(--font-compact); text-transform: uppercase; letter-spacing: .06em; }
.class-card__footer strong { color: var(--blue-deep); font-size: 12px; }
```

## 6. Cahier de classe

### En-tête

- Retour à gauche.
- Nom complet de la classe en grand, non centré artificiellement.
- Nom du professeur puis établissement sous le nom de classe.
- Mot **Synchronisation** à gauche de la barre d’actions, sans badge ; un petit point animé peut signaler une opération, mais aucun point décoratif permanent.
- Menu `…` : Importer, Exporter, Historique, Évaluations de la classe, Gérer les contenus.

### Tableau

Colonnes : Date, Contenu pédagogique, Remarque. Les titres ne sont ni soulignés ni décorés par une ligne individuelle. Le contour externe du tableau est complet et plus marqué que les séparateurs internes.

Types de lignes à maqueter :

- chapitre : rouge élégant, icône livre à gauche, jamais souligné ;
- contenu normal ;
- contenu affecté à une date : fond chaud distinct ;
- devoir ;
- note/remarque ;
- séparation pédagogique ;
- ligne sélectionnée ;
- ligne sans date ;
- expression LaTeX rendue visuellement.

```html
<header class="class-header container">
  <a href="index.html" aria-label="Retour">←</a>
  <div class="class-identity">
    <h1 class="display">2e année collégiale · Gr. 3</h1>
    <p>Prof Dev · Lycée/Collège exemple</p>
  </div>
  <span class="sync"><i></i> Synchronisation</span>
</header>

<div class="toolbar container">
  <span>Affectation de date(s) · il y a 1 min</span>
  <div><button>Annuler</button><button>Rétablir</button><button>Enregistrer</button><button>Rechercher</button><button>…</button></div>
</div>

<main class="container table-shell">
  <table>
    <thead><tr><th>Date</th><th>Contenu pédagogique</th><th>Remarque</th></tr></thead>
    <tbody>
      <tr class="chapter"><td></td><td><span aria-hidden="true">▣</span> Chapitre 1 : Les nombres rationnels</td><td></td></tr>
      <tr class="assigned"><td><strong>13</strong><small>JUIL. 26</small></td><td>Somme et différence de deux nombres rationnels</td><td>Exercices 1 à 4</td></tr>
      <tr><td></td><td>Calcul littéral : \(a(b+c)=ab+ac\)</td><td></td></tr>
    </tbody>
  </table>
</main>
```

Sur téléphone, le tableau peut dépasser horizontalement dans une zone scrollable. L’identité, la synchronisation et les actions se réorganisent sur deux lignes. Les boutons secondaires deviennent des icônes avec `aria-label`.

## 7. Paramètres

La page possède cinq onglets :

1. **Profil** — établissement, enseignant, cycle Collège/Lycée/Prépa.
2. **Emploi du temps** — créneaux par classe, volume horaire, préférences de devoirs.
3. **Notifications** — navigateur/téléphone, retard, absence, rappels.
4. **Données** — sauvegarde, restauration, import de plateforme.
5. **Compte** — profil enseignant et synchronisation.

Sur ordinateur, les onglets forment une colonne courte à gauche du contenu. Sur téléphone, ils deviennent une rangée horizontale scrollable au-dessus du formulaire. Le pied reste limité à **Annuler** et **Enregistrer**.

## 8. Évaluations liées à la classe

Ce panneau part toujours de la classe active. En-tête : nom complet de la classe, bouton **Fermer**. Onglets :

- **Mes évaluations** — diagnostique, soutien, devoir surveillé, examen blanc, rattrapage, olympiade ;
- **Parcours officiel** — échéances du bulletin selon cycle et niveau ;
- **Concours** — événements applicables au niveau.

Prévoir les sous-panneaux statiques **Ajouter/modifier une activité** et **Absences**. Les dates utilisent le format local français `jj/mm/aaaa` dans les champs, et une forme lisible comme « lundi 5 octobre » dans les cartes.

## 9. Guide d’utilisation

Le guide utilise une surface jaune papier `--paper`, sans boîtes excessives. Le sommaire arabe est à droite. Les mots importants sont en gras et le texte est plus grand que le texte d’interface.

```css
.guide {
  background-color: var(--paper);
  background-image:
    radial-gradient(circle at 14% 10%, rgb(177 137 52 / 5.5%), transparent 28%),
    radial-gradient(circle at 88% 82%, rgb(120 95 38 / 3.5%), transparent 32%);
  box-shadow: inset 0 0 56px rgb(150 112 34 / 3.5%);
}
.guide__layout { display: grid; grid-template-columns: 230px minmax(0, 1fr); }
.guide[dir="rtl"] .guide__layout { grid-template-columns: minmax(0, 1fr) 230px; }
.guide[dir="rtl"] .guide__toc { grid-column: 2; }
.guide__article { max-width: 760px; padding: 32px; font-size: 17px; line-height: 1.9; }
.guide__article strong { color: #151b2d; }
.guide figure { margin: 22px 0; border: 1px solid #e8d48c; background: #fffdf2; padding: 10px; }
.guide img { width: 100%; height: auto; display: block; }
```

Prévoir au moins six figures ou GIF : accueil, création de cahier, recherche, affectation de date, emploi du temps, export/import. Le pied contient un bouton explicite **Fermer**. Aucun « X ».

## 10. Modales et panneaux à reproduire

| Identifiant | Titre visible | Contenu essentiel | Action de sortie |
|---|---|---|---|
| `creation-classe` | Nouveau cahier | Cycle, niveau, groupe, matière, couleur | Annuler / Créer |
| `bienvenue` | Bienvenue | Configuration guidée, profil, emploi du temps, notifications | Plus tard / Continuer |
| `guide` | Guide d’utilisation | Langue FR/AR, sommaire, articles et figures | Fermer |
| `recherche` | Résultats de recherche | Requête, résultats groupés par classe, aucun résultat | Fermer |
| `transfert` | Importer ou exporter | Import en premier, fichier JSON/GIF autorisé pour illustrations si concerné, export en second | Fermer |
| `contenus` | Gérer chapitres & devoirs | Liste, ordre, ajout, modification | Fermer / Appliquer |
| `date` | Planification & affectation | Élément choisi, date, classe, plage | Annuler / Affecter |
| `verification-date` | Vérification de la date | Date choisie et anomalies lisibles | Modifier la date / J’ai compris, enregistrer |
| `description` | Description | Texte pédagogique court | Annuler / Enregistrer |
| `ajout-contenu` | Ajouter un contenu | Type, texte, LaTeX, remarque | Annuler / Ajouter |
| `modification-contenu` | Modifier le contenu | Même formulaire prérempli | Annuler / Enregistrer |
| `analyse` | Analyse pédagogique | Progression, cohérence, suggestions | Fermer |
| `evaluations` | Évaluations & échéances | Onglets contextualisés par classe | Fermer |
| `activite` | Activité pédagogique | Type, titre, date, durée | Annuler / Enregistrer |
| `absences` | Absences | Liste ou compteur, remarque | Fermer / Enregistrer |
| `impression` | Imprimer le cahier | Plage, options, aperçu | Annuler / Imprimer |
| `historique` | Historique des changements | Chronologie, auteur, restauration | Fermer |
| `centre-actions` | À vérifier | Problèmes de date/horaire, accès direct à la source | Fermer |
| `emploi-manquant` | Compléter l’emploi du temps | Classe concernée et créneaux manquants | Plus tard / Modifier |
| `confirmation` | Confirmer l’action | Conséquence concise | Annuler / Confirmer |
| `plateforme` | Importer depuis une plateforme | Zone de fichier et résumé | Annuler / Importer |
| `invite` | Saisir une valeur | Champ unique | Annuler / Valider |

### Patron ordinateur

```html
<dialog open class="dialog" aria-labelledby="dialog-title">
  <header><h2 id="dialog-title" class="display">Vérification de la date</h2><p>Date choisie : 12/07/2026</p></header>
  <section class="dialog__body">
    <div class="message message--warning">
      <strong>À vérifier avant de continuer</strong>
      <ul><li>Vous n’enseignez pas cette classe le dimanche.</li><li>Cette date tombe pendant les vacances.</li></ul>
    </div>
  </section>
  <footer><button>Modifier la date</button><button class="primary">J’ai compris, enregistrer</button></footer>
</dialog>
```

### Comportement visuel téléphone

- Dialogue fixé en bas, largeur 100 %, coins arrondis uniquement en haut.
- Hauteur maximale `calc(100dvh - 12px)` ; contenu interne scrollable.
- Titre et actions restent visibles si le contenu est long.
- Actions empilées si leur texte ne tient pas ; action principale en dernier.
- Respect de `env(safe-area-inset-bottom)`.

```css
.dialog { width: min(520px, calc(100% - 32px)); border: 0; border-radius: 14px; padding: 0; box-shadow: 0 24px 70px rgb(15 23 42 / 28%); }
.dialog::backdrop { background: rgb(15 23 42 / 36%); backdrop-filter: blur(4px); }
.dialog header, .dialog__body, .dialog footer { padding: 18px 20px; }
.dialog header h2, .dialog header p { margin: 0; }
.dialog header p { margin-top: 6px; color: var(--muted); }
.dialog footer { display: flex; justify-content: flex-end; gap: 10px; }
.dialog button { min-height: 44px; border: 1px solid var(--line); border-radius: 9px; padding: 0 15px; background: var(--surface-soft); font-weight: 700; }
.dialog .primary { border-color: var(--blue); background: var(--blue); color: white; }
.message { border: 1px solid; border-radius: 10px; padding: 14px; }
.message--warning { border-color: #f1c66f; background: #fff7e6; }

@media (max-width: 639px) {
  .dialog { position: fixed; inset: auto 0 0; width: 100%; max-width: none; max-height: calc(100dvh - 12px); margin: 0; border-radius: 18px 18px 0 0; }
  .dialog__body { overflow: auto; }
  .dialog footer { flex-direction: column; padding-bottom: calc(14px + env(safe-area-inset-bottom)); }
  .dialog footer button { width: 100%; }
}
```

## 11. Administration

La maquette `admin.html` doit présenter séparément :

- connexion administrateur ;
- liste des enseignants avec recherche, actualisation et déconnexion ;
- détail d’un enseignant et de ses cahiers ;
- gestion des vacances/jours fériés ;
- gestion du bulletin officiel JSON : importer, vérifier, publier, conserver la version précédente.

Chaque vue peut être une `<section id="...">` dans la même page statique. Le JSON doit être affiché comme exemple non exécutable dans `<pre><code>`.

## 12. États à montrer obligatoirement

- chargement discret ;
- liste vide ;
- erreur de réseau ;
- synchronisé / synchronisation en cours ;
- classe sans emploi du temps ;
- horaire incomplet ;
- date hors année scolaire ;
- dimanche ou vacances ;
- contenu non affecté ;
- recherche sans résultat ;
- recherche avec résultats dans le contenu des cahiers ;
- notification native non autorisée ;
- année scolaire terminée ;
- mobile avec clavier ouvert ;
- arabe RTL.

## 13. Responsive

```css
@media (max-width: 1023px) {
  .class-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .guide__layout { grid-template-columns: 1fr; }
  .guide__toc { grid-column: 1 !important; overflow-x: auto; }
}

@media (max-width: 639px) {
  .container { width: min(100% - 24px, 1540px); }
  .home-header { display: grid; gap: 16px; padding-block: 16px 22px; }
  .header-actions { justify-content: flex-start; flex-wrap: wrap; }
  .search--open { order: 2; width: 100%; flex-basis: 100%; }
  .briefing { display: grid; }
  .briefing-stats { overflow-x: auto; }
  .class-grid { grid-template-columns: 1fr; gap: 14px; }
  .class-card { min-height: 212px; }
  .class-card__main { min-height: 150px; }
  .section-heading { margin-block: 22px 14px; }
  .section-heading h2 { font-size: 28px; }
  .table-shell { width: 100%; overflow-x: auto; padding-inline: 12px; }
  .table-shell table { min-width: 760px; }
}
```

Tester au minimum : 320×568, 360×800, 390×844, 430×932, 768×1024, 1024×1366 et 1440×900. La mise en page doit fonctionner avec un zoom texte de 200 % et en orientation paysage.

## 14. Accessibilité et cohérence

- Un seul `<h1>` par écran.
- Ordre des titres continu : `h1`, puis `h2`, puis `h3`.
- Tous les champs ont un `<label>` visible ou un nom accessible explicite.
- Le focus clavier est visible en bleu avec un décalage de 2 px.
- Une couleur n’est jamais la seule manière d’expliquer un état.
- Les animations sont désactivées avec `prefers-reduced-motion`.
- Le français et l’arabe utilisent des documents `lang` et `dir` corrects.
- Les textes longs ne sont jamais coupés sans possibilité de les lire.
- Aucun bouton d’icône ambigu : ajouter `aria-label` et éventuellement une infobulle.

```css
:focus-visible { outline: 3px solid color-mix(in srgb, var(--blue) 55%, white); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; animation-duration: .01ms !important; transition-duration: .01ms !important; }
}
```

## 15. Ordre de reconstruction

1. Créer les variables, typographies et styles de base.
2. Créer boutons, badges, champs, cartes, tableau et dialogues.
3. Construire l’accueil et ses trois états : normal, recherche ouverte, aucun cahier.
4. Construire le cahier et ses différents types de lignes.
5. Construire paramètres, évaluations, guide et impression.
6. Construire le catalogue complet des modales.
7. Construire l’administration.
8. Tester tous les formats mobiles et le RTL.

## 16. Critères d’acceptation

- « Mes classes · 4 classes » forme une seule unité visuelle.
- Aucun compteur n’apparaît près du nom de l’utilisateur.
- La recherche fermée n’occupe que 44 px ; ouverte, elle reste alignée et pousse les actions.
- La matière est visible en haut à gauche de chaque carte.
- Les cartes ont une séparation nette entre contenu et pied.
- Le guide ressemble à un papier de livre chaud et lisible.
- Toutes les pages et modales de l’inventaire existent en HTML statique.
- La maquette reste utilisable à 320 px sans chevauchement ni texte inaccessible.
- Aucun faux mécanisme n’est requis pour comprendre les parcours visuels.
