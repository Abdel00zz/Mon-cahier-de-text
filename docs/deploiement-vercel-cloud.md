# Deploiement Vercel et services cloud

## Objectif

Le projet est prepare pour un deploiement Vercel avec :

- build Vite optimise vers `dist`
- assets caches longtemps par Vercel
- endpoint serverless `/api/send-email` pour Resend
- secrets gardes cote serveur
- base propre pour ajouter une authentification avancee ensuite

## Variables Vercel

Dans Vercel, ajoutez ces variables dans `Project Settings > Environment Variables` :

```txt
RESEND_API_KEY=...
RESEND_FROM_EMAIL=Cahier <notifications@votre-domaine.com>
RESEND_DEFAULT_TO_EMAIL=admin@votre-domaine.com
GEMINI_API_KEY=...
```

`RESEND_FROM_EMAIL` doit utiliser un domaine verifie dans Resend.

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

## Auth avancee a faire apres

La suite logique est d'ajouter une couche auth serveur autour des endpoints sensibles :

- session securisee avec cookie `HttpOnly`
- protection des routes `/api/*`
- roles : administrateur, enseignant, lecture seule
- stockage cloud des classes et cahiers
- audit des actions sensibles : suppression, import, export, email

Pour Vercel, les options solides sont :

- Auth.js si on veut une auth email/OAuth flexible
- Clerk si on veut aller vite avec gestion d'utilisateurs complete
- Supabase Auth si on veut aussi une base Postgres et des regles de securite

## Commandes de verification

```txt
npm run build
```

Puis sur Vercel :

```txt
Build Command: npm run build
Output Directory: dist
Install Command: npm ci
```
