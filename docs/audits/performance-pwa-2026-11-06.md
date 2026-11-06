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
Ressources PWA précachées : **360 → 298**.

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
- Build : **934,8 Ko JS / 110,9 Ko CSS gzip**, budgets respectés
- PWA : **298 ressources** précachées
- `quality` : 14 fichiers > 400, 0 cycle, 0 code mort






