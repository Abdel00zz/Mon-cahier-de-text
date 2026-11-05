# Système de Modales Ultra-Modernes & Dynamiques (Android Premium 2026)

## 1. Philosophie & Principes Directeurs
Le système de modales de l'application est conçu comme le **point d'interaction pivot** pour la saisie, l'édition, la configuration et la confirmation d'actions critiques. Il allie :
- **Verre discret et lisible** : Les fenêtres flottantes utilisent une surface presque opaque, un flou modéré et une bordure fine. Les textes restent portés par des surfaces opaques ; le verre est réservé aux barres collantes.
- **Mouvement court et coordonné** : Le voile entre en 200 ms, la surface en 260 ms et la fermeture en 180 ms. Les transitions CSS n'animent que `opacity` et `transform`; la poignée reste pilotée par la bibliothèque de feuilles pour éviter les conflits de gestes.
- **Gestes et viewport réels** : `react-modal-sheet` prend en charge le suivi du doigt, la vitesse et l'annulation du glissement. Le viewport visuel tient compte des barres système et du clavier.
- **Accessibilité intégrée** : Radix gère le focus, le retour au déclencheur et l'échappement ; les fenêtres imbriquées reçoivent une couche distincte. `prefers-reduced-motion` et `prefers-reduced-transparency` sont respectés.
- **Retours haptiques calibrés (`useModalHaptics`)** : Le socle commun confirme l'ouverture et la fermeture ; les actions de validation, d'erreur et de suppression restent déclenchées par leurs parcours métier.

---

## 2. Tokens de Conception (`modal-premium-tokens.css`)

### 2.1. Courbes et Paramètres de Ressorts
| Token | Valeur CSS / Type | Rôle |
| :--- | :--- | :--- |
| `--modal-spring-golden` | `cubic-bezier(0.19, 1, 0.22, 1)` | Retour souple sur les gestes |
| `--modal-spring-bounce` | `cubic-bezier(0.16, 1.08, 0.28, 1)` | Rebond léger sur les actions positives |
| `--modal-spring-smooth` | `cubic-bezier(0.18, 1.01, 0.24, 1)` | Transition amortie de la surface |
| `--modal-spring-snappy` | `cubic-bezier(0.24, 1.02, 0.35, 1)` | Réponse vive sans rebond |

Les durées effectivement utilisées par le socle sont centralisées dans
`modal-premium-tokens.css` : `--modal-timing-backdrop` (200 ms),
`--modal-timing-surface` (260 ms), `--modal-timing-content` (180 ms).

### 2.2. Niveaux de Flou et Glassmorphism
| Token | Valeur | Usage |
| :--- | :--- | :--- |
| `--modal-blur-subtle` | `10px` | Voile de fond |
| `--modal-blur-medium` | `18px` | Verre standard des modales |
| `--modal-blur-intense` | `26px` | Élévation haute (réservée aux cas spécifiques) |

### 2.3. Ombres d'Élévation Z
| Token | Valeur | Élévation (`data-elevation`) |
| :--- | :--- | :--- |
| `--modal-shadow-low` | `0 6px 18px -4px rgb(28 26 22 / 0.08)` | `low` : alertes légères, menus courts |
| `--modal-shadow-mid` | `0 16px 38px -12px rgb(28 26 22 / 0.16)` | `mid` (défaut) : modales standards |
| `--modal-shadow-high` | `0 28px 64px -14px rgb(28 26 22 / 0.24)` | `high` : formulaires denses, wizards |

### 2.4. Halos Lumineux Contextuels (`data-glow`)
| Variant | Token | Contexte d'application |
| :--- | :--- | :--- |
| `primary` | `--glow-primary` | Focus actif, découverte guidée |
| `success` | `--glow-success` | Formulaire valide, création réussie |
| `warning` | `--glow-warning` | Avertissement non-destructif |
| `danger` | `--glow-danger` | Suppression irréversible, remplacement base |

---

## 3. Composants et API

### 3.1. `ModalBottomSheet` & `Modal`
Props additionnelles ajoutées :
```typescript
export interface ModalBottomSheetProps {
  // ...props existantes (isOpen, onClose, title, description, children, footer, ...)
  
  /** Élévation et ombrage Z ('low' | 'mid' | 'high'). Par défaut 'mid'. */
  elevation?: 'low' | 'mid' | 'high';
  
  /** Glow contextuel subtil ('primary' | 'success' | 'warning' | 'danger'). */
  glow?: 'primary' | 'success' | 'warning' | 'danger';
}
```

### 3.2. Retours Haptiques (`useModalHaptics`)
```typescript
import { useModalHaptics } from '@/hooks/useModalHaptics';

const haptics = useModalHaptics();

// Méthodes disponibles :
haptics.onOpen();       // Vibration 'soft' à l'apparition
haptics.onClose();      // Vibration 'light' au rejet
haptics.onConfirm();    // Notification 'success' à la sauvegarde
haptics.onDelete();     // Notification 'warning' à la suppression
haptics.onError();      // Notification 'error' lors d'un échec
haptics.onSelect();     // Retour 'selection' pour listes et étapes
haptics.onExpand();     // Retour 'light' lors de l'expansion du palier
haptics.onCollapse();   // Retour 'soft' lors du repli du palier
```

### 3.3. Boutons avec Pulsation Subtile (`glow-pulse-*`)
Classes disponibles pour les actions primordiales :
- `.glow-pulse-primary` : Incitation à la découverte ou validation standard
- `.glow-pulse-danger` : Alerte de confirmation d'effacement
- `.glow-pulse-success` : Validation prête

### 3.4. État Vide Dédié (`ModalEmptyState`)
Conforme à la règle d'ergonomie "Jamais de surface vide passive" :
```tsx
import { ModalEmptyState } from '@/components/ui/ModalEmptyState';

<ModalEmptyState
  title="Aucune leçon programmée"
  description="Commencez par ajouter une nouvelle leçon pour cette classe."
  primaryAction={{
    label: "Ajouter une leçon",
    onClick: handleAddLesson,
  }}
/>
```

---

## 4. Téléphones : la fenêtre devient un écran (System UI)

Sous **768 px**, une fenêtre n'est plus une feuille posée sur la page : elle
remplit l'écran, bords vifs, et se lit comme une application système native
(One UI / Google Pixel).

| Règle | Réalisation (`modal-motion.css`) |
| --- | --- |
| Plein écran | `width/height: 100 %`, `max-height: var(--modal-visible-height)`, `border-radius: 0` |
| Zone visible réelle | `--modal-visible-height` suit clavier et barres système |
| En-tête et pied collants | `position: sticky` + verre `--ui-glass-bg` / `--ui-glass-filter` |
| Poignée masquée | `.modal-handle-region { display: none }` : plus de glissement à fermer |
| Entrée | `modal-fullscreen-in` — 260 ms, montée amortie, `prefers-reduced-motion` respecté |
| Corps opaque | seule la coque est en verre ; le texte reste à 4.5:1 |

Au-delà de 768 px, la fenêtre reste un dialogue flottant (rayon de 22 px, ou
28 px pour les dialogues liquides), centré dans la zone visible.

## 5. Branchement des fenêtres

Les fenêtres de formulaire, de réglage, de guide, d'édition et de consultation
passent par `Modal` (`modal.tsx`), qui délègue à `ModalBottomSheet`. Ce point
unique fournit le viewport, la pile, le focus, les gestes, les retours haptiques
et le cadre visuel.

Deux exceptions gardent leur sémantique ou leur placement propres tout en
partageant l'overlay et la pile de fenêtres :

- `ConfirmDialog` reste un `AlertDialog` Radix pour conserver la sémantique
  d'une décision critique ; son format compact est explicite.
- `CommandPalette` reste un dialogue de recherche ancré en haut de l'écran ;
  son voile, son animation et sa couche suivent les tokens communs.

Le guide d'installation PWA utilise désormais `Modal` comme les autres
parcours. Le bouton de fermeture standard et le bouton de pied de page
déclenchent ainsi le même cycle de fermeture.

Les fenêtres Aide et Paramètres gardent leur barre de titre (et le retour de
rubrique dans les Paramètres), sans filet sous l'en-tête ni bouton X. Elles
restent fermables par Échap ou en cliquant hors de la fenêtre.
Sur téléphone et tablette compacte (jusqu'à 1023 px), la barre de navigation
des trois sections est rendue dans la fenêtre elle-même : elle reste visible,
accessible au clavier et utilisable sans passer sous le voile plein écran.
Les fenêtres Aide et Paramètres occupent alors le viewport ; l'accueil des
Paramètres conserve deux colonnes et la carte d'aide ferme la dernière ligne.
La barre n'est pas ajoutée sur ordinateur.

## 6. Une surface, un filet, un accent

Les fenêtres ne portent plus de frise, de cannelure ni de dégradé coloré :

- `--modal-surface-bg` = `hsl(var(--card))`, la même surface que toutes les cartes ;
- `--modal-surface-tint` = un simple voile de lumière en haut (`linear-gradient`) ;
- `--modal-border-artistic` = `hsl(var(--border))`, un filet d'un pixel ;
- la couleur ne sert plus qu'au sens : action principale (`--primary`), succès,
  avertissement, destruction.

Les titres de fenêtre, de section et de contenu se calent toujours sur le bord
de lecture : plus de centrage systématique.

---

## 7. Accessibilité & Dégradation Gracieuse

1. **`prefers-reduced-motion`** :
   Toutes les animations de pulsations lumineuses (`.glow-pulse-*`), de ressorts et de transitions sont désactivées instantanément lorsque le système de l'enseignant le demande :
   ```css
   @media (prefers-reduced-motion: reduce) {
     .glow-pulse-primary, .glow-pulse-danger, .glow-pulse-success {
       animation: none !important;
     }
   }
   ```
2. **Support RTL Complet** :
   Tous les styles, poignées tactiles, marges intérieures et hiérarchies s'adaptent de droite à gauche sans perte de géométrie.
3. **Contrastes WCAG AA Validés** :
   Chaque teinte de texte et d'icône respecte scrupuleusement le ratio $\ge 4.5:1$ vis-à-vis du fond de la surface modale en mode clair comme en mode sombre.
