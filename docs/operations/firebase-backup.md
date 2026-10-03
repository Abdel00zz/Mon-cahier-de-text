# Sauvegarde, restauration et contrôles Firebase

## Deux sauvegardes complémentaires

L'export JSON dans les paramètres conserve les données locales de l'enseignant : configuration, classes, cahiers, direction du contenu, journaux et métadonnées d'impression. Il reste compatible avec les anciens formats. L'intégralité du fichier est validée avant toute écriture ; une erreur de quota annule les écritures. Une restauration rejoint ensuite le circuit de synchronisation, avec protection des versions concurrentes. La taille d'export et d'import est la même, calculée en UTF-8. Une donnée locale illisible interrompt l'export au lieu de produire un cahier vide.

La sauvegarde cloud ci-dessous capture les documents Firestore, y compris les fragments des cahiers, les révisions, les messages et les associations de notifications. Elle utilise une transaction en lecture seule pour obtenir un instantané cohérent, des pages de 100 documents et des limites de 64 Mio / 100 000 documents. Les collections admises sont explicites dans `scripts/firebase/backup-format.ts` : toute évolution du schéma doit aussi mettre à jour l'export et son test de restauration.

**Le fichier cloud porte le périmètre `firestore-only`. Il ne remplace pas un export Firebase Authentication, des règles, des index, des paramètres du projet ou des secrets de déploiement.** Les comptes serveur présents dans Firestore ne constituent pas une restauration complète du service Authentication. Conserver ces éléments séparément dans un plan de reprise.

## Export cloud protégé

Sous Windows, le dossier privé est situé dans `%LOCALAPPDATA%\MonCahierDeTextes\backups`. Le script restreint son ACL à l'utilisateur Windows et SYSTEM. Le compte de service reste dans le dossier privé `firebase`, hors du dépôt. Les chemins suivants n'affichent aucune clé :

```powershell
$taskPrivateRoot = Join-Path $env:LOCALAPPDATA 'MonCahierDeTextes'
$taskBackupFile = Join-Path $taskPrivateRoot ('backups\firestore-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.cdtbackup')
$taskBackupKey = Join-Path $taskPrivateRoot 'backups\backup-key.bin'
$taskServiceAccount = Join-Path $taskPrivateRoot 'firebase\service-account.json'
npm run firebase:backup -- --credentials "$taskServiceAccount" --output "$taskBackupFile" --key-file "$taskBackupKey"
```

Le script ne modifie pas Firestore. Il refuse d'écraser un fichier existant et crée la clé de 32 octets si nécessaire. L'archive est compressée puis chiffrée avec AES-256-GCM, un nonce aléatoire et une authentification du contenu. Elle est relue et déchiffrée immédiatement ; tous les documents doivent correspondre à l'instantané. Le journal fournit seulement le périmètre, le nombre de documents, l'heure de lecture et l'empreinte SHA-256.

Conserver une copie de l'archive et une copie protégée de la clé sur des supports distincts. La perte de la clé rend l'archive inutilisable. Ne jamais ajouter ces fichiers à Git ni au paquet Android. L'ACL du dossier courant ne constitue pas une sauvegarde hors appareil.

## Vérifier et répéter une restauration

```powershell
npm run firebase:backup -- --backup-file "$taskBackupFile" --key-file "$taskBackupKey"
npm run firebase:backup:rehearse -- --backup-file "$taskBackupFile" --key-file "$taskBackupKey"
```

La première commande vérifie l'archive sans écrire. La seconde démarre un émulateur Firestore local avec le projet fixe `demo-cahier-text-backup`, restaure par lots de 400 créations maximum, compare chaque document puis arrête l'émulateur. Java doit être disponible ; le lanceur réutilise le JDK du projet. Le serveur de restauration accepte uniquement `localhost` ou `127.0.0.1` et exige une cible vide. Aucun mode de restauration de production n'est proposé par cet outil.

Pour une reprise de production, préparer une cible distincte, Firebase Authentication et les secrets, vérifier les données et les parcours HTTP, puis effectuer une bascule explicite. Ne pas restaurer automatiquement d'anciennes associations d'appareils sur une base active.

## Règles, index et fonctions

```powershell
npm run firebase:verify -- --credentials "$taskServiceAccount"
npm run test:firebase
```

Le premier contrôle compare les règles publiées et les sept exemptions du champ JSON. Sans `--apply`, il ne publie rien. Les tests utilisent les émulateurs Auth / Firestore et vérifient accès interdits, sessions, propriété, blocage, notifications, imports administrateur, conflits et restauration.

Les routes `api/*` utilisent **Vercel Node.js 24**, avec Firebase Admin côté serveur. Ce projet ne déclare pas de déploiement Firebase Cloud Functions. Le runtime Edge de Vercel ne fournit pas toutes les API Node requises par le SDK Admin ; la validation `check:api` vérifie le chargement dans le runtime réellement utilisé. [Node.js](https://vercel.com/docs/functions/runtimes/node-js), [Edge](https://vercel.com/docs/functions/runtimes/edge).

## Protection gérée et limites observées le 3 octobre 2026

- L'API de la base `cahier-text/(default)`, région `nam5`, indique que PITR et la protection contre la suppression sont désactivés.
- Le compte de service reçoit HTTP 403 pour la liste des calendriers de sauvegarde et des Cloud Functions. Ce résultat ne prouve pas leur absence ; leur état reste à vérifier avec un compte disposant des droits nécessaires.
- La console Firebase, onglet « Reprise après sinistre », demande un forfait supérieur pour modifier PITR et les sauvegardes planifiées. La capture de cet état est conservée dans les preuves locales ; aucun changement de forfait n'a été effectué.
- L'archive chiffrée créée pour cet audit contient **76 documents**. Sa relecture et sa restauration locale ont été validées, avec comparaison exacte des 76 documents. Le résultat est conservé dans les preuves locales de l'audit.

Les sauvegardes planifiées gérées, PITR et exports Google Cloud constituent des options complémentaires à configurer selon le budget et les droits du projet. Les exports gérés nécessitent la facturation et consomment des lectures / écritures ; cet audit n'a activé aucun service payant. [Récupération Firestore](https://firebase.google.com/docs/firestore/disaster-recovery), [exports et imports](https://firebase.google.com/docs/firestore/manage-data/export-import).

L'export local est exécuté à la demande. Il n'a pas de planificateur automatique, et son succès ne garantit pas la livraison d'une notification sur un téléphone réel. Ce dernier contrôle exige un appareil et ses permissions système.
