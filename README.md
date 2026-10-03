# IHOST — Plateforme touristique

Application touristique moderne basée sur **Next.js 14**, **Node.js/Express**, **Prisma** et **Supabase PostgreSQL**. Le backend accepte Node.js **20, 22 et 24**.

## Corrections incluses dans cette version

- Upload multi-images d’offres corrigé : chaque fichier reçoit son propre identifiant et sa propre ligne `offre_photos`.
- Stockage organisé par ressource :
  - `backend/uploads/offers/<id-image>/thumbnail.webp`
  - `backend/uploads/offers/<id-image>/medium.webp`
  - `backend/uploads/offers/<id-image>/large.webp`
  - les catégories utilisent `backend/uploads/categories/<id-categorie>/...`.
- Conversion et validation du contenu réel des images avec `sharp`, rotation EXIF et variantes WebP.
- URLs `/uploads/...` stables, compatibles avec le proxy Next.js et un disque persistant de production.
- Suppression complète des variantes lors de la suppression d’une offre.
- Galerie responsive, couverture prioritaire et affichage uniforme des images sur l’accueil, les cartes et le détail d’une offre.
- Accueil client modernisé : palette bleu nuit / turquoise / sable, promotions plus visibles et descriptions lisibles.
- Navbar mobile remplacée par une vraie recherche en panneau bas et un menu mobile sans débordement horizontal.
- Script de contrôle : `npm run images:verify`.
- Réparation des anciennes lignes photo dupliquées : `npm run images:dedupe`.

## Emplacements importants

- Page d’accueil : `frontend/src/app/[locale]/page.tsx`
- Composition de l’accueil : `frontend/src/components/public/PublicHome.tsx`
- Navbar publique responsive : `frontend/src/components/public/PublicHeader.tsx`
- Cartes d’offres : `frontend/src/components/public/OfferCard.tsx`
- Formulaire d’offres et galerie admin : `frontend/src/components/offers/OfferForm.tsx`
- Styles globaux et palette : `frontend/src/app/globals.css`
- Upload d’offres : `backend/src/modules/offers/offer.routes.ts`
- Traitement des images : `backend/src/lib/image-processing.ts`
- Racine de stockage : `backend/src/lib/upload-storage.ts`
- Schéma Supabase/Prisma : `backend/prisma/schema.prisma`

## Installation

### Backend

```bash
cd backend
cp .env.example .env
npm ci
npx prisma generate
npm run dev
```

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm ci
npm run dev
```

Le frontend est disponible sur `http://localhost:3000` et l’API sur `http://localhost:4000`.

## Configuration Supabase PostgreSQL

Renseigner dans `backend/.env` :

```env
DATABASE_URL="postgresql://...:6543/postgres?pgbouncer=true&connection_limit=10&pool_timeout=20"
DIRECT_URL="postgresql://...:5432/postgres"
```

`DATABASE_URL` sert aux requêtes applicatives via le pooler Supabase. `DIRECT_URL` sert aux migrations Prisma.

## Réinitialiser toute la base et tous les médias

> Ces commandes sont **destructives**. Elles suppriment les données métier (offres, photos, catégories, zones, promotions, réservations, etc.). Vérifier le projet Supabase et faire une sauvegarde avant exécution.

Depuis `backend` :

```bash
npm ci
npx prisma generate
npm run db:reset-data -- --all
```

- Avec `--all` : supprime aussi utilisateurs, sessions, tokens et réglages du site.
- Sans `--all` : conserve les comptes administrateurs et les réglages, mais supprime toutes les données métier et leurs médias.
- Le script respecte `UPLOAD_DIR`, y compris si les images sont sur un disque persistant.

Après un reset complet, recréer un administrateur avec le flux prévu par l’application ou le seed du projet.

## Vérifier que chaque image existe une seule fois

```bash
cd backend
npm run images:verify
```

Le script signale les URLs dupliquées dans une offre et les fichiers absents du stockage.
Pour supprimer uniquement les lignes dupliquées en conservant la première photo et son fichier :

```bash
npm run images:dedupe
```

Cette commande ne supprime pas l’image physique conservée et ne touche pas aux offres uniques.

## Stockage de production

Le stockage local d’un hébergeur sans disque persistant est éphémère. Pour Render ou un serveur équivalent, définir par exemple :

```env
UPLOAD_DIR=/var/data/uploads
```

et monter un disque persistant sur `/var/data`. Pour un déploiement distribué, remplacer le stockage local par Supabase Storage, S3, Cloudflare R2 ou Cloudinary en conservant le même contrat d’URL côté frontend.

## Tests de validation

```bash
cd backend && npm run build
cd ../frontend && npm run build
```

Les fichiers `.env`, `node_modules`, `.next`, `.git` et les uploads de développement ne doivent pas être commités ni envoyés dans le ZIP de livraison.
