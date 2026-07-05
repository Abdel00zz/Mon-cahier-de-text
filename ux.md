# UX.md — Charte d'interface premium

> Guide de référence pour une interface **haut de gamme, cohérente et hyper-pratique** sur tous les axes.
> Chaque règle est actionnable et vérifiable. À lire avant toute modification visuelle.

---

## 0. Les 5 principes directeurs

1. **Le professeur d'abord** — chaque écran répond à « qu'est-ce que le prof veut faire *maintenant* ? ». L'action la plus fréquente est la plus grosse, la plus proche du pouce.
2. **Calme visuel** — un seul accent chaud (`#C96442`), un seul métal signature (or `#B8935A`). Le reste est neutre. On n'ajoute une couleur que si elle *signifie* quelque chose.
3. **La donnée respire** — pas de « boîtes dans des boîtes ». Des filets fins, de l'espace, un rythme régulier. Le contenu est le héros, pas les bordures.
4. **Zéro surprise** — mêmes gestes partout : tap = sélectionner, double-tap = éditer, Échap = fermer. Les alertes conseillent, ne bloquent jamais.
5. **Fluide et vivant** — micro-animations courtes (150–240 ms), jamais gratuites : elles confirment une action ou guident l'œil.

---

## 1. Fondations (design tokens)

Source unique : [`index.css`](index.css) (`:root` + `@theme inline`). **Ne jamais coder une couleur en dur** hors de ce fichier — utiliser les classes sémantiques.

| Rôle | Token | Usage |
|---|---|---|
| Accent principal | `primary` (#C96442) | boutons d'action, sélection, liens |
| Métal signature | `#B8935A` (or) | rails de dates, séparateurs, filets d'en-tête |
| Fond app | `background` (sable 24 33% 97%) | corps |
| Surface | `card` (blanc) | cartes, modales |
| Texte | `foreground` / `muted-foreground` | primaire / secondaire |
| Danger | `destructive` | suppression uniquement |

**Typographie** : titres `Roboto Slab` (`.font-slab`), corps `Inter`, arabe `IBM Plex Sans Arabic` (`.font-ar`), dates en chiffres tabulaires.

**Rayons** : `rounded-lg` (éléments), `rounded-2xl` (cartes/modales), `rounded-full` (pastilles, FAB). **Ombres** : douces et chaudes (`--shadow-sm/md/lg`), jamais noires dures.

---

## 2. Rythme & espacement

- Échelle 4 px : `gap-1.5` (6px) entre éléments serrés, `gap-3` (12px) entre groupes, `gap-6` entre sections.
- Marge de respiration des cartes : `p-4` mobile, `p-6` desktop.
- **Cibles tactiles ≥ 44 px** partout (boutons `h-11`, items de menu `min-h-11`). Non négociable.
- Largeur de lecture max `max-w-5xl` centré ; jamais de texte pleine largeur sur grand écran.

---

## 3. Couleur avec intention

- **Une sélection** = teinte primaire à 6 % + rail primaire 3 px sur toute la ligne. Jamais un simple gris.
- **Une date affectée** = lavis sable chaud (`#FBF6EE`) + rail doré. Le regard distingue instantanément « planifié » de « à planifier ».
- **Badges de type** (Déf./Th./Exo…) : la couleur code le type, pas la décoration. Palette douce (fonds `-100`, texte `-800`).
- **Alertes** : ambre = conseil (retard, conflit de date), orange = urgent (devoir ≤ 3 j), rouge = danger destructif seulement.

---

## 4. Composants — règles d'or

### Boutons
Hiérarchie stricte par écran : **1 seule** action primaire (plein, accent), le reste en `secondary`/`ghost`/`outline`. L'action dangereuse est toujours à l'écart, en dernier, jamais accolée au « Enregistrer ».

### Modales (bottom-sheet iOS)
- Mobile : feuille montante avec **poignée**, `max-h-92vh`, coins hauts arrondis, safe-area en bas.
- Le champ focusé remonte au centre (clavier virtuel).
- Un titre clair + une phrase de contexte. Actions en pied : secondaire à gauche, primaire à droite.
- Fermeture : croix, clic sur le fond, ou Échap — les trois toujours actives.

### Table de l'éditeur
- 3 colonnes **Date | Contenu | Remarque**, filets verticaux fins et visibles.
- Rangées **plates et continues** ; un groupe de dates fusionnées se lit comme **un seul bloc** longé d'un rail doré, clos par un filet doré plus marqué.
- La **date super-affichée** : grand jour, mois en petites capitales, année discrète — pas de badge encadré.
- Sur mobile : le badge de type passe **au-dessus** du titre, la Remarque s'affiche **sous** le contenu (jamais cachée), un **FAB « + »** flotte en bas à droite.

### Barre de sélection (contextuelle)
- Apparaît en bas après un tap. Son en-tête dit **CE qui est sélectionné** (« Exercice — Calcul de termes »), pas un simple compteur.
- Actions groupées par intention : *déplacer · contenu · dates · danger*, séparées par des filets.
- L'action reine du prof en classe — **« Dater aujourd'hui »** — est un bouton accent, un seul tap.

### Cartes de classe
- Nom en évidence, matière en pastille, chip « Prochaine séance : jeudi », date de dernière modification en mono discret. Suppression révélée au survol (desktop) / toujours visible (tactile).

---

## 5. Feedback & états

- **Toasts** (sonner, bas-droite) : succès/erreur/info courts, auto-disparition. Jamais bloquants.
- **États vides** : une icône douce, une phrase, **une** action (« Créer un chapitre »). Jamais une page blanche.
- **Chargement** : squelettes qui épousent la forme finale, pas de spinner central.
- **Alertes intelligentes** (retard, devoir proche, conflit de date) : bannière ambre ou toast — toujours *« vous pouvez tout de même… »*. L'app conseille, le prof décide.
- **Synchronisation** : pastille d'état discrète dans l'en-tête (Synchronisé / … / Hors ligne), cliquable pour forcer.

---

## 6. Mouvement

| Interaction | Animation | Durée |
|---|---|---|
| Ouverture modale | slide-up + léger scale | 240 ms |
| Toast / bannière | fade + slide | 180 ms |
| Onglet actif | soulignement animé (`layoutId`) | spring |
| Nouvel élément | halo doré qui s'estompe | 2,5 s |
| Bouton pressé | `active:scale-95` | instantané |

Respecter `prefers-reduced-motion` : désactiver les transforms non essentiels.

---

## 7. Accessibilité & i18n

- Contraste AA minimum ; focus visible (anneau primaire) sur tout élément interactif.
- `aria-label` sur chaque bouton-icône ; `role="alert"` sur les avertissements.
- **RTL arabe** : `dir` posé sur les contenus arabes détectés, police IBM Plex.
- Raccourcis desktop annoncés (`/`, `Ctrl+K`, `Ctrl+Z`, `Échap`) mais **jamais** requis — tout est atteignable au doigt.

---

## 8. Checklist de revue (avant merge d'un écran)

- [ ] Une seule action primaire, danger isolé.
- [ ] Cibles ≥ 44 px, testé à 360 px de large.
- [ ] Aucune couleur en dur hors `index.css`.
- [ ] Sélection = pleine ligne teintée, pas un bout de cellule.
- [ ] Modale : poignée mobile, Échap actif, champ focusé visible sous clavier.
- [ ] Alertes non bloquantes.
- [ ] État vide + squelette de chargement présents.
- [ ] RTL et MathJax vérifiés si contenu pédagogique.
- [ ] Animation ≤ 240 ms, respect de `reduced-motion`.
