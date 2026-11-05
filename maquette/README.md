# Maquette HTML — cahier de textes

Simulation statique de l'application : cinq écrans, les dialogues, les menus
contextuels, trois langues, thème clair / sombre et une version mobile fidèle au
dock flottant de l'application réelle.

Aucune dépendance, aucun build : ouvrir `index.html` suffit.

```
maquette/
├── index.html            # coquille : rail, en-têtes, 5 écrans, dialogues, menus, toast
├── planche-mobile.html   # revue côte à côte (360 / 393 / 430 px)
├── assets/
│   ├── tokens.css        # couleurs, rayons, typographie, profondeur
│   ├── app.css           # composants et adaptation (bureau → dock)
│   └── app.js            # données de démonstration, i18n, rendu, interactions
```

## Ce que reprend la maquette

Les valeurs sont relevées sur l'application (jetons `--primary`, `--border`,
`--muted`, rayons 8/10/14/18/24, ombres internes) :

| Élément | Réalisation |
| --- | --- |
| Police | Readex Pro (Google Fonts) avec repli système |
| Encres | `#2e2016` texte, `#221d35` titres, `#6e5a49` secondaire |
| Filets | `#e5ddd2` et `rgba(70, 55, 130, .11)` |
| Action | dégradé `#5f52d6 → #3e6ec9`, halo `0 10px 20px -8px` |
| Rail | carte blanche 236 px, coins arrondis côté contenu, pastille active surélevée |
| Dock mobile | pilule 352 px, rayon 30, verre dépoli, pastille active dégradée |
| Cartes de classe | rayon `22px 22px 12px`, halo interne clair, ombre très basse |

### L'éditeur du cahier, repris de l'application

Le tableau n'est pas un tableau générique : c'est celui de l'application, avec
ses trois colonnes **Date | Contenu | Remarque**, sa grille et sa typographie.

| Élément | Valeur reprise |
| --- | --- |
| Grille | `--cdt-table-cols` : `18% · 1fr · 20%` (< 640), `13% · 1fr · 16%` (≥ 768) |
| Carte | rayon 14 px, bordure 2 px à 80 %, `shadow-xs` |
| En-tête | fond `muted/30`, capitales 0,08 em, colonnes latérales en `muted-foreground` |
| Échelle | `clamp(0.9375rem, 0.875rem + 0.2vw, 1rem)`, chapitre ×1,45 → badge ×0,72 |
| Voix typographiques | chapitre et section en **Demi Condensed 600**, sous-sections et éléments en **Oblique**, corps en **Medium**, remarque en oblique |
| Chapitre | centré, couleur `#2b6d73` (mode sombre `#91cec8`), numéro en marge |
| Élément | pastille de nature + numéro, retrait 4/8/14 px (16/32/48 px ≥ 640) |
| Ligne | `min-h 56 px`, filets verticaux entre colonnes, dates et remarques fusionnées par séance |
| États | sélection 14 % d'encre d'accent, édition 20 % + filet interne 1 px |

Interactions : clic sur une ligne pour la sélectionner, double-clic sur un titre
pour l'éditer en ligne (Entrée valide, Échap annule), barre d'outils pour
ajouter, déplacer et retirer, « Nouvelle séance » pour créer une date.

## Balayer les interfaces

La barre **Maquette** (en bas à droite ; icône ⚙ sur téléphone) permet de changer
de jeu de données et de langue sans rien recharger.

| Commande | Effet |
| --- | --- |
| `Données` | 6 classes, séances remplies, emploi du temps partiel |
| `Vide` | aucun contenu : états vides des cinq écrans |
| `Sans résultat` | recherche sans correspondance |
| `FR` / `AR` / `EN` | bascule la langue **et** le sens de lecture |
| Icône lune/soleil (rail) | thème clair / sombre |
| Réglages → thème, taille, langue | mêmes réglages que l'application |

Écrans et états couverts :

1. **Classes** — cartes pastel, pastille « En cours », recherche, deux états vides,
   menu de carte (ouvrir, emploi du temps, modifier, supprimer).
2. **Cahier** — tableau Date / Contenu / Remarque : en-tête, chapitres centrés,
   sections et éléments numérotés avec pastille, remarques en marge fusionnées
   par séance, sélection, édition en ligne, plan vide, aucune classe ouverte.
3. **Emploi du temps** — bascule matin / après-midi, grille 6 jours, cases
   colorées par classe, affectation et suppression par menu.
4. **Réglages** — identité, matières, apparence, données.
5. **Aide** — cinq repères.

Dialogues : création / modification de classe, confirmation destructive.
Bandeau de confirmation pour chaque sauvegarde.

## Version mobile

Le seuil de bascule est celui de l'application : **767 px**. En dessous, le rail
disparaît au profit du dock flottant ; le champ de recherche s'efface sous 520 px
(l'en-tête ne garde que le titre et l'action) ; les cartes passent à deux
colonnes ; le cahier empile séances et plan ; les segments occupent la largeur.

`planche-mobile.html` affiche trois largeurs côte à côte, ou une seule :
`planche-mobile.html?w=393`.

## Couverture clavier et accessibilité

Cibles ≥ 44 px sur les éléments de navigation, anneau de focus visible
(`--ring`), `aria-*` sur les listes, menus et dialogues, contrastes conformes AA
sur les textes des cartes pastel.
