# Performance, fonts et PWA

**Date :** 6 novembre 2026 · **Périmètre :** `fonts.css`, modal glass, cartes,
manifest PWA, service worker registration.

## 1. Polices : 55 → 14 déclarations

Les familles n’étaient plus sélectionnées par aucun composant après la
consolidation sur Readex Pro. Supprimées de `src/styles/fonts.css` :
Lora, Roboto, Amiri, Aref Ruqaa, Lalezar, KOMission, Elgharib, Outfit, Inter,
Special Elite, DM Sans, Rubik, Roboto Slab, Lato, Barlow, Open Sans, Newsreader.

Conservées :

- **Readex Pro** (latin + arabe) : interface, contenu, titres ;
- **Latin Modern Sans** : document imprimé ;
- **Computer Modern Sans Serif** : composition éditoriale ;
- **Source Sans 3** : repli du document ;
- **SamsungOne Arabic / SamsungOne** : rendu arabe natif et secours local.

Fichiers retirés de `public/` :

| Fichier | Taille |
|---|---:|
| `maghribi-font-3.ttf` (doublon exact de SamsungOneArabic) | 418 Ko |
| `Elgharib-Hayyakum-Allah-Taweel-Light.ttf` | 102 Ko |
| `fonts/Elgharib-...-Medium.ttf` | 103 Ko |
| `fonts/KOMission-Black.otf` + `.ttf` | 40 Ko |
| `arabswell-3.ttf` | 51 Ko |

`@font-face` : **55 → 14**. Dépendances `@fontsource` : **16 → 2**.
Ressources PWA précachées : **360 → 305** (7 fichiers de polices ajoutés).

## 2. Couches de fond supprimées

- **Modales** : plus de `backdrop-filter` sur le voile, plus de teinte
  `--modal-surface-tint`, plus de verre/flou sur `liquid-modal` ni sur les
  en-têtes/pieds collants mobiles. Les surfaces sont opaques, le voile reste
  un aplat lisible.
- **Feuilles Claude** : suppression du flou 26 px, du liseré dégradé supérieur
  et des dégradés d’accent ; boutons principaux en aplat.
- **Création de classe** : fonds héro et tuiles en aplats, sans dégradés.
- **Cartes de classe** : suppression du dégradé de carte et des anciennes
  couches `class-card__sheet` (perforations, lignes de cahier). La surface
  pastel reste la seule couche, avec bordure et ombre douces.
- **Lignes de classe** : surface unie, ombre et soulèvement au survol.
- `prefers-reduced-transparency` continue de forcer les surfaces opaques.

## 3. PWA

- Manifest : `handle_links: "preferred"` pour ouvrir les liens dans l’app
  installée.
- Le service worker est revalidé **au retour au premier plan**, **au retour du
  réseau** et **toutes les 30 minutes** ; une mise à jour installée prend la
  main sans interrompre la saisie.
- `updateViaCache: 'none'` conservé : jamais de `sw.js` figé par le cache HTTP.
- Le worker précache toujours la coque, les icônes, les polices et les données
  hors ligne, mais avec 40 ressources de moins.

## 4. Vérifications

- `npm run lint` ✅
- Tests UI : **327/327**
- Suite complète : **944 réussis**, 2 échecs hors périmètre déjà connus, 1 ignoré
- Build : **935,8 Ko JS / 112,3 Ko CSS gzip**, budgets respectés
- PWA : **305 ressources** précachées
- `quality` : 14 fichiers > 400, 0 cycle, 0 code mort







## Passe performance du 7 novembre 2026

- Le liseré liquid est désormais **statique** : plus d’animation de propriété personnalisée ni de repeint du `conic-gradient` à chaque frame.
- Seul le reflet utilise encore une animation composée (`transform` + `opacity`), coupée par `prefers-reduced-motion`.
- Le flou de fond mobile reste limité aux dialogues, avec repli opaque si `backdrop-filter` manque ou si la transparence est réduite.
- Les polices Lexend, Bricolage Grotesque et IBM Plex Sans Arabic sont embarquées : +7 fichiers PWA, aucune requête réseau.
- Build : **935,8 Ko JS / 112,3 Ko CSS gzip**, budgets respectés.
- PWA : **305 ressources**, dist totale **10,48 Mo**.

### Mesures editor

| Opération | Médiane | p95 |
| --- | ---: | ---: |
| Construction des lignes (1 260) | 2,26 ms | 7,03 ms |
| Groupement sans cache | 4,81 ms | 6,58 ms |
| Groupement avec cache | 0 ms | 0,02 ms |
| Signatures d’impression | 2,49 ms | 5,20 ms |
| Numéros de contenu | 1,26 ms | 2,40 ms |
| Ordre des dates | 0,82 ms | 1,63 ms |

### Mesures domaine

- Pilotage 60 chapitres / 12 000 éléments : **19,8 ms** à froid, **0,7 ms** à chaud.
- Diagnostic JSON 5 000 éléments : **16,8 ms** médian, **26,5 ms** p95.

## Équilibrage d'impression

Le moteur ajuste maintenant **taille, interligne et espacement vertical** des cellules, titres, paragraphes et listes, puis répartit le reliquat entre les blocs afin que la dernière page soit aussi pleine que les précédentes. Une dernière page entamée à moins de 50 % est compactée pour disparaître.
