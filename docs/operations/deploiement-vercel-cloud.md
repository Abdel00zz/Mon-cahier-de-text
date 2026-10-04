# Deploiement Vercel et services cloud

## Objectif

Le projet est prepare pour un deploiement Vercel avec :

- build Vite optimise vers `dist`
- assets caches longtemps par Vercel
- secrets gardes cote serveur
- authentification enseignant et administration par cookies securises
- synchronisation persistante dans Upstash Redis

## Variables Vercel

Dans Vercel, ajoutez ces variables dans `Project Settings > Environment Variables` :

```txt
AUTH_SECRET=une-valeur-aleatoire-d-au-moins-32-caracteres
ADMIN_SECRET=un-code-administrateur-d-au-moins-6-caracteres
CRON_SECRET=une-valeur-aleatoire-privee
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

Configurez-les au minimum pour l'environnement **Production**. Les apercus
Vercel qui doivent utiliser le cloud ont besoin des memes variables.

Certaines integrations Vercel injectent `KV_REST_API_URL` et
`KV_REST_API_TOKEN` a la place des deux variables `UPSTASH_*`. Le serveur
accepte les deux conventions. Il faut connecter le projet a la meme base
Upstash que celle qui contient les cles `user:*`, `classes:*`, `lessons:*` et
le hash `admin:snapshots`, puis redeployer l'application apres toute
modification des variables.

## Envoi email

La route `POST /api/send-email` a ete **supprimee le 4 octobre 2026** : aucun
écran ne l'appelait et elle restait joignable **sans authentification**, ce qui
permettait d'envoyer des messages depuis le domaine du projet (phishing ou spam
en son nom). L'application n'envoie plus d'email : le support passe par WhatsApp
(`src/constants/support.ts`) et l'administration notifie les professeurs dans
l'application (fil de messages et notifications natives). Les variables
`RESEND_*` ne sont plus lues et peuvent etre retirees de Vercel.

## Commandes de verification

```txt
npm run lint
npm run build
```

Puis sur Vercel :

```txt
Build Command: npm run build
Output Directory: dist
Install Command: npm ci
```
