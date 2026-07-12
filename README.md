# Cahier de textes interactif

Application web offline-first destinée aux enseignants : cahiers structurés, emploi du temps, progression, devoirs, impression et synchronisation sécurisée.

## Ce que fait l’application

- Gère des classes et des cahiers hiérarchiques (chapitres, sections, contenus, remarques).
- Affecte une date à un ou plusieurs contenus, avec contrôle du calendrier scolaire, des absences et de l’emploi du temps.
- Affiche un tableau de bord relié au même circuit de données : emploi du temps, séances saisies, contenus préparés, progression et devoirs à venir.
- Permet l’impression, l’export, l’import, l’archivage et l’utilisation hors connexion.
- Synchronise les données d’un compte vers le cloud dès que le réseau est disponible.

## Parcours enseignant

1. Connexion ou inscription.
2. Accueil guidé : profil, classes, puis emploi du temps.
3. Tableau de bord : le circuit pédagogique résume les données utiles de la journée.
4. Édition d’un cahier : saisie, sélection multiple, dates, recherche, annulation et impression.
5. Paramètres : emploi du temps, notifications, sauvegardes, archives et compte.

## Circuit d’une date

```text
Choix de date
  → validation (emploi du temps, vacances, fériés, absences, année scolaire)
  → aucun écart : écriture immédiate
  → écart : message de vérification « J’ai compris, enregistrer »
  → historique et sauvegarde locale
  → file de synchronisation cloud
  → progression, séances, devoirs et tableau de bord
```

Les écarts ne sont jamais présentés comme une faute : l’enseignant peut confirmer une exception ou modifier la date.

## Architecture

| Dossier | Rôle |
|---|---|
| `components/` | Écrans, éditeur, vues du tableau de bord, modales et composants UI |
| `components/config/` | Paramètres, emploi du temps, archives et notifications |
| `components/modals/` | Parcours guidés et interactions nécessitant une décision explicite |
| `contexts/` | Authentification et synchronisation cloud |
| `hooks/` | État local, historique, données de classes et alertes locales |
| `utils/` | Règles métier pures : calendrier, dates, progression, emploi du temps, devoirs et synchronisation |
| `api/` | Fonctions serverless Vercel et helpers Redis/authentification |
| `public/` | Calendrier, contenus officiels et icônes |
| `pwa/` | Service worker et enregistrement PWA |

### Sources de vérité

- La grille `timetable` est la source de vérité de l’emploi du temps ; `schedules` est toujours dérivé.
- Le cahier est la source de vérité des contenus et des dates réellement retenues.
- Les règles métier vivent dans `utils/` et ne dépendent pas de React.
- Les vues lisent les mêmes données : aucune règle de progression, de retard ou de devoir ne doit être dupliquée dans un composant.

## Développement

```bash
npm.cmd run dev
npm.cmd run lint
npm.cmd run build
```

`lint` lance TypeScript sans émission de fichiers. Le projet utilise React, TypeScript, Vite, Tailwind CSS, Radix UI, Immer et Vercel Functions.

## Synchronisation et sécurité

- Sessions signées dans des cookies `HttpOnly`.
- Mots de passe hachés avec `scrypt`.
- Synchronisation par classe, avec lots limités en taille et archivage local lors d’un conflit multi-appareils.
- À la déconnexion, le poste local est purgé afin qu’un autre compte partagé ne voie ni ne synchronise les cahiers précédents.

## Règles de maintenance

- Toute nouvelle saisie de date passe par la validation centralisée.
- Une erreur de formulaire reste dans son contexte ; un toast ne remplace pas une décision utilisateur.
- Les actions destructives demandent confirmation.
- Les composants UI génériques restent dans `components/ui/`, les règles dans `utils/` et les flux d’écran dans `components/`.
- Avant toute suppression de fichier, vérifier son import, son rôle PWA/API et l’état Git du dépôt.
