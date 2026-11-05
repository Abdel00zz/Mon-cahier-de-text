# Maquette HTML — Mon cahier de textes

Maquette statique, sans build ni dépendance, relevée page par page sur
l’application réelle : tokens de couleur, typographie, cartes de classe teintées,
barre d’onglets mobile, fenêtres plein écran et dialogue de confirmation.

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

- **Classes** : barre d’actions (messages avec compteur `42`, bouton `+`) au-dessus
  du titre « أقسامي الدراسية : », groupes `الآن` / `اليوم`, cartes teintées à la
  couleur de la classe avec menu `⋮`, carte d’ajout. Le libellé du groupe et la
  pastille « maintenant » suivent l’état de séance.
- **Cahier** : titre de classe centré, barre d’icônes (menu, recherche,
  annuler/rétablir, témoin d’enregistrement), rangée d’actions sur bureau et
  tableau `التاريخ / المحتوى / ملاحظة` — dates centrées, chapitres et évaluations
  centrés, sections et items au bord de lecture, puces `Cours 1`.
- **Édition de classe** : modale plein écran (onglets `المعلومات` / `تلاميذ القسم`,
  pastilles de couleur, sélecteurs, numéro de groupe, pied `حفظ` + `حذف القسم`).
- **Paramètres** : panneaux en listes groupées (libellé de groupe, une seule carte, filets fins) avec contrôles segmentés pour le thème, la taille du texte et la langue ; grille de sept cartes sur téléphone, rail de navigation sur
  bureau ; panneaux Emploi du temps, Absences, Profil, Apparence, Notifications,
  Compte et données.
- **Aide** : recherche en pastille, accordéons à icône teintée et chevron qui pivote, réponses indentées avec étapes et astuce, rubrique « À propos / من نحن », crédit.
- **Créer une classe** : assistant en trois étapes (niveau, filière, détails).
- **Évaluations** : contexte de classe, groupes accordéon, lignes datées.
- **Messages** : boîte de réception, compteur de non-lus, items horodatés.
- **Aperçu d’impression** : feuille papier, en-tête d’année, tableau daté, actions.
- **Connexion** : marque, Google, e-mail/mot de passe, mot de passe oublié,
  création de compte (ouverte depuis Compte → Se déconnecter).
- **Confirmation destructive** : alerte compacte ancrée en bas sur téléphone.

## Interactions

- `Échap`, clic sur le voile ou bouton de fermeture ferment la fenêtre active.
- Thème clair / sombre / système ; langue arabe (RTL) ou française (LTR) ;
  quatre densités de texte, mémorisées dans `localStorage`.
- Les onglets Paramètres basculent entre la grille et le panneau ; le retour
  revient à la grille sur téléphone/tablette.
- Les onglets de l’édition de classe affichent la fiche ou la liste d’élèves ;
  les pastilles de couleur, le compteur de groupe et le bouton d’impression
  répondent au clic.
- L’assistant avance et recule, coche les étapes terminées et affiche le
  récapitulatif de la classe.

## Mesures de référence

Valeurs relevées dans les feuilles du dépôt (`src/styles`, `features/**/*.css`) :

- cibles tactiles 44 px au pointeur fin, **48 px au doigt** (`--touch-min`) ;
- barre mobile de 60 px par item, libellé 11 px, pastille active ;
- cartes de classe : `min-height` 76,8 px, rayon 22 px, dégradé 135° entre deux
  teintes de la palette, filet 1 px ;
- fenêtres plein écran sous 768 px, dialogues centrés au-delà ; seules les
  alertes de confirmation gardent un format de dialogue ;
- en-tête et pied collants en verre dépoli sur téléphone ;
- accent de navigation `#0a5bbd` (6,2:1 sur `#fafafa`), lavis `rgb(10 91 189 / .08)` ;
- paramètres : cartes de 136 px minimum, icône 44 px, rayon 16 px ;
- transitions de 150 à 320 ms ; deux courbes : `--spring-bounce cubic-bezier(.34,1.56,.64,1)` pour les gestes (pastilles, chevrons, onglets) et `--ease-ios cubic-bezier(.32,.72,0,1)` pour les panneaux ; tout est supprimé avec `prefers-reduced-motion` ;
- cahier sur téléphone : échelle propre (base 12,1 px), écarts d’au moins 0,7 px
  entre niveaux de lecture.

## Limites

- Maquette : aucune donnée réelle, aucune synchronisation, aucune impression.
- Les écrans de l’administration (`/admin.html`), la restauration de sauvegarde et
  l’assistant de première visite ne sont pas dupliqués.
- Les dimensions sont déclaratives, vérifiées dans le navigateur mais pas sur un
  appareil physique.