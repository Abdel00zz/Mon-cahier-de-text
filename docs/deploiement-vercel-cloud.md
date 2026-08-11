# Deploiement Vercel et services cloud

## Objectif

Le projet est prepare pour un deploiement Vercel avec :

- build Vite optimise vers `dist`
- assets caches longtemps par Vercel
- endpoint serverless `/api/send-email` pour Resend
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
RESEND_API_KEY=...
RESEND_FROM_EMAIL=Cahier <notifications@votre-domaine.com>
RESEND_DEFAULT_TO_EMAIL=admin@votre-domaine.com
VAPID_PRIVATE_KEY=...
VAPID_PUBLIC_KEY=...
VAPID_SUBJECT=mailto:admin@votre-domaine.com
VITE_VAPID_PUBLIC_KEY=...
```

Configurez-les au minimum pour l'environnement **Production**. Les apercus
Vercel qui doivent utiliser le cloud ont besoin des memes variables.

`RESEND_FROM_EMAIL` doit utiliser un domaine verifie dans Resend.

Certaines integrations Vercel injectent `KV_REST_API_URL` et
`KV_REST_API_TOKEN` a la place des deux variables `UPSTASH_*`. Le serveur
accepte les deux conventions. Il faut connecter le projet a la meme base
Upstash que celle qui contient les cles `user:*`, `classes:*`, `lessons:*` et
le hash `admin:snapshots`, puis redeployer l'application apres toute
modification des variables.

## Envoi email

Le navigateur ne contacte jamais Resend directement. Il appelle :

```txt
POST /api/send-email
```

Exemple de payload :

```json
{
  "subject": "Notification cahier",
  "text": "Message simple",
  "to": "admin@votre-domaine.com"
}
```

Si `to` est absent, l'API utilise `RESEND_DEFAULT_TO_EMAIL`.

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
