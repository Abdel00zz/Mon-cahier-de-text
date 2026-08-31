# Directives & Charte UX/UI - Mon cahier de textes

## 1. Ergonomie et Psychologie Utilisateur (Lois UX)
- **Loi de Hick & Chunking ($7 \pm 2$)** : Découpage clair des actions, divulgation progressive des informations complexes (*progressive disclosure*).
- **Loi de Jakob** : Respect des conventions et modèles mentaux familiers aux enseignants (tableaux de bord clairs, grilles horaires, conformité aux bulletins officiels).
- **Exposition directe du contenu** : Zéro friction ou écrans d'attente inutiles, mise en valeur immédiate du contenu principal.

## 2. Ergonomie Spatiale & Interactivité
- **Loi de Fitts & Thumb Zone** : Cibles tactiles ≥ 44px (`touch-target`), éléments d'action stratégiques accessibles facilement au pouce sur mobile.
- **Mise en page modulaire (Bento Grids & CSS Grid)** : Cartes interactives distinctes, hiérarchie claire, espacements mathématiques équilibrés.
- **Règle des Rayons Imbriqués** : Rayon intérieur = Rayon extérieur - Espacement (padding).

## 3. Engagement & Valorisation des États de l'Interface
- **États vides valorisés (*Empty States*)** : Jamais de surface vide passive. Toujours une illustration/icône soignée, un message d'orientation et un bouton d'action contextuel direct.
- **Repères visuels & Scannabilité (*Skimming*)** : Badges d'état distincts, contrastes AA validés, typographie fluide avec hiérarchie claire.

## 4. Tendances Web & Technologies Visuelles
- **Micro-interactions & Spring Physics** : Transitions fluides au survol/clic (`spring-interactive`, `spring-press`).
- **Squelettes de chargement (CLS = 0)** : Transitions avec shimmer GPU sans décalage de mise en page.
- **Typographie bilingue soignée** : Équilibre parfait entre polices arabes et latines avec lisibilité optimale.

---

## 5. Principes fondamentaux du parcours (Onboarding)
Un onboarding efficace repose sur quatre piliers d'ergonomie et d'apprentissage :
* **Réactivité immédiate :** Composants réactifs, animations fluides (60 fps) et absence totale d'inhibition dans l'interaction dès les premières secondes.
* **Intuitivité cognitive :** Respect de la loi de Hick : réduire les choix pour minimiser la charge mentale.
* **Orientation action :** Chaque écran doit comporter un objectif d'apprentissage ou de configuration précis.
* **Progression pédagogique :** Transmission contextuelle des fonctionnalités au fur et à mesure des choix de l'utilisateur.

## 6. Règles d'or de conception (Do / Don't)
| À privilégier (Do) | À éviter (Don't) |
| --- | --- |
| **Aller à l'essentiel :** Sélection stricte des étapes clés. | **Surcharger d'informations :** Bloquer l'utilisateur avec des blocs de texte descriptifs. |
| **Encourager l'action :** Boutons d'action explicites (*Call to Action*). | **Créer des écrans passifs :** Proposer de simples diapositives informatives sans interaction. |
| **Personnaliser l'expérience :** Adapter le contenu selon les saisies utilisateur. | **Imposer une configuration générique :** Présenter un parcours identique pour tous les profils. |

## 7. Stratégies UX & Amorçage cognitif (*Priming*)
**Réutilisation des patrons de conception établis :** S'appuyer sur des patterns familiers (listes à coche, commutateurs de thème, demandes de permissions ciblées) réduit la courbe d'apprentissage.

**L'amorçage cognitif (*Priming*) :** Transformer une présentation passive en une transition active adaptative (ex: "Préparation de vos sessions personnalisées..." avec checkmarks au lieu d'une liste statique des bénéfices de l'app).

## 8. Renforcement de l'engagement et de l'appropriation
Susciter un sentiment d'appropriation immédiat (*Effet d'IKEA*) :
* **Micro-personnalisation visuelle :** Choix du thème (sombre/clair) ou sélection de l'icône de l'application.
* **Intégration au système :** Configuration guidée des notifications contextuelles et installation d'un widget sur l'écran d'accueil.
* **Rétroaction immédiate :** Affichage du tableau de bord configuré dès la validation de la dernière étape.
