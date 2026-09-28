# IHOST — Plateforme touristique

Plateforme touristique composée d’un site public Next.js et d’une API Express/Prisma. Le parcours client permet de choisir une offre, renseigner ses coordonnées, enregistrer la demande en base puis ouvrir WhatsApp avec un message complet destiné à l’administrateur.

- Dépôt : [https://github.com/hana270/tourism-platform](https://github.com/hana270/tourism-platform)

- Frontend de test : [https://tourism-platform-ten.vercel.app/](https://tourism-platform-ten.vercel.app/)

- Backend de test : [https://tourism-platform-25nn.onrender.com/](https://tourism-platform-25nn.onrender.com/)

## Structure

```
tourism-platform/
├── backend/     API Express + TypeScript + Prisma + PostgreSQL/Supabase
└── frontend/    Next.js 14 + TypeScript + Tailwind
```

## Prérequis

- Node.js 20 LTS recommandé

- npm 10+

- PostgreSQL/Supabase

- Git

## Installation locale

### Backend

```bash
cd backend
npm ci
copy .env.example .env       # Windows
# cp .env.example .env       # macOS/Linux
```

Renseigner au minimum dans `backend/.env` :

```
NODE_ENV=development
PORT=4000
CORS_ORIGIN=http://localhost:3000
APP_BASE_URL=http://localhost:3000
DATABASE_URL="..."
DIRECT_URL="..."
SESSION_COOKIE_NAME=ihost_session
SESSION_DAYS=7
```

Puis :

```bash
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Vérification : `http://localhost:4000/health` doit répondre `{"status":"ok"}`.

### Frontend

Dans un second terminal :

```bash
cd frontend
npm ci
copy .env.local.example .env.local       # Windows
# cp .env.local.example .env.local       # macOS/Linux
npm run dev
```

Variables frontend :

```
NEXT_PUBLIC_API_ORIGIN=http://localhost:4000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Ouvrir `http://localhost:3000/fr`.

## Réservation et WhatsApp

1. Le client clique sur **Réserver**.

1. Il renseigne les dates, le nombre de voyageurs, son nom et son téléphone. L’e-mail et le message sont facultatifs.

1. La demande est validée côté frontend et backend, puis enregistrée avec le statut `PENDING`.

1. WhatsApp s’ouvre vers le numéro configuré dans **Administration → Paramètres → Contact du site**.

1. Le message contient les informations du client et de l’offre : offre, catégorie, zone, prix, adresse, dates, voyageurs, téléphone, e-mail, message et référence de réservation.

1. L’administrateur confirme ensuite la disponibilité et le statut de la réservation.

Le numéro WhatsApp doit être saisi au format international, par exemple `+216 52 663 607`.

Pour une notification automatique côté serveur avec WhatsApp Cloud API, configurer aussi :

```
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_GRAPH_VERSION=v23.0
```

Cette option nécessite un template Meta approuvé nommé `nouvelle_reservation_admin` en langue française. Sans ces variables, le lien WhatsApp client continue de fonctionner normalement.

## Google Translate

L’interface est écrite en français et le sélecteur de langue utilise Google Translate dans le navigateur. Le routage reste sous `/fr/...`. Les textes métier sont saisis par l’administrateur et les pages publiques restent immédiatement disponibles en français.

## Validation avant mise en ligne

```bash
cd backend
npm ci
npm run build
npm run lint

cd ../frontend
npm ci
npm run build
```

Tester ensuite :

- accueil et navigation mobile ;

- recherche et détail d’une offre ;

- formulaire **Réserver via WhatsApp** ;

- réception de la demande dans l’administration ;

- page `/fr/contact` ;

- catégories, détail catégorie et tableau centré ;

- indication des champs obligatoires dans l’administration.

## Déploiement Render + Vercel

### 1. Publier les corrections sur GitHub

```bash
git status
git add backend frontend README.md
git commit -m "fix: improve booking flow and public client experience"
git push origin main
```

### 2. Backend sur Render

Créer ou mettre à jour le service avec :

| Paramètre | Valeur |
| --- | --- |
| Root Directory | `backend` |
| Build Command | `npm ci && npx prisma generate && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/health` |

Variables obligatoires : `NODE_ENV=production`, `PORT` fourni par Render, `DATABASE_URL`, `DIRECT_URL`, `CORS_ORIGIN` avec l’URL Vercel, `APP_BASE_URL` avec l’URL Vercel, `SESSION_COOKIE_NAME`, `SESSION_DAYS`.

Après le déploiement :

```bash
cd backend
npx prisma migrate deploy
```

### 3. Frontend sur Vercel

- Root Directory : `frontend`

- Build Command : `npm run build`

- `NEXT_PUBLIC_API_ORIGIN=https://tourism-platform-25nn.onrender.com`

- `NEXT_PUBLIC_SITE_URL=https://tourism-platform-ten.vercel.app`

Après chaque changement de variable Vercel, relancer un déploiement.

## Tester avec un téléphone

1. Pousser le code sur GitHub et attendre la fin des déploiements Render/Vercel.

1. Ouvrir `https://tourism-platform-ten.vercel.app/fr` sur le téléphone.

1. Ouvrir une offre, cliquer sur **Réserver**, renseigner un numéro réel et des dates futures.

1. Vérifier que la demande apparaît dans l’administration.

1. Vérifier que WhatsApp s’ouvre sur le téléphone avec le message prérempli et que le numéro destinataire est celui configuré par l’administrateur.

1. Si WhatsApp ne s’ouvre pas, vérifier le numéro international dans les réglages Contact et tester le lien HTTPS de l’API `/health`.

## Sécurité et stockage des images

Ne jamais commiter `.env`, les mots de passe ou les tokens Meta. Les fichiers uploadés dans `backend/uploads` sont stockés sur le disque local : sur Render Free, ils peuvent disparaître après redémarrage. Pour une production durable, utiliser Supabase Storage ou un stockage objet persistant.
