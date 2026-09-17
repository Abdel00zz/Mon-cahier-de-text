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

---

## 10. Cadre Opérationnel du Design Émotionnel

L'intégration du design émotionnel repose sur l'équilibre entre utilité fonctionnelle, retour visuel immédiat et sentiment d'accomplissement. Ce cadre décline la méthode selon les trois niveaux théoriques (viscéral, comportemental et réflexif) adaptés au quotidien de l'enseignant.

### 1. Piliers d'Expérience

#### Niveau Viscéral (Impression immédiate)
* **Soigner l'Onboarding :** Créer une première interaction fluide avec des visuels chaleureux et des transitions douces pour réduire l'effort cognitif initial.
* **Finition Visuelle :** Utiliser des micro-détails (effets de survol, légères ombres portées, typographie soignée) qui traduisent immédiatement la qualité, la clarté et la rigueur du produit.

#### Niveau Comportemental (Plaisir d'utilisation)
* **Micro-Interactions Dynamiques :** Associer à chaque action (bouton pressé, formulaire validé, élément glissé, date attribuée) un retour visuel direct comme un léger rebond, un changement de couleur, une lueur ou une micro-vibration haptique.
* **Gestion de la Latence :** Remplacer les indicateurs de chargement statiques par des animations de squelette (*skeleton screens*) ou des progressions fluides pour maintenir le sentiment de vitesse et de réactivité instantanée.

#### Niveau Réflexif (Attachement et fidélité)
* **Célébration des Progrès :** Marquer les réussites (validation d'une séance, complétion d'un programme, maintien d'une série) avec des compteurs animés ou des visuels de félicitation discrets mais gratifiants.
* **Communication Empathique :** Reformuler les messages d'erreur et d'alerte de façon humaine et bienveillante en indiquant clairement la démarche à suivre sans culpabiliser l'enseignant.

---

### 2. Matrice d'Application Par Phase

| Phase Utilisateur | Objectif Émotionnel | Leviers & Éléments UI |
| --- | --- | --- |
| **Accueil & Inscription** | Rassurer et susciter l'intérêt | Parcours guidé pas-à-pas, animations de bienvenue, clarté visuelle |
| **Usage Quotidien** | Transformer la routine en plaisir | Retours haptiques/visuels au clic, barres de progression interactives |
| **Accomplissement** | Déclencher la fierté et le retour | Badges animés, compteurs de séries (*streaks*), récapitulatifs visuels |
| **Erreurs ou Blocages** | Désamorcer la frustration | Mascotte ou icône empathique, suggestions directes de résolution |

---

### 3. Plan d'Action en 4 Étapes

1. **Cartographier les frictions :** Repérer les écrans où l'utilisateur subit de la latence, de la confusion ou des tâches répétitives.
2. **Cibler 3 micro-moments :** Choisir une action clé de votre modèle (validation, complétion, chargement) à enrichir visuellement.
3. **Régler la fluidité :** Garder des animations très courtes (entre 150 ms et 300 ms) pour enrichir l'interface sans jamais ralentir la navigation.
4. **Tester et mesurer :** Observer si ces ajouts augmentent la rétention, le taux de complétion ou l'engagement global.

---

## 11. The Emotion-Value Bridge : Architecture d'Onboarding & Rétention

Un produit engageant et durable combine **rassurance psychologique immédiate** et **délivrance rapide de valeur concrète**.

```
[Onboarding: Vendre le Résultat] ➔ [Usage: Boucles de Micro-Feedback] ➔ [Rétention: Identité & Progrès]
```

### 1. Architecture d'Onboarding & Délivrance de Valeur
* **Vendre le Résultat, Pas les Fonctionnalités (*Sell Outcomes, Not Features*) :** Cadrer chaque écran autour de l'objectif final de l'enseignant. Montrer des projections de gain de temps (*« Votre cahier complet en 2 minutes »*) et des prévisualisations directes du carnet.
* **Déblocage Progressif de la Valeur (*Progressive Value Unlocking*) :** Permettre à l'utilisateur de configurer et tester son premier cahier avant d'imposer la création formelle d'un compte de synchronisation.
* **Personnalisation Multi-Intention (*Multi-Intent Personalization*) :** Permettre le choix combiné de plusieurs cycles (Collège + Lycée) ou de plusieurs matières dès le départ.
* **Découpage des Frictions (*Friction Partitioning*) :** Scinder les formulaires denses en micro-étapes focalisées pour minimiser la charge mentale.
* **Sensibilisation Pré-Permissions (*Permission Warm-Ups*) :** Toujours expliquer clairement le bénéfice enseignant (ex: rappel des séances, alertes évaluations) sur un écran dédié avant de déclencher les fenêtres de permissions système (notifications, installation PWA).

### 2. Micro-Interactions & UX Émotionnelle

| Type d'Interaction | Motif d'Interface (UI Pattern) | Impact Émotionnel |
| :--- | :--- | :--- |
| **Qualité Viscérale** | Squelettes avec shimmer GPU, micro-lueurs, transitions fluides de 150 à 300 ms | Signale rapidité, précision et maîtrise technique |
| **Confirmation d'Action** | Retour haptique doux (`impact('medium')`), physique de ressorts, animation morphing (coche de succès) | Rassure l'enseignant sur la prise en compte immédiate de sa saisie |
| **Éléments Tactiles** | Cartes interactives, jauges de progression dynamiques, bascules élastiques | Transforme la routine administrative en expérience plaisante |
| **Récupération Empathique** | Validation de champs en temps réel, formulations bienveillantes, guidage pas-à-pas | Prévient la frustration en cas d'erreur ou de coupure réseau |

### 3. Boucles d'Habitude & Systèmes de Rétention
* **Affichage Immédiat de la Personnalisation :** Présenter un tableau de bord pré-configuré aux couleurs de l'enseignant dès la fin de l'onboarding pour susciter le sentiment d'appropriation immédiat (*Effet d'IKEA*).
* **Récompense des Jalons (*Milestone Rewards*) :** Célébrer discrètement les accomplissements (semaine bouclée, programme avancé, régularité de tenue) par des indicateurs visuels intégrés.
* **Check-lists Persistantes :** Remplacer les visites guidées intrusives par un bloc de progression discret guidant la prise en main (ex: ajouter un horaire, tester une première séance).
* **Points de Contact Humains :** Soigner les messages d'accueil et le ton des communications pour valoriser le métier d'enseignant.

### 4. Feuille de Route d'Exécution
1. **Cartographier le Temps-vers-la-Valeur (*Time-to-Value*) :** Réduire au strict minimum les étapes entre l'ouverture de l'application et la première séance rédigée.
2. **Polir les 3 Actions Clés :** Sauvegarde de séance, assignation de date, et navigation inter-classes.
3. **Calibrer la Physique des Animations :** Maintenir les transitions strictement entre **150 ms et 300 ms** avec courbes *spring*.
4. **Mesurer l'Impact :** Taux d'activation dès le jour 1, régularité de saisie et fluidité perçue.



