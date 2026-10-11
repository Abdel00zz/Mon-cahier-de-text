# Système de Modales Ultra-Modernes & Dynamiques (Android Premium 2026)

## 1. Philosophie & Principes Directeurs
Le système de modales de l'application est conçu comme le **point d'interaction pivot** pour la saisie, l'édition, la configuration et la confirmation d'actions critiques. Il allie :
- **Liquid Glass Architecture & Glassmorphism WCAG AA** : Transparence calibrée (88-92%), `backdrop-filter: blur(16-24px) saturate(150%)`, liseré spéculaire supérieur (`inset 0 1px 0.5px`) garantissant un détachement net sur fond clair comme sur fond sombre sans compromettre le ratio de contraste de 4.5:1.
- **Accélération Matérielle GPU (60 FPS Constant)** : Seules les propriétés optimisées par le compositeur GPU (`transform`, `opacity`, `backdrop-filter`) sont animées avec `will-change: transform, opacity`.
- **Chorégraphie Spring Physics** : Entrée orchestrée en 3 temps (Backdrop $T+0\text{ms}$ $\rightarrow$ Surface modale $T+40\text{ms}$ avec ressort amorti $\rightarrow$ Éléments internes $T+120\text{ms}$ en cascade cadencée).
- **Morphing 3D Tactile au Glissement (Swipe-to-Dismiss)** : Suivi en temps réel de la progression (`--drag-progress`) avec micro-mise à l'échelle (`scale(calc(1 - var(--drag-progress) * 0.04))`) et perspective 3D douce (`rotateX(calc(var(--drag-progress) * 2.5deg))`).
- **Retours Haptiques Systématiques (`useModalHaptics`)** : Retours sensoriels calibrés pour chaque geste (ouverture douce, confirmation de succès, suppression sécurisée, sélection de niveau, expansion/repli de palier).

---

## 2. Tokens de Conception (`modal-premium-tokens.css`)

### 2.1. Courbes et Paramètres de Ressorts
| Token | Valeur CSS / Type | Rôle |
| :--- | :--- | :--- |
| `--modal-spring-bounce` | `cubic-bezier(0.16, 1.12, 0.3, 1)` | Rebond dynamique subtil sur actions positives |
| `--modal-spring-smooth` | `cubic-bezier(0.22, 1, 0.36, 1)` | Transition fluide et amortie pour la surface |
| `--modal-spring-snappy` | `cubic-bezier(0.4, 0, 0.2, 1)` | Clôture vive et immédiate sans latence |

### 2.2. Niveaux de Flou et Glassmorphism
| Token | Valeur | Usage |
| :--- | :--- | :--- |
| `--modal-blur-subtle` | `8px` | Voile de fond initial / appareils d'entrée de gamme |
| `--modal-blur-medium` | `16px` | Élévation standard (modales courantes) |
| `--modal-blur-intense` | `24px` | Élévation haute (actions critiques, création classe) |

### 2.3. Ombres d'Élévation Z
| Token | Valeur | Élévation (`data-elevation`) |
| :--- | :--- | :--- |
| `--modal-shadow-low` | `0 4px 14px -4px rgb(0 0 0 / 0.08)` | `low` : alertes légères, menus courts |
| `--modal-shadow-mid` | `0 12px 32px -12px rgb(0 0 0 / 0.18)` | `mid` (défaut) : modales standards |
| `--modal-shadow-high` | `0 24px 56px -16px rgb(0 0 0 / 0.28)` | `high` : formulaires denses, wizards |

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

## 4. Accessibilité & Dégradation Gracieuse

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
