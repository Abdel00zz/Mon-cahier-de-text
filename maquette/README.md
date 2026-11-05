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
2. **Cahier** — liste des séances, date, plan numéroté (I / A / 1° / a), barre
   d'outils, remarque et travail à faire, plan vide, aucune classe ouverte.
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
