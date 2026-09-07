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

---

## 9. Charte Chromatique & Prévention des 7 Erreurs Graphiques (Kole Jain)

### 1. Règle du 60-30-10 & Maîtrise des Couleurs d'Accent
* **Problème évité :** Trop de couleurs vives simultanées créent de la confusion visuelle, détruisent la hiérarchie et échouent aux tests WCAG.
* **60% (Couleur dominante / Neutre) :** Appliquée à l'arrière-plan ou aux zones majoritaires de la page.
* **30% (Couleur secondaire / Structure) :** Réservée à la structure, aux cartes, panneaux et conteneurs.
* **10% (Couleur d'accent) :** Réservée exclusivement aux éléments d'action clés (boutons CTA) et indicateurs importants.
* **Icônes :** Les icônes restent neutres par défaut. La couleur est réservée pour exprimer un état actif ou un statut critique.

### 2. L'Équilibre des Neutres (Neutral Balance & Color Tinting)
* **Problème évité :** Arrière-plans saturés ou gradients vifs étouffant le contenu et fatiguant l'œil.
* **Arrière-plans neutres :** Privilégier un blanc cassé / gris très clair en mode clair, ou un gris sombre en mode sombre.
* **Teinter les neutres (Color Tinting) :** Injecter une subtile nuance (1 à 5%) de la couleur principale dans les gris d'arrière-plan pour une identité chaleureuse sans surcharge.
* **Bordures vs Arrière-plans :** Séparer les cartes par des bordures fines et discrètes plutôt que d'empiler des arrière-plans colorés.

### 3. Adaptation des Couleurs de Marque (Brand Colors & Accessibilité WCAG)
* **Problème évité :** S'enfermer dans les 1 ou 2 couleurs du logo qui ne sont pas pensées pour des contrastes d'interface.
* **Harmonies chromatiques :** Étendre la palette avec des couleurs analogues ou complémentaires pour enrichir la hiérarchie.
* **Ajustement pour le contraste WCAG :** Si une couleur vive (jaune, ambre clair, vert lime) échoue avec du texte blanc, assombrir la teinte pour l'action ou lui associer un texte foncé adapté.

### 4. Éviter le Noir Pur (#000000) et le Blanc Pur (#FFFFFF)
* **Problème évité :** Contrastes violents provoquant fatigue visuelle et manque de raffinement.
* **Nuances de gris :** Utiliser des nuances de gris foncé (au lieu du noir) pour les textes secondaires, étiquettes et bordures.
* **Subtilité :** Réserver le blanc ou le noir pur uniquement aux zones de très haute priorité, jamais sur les grands aplats d'arrière-plan.

### 5. Le Mode Sombre n'est pas une Inversion du Mode Clair
* **Problème évité :** Inversion mécanique produisant une interface agressive et éblouissante.
* **Arrière-plans sombres :** Gris profonds élégants au lieu du noir absolu (#000000).
* **Élévation en Z :** Conteneurs et cartes légèrement plus clairs que le fond pour matérialiser la profondeur.
* **Typographie :** Texte gris clair ou teinté au lieu du blanc pur pour limiter l'éblouissement.
* **Désaturation :** Couleurs vives légèrement désaturées pour éviter la vibration visuelle sur fond sombre.

### 6. Respecter la Sémantique des Couleurs
* **Problème évité :** Utiliser la couleur de marque pour tout, y compris les actions dangereuses.
* **Rouge sémantique :** Actions destructives (Supprimer, Annuler, Alertes d'erreur).
* **Vert sémantique :** Succès, validation, confirmation.
* **Ambre / Jaune sémantique :** Avertissements et notifications d'attention.
* **Priorité à l'usabilité :** Le rouge s'impose pour toute action de suppression ou de rupture, même s'il ne figure pas dans la marque.

### 7. Communication des États d'Éléments (States)
Chaque composant interactif communique clairement son état :
* **Repos (Default) :** Teinte de base équilibrée.
* **Survol (Hover) :** Nuance plus lumineuse (+10% luminosité).
* **Pression / Actif (Pressed) :** Nuance plus sombre (-10% luminosité) et légère compression physique.
* **Désactivé (Disabled) :** Version désaturée ou gris neutre avec baisse d'opacité (50%).

---

### Fiche Récapitulative des Règles Chromatiques
| Élément | Règle à appliquer |
| --- | --- |
| **Structure globale** | Appliquer la règle 60% (Neutre fond) - 30% (Cartes/Structure) - 10% (Accent/CTA). |
| **Arrière-plan** | Neutre subtil, teinté avec 1-5% de la teinte primaire, pas de blanc pur aveuglant. |
| **Textes secondaires** | Gris moyen/foncé doux, jamais de noir pur à 100%. |
| **Actions destructives** | Rouge sémantique impératif (indépendant de la couleur de marque). |
| **Survol (Hover)** | +10% de luminosité (`hover:brightness-110` ou éclaircissement). |
| **Pression (Click/Active)** | -10% de luminosité (`active:brightness-90` et micro-compression). |
| **Mode Sombre** | Gris sombre étagé (fond plus foncé que les cartes), texte adouci, couleurs désaturées. |

