# Référence de vitesse Android — avant / après optimisation

Ce document fixe la **référence** à battre avant les optimisations de vitesse
Android (ouverture d'une classe, navigation, saisie, connexion Google). Le
protocole est reproductible ; les tableaux sont à remplir sur un appareil réel ou
un émulateur, jamais depuis le poste de développement.

## Protocole

1. Installer l'APK debug : `adb install -r artifacts/android/mon-cahier-de-textes-debug.apk`.
2. Jeu de données : **8 classes** avec cahiers, dont une classe portant au moins
   une formule LaTeX et un chapitre long.
3. Activer le journal de développement (l'APK debug l'expose) et relever les
   lignes `[perf]` : elles n'apparaissent qu'en développement, jamais en release.
4. Mesurer trois fois chaque geste, garder la **médiane**, et noter la connexion
   (Wi-Fi ou 4G).

## Étapes mesurées côté client

| Marqueur | Signification |
| --- | --- |
| `connexion/debut` | L'enseignant déclenche la connexion (Google ou e-mail) |
| `connexion/prete` | Session ouverte, espace local prêt |
| `synchronisation/debut` | Début du rapatriement des données cloud |
| `synchronisation/emploi-du-temps` | Réglages et emploi du temps appliqués |
| `synchronisation/classes` | Liste des classes appliquée (fin du premier chargement) |
| `cahier/ouverture` | Cahier d'une classe disponible à l'écran |

Les valeurs s'affichent en millisecondes dans le journal : `[perf] nom : 1240 ms`.

## Relevé de référence

| Geste | Wi-Fi | 4G | Date |
| --- | --- | --- | --- |
| Première connexion (compte existant, 8 classes) | | | |
| Connexion Google | | | |
| Premier chargement (emploi du temps puis classes) | | | |
| Ouverture d'une classe (cahier déjà synchronisé) | | | |
| Ouverture d'une classe (cahier à rapatrier) | | | |
| Passage tableau de bord → éditeur | | | |
| Saisie de 20 lignes consécutives | | | |

## Côté API

Les réponses `/api/sync` et `/api/auth` portent un en-tête `Server-Timing` :
l'onglet Réseau des outils de développement affiche la durée totale et les
phases mesurées, sans latence ajoutée. Comparer ces durées à celles du client
pour distinguer le coût réseau du coût de calcul.

## Après optimisation

| Geste | Référence | Après | Gain |
| --- | --- | --- | --- |
| Première connexion | | | |
| Connexion Google | | | |
| Premier chargement | | | |
| Ouverture d'une classe | | | |
| Navigation entre onglets | | | |

Un écart inférieur à 10 % n'est pas concluant : refaire le relevé avec le même
appareil, la même connexion et le même jeu de données.
