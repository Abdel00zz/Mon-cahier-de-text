# Maquette HTML — Mon cahier de textes

Maquette statique, sans build ni dépendance, qui reprend le langage visuel de
l’application : tokens de couleur, typographie, cartes, barre d’onglets mobile,
fenêtres plein écran et feuilles tactiles.

## Ouvrir

Double-cliquer sur `index.html`, ou servir le dossier :

```powershell
python -m http.server 4173 --directory maquette
# http://localhost:4173
```

La police Readex Pro est chargée depuis Google Fonts ; hors ligne, la pile
`system-ui` prend le relais.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Écrans et fenêtres, icônes SVG inline, textes AR/FR |
| `assets/maquette.css` | Tokens, composants, responsive, mode sombre |
| `assets/maquette.js` | Navigation, overlays, thème, langue, densité, assistant |

## Écrans

- **Classes** : en-tête (identité, année), actions assistant et `+` au-dessus du
  titre, onglets de vue, groupes `الآن` / `اليوم`, cartes de classe et carte
  d’ajout. Le libellé du groupe et la pastille « maintenant » suivent l’état de
  séance.
- **Cahier** : en-tête de classe, barre d’actions, tableau date / contenu / durée.
- **Actions de classe** : feuille à trois tuiles (évaluations, modifier, supprimer).
- **Paramètres** : grille de sept cartes sur téléphone, rail de navigation sur
  bureau ; panneaux Emploi du temps, Absences, Profil, Apparence, Notifications,
  Compte et données.
- **Aide** : recherche, accordéons, rubrique « À propos / من نحن », crédit.
- **Créer une classe** : assistant en trois étapes (niveau, filière, détails),
  avec groupe, couleur et récapitulatif.
- **Évaluations** : contexte de classe, groupes accordéon, lignes datées et
  actions.
- **Confirmation destructive** : alerte compacte ancrée en bas sur téléphone.

## Interactions

- `Échap`, clic sur le voile ou bouton de fermeture ferment la fenêtre active.
- Thème clair / sombre / système ; langue arabe (RTL) ou française (LTR) ;
  quatre densités de texte. Ces trois choix sont mémorisés dans `localStorage`.
- Les onglets Paramètres basculent entre la grille et le panneau ; le retour
  revient à la grille sur téléphone/tablette.
- L’assistant avance et recule, coche les étapes terminées et affiche le
  récapitulatif de la classe.

## Mesures de référence

Les valeurs viennent des feuilles du dépôt (`src/styles`, `features/**/*.css`) :

- cibles tactiles ≥ 44 px, barre mobile de 60 px par item ;
- cartes de classe de 76,8 px minimum, rayon 22 px ;
- fenêtres plein écran sous 768 px, dialogues centrés au-delà ;
- en-tête/pied collants avec verre dépoli sur téléphone ;
- barre d’onglets mobile : accent `#0071e3`, pastille active `rgba(0,113,227,.08)` ;
- paramètres : cartes de 136 px minimum, icône 44 px, rayon 16 px ;
- transitions de 150 à 320 ms, supprimées avec `prefers-reduced-motion`.

## Limites

- Maquette : aucune donnée réelle, aucune synchronisation, aucune impression.
- Seuls les parcours listés sont représentés ; les autres écrans de
  l’application ne sont pas dupliqués.
- Les dimensions sont déclaratives, pas mesurées sur un appareil physique.
