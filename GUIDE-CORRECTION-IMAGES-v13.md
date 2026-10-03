# Correction définitive des images (v13) — Supabase Storage

## Pourquoi les images disparaissaient en ligne

Le backend écrivait les images dans `backend/uploads/` (disque du serveur) et la base de
données ne gardait que `/uploads/...`. Or :

1. `backend/uploads/*` est dans `.gitignore` → les images **ne partent jamais sur GitHub** avec `git push` ;
2. le disque de Render/Vercel est **éphémère** → même uploadées en ligne, les images sont effacées à chaque redéploiement/redémarrage ;
3. la base Supabase est partagée entre votre PC et la production → la base contient des liens vers des fichiers qui n'existent que sur votre PC.

## La solution

Les images sont maintenant envoyées dans **Supabase Storage** (bucket public `media`).
La base stocke l'**URL publique complète** (`https://xxxx.supabase.co/storage/v1/object/public/media/...`),
valable partout : en local, sur Render, sur Vercel. Plus aucune image sur disque.

- **Catégorie** : une seule image = la couverture (`categories/<idCategorie>/<uuid>/…`). Remplacer l'image supprime l'ancienne.
- **Offre** : plusieurs images (`offers/<uuid>/…`), **exactement une couverture** (`isPrimary`), garantie côté serveur (doublons supprimés, couverture toujours en premier).
- Logo / photo d'accueil / photo de profil : aussi dans Supabase Storage.

## Étapes (dans cet ordre)

### 1. Récupérer les clés Supabase
Supabase → *Project Settings → API* :
- **Project URL** → `SUPABASE_URL` (probablement `https://rhyabzfloilwtepjqxwb.supabase.co`)
- clé **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (SECRÈTE : backend uniquement, jamais dans Vercel/GitHub)

### 2. Copier les fichiers de ce paquet dans votre projet
Dézippez en conservant les dossiers (remplace les fichiers existants). Puis **supprimez** les deux anciens scripts devenus dangereux :
`backend/scripts/repair-image-paths.ts` et `backend/scripts/repair-published-offers.ts`.

### 3. Configurer le backend
Dans `backend/.env` (local) **et** dans les variables d'environnement Render :
```
SUPABASE_URL=https://VOTRE-PROJET.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...clé service_role...
SUPABASE_BUCKET=media
```
Le serveur refuse de démarrer si ces variables manquent (message clair dans les logs).

### 4. Créer le bucket public
```bash
cd backend
npm ci
npm run storage:init
```
(ou à la main : Supabase → Storage → New bucket → nom `media` → cocher **Public**.)

### 5. Migrer les anciennes images (une seule fois, depuis votre PC qui a `backend/uploads`)
```bash
npm run images:migrate            # simulation : rien n'est écrit
npm run images:migrate -- --apply # envoie les fichiers + corrige la base
```
Le script liste les images référencées en base mais absentes du dossier local : ré-uploadez-les depuis l'admin.

### 6. Déployer
```bash
npm run build      # vérification locale
git add -A && git commit -m "Images: Supabase Storage" && git push
```
Render redéploie le backend, Vercel le frontend.

### 7. Vercel (frontend)
- `NEXT_PUBLIC_API_ORIGIN` = URL du backend (sans `/api/v1`)
- **supprimez** `NEXT_PUBLIC_ASSET_ORIGIN` s'il existe
- Redéployez.

### 8. Contrôle
```bash
npm run images:verify
```
Teste chaque image en ligne (HTTP), vérifie 1 couverture par catégorie et 1 couverture unique par offre.

## Sécurité
Le `.env` contenu dans votre ZIP montre la clé DeepL et le mot de passe de la base en clair : **changez-les** (Supabase → Database → Reset password ; DeepL → nouvelle clé) et mettez à jour Render. Ne mettez jamais `.env` dans un ZIP partagé.

## Fichiers modifiés / ajoutés
Nouveaux : `backend/src/lib/storage.ts`, `backend/scripts/storage-init.ts`, `backend/scripts/migrate-uploads-to-supabase.ts`
Modifiés : `backend/src/lib/image-processing.ts`, `backend/src/config/env.ts`, `backend/src/app.ts`, `backend/src/modules/offers/offer.routes.ts`, `backend/src/modules/categories/category.service.ts`, `backend/src/modules/auth/auth.routes.ts`, `backend/src/modules/settings/settings.routes.ts`, `backend/src/lib/upload-storage.ts` (legacy), `backend/scripts/reset-data.ts`, `backend/scripts/verify-offer-images.ts`, `backend/package.json`, `backend/.env.example`, `frontend/.env.production.example`
Le frontend n'a besoin d'aucune modification de code : il affiche déjà les URLs absolues et utilise déjà la photo de couverture.
