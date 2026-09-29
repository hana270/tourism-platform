# IHOST — Plateforme touristique

Site de réservation touristique en Tunisie : offres (hôtels, studios, appartements, activités), recherche, réservation via WhatsApp et tableau de bord d'administration.

**Stack** : Next.js 14 (frontend) · Express + Prisma + PostgreSQL/Supabase (backend) · Google Translate · WhatsApp.

## Démarrage rapide

```bash
# 1. Backend (port 4000)
cd backend
cp .env.example .env        # puis renseigner DATABASE_URL, DIRECT_URL, DEEPL_API_KEY
npm install
npx prisma migrate deploy
npm run dev

# 2. Frontend (port 3000)
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Ouvrir http://localhost:3000 (site) et http://localhost:3000/fr/login (administration).

## Fonctionnement

- **Réservation client** : le formulaire enregistre la demande, puis ouvre WhatsApp (mobile, ordinateur) avec un message pré-rempli : offre + coordonnées du client.
- **Blocage des dates** : automatique. Quand une réservation passe à **Confirmée** *et* **Payée**, ses dates sont bloquées et l'offre disparaît des résultats pour cette période. Si l'une des deux conditions est retirée, les dates sont libérées.
- **Référencement** : URLs par langue, balises `hreflang`, sitemap multilingue, `robots.txt`, données structurées.

## Sécurité

- Ne jamais publier `backend/.env` (déjà dans `.gitignore`). Changez tout mot de passe qui a été partagé.
- API protégée par Helmet, CORS restreint, limitation de débit et validation Zod.

## Performance / erreurs « serveur trop long »

Dans `DATABASE_URL`, ajouter : `?pgbouncer=true&connection_limit=10&pool_timeout=20&connect_timeout=15`.
Le backend maintient la connexion à la base active et le frontend relance automatiquement les lectures échouées.

## Production

```bash
cd backend  && npm run build && npm start
cd frontend && npm run build && npm start
```

Définir `NEXT_PUBLIC_SITE_URL` (domaine public) et `NEXT_PUBLIC_API_URL` côté frontend.
