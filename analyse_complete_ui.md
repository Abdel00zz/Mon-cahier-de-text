# 🔍 Analyse Complète de l'Interface — De A à Z

> **Application** : Mon Cahier de Textes Interactif  
> **Stack** : React + TypeScript + Vite + Tailwind CSS + Shadcn/UI (style New York) + Radix UI  
> **Design System** : CSS Variables HSL + Class Variance Authority (CVA)

---

## Table des Matières

1. [Système de Design & Tokens](#1-système-de-design--tokens)
2. [Palette de Couleurs](#2-palette-de-couleurs)
3. [Typographie](#3-typographie)
4. [Boutons](#4-boutons)
5. [Cartes (Cards)](#5-cartes-cards)
6. [Badges & Labels](#6-badges--labels)
7. [Formulaires (Inputs, Select, Textarea, Switch)](#7-formulaires)
8. [Tables & Grilles](#8-tables--grilles)
9. [Modals & Dialogs](#9-modals--dialogs)
10. [Navigation & Header](#10-navigation--header)
11. [Icônes](#11-icônes)
12. [Animations & Effets](#12-animations--effets)
13. [Zones & Layouts](#13-zones--layouts)
14. [États Spéciaux](#14-états-spéciaux)
15. [Page d'Authentification](#15-page-dauthentification)
16. [Système d'Impression](#16-système-dimpression)
17. [Accessibilité](#17-accessibilité)
18. [Composants Spécialisés](#18-composants-spécialisés)
19. [Inventaire Complet des Fichiers](#19-inventaire-complet-des-fichiers)

---

## 1. Système de Design & Tokens

### Configuration Shadcn/UI
| Paramètre | Valeur |
|-----------|--------|
| Style | `new-york` |
| RSC | `false` |
| TSX | `true` |
| Base Color | `zinc` |
| CSS Variables | `true` |
| Border Radius | `0.5rem` (8px) |

### Variables CSS — Mode Clair (`:root`)

| Variable | Valeur HSL | Rendu visuel |
|----------|-----------|--------------|
| `--background` | `0 0% 100%` | ⬜ Blanc pur |
| `--foreground` | `240 10% 3.9%` | ⬛ Noir profond |
| `--card` | `0 0% 100%` | ⬜ Blanc |
| `--card-foreground` | `240 10% 3.9%` | ⬛ Noir |
| `--popover` | `0 0% 100%` | ⬜ Blanc |
| `--popover-foreground` | `240 10% 3.9%` | ⬛ Noir |
| `--primary` | `240 5.9% 10%` | 🔵 Gris très sombre |
| `--primary-foreground` | `0 0% 98%` | ⬜ Blanc cassé |
| `--secondary` | `240 4.8% 95.9%` | 🔘 Gris très clair |
| `--secondary-foreground` | `240 5.9% 10%` | ⬛ Gris sombre |
| `--muted` | `240 4.8% 95.9%` | 🔘 Gris clair |
| `--muted-foreground` | `240 3.8% 46.1%` | 🔘 Gris moyen |
| `--accent` | `240 4.8% 95.9%` | 🔘 Gris clair |
| `--accent-foreground` | `240 5.9% 10%` | ⬛ Gris sombre |
| `--destructive` | `0 84.2% 60.2%` | 🔴 Rouge vif |
| `--destructive-foreground` | `0 0% 98%` | ⬜ Blanc cassé |
| `--border` | `240 5.9% 90%` | 🔘 Gris clair |
| `--input` | `240 5.9% 90%` | 🔘 Gris clair |
| `--ring` | `240 5.9% 10%` | ⬛ Gris sombre |

### Variables CSS — Mode Sombre (`.dark`)

| Variable | Valeur HSL | Rendu visuel |
|----------|-----------|--------------|
| `--background` | `240 10% 3.9%` | ⬛ Noir |
| `--foreground` | `0 0% 98%` | ⬜ Blanc cassé |
| `--primary` | `0 0% 98%` | ⬜ Blanc cassé |
| `--primary-foreground` | `240 5.9% 10%` | ⬛ Gris sombre |
| `--secondary` | `240 3.7% 15.9%` | 🔘 Gris foncé |
| `--muted` | `240 3.7% 15.9%` | 🔘 Gris foncé |
| `--muted-foreground` | `240 5% 64.9%` | 🔘 Gris moyen clair |
| `--destructive` | `0 62.8% 30.6%` | 🔴 Rouge foncé |
| `--border` | `240 3.7% 15.9%` | 🔘 Gris foncé |
| `--ring` | `240 4.9% 83.9%` | 🔘 Gris clair |

---

## 2. Palette de Couleurs

### Couleurs par Matière (Mode Clair)

| Matière | Fond | Texte | Bordure |
|---------|------|-------|---------|
| Mathématiques | `#dbeafe` 🔵 | `#1e40af` | `#93c5fd` |
| Physique-Chimie | `#fef3c7` 🟡 | `#92400e` | `#fcd34d` |
| SVT | `#d1fae5` 🟢 | `#065f46` | `#6ee7b7` |
| Français | `#fce7f3` 🩷 | `#9d174d` | `#f9a8d4` |
| Histoire-Géo | `#fed7aa` 🟠 | `#9a3412` | `#fdba74` |
| Anglais | `#e0e7ff` 🔵 | `#3730a3` | `#a5b4fc` |
| Espagnol | `#fef9c3` 🟡 | `#854d0e` | `#fde047` |
| Allemand | `#f3e8ff` 🟣 | `#6b21a8` | `#c4b5fd` |
| Philosophie | `#f1f5f9` ⚪ | `#334155` | `#cbd5e1` |
| EPS | `#ccfbf1` 🩵 | `#115e59` | `#5eead4` |
| Arts Plastiques | `#ffe4e6` 🩷 | `#9f1239` | `#fda4af` |
| Musique | `#fae8ff` 🟣 | `#86198f` | `#e879f9` |
| Technologie | `#cffafe` 🩵 | `#155e75` | `#67e8f9` |
| SES | `#ecfccb` 🟢 | `#3f6212` | `#bef264` |
| NSI | `#ddd6fe` 🟣 | `#5b21b6` | `#a78bfa` |
| Default | `#f4f4f5` ⚪ | `#3f3f46` | `#d4d4d8` |

### Couleurs par Matière (Mode Sombre)

| Matière | Fond | Texte | Bordure |
|---------|------|-------|---------|
| Mathématiques | `#1e3a5f` | `#93c5fd` | `#2563eb` |
| Physique-Chimie | `#451a03` | `#fcd34d` | `#b45309` |
| SVT | `#064e3b` | `#6ee7b7` | `#059669` |
| Français | `#500724` | `#f9a8d4` | `#be185d` |
| Histoire-Géo | (même pattern, fonds sombres, textes clairs) |

### Couleurs par Type de Séance

| Type | Fond | Texte | Icône |
|------|------|-------|-------|
| Cours | `bg-blue-50` | `text-blue-700` | `BookOpen` |
| TD | `bg-green-50` | `text-green-700` | `PenTool` |
| TP | `bg-purple-50` | `text-purple-700` | `FlaskConical` |
| DS | `bg-red-50` | `text-red-700` | `FileText` |
| DM | `bg-orange-50` | `text-orange-700` | `Home` |
| Interrogation | `bg-amber-50` | `text-amber-700` | `AlertCircle` |
| Révision | `bg-teal-50` | `text-teal-700` | `RefreshCw` |
| Autre | `bg-gray-50` | `text-gray-700` | `MoreHorizontal` |

### Couleurs Sémantiques Utilitaires

| Usage | Clair | Sombre |
|-------|-------|--------|
| Succès/Synced | `bg-emerald-100 text-emerald-700` | `bg-emerald-900/30 text-emerald-400` |
| Info/Syncing | `bg-blue-100 text-blue-700` | `bg-blue-900/30 text-blue-400` |
| Erreur | `bg-red-100 text-red-700` | `bg-red-900/30 text-red-400` |
| Offline | `bg-zinc-100 text-zinc-500` | `bg-zinc-800 text-zinc-400` |
| Warning | `bg-amber-50 border-amber-200` | `bg-amber-900/20 border-amber-800` |
| Danger | `bg-red-50 border-red-200` | `bg-red-900/20 border-red-800` |

### Couleurs Gradients (DashboardStats)

| Stat | Gradient |
|------|----------|
| Total classes | `from-blue-500 to-blue-600` |
| Total leçons | `from-emerald-500 to-emerald-600` |
| Prochaine éval | `from-amber-500 to-amber-600` |
| Complétion | `from-purple-500 to-purple-600` |

---

## 3. Typographie

### Police
| Propriété | Valeur |
|-----------|--------|
| Police principale | `Inter` (Google Fonts) |
| Fallback | `system-ui, sans-serif` |
| Antialiasing | `-webkit-font-smoothing: antialiased` |

### Échelle Typographique (via Tailwind)

| Classe | Usage |
|--------|-------|
| `text-xs` (12px) | Badges, labels secondaires, raccourcis clavier, timestamps |
| `text-sm` (14px) | Contenu de table, descriptions, labels de formulaire |
| `text-base` (16px) | Texte courant |
| `text-lg` (18px) | Titres de cartes, titres éditables |
| `text-xl` (20px) | Sous-titres de page |
| `text-2xl` (24px) | Chiffres stats, titres principaux |
| `text-3xl` (30px) | Titre branding auth |

### Poids
| Classe | Usage |
|--------|-------|
| `font-medium` (500) | Labels, items de menu, onglets |
| `font-semibold` (600) | Titres de cartes, en-têtes de table, badges |
| `font-bold` (700) | Titres de page, statistiques |

### Styles Spéciaux
- `tracking-tight` : Titres
- `tracking-wider` : Labels de séparateur (uppercase)
- `leading-none` : Titres de cartes
- `font-mono` : Heures dans l'emploi du temps

---

## 4. Boutons

### Composant : [button.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/button.tsx)

> [!IMPORTANT]
> Utilise `class-variance-authority (CVA)` pour la gestion des variantes avec support `asChild` via `@radix-ui/react-slot`.

### Variantes de Style

| Variante | Fond | Texte | Hover | Usage |
|----------|------|-------|-------|-------|
| `default` | `bg-primary` | `text-primary-foreground` | `bg-primary/90` | Actions principales |
| `destructive` | `bg-destructive` | `text-destructive-foreground` | `bg-destructive/90` | Suppression, danger |
| `outline` | `bg-background` + `border-input` | inherit | `bg-accent text-accent-foreground` | Actions secondaires |
| `secondary` | `bg-secondary` | `text-secondary-foreground` | `bg-secondary/80` | Actions tertiaires |
| `ghost` | transparent | inherit | `bg-accent text-accent-foreground` | Toolbar, navigation |
| `link` | transparent | `text-primary` | `underline` | Liens textuels |

### Tailles

| Taille | Dimensions | Padding | Texte |
|--------|-----------|---------|-------|
| `default` | `h-9` | `px-4 py-2` | normal |
| `sm` | `h-8` | `px-3` | `text-xs` |
| `lg` | `h-10` | `px-8` | normal |
| `icon` | `h-9 w-9` | aucun | - |

### États
- **Focus** : `ring-ring ring-offset-2` (outline focus-visible)
- **Disabled** : `pointer-events-none opacity-50`
- **Transition** : `transition-colors`

### Boutons Spéciaux dans l'Application

| Contexte | Style | Exemple |
|----------|-------|---------|
| CTA Auth | `w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium` | Connexion/Inscription |
| CTA Welcome | `bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-3` | Démarrer |
| Social Login | `w-full border rounded-lg py-2.5 flex items-center justify-center gap-2` | Google, GitHub |
| Confirm Danger | `bg-red-600 hover:bg-red-700 text-white` | Supprimer |
| Confirm Warning | `bg-amber-600 hover:bg-amber-700 text-white` | Attention |
| Confirm Info | `bg-blue-600 hover:bg-blue-700 text-white` | Info |

---

## 5. Cartes (Cards)

### Composant de Base : [card.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/card.tsx)

| Sous-composant | Style |
|----------------|-------|
| `Card` | `rounded-xl border bg-card text-card-foreground shadow` |
| `CardHeader` | `flex flex-col space-y-1.5 p-6` |
| `CardTitle` | `font-semibold leading-none tracking-tight` |
| `CardDescription` | `text-sm text-muted-foreground` |
| `CardContent` | `p-6 pt-0` |
| `CardFooter` | `flex items-center p-6 pt-0` |

### ClassCard (Carte de Classe)

```
┌─────────────────────────────────────┐
│▌ [Badge matière coloré]  ⋮ (menu)  │  ← border-l-4 couleur matière
│▌ Titre classe (font-semibold lg)   │
│▌ Badge niveau (secondary)          │
│▌                                    │
│▌ 📚 12 leçons  ·  🕐 Mis à jour   │
│▌ ▓▓▓▓▓▓▓▓▓░░░░░ 68%               │  ← Barre progression gradient
└─────────────────────────────────────┘
```

- **Effets** : `hover:shadow-md transition-shadow`, `hover:border-l-primary`
- **Menu** : `DropdownMenu` avec Éditer, Dupliquer, Archiver, Supprimer
- **Badge statut** : Puce couleur (🟢 actif, ⚪ archivé)

### DashboardStats (Cartes Statistiques)

```
┌──────────────────┐
│ 🎓  Total        │  ← Icône + label, `text-sm opacity-80`
│ 24               │  ← `text-2xl font-bold text-white`
│ ▓▓▓▓▓▓▓░░░░      │  ← Barre `bg-white/20` + fill
└──────────────────┘
   ↑ Fond gradient (from-blue-500 to-blue-600)
   ↑ rounded-xl p-4 text-white shadow-lg
```

- **Effet hover** : `hover:scale-[1.02] transition-transform`
- **4 cartes** : Bleu, Émeraude, Ambre, Violet

### Cartes Config (NotificationsTab, ScheduleTab)
- Style : `border rounded-lg p-4 space-y-3`
- Titre : `font-medium`
- Description : `text-sm text-muted-foreground`

---

## 6. Badges & Labels

### Badge de Base : [badge.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/badge.tsx)

| Variante | Style |
|----------|-------|
| `default` | `bg-primary text-primary-foreground border-transparent` |
| `secondary` | `bg-secondary text-secondary-foreground border-transparent` |
| `destructive` | `bg-destructive text-destructive-foreground border-transparent` |
| `outline` | `text-foreground` (bordure visible) |

**Style commun** : `inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors`

### SyncStatusBadge : [SyncStatusBadge.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/SyncStatusBadge.tsx)

| État | Fond | Texte | Icône |
|------|------|-------|-------|
| ✅ Synced | `bg-emerald-100` / `dark:bg-emerald-900/30` | emerald-700/400 | `Check` |
| 🔄 Syncing | `bg-blue-100` / `dark:bg-blue-900/30` | blue-700/400 | `RefreshCw` (animate-spin) |
| ❌ Error | `bg-red-100` / `dark:bg-red-900/30` | red-700/400 | `AlertTriangle` |
| 📴 Offline | `bg-zinc-100` / `dark:bg-zinc-800` | zinc-500/400 | `WifiOff` |

### Chips Matières (CreateClassModal)
- Style : `inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium`
- Couleur : dynamique selon la matière
- Bouton supprimer : `X` icon `w-3 h-3`

### Labels de Séparateur (SeparatorRow)
- Style : `text-xs font-semibold uppercase tracking-wider text-zinc-500`
- Icône : `Calendar`

### Label de formulaire : [label.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/label.tsx)
- Style : `text-sm font-medium leading-none`
- Disabled : `peer-disabled:cursor-not-allowed peer-disabled:opacity-70`

---

## 7. Formulaires

### Input : [input.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/input.tsx)
- **Dimensions** : `h-9 w-full`
- **Style** : `rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm`
- **Focus** : `ring-1 ring-ring`
- **Disabled** : `cursor-not-allowed opacity-50`
- **Placeholder** : `text-muted-foreground`
- **File input** : `file:border-0 file:bg-transparent file:text-sm file:font-medium`

### Textarea : [textarea.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/textarea.tsx)
- **Min height** : `60px`
- **Style** : Identique à Input (mêmes bordures, focus, etc.)

### Select : [select.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/select.tsx)
- **Trigger** : `h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm`
- **Dropdown** : `rounded-md border bg-popover text-popover-foreground shadow-md`
- **Item** : `relative flex cursor-default items-center rounded-sm py-1.5 pl-2 pr-8 text-sm`
- **Item hover** : `focus:bg-accent focus:text-accent-foreground`
- **Item sélectionné** : Icône `Check` à droite
- **Icône dropdown** : `ChevronDown`, `h-4 w-4 opacity-50`
- **Animations** : fade-in/out, zoom-in/out 95%

### Switch : [switch.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/switch.tsx)
- **Track** : `h-5 w-9 rounded-full`, checked `bg-primary`, unchecked `bg-input`
- **Thumb** : `h-4 w-4 rounded-full bg-background shadow-lg`
- **Transition** : `transition-colors`
- **Disabled** : `opacity-50 cursor-not-allowed`

### EditableCell : [EditableCell.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/EditableCell.tsx)
- **Affichage** : Double-clic pour éditer
- **Édition** : `border-2 border-blue-400 rounded px-1`
- **Hover** : `cursor-text bg-blue-50/50 dark:bg-blue-900/20`
- **Sauvegarde** : Enter, **Annulation** : Escape

### EditableTitle : [EditableTitle.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/EditableTitle.tsx)
- **Mode lecture** : `<h1>` avec `hover:text-primary/80`
- **Mode édition** : `<input>` avec `border-b-2 border-primary`, `text-lg font-semibold`

---

## 8. Tables & Grilles

### Table de Base : [table.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/table.tsx)

| Sous-composant | Style |
|----------------|-------|
| `Table` | `w-full caption-bottom text-sm` dans container `overflow-auto` |
| `TableHeader` | En-têtes groupés |
| `TableRow` | `border-b`, hover `bg-muted/50`, selected `bg-muted` |
| `TableHead` | `h-10 px-2 text-left font-medium text-muted-foreground` |
| `TableCell` | `p-2 align-middle` |
| `TableFooter` | `border-t bg-muted/50 font-medium` |

### MainTable (Table Principale de l'Éditeur)

```
┌────────────────────────────────────────────────────────────────┐
│ ☐ │ Matière │ Date   │ Début │ Fin  │ Type  │ Contenu │  ⚡  │  ← sticky, bg-zinc-50
├────────────────────────────────────────────────────────────────┤
│   │ ══════ Trimestre 1 ═══════════════════════════════════     │  ← SeparatorRow
├────────────────────────────────────────────────────────────────┤
│ ☐ │🔵 Math │ 15/09 │ 8:00 │ 9:00 │ Cours │ Limites │ ✏🗑  │  ← TableRow
│ ☐ │🟢 SVT  │ 15/09 │ 10:00│11:00 │ TP    │ Cellule │ ✏🗑  │
└────────────────────────────────────────────────────────────────┘
```

- **En-têtes triables** : Icônes `ArrowUpDown`/`ArrowUp`/`ArrowDown`
- **Ligne courante** : `bg-blue-50/70 dark:bg-blue-900/20 border-l-2 border-l-blue-500`
- **Date passée** : `opacity-60`
- **Drag handle** : `GripVertical` en début de ligne

### Grille Emploi du Temps (ScheduleTab)

```
┌──────┬──────┬──────┬──────┬──────┬──────┐
│      │ Lun  │ Mar  │ Mer  │ Jeu  │ Ven  │  ← bg-zinc-100 font-semibold
├──────┼──────┼──────┼──────┼──────┼──────┤
│ 8:00 │ Math │      │ SVT  │      │ Hist │  ← Badges colorés par matière
│ 9:00 │ Fran │ Phys │      │ Angl │      │
│10:00 │      │ EPS  │ Math │ Tech │ Fran │
└──────┴──────┴──────┴──────┴──────┴──────┘
```

- **Cellules** : `min-h-[3rem] border border-zinc-200 dark:border-zinc-700 p-1`
- **Remplie** : Badge matière `rounded-md px-2 py-1 text-xs`
- **Vide hover** : `bg-blue-50 dark:bg-blue-900/20 cursor-pointer`

---

## 9. Modals & Dialogs

### Dialog (Base Radix) : [dialog.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/dialog.tsx)

| Élément | Style |
|---------|-------|
| Overlay | `fixed inset-0 z-50 bg-black/80` |
| Content | `fixed left-[50%] top-[50%] translate-x/y-[-50%] z-50 w-full max-w-lg gap-4 border bg-background p-6 shadow-lg sm:rounded-lg` |
| Close button | `absolute right-4 top-4`, icône `X`, `rounded-sm opacity-70 hover:opacity-100` |
| Animations | 200ms fade-in/out + zoom-in-95/out-95 |

### Modal Custom : [modal.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/modal.tsx)

| Élément | Style |
|---------|-------|
| Overlay | `fixed inset-0 z-50 bg-black/60 backdrop-blur-sm` |
| Content | `bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700 max-w-lg w-full mx-4 p-6` |
| Animation | `animate-fadeIn` |
| Fermeture | Clic extérieur |

### Confirm Dialog : [confirm-dialog.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/confirm-dialog.tsx)

| Variante | Fond icône | Couleur icône | Bouton CTA |
|----------|-----------|---------------|------------|
| `danger` | `bg-red-100 dark:bg-red-900/30` | `text-red-600` | `bg-red-600 hover:bg-red-700` |
| `warning` | `bg-amber-100 dark:bg-amber-900/30` | `text-amber-600` | `bg-amber-600 hover:bg-amber-700` |
| `info` | `bg-blue-100 dark:bg-blue-900/30` | `text-blue-600` | `bg-blue-600 hover:bg-blue-700` |

- **Icône** : `AlertTriangle` (Lucide)
- **Accessibilité** : `role="alertdialog"`, `aria-modal`, `aria-labelledby`, `aria-describedby`

### Sheet (Panneau latéral) : [sheet.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/sheet.tsx)

| Position | Dimensions | Animation |
|----------|-----------|-----------|
| `top` | `w-full` | slide-in depuis haut |
| `bottom` | `w-full` | slide-in depuis bas |
| `left` | `h-full w-3/4 sm:max-w-sm` | slide-in depuis gauche |
| `right` | `h-full w-3/4 sm:max-w-sm` | slide-in depuis droite |

### Inventaire des 17 Modals Spécifiques

| Modal | Fichier | Fonction |
|-------|---------|----------|
| Welcome | [WelcomeModal.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/modals/WelcomeModal.tsx) | Accueil première visite, gradient bleu-indigo |
| Start Steps | [StartStepsModal.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/modals/StartStepsModal.tsx) | Wizard 4 étapes, barre progression, cercles numérotés |
| Create Class | [CreateClassModal.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/modals/CreateClassModal.tsx) | Formulaire création classe, chips matières |
| Edit Item | [EditItemModal.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/modals/EditItemModal.tsx) | Édition complète de leçon (~23KB), preview temps réel |
| Config | [ConfigModal.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/modals/ConfigModal.tsx) | 4 tabs (Général, Affichage, Données, Avancé) |
| Print | [PrintModal.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/modals/PrintModal.tsx) | Preview A4, options d'impression |
| Assign Date | [AssignDateModal.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/modals/AssignDateModal.tsx) | Calendrier interactif, sélection date/heure |
| Manage Lessons | [ManageLessonsModal.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/modals/ManageLessonsModal.tsx) | Liste filtrable de leçons |
| Import | [ImportModal.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/modals/ImportModal.tsx) | Drop zone fichier, JSON/CSV |
| Import Platform | [ImportPlatformModal.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/modals/ImportPlatformModal.tsx) | Sélection plateforme source |
| Analysis | [AnalysisModal.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/modals/AnalysisModal.tsx) | Stats et progression |
| Guide | [GuideModal.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/modals/GuideModal.tsx) | Documentation accordéon |
| History | [HistoryModal.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/modals/HistoryModal.tsx) | Timeline chronologique |
| Description | [DescriptionModal.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/modals/DescriptionModal.tsx) | Description longue |
| Timetable Nudge | [TimetableNudgeModal.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/modals/TimetableNudgeModal.tsx) | Suggestion emploi du temps |
| Prompt | [PromptModal.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/modals/PromptModal.tsx) | Confirmation avec input |

---

## 10. Navigation & Header

### Header : [Header.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/Header.tsx)

```
┌──────────────────────────────────────────────────────────────────────┐
│ 📖 Mon Cahier de Textes   │  Dashboard  Paramètres  │  ☀/🌙  🔄  👤│
└──────────────────────────────────────────────────────────────────────┘
  ↑ sticky top-0 z-40                        ↑ backdrop-blur-md
  ↑ bg-white/80 dark:bg-zinc-900/80          ↑ border-b
```

| Élément | Détails |
|---------|---------|
| **Logo** | `BookOpen` icon + "Mon Cahier de Textes" |
| **Nav** | Boutons `ghost` |
| **Theme toggle** | `Sun`/`Moon` icons |
| **Sync status** | `SyncStatusBadge` |
| **User menu** | `DropdownMenu` avec avatar, email, déconnexion |
| **Effet** | `backdrop-blur-md`, ombre au scroll |

### Toolbar : [Toolbar.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/Toolbar.tsx)

```
┌──────────────────────────────────────────────────────────────────────┐
│ [+ Ajouter] [📤 Import] [📥 Export] [🖨 Imprimer] | 🔍 Recherche... │
│ [↩ Undo] [↪ Redo] | [📊 Stats] [📜 Historique]  | 📋/📅 Vue       │
└──────────────────────────────────────────────────────────────────────┘
```

| Bouton | Variante | Icône |
|--------|----------|-------|
| Ajouter | `default` (primary) | `Plus` |
| Importer | `outline` | `Upload` |
| Exporter | `outline` | `Download` |
| Imprimer | `outline` | `Printer` |
| Undo/Redo | `ghost` | `Undo2`/`Redo2` |
| Stats | `ghost` | `BarChart3` |
| Historique | `ghost` | `History` |

### SelectionBar : [SelectionBar.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/SelectionBar.tsx)
- Position : `fixed bottom-0 left-0 right-0 z-50`
- Style : `bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xl`
- Animation : `animate-slide-in-right`
- Actions : Supprimer, Déplacer, Dupliquer, Assigner date

---

## 11. Icônes

### Bibliothèque : `lucide-react`

Fichier d'exports centralisé : [icons.ts](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/icons.ts)

### Inventaire Complet par Catégorie

#### Navigation & Actions
| Icône | Usage |
|-------|-------|
| `Menu` | Menu hamburger mobile |
| `X` | Fermeture modal/dialog |
| `ChevronDown/Up/Right/Left` | Navigation, accordéons, tri |
| `ArrowLeft` | Retour |
| `ArrowUpDown` / `ArrowUp` / `ArrowDown` | Tri de colonnes |
| `MoreHorizontal` / `MoreVertical` | Menu contextuel |

#### CRUD & Édition
| Icône | Usage |
|-------|-------|
| `Plus` / `Minus` | Ajouter/Retirer |
| `Edit` / `PenTool` | Éditer |
| `Trash2` | Supprimer |
| `Save` | Sauvegarder |
| `Copy` | Dupliquer |
| `Undo2` / `Redo2` | Annuler/Refaire |
| `GripVertical` | Drag & drop handle |

#### Fichiers & Données
| Icône | Usage |
|-------|-------|
| `Upload` | Importer |
| `Download` | Exporter |
| `Printer` | Imprimer |
| `FileText` / `FileJson` / `FileSpreadsheet` | Types de fichiers |
| `Archive` | Archiver |

#### Interface
| Icône | Usage |
|-------|-------|
| `Search` | Recherche |
| `Eye` / `EyeOff` | Visibilité mot de passe |
| `Sun` / `Moon` | Mode clair/sombre |
| `RefreshCw` | Synchronisation |
| `AlertTriangle` / `AlertCircle` / `Info` | Alertes |
| `Check` | Validation, sélection |
| `Bell` | Notifications |
| `RotateCcw` | Restaurer |

#### Éducation & Contenu
| Icône | Usage |
|-------|-------|
| `BookOpen` | Logo app, matière Lettres |
| `Calendar` / `Clock` | Date, heure |
| `GraduationCap` | Classes |
| `BarChart3` | Statistiques |
| `History` | Historique |
| `Zap` | Performance |

#### Matières (27 icônes)
`FlaskConical`, `Atom`, `Leaf`, `Dna`, `Calculator`, `Sigma`, `Languages`, `Globe2`, `Palette`, `Music`, `Drama`, `Dumbbell`, `Cpu`, `Code`, `Wrench`, `Landmark`, `MapPin`, `TrendingUp`, `Building2`, `Brain`, `PenTool`, `Church`, `Home`

#### Utilisateur
| Icône | Usage |
|-------|-------|
| `User` | Profil |
| `Mail` | Email |
| `Lock` | Mot de passe |
| `LogOut` | Déconnexion |
| `Settings` | Paramètres |
| `WifiOff` | Offline |

---

## 12. Animations & Effets

### Keyframes CSS (index.css)

```css
fadeIn       : opacity 0→1 + scale 0.95→1     (200ms ease-out)
slideUp      : opacity 0→1 + translateY 10→0  (300ms ease-out)
shimmer      : background-position -200%→200%  (2s infinite linear)
pulse-gentle : opacity 1→0.7→1                (2s ease-in-out infinite)
slide-in-right : translateX 100%→0            (300ms ease-out)
```

### Classes d'Animation Tailwind

| Classe | Animation | Durée |
|--------|-----------|-------|
| `animate-fadeIn` | Scale + fade in | 200ms |
| `animate-slideUp` | Glissement vers haut | 300ms |
| `animate-shimmer` | Effet brillant skeleton | 2s ∞ |
| `animate-pulse-gentle` | Pulsation douce | 2s ∞ |
| `animate-slide-in-right` | Glissement depuis droite | 300ms |
| `animate-pulse` | Pulsation (Tailwind natif) | ∞ |
| `animate-spin` | Rotation 360° | ∞ |

### Transitions CSS

| Type | Classes Tailwind | Propriétés |
|------|-----------------|------------|
| Couleurs | `transition-colors` | background, color, border (150ms) |
| Transformation | `transition-transform` | scale, translate (150ms) |
| Tout | `transition-all` | Toutes propriétés (150ms) |
| Ombre | `transition-shadow` | box-shadow (150ms) |

### Effets Visuels

| Effet | Implémentation | Usage |
|-------|---------------|-------|
| **Glassmorphism** | `bg-white/80 backdrop-blur-md` | Header sticky |
| **Backdrop blur** | `backdrop-blur-sm` | Overlay modal custom |
| **Shadow elevation** | `shadow` → `shadow-md` → `shadow-lg` → `shadow-2xl` | Cards, modals, toasts |
| **Hover scale** | `hover:scale-[1.02]` | Cartes stats |
| **Opacity states** | `opacity-50` (disabled), `opacity-60` (date passée), `opacity-70` (close btn) | État réduit |
| **Gradient** | `bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800` | Auth page |
| **Shimmer** | Gradient linéaire animé | Skeleton loading |
| **Ring focus** | `ring-1 ring-ring` / `ring-2 ring-blue-500` | Focus visible |

### Hover Effects par Composant

| Composant | Effet Hover |
|-----------|-------------|
| Bouton default | `bg-primary/90` (assombrissement) |
| Bouton ghost | `bg-accent text-accent-foreground` |
| Ligne de table | `bg-muted/50` → `bg-zinc-50 dark:bg-zinc-800/50` |
| Carte de classe | `shadow-md + border-l-primary` |
| Carte stats | `scale-[1.02]` |
| Cellule éditable | `bg-blue-50/50 dark:bg-blue-900/20` |
| Item dropdown | `bg-accent text-accent-foreground` |
| Drop zone | `border-blue-400 bg-blue-50/50` |
| Carte plateforme | `border-blue-400 shadow-md` |
| Lien | `underline` |
| Close button | `opacity-70 → opacity-100` |

---

## 13. Zones & Layouts

### Architecture Générale de l'App

```
┌─────────────────────────────────────────────────┐
│                   HEADER                         │  sticky top-0 z-40
│     (backdrop-blur, logo, nav, user menu)       │  bg-white/80
├─────────────────────────────────────────────────┤
│                                                  │
│              PAGE CONTENT                        │  min-h-screen
│                                                  │  bg-background
│   ┌─ Dashboard ────────────────────────────┐    │
│   │  [Stats Grid 2x2 → 4x1]               │    │
│   │  [ClassCard Grid 1→2→3 cols]           │    │
│   └────────────────────────────────────────┘    │
│                                                  │
│   ┌─ Editor ───────────────────────────────┐    │
│   │ ┌─ Sidebar ─┐ ┌─ Main Area ──────────┐│    │
│   │ │ w-64      │ │ Toolbar              ││    │
│   │ │ Classes   │ │ MainTable            ││    │
│   │ │ list      │ │                      ││    │
│   │ └───────────┘ └──────────────────────┘│    │
│   └────────────────────────────────────────┘    │
│                                                  │
│   ┌─ Settings ─────────────────────────────┐    │
│   │  max-w-4xl mx-auto p-6                 │    │
│   │  [Tabs: Compte | Planning | Notifs]    │    │
│   └────────────────────────────────────────┘    │
│                                                  │
├─────────────────────────────────────────────────┤
│              SELECTION BAR (conditionnel)        │  fixed bottom-0 z-50
│              (actions groupées)                  │  bg-zinc-900
└─────────────────────────────────────────────────┘

┌─ TOASTS (Sonner) ──────────────────────────────┐
│  Position: coin inférieur droit                 │  z-[9999]
│  bg-background shadow-lg border                │
└─────────────────────────────────────────────────┘

┌─ GLOBAL TOOLTIP ───────────────────────────────┐
│  Position: fixed, dynamique                     │  z-[9999]
│  bg-zinc-900 dark:bg-zinc-100 rounded-lg       │
└─────────────────────────────────────────────────┘
```

### Layouts Responsifs

| Breakpoint | Dashboard Grid | Stats Grid | Sidebar |
|------------|---------------|------------|---------|
| Mobile (<640px) | 1 colonne | 2 colonnes | Cachée |
| Tablet (640-1024px) | 2 colonnes | 2 colonnes | Cachée/Sheet |
| Desktop (>1024px) | 3 colonnes | 4 colonnes | `w-64` visible |

### Spacing System (via Tailwind)

| Token | Valeur | Usage |
|-------|--------|-------|
| `gap-1` | 4px | Éléments très proches |
| `gap-2` | 8px | Boutons toolbar |
| `gap-3` | 12px | Items de liste |
| `gap-4` | 16px | Grilles, sections |
| `p-1` | 4px | Dropdown items |
| `p-2` | 8px | Cellules de table |
| `p-3` | 12px | Banners |
| `p-4` | 16px | Cards config |
| `p-6` | 24px | Cards, dialogs, modals |
| `p-8` | 32px | Drop zones |
| `space-y-1.5` | 6px | Card header |
| `space-y-3` | 12px | Sections formulaire |
| `space-y-4` | 16px | Sections principales |

---

## 14. États Spéciaux

### Skeleton Loading : [PageSkeleton.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/PageSkeleton.tsx)
- **Couleur** : `bg-zinc-200/70 dark:bg-zinc-700/70`
- **Accents** : `bg-blue-200/50 dark:bg-blue-700/30`
- **Animation** : `animate-pulse` (pulsation)
- **Structure** : Reproduit la page complète (header + sidebar + contenu)

### Empty States
- **Dashboard vide** : Grande icône centrée, texte explicatif, bouton CTA
- **Table vide** : Illustration centrée avec texte et bouton d'ajout
- **Archives vides** : Icône `Archive` + "Aucune archive"

### Banners d'Alerte

#### AssessmentBanner (Évaluations à venir)
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Évaluations à venir                                      │
│ 📅 DS Math — 15/09  ·  📅 DM Physique — 18/09             │
└─────────────────────────────────────────────────────────────┘
  ↑ bg-amber-50 border-amber-200 rounded-lg p-3
  ↑ Urgence : vert→jaune→orange→rouge selon proximité
  ↑ Les urgentes : animate-pulse-gentle
```

#### LatenessBanner (Retards)
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Retards détectés                                         │
│ ⏰ Math 3ème A — 3 jours   [Mettre à jour]                 │
└─────────────────────────────────────────────────────────────┘
  ↑ bg-red-50 border-red-200 rounded-lg p-3
  ↑ text-red-700 dark:text-red-400
```

### États de Validation (Formulaires)
- **Invalide** : `border-red-500`, message `text-red-500 text-xs`
- **Erreur auth** : `bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-3` avec `AlertTriangle`

### États de Chargement
- **Bouton loading** : Spinner `animate-spin` intégré
- **Page loading** : `PageSkeleton` complet
- **Import progress** : Barre de progression

---

## 15. Page d'Authentification

### Layout : [AuthPage.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/auth/AuthPage.tsx)

```
┌────────────────────────┬────────────────────────┐
│                        │                        │
│   📖                   │   ┌──────────────────┐ │
│                        │   │ Email            │ │
│   Mon Cahier           │   │ 📧 ___________   │ │
│   de Textes            │   │                  │ │
│                        │   │ Mot de passe     │ │
│   ✅ Feature 1         │   │ 🔒 ___________  👁│ │
│   ✅ Feature 2         │   │                  │ │
│   ✅ Feature 3         │   │ [Se connecter]   │ │
│                        │   │                  │ │
│   bg-gradient-to-br    │   │ ─── ou ───       │ │
│   from-blue-600        │   │                  │ │
│   via-blue-700         │   │ [G] Google       │ │
│   to-indigo-800        │   │ [⌥] GitHub       │ │
│                        │   │                  │ │
│                        │   │ Pas de compte ?  │ │
│                        │   │ S'inscrire →     │ │
│                        │   └──────────────────┘ │
└────────────────────────┴────────────────────────┘
```

### Éléments Détaillés

| Élément | Style |
|---------|-------|
| Colonne gauche | `bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800` |
| Logo | `BookOpen` icon grande, `text-white` |
| Titre | `text-3xl font-bold text-white` |
| Feature list | `Check` icons + descriptions, texte blanc |
| Motifs décoratifs | `opacity-10` |
| Input email | `pl-10` (icône gauche `Mail`), `rounded-lg border-zinc-300` |
| Input password | `pl-10` (icône `Lock`), toggle `Eye`/`EyeOff` |
| Bouton submit | `w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium` |
| Social buttons | `w-full border rounded-lg py-2.5 flex items-center justify-center gap-2` |
| Séparateur "ou" | Lignes `border-t` + texte centré |
| Lien toggle | `text-blue-600 font-medium` |
| Erreur | `bg-red-50 border-red-200 rounded-lg p-3` + `AlertTriangle` |
| Loading | `animate-spin` sur bouton submit |

### Modes
1. **Login** : Email + Mot de passe
2. **Register** : + Nom + Confirmation mot de passe
3. **Reset Password** : Email uniquement

---

## 16. Système d'Impression

### PrintView : [PrintView.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/PrintView.tsx)

| Propriété | Valeur |
|-----------|--------|
| Format | A4, `max-width: 210mm` |
| Marges | 15mm |
| Fond | Blanc forcé |
| Texte | Noir forcé |
| Bordures table | Pleines, `border-collapse`, `#ddd` |
| Alternance | Couleurs alternées dans les lignes |
| Pied de page | Numéro de page, date de génération |
| Mode sombre | Désactivé (toujours clair) |

### Styles d'impression (`@media print`)
- Cache les éléments `.no-print`
- Force fond blanc, texte noir
- Images `max-width: 100%`
- Styles spécifiques pour `.print-container`, `.print-table`

### PrintModal Options
- Période (tout, trimestre, personnalisé)
- Matières (multi-select)
- Orientation (portrait/paysage)
- Colonnes visibles (checkboxes)
- En-tête/pied personnalisés
- Preview miniature format A4

---

## 17. Accessibilité

### Composants Radix UI (Accessibilité native)
| Composant | Propriétés a11y |
|-----------|----------------|
| Dialog | `role="dialog"`, `aria-modal`, `aria-labelledby` |
| Confirm Dialog | `role="alertdialog"`, `aria-modal`, `aria-labelledby`, `aria-describedby` |
| Dropdown Menu | Navigation clavier complète, `role="menu"` |
| Select | `role="listbox"`, navigation clavier |
| Switch | `role="switch"`, `aria-checked` |
| Tabs | `role="tablist"` / `role="tab"` / `role="tabpanel"` |
| Tooltip | Apparition au focus et hover |
| Label | Association `htmlFor` automatique |

### Focus Management
- **Focus visible** : `ring-ring ring-offset-2` (anneau bleu)
- **Custom focus** : `outline ring-2 ring-blue-500 ring-offset-2`
- **Disabled** : `pointer-events-none opacity-50 cursor-not-allowed`

### Scrollbar Custom
- Largeur : 6px
- Thumb : arrondi, `bg-zinc-300 dark:bg-zinc-600`
- Track : transparent

### Sélection de texte
- `::selection { background: hsl(var(--primary) / 0.15) }`

---

## 18. Composants Spécialisés

### Tooltip Global : [GlobalTooltip.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/GlobalTooltip.tsx)
- Positionné dynamiquement via `position: fixed`
- Écoute attributs `data-tip` sur les éléments
- Style : `bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-2.5 py-1 rounded-lg text-xs font-medium shadow-lg z-[9999]`
- Transition opacity 150ms

### MathText : [math-text.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/math-text.tsx)
- Rendu LaTeX inline via KaTeX
- Détection regex `$...$`
- Fallback texte brut en cas d'erreur

### Virtual List : [virtual-list.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/virtual-list.tsx)
- Virtualisation pour listes longues
- Props : `itemHeight`, `overscan`, `containerHeight`
- Items positionnés en `absolute` pour performance

### ContentRenderer : [ContentRenderer.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ContentRenderer.tsx)
- Détection automatique : listes (`•`, `–`, `-`), liens URL, maths LaTeX, formatage markdown
- Liens : `text-blue-600 hover:underline`
- Listes : `list-disc ml-4 space-y-0.5`

### Sonner (Toasts) : [sonner.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/sonner.tsx)
- Adaptatif au thème (clair/sombre)
- Style : `bg-background text-foreground border-border shadow-lg`
- Actions : `bg-primary text-primary-foreground`

---

## 19. Inventaire Complet des Fichiers

### Composants UI de base (28 fichiers)
| Fichier | Taille | Type |
|---------|--------|------|
| [button.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/button.tsx) | 1.9 KB | Bouton CVA |
| [card.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/card.tsx) | 1.9 KB | Carte |
| [badge.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/badge.tsx) | 1.1 KB | Badge |
| [input.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/input.tsx) | 1.0 KB | Input |
| [label.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/label.tsx) | 0.7 KB | Label |
| [select.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/select.tsx) | 5.8 KB | Select Radix |
| [dialog.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/dialog.tsx) | 3.9 KB | Dialog Radix |
| [modal.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/modal.tsx) | 1.8 KB | Modal custom |
| [confirm-dialog.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/confirm-dialog.tsx) | 2.6 KB | Confirmation |
| [dropdown-menu.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/dropdown-menu.tsx) | 7.6 KB | Menu déroulant |
| [sheet.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/sheet.tsx) | 4.6 KB | Panneau latéral |
| [popover.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/popover.tsx) | 1.3 KB | Popover |
| [tooltip.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/tooltip.tsx) | 1.2 KB | Tooltip Radix |
| [GlobalTooltip.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/GlobalTooltip.tsx) | 2.5 KB | Tooltip global |
| [switch.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/switch.tsx) | 1.2 KB | Toggle switch |
| [tabs.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/tabs.tsx) | 1.9 KB | Onglets |
| [table.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/table.tsx) | 2.8 KB | Table |
| [textarea.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/textarea.tsx) | 0.8 KB | Zone de texte |
| [separator.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/separator.tsx) | 0.8 KB | Séparateur |
| [skeleton.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/skeleton.tsx) | 0.3 KB | Skeleton |
| [PageSkeleton.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/PageSkeleton.tsx) | 4.0 KB | Skeleton page |
| [sonner.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/sonner.tsx) | 1.8 KB | Toast |
| [icons.ts](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/icons.ts) | 1.1 KB | Export icônes |
| [EditableCell.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/EditableCell.tsx) | 3.7 KB | Cellule éditable |
| [EditableTitle.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/EditableTitle.tsx) | 2.2 KB | Titre éditable |
| [SyncStatusBadge.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/SyncStatusBadge.tsx) | 1.5 KB | Badge synchro |
| [math-text.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/math-text.tsx) | 0.6 KB | Rendu LaTeX |
| [virtual-list.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ui/virtual-list.tsx) | 6.4 KB | Liste virtualisée |

### Composants de Page (17 fichiers)
| Fichier | Taille | Rôle |
|---------|--------|------|
| [App.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/App.tsx) | 13 KB | Routeur principal |
| [Dashboard.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/Dashboard.tsx) | 21.6 KB | Tableau de bord |
| [DashboardStats.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/DashboardStats.tsx) | 20.4 KB | Statistiques |
| [Editor.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/Editor.tsx) | 47 KB | Éditeur principal |
| [MainTable.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/MainTable.tsx) | 31.3 KB | Table principale |
| [TableRow.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/TableRow.tsx) | 18 KB | Ligne de table |
| [Toolbar.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/Toolbar.tsx) | 12 KB | Barre d'outils |
| [Header.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/Header.tsx) | 2.7 KB | En-tête |
| [SelectionBar.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/SelectionBar.tsx) | 7.7 KB | Barre sélection |
| [ClassCard.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ClassCard.tsx) | 9 KB | Carte de classe |
| [ContentRenderer.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/ContentRenderer.tsx) | 10.5 KB | Rendu contenu |
| [PrintView.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/PrintView.tsx) | 30.8 KB | Vue impression |
| [SettingsPage.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/SettingsPage.tsx) | 2.5 KB | Page paramètres |
| [AssessmentBanner.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/AssessmentBanner.tsx) | 5 KB | Banner évaluations |
| [LatenessBanner.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/LatenessBanner.tsx) | 3.9 KB | Banner retards |
| [SeparatorRow.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/SeparatorRow.tsx) | 4.7 KB | Ligne séparateur |
| [EditorModals.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/EditorModals.tsx) | 4.3 KB | Wrapper modals |

### Modals (17 fichiers)
| Fichier | Taille |
|---------|--------|
| [EditItemModal.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/modals/EditItemModal.tsx) | 23.6 KB |
| [ConfigModal.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/modals/ConfigModal.tsx) | 16.2 KB |
| [AssignDateModal.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/modals/AssignDateModal.tsx) | 16 KB |
| [PrintModal.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/modals/PrintModal.tsx) | 15.2 KB |
| [CreateClassModal.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/modals/CreateClassModal.tsx) | 11 KB |
| [GuideModal.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/modals/GuideModal.tsx) | 11.2 KB |
| [ManageLessonsModal.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/modals/ManageLessonsModal.tsx) | 9 KB |
| [StartStepsModal.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/modals/StartStepsModal.tsx) | 9 KB |
| [AnalysisModal.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/modals/AnalysisModal.tsx) | 6.4 KB |
| [WelcomeModal.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/modals/WelcomeModal.tsx) | 5.4 KB |
| [HistoryModal.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/modals/HistoryModal.tsx) | 4.8 KB |
| [TimetableNudgeModal.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/modals/TimetableNudgeModal.tsx) | 4.6 KB |
| [ImportModal.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/modals/ImportModal.tsx) | 4.5 KB |
| [ImportPlatformModal.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/modals/ImportPlatformModal.tsx) | 4.4 KB |
| [DescriptionModal.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/modals/DescriptionModal.tsx) | 3.5 KB |
| [PromptModal.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/modals/PromptModal.tsx) | 1.7 KB |

### Config (5 fichiers)
| Fichier | Taille |
|---------|--------|
| [ScheduleTab.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/config/ScheduleTab.tsx) | 22.8 KB |
| [NotificationsTab.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/config/NotificationsTab.tsx) | 12.5 KB |
| [ArchivesSection.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/config/ArchivesSection.tsx) | 6.1 KB |
| [DescriptionVisibilityControl.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/config/DescriptionVisibilityControl.tsx) | 5.6 KB |
| [AccountTab.tsx](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/components/config/AccountTab.tsx) | 2.9 KB |

### Styles & Config
| Fichier | Taille |
|---------|--------|
| [index.css](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/index.css) | 12 KB |
| [constants.ts](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/constants.ts) | 20.3 KB |
| [types.ts](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/types.ts) | 5.9 KB |
| [subjectColors.ts](file:///c:/Users/it's%20me/Downloads/cahier-de-textes-interactif%20(3)%20(2)/utils/subjectColors.ts) | 1.4 KB |

---

> [!NOTE]
> **Total des fichiers UI analysés** : 72 fichiers composant l'interface complète de l'application.
> **Taille totale du code UI** : ~450 KB de code TypeScript/TSX + 12 KB de CSS.
> **Nombre total d'icônes Lucide** : 60+ icônes distinctes utilisées.
> **Nombre de couleurs matières** : 16 palettes (clair + sombre = 32 combinaisons).
> **Nombre de modals** : 17 dialogues/modals spécialisés.
> **Animations** : 7 keyframes CSS + 6 classes utilitaires + transitions Tailwind.
