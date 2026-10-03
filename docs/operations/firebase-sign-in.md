# Connexion Google et e-mail

La connexion utilise Firebase Authentication. Le numéro de téléphone est un contact facultatif lors d'une inscription par e-mail ; Google n'en demande aucun. Les anciens comptes conservent l'entrée « Connexion par téléphone ».

## Identité et conservation des données

Les nouveaux comptes possèdent un identifiant stable `acct_…` dérivé du UID Firebase. Le contact téléphonique ne sert jamais à joindre deux comptes. Changer de fournisseur pour un ancien compte téléphonique ne transfère donc pas automatiquement ses cahiers : utiliser son accès historique et une sauvegarde/export pour tout transfert volontaire.

Le SDK Web charge uniquement les modules Firebase App et Auth sur l'écran de connexion. Le jeton Google reste en mémoire et est vérifié par l'API serveur, avec fournisseur, adresse vérifiée, révocation et fraîcheur de connexion. La session persistante de l'application reste le cookie HttpOnly ; aucun jeton Google n'est enregistré dans le stockage local.

Android ouvre le sélecteur système Google Credential Manager. Le serveur échange le jeton Google contre une identité Firebase vérifiée. OAuth ne s'exécute pas dans le WebView. Les cahiers, messages, rappels et sauvegardes utilisent le même identifiant stable, avec isolation des espaces locaux et contrôle du propriétaire sur les API.

L'inscription et la connexion par e-mail passent par Firebase Auth ; le serveur ne conserve pas leur mot de passe. La récupération envoie le lien Firebase localisé. Sa réponse est identique pour une adresse existante ou inconnue. Les règles Firestore continuent à refuser l'accès direct des clients : seule l'API autorisée accède aux données privées.

## Configuration

1. Activer Google et e-mail/mot de passe dans Firebase Authentication. Ajouter le domaine réel de l'application à la liste des domaines autorisés.
2. Sur le serveur, définir `CLOUD_PROVIDER=firestore`, les identifiants Firebase Admin privés et `FIREBASE_WEB_API_KEY`. Cette dernière clé est une configuration publique Firebase ; elle est exposée par `GET /api/auth?action=config` au SDK de connexion. La clé privée Admin reste exclusivement sur le serveur.
3. Enregistrer Android `ma.cahier.textes` dans le même projet et les empreintes SHA-1/SHA-256 du certificat qui signe l'APK. Télécharger sa configuration actualisée dans `android/app/google-services.json`, exclu de Git. Elle doit contenir les clients OAuth Android et Web. `default_web_client_id` est conservé pendant la réduction des ressources.
4. Pour une application distribuée par Google Play App Signing, enregistrer aussi les empreintes du **certificat de signature Play**. Elles peuvent différer de celles de la clé d'import locale. Ne pas remplacer le keystore existant pour une mise à jour.
5. Recompiler l'APK/AAB après un changement de configuration Android.

Le script suivant vérifie les fournisseurs, le domaine, le certificat du dernier APK signé et le raccordement OAuth. `--apply` ajoute seulement le domaine/les empreintes manquantes et actualise le fichier client Android ; il ne modifie ni IAM ni la facturation.

```powershell
node scripts/firebase/configure-sign-in.mjs --credentials 'C:\dossier-prive\service-account.json'
node scripts/firebase/configure-sign-in.mjs --credentials 'C:\dossier-prive\service-account.json' --apply
```

Pour `cahier-text`, Google et e-mail sont activés, le domaine `mon-cahier-de-text.vercel.app` est autorisé et le certificat du canal APK est enregistré. L'authentification Google interactive sur la Samsung Tab S7 et le certificat Play restent à vérifier lors de la distribution correspondante.

## Vérifications

`npm run test:firebase` couvre les comptes sans téléphone, la non-fusion par contact, les sessions Google émulées, la synchronisation, les messages, le blocage et la suppression. Les jetons Google de ces tests sont fictifs ; ils ne prouvent pas une connexion Google réelle.

Sur un appareil de test : ouvrir Google, choisir un compte, vérifier le cahier, se déconnecter puis revenir ; tester aussi l'annulation du sélecteur, e-mail/mot de passe, récupération, mode hors connexion et changement de compte. Le serveur local de démonstration simule l'e-mail mais refuse explicitement de prétendre envoyer un lien ou connecter Google sans Firebase.
