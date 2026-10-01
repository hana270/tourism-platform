# IHOST — Tourism Platform V11

Plateforme web de réservation et de découverte touristique.

## Stack

### Frontend
- Next.js 14
- React
- TypeScript
- Tailwind CSS

### Backend
- Node.js
- Express
- TypeScript
- Prisma
- PostgreSQL

### Fonctionnalités principales

- Gestion des catégories
- Une image principale par catégorie
- Gestion des offres avec plusieurs images
- Offres publiées ou archivées
- Recherche et filtres
- Promotions
- Réservations
- Gestion des disponibilités
- Blocage automatique des dates après confirmation + paiement
- Contact et réservation via WhatsApp
- Dashboard administrateur
- Gestion du logo et de la page d'accueil
- SEO
- Responsive desktop / tablette / mobile
- Optimisation et sécurisation des images

## Structure

```text
IHOST/
├── frontend/
│   └── src/
├── backend/
│   ├── src/
│   ├── prisma/
│   └── uploads/
└── README.md
```

## 1. Installation

### Prérequis

- Node.js 20
- npm
- PostgreSQL
- Git

Vérifier :

```bash
node -v
npm -v
```

## 2. Backend

```bash
cd backend
npm install
```

Créer :

```text
backend/.env
```

Exemple :

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
PORT=4000
FRONTEND_URL="http://localhost:3000"
JWT_SECRET="CHANGE_ME"
```

Puis :

```bash
npx prisma generate
npx prisma migrate dev
npm run dev
```

API :

```text
http://localhost:4000
```

## 3. Frontend

Dans un autre terminal :

```bash
cd frontend
npm install
```

Créer :

```text
frontend/.env.local
```

Exemple :

```env
NEXT_PUBLIC_API_URL="http://localhost:4000/api/v1"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

Puis :

```bash
npm run dev
```

Site :

```text
http://localhost:3000
```

## 4. Réinitialisation des données

### Données métier uniquement

```bash
cd backend
npm run db:reset-data
```

### Réinitialisation complète

```bash
cd backend
npm run db:reset-all
```

Ces commandes sont destructives. Faire une sauvegarde avant utilisation en production.

## 5. Offres

Une offre possède uniquement deux statuts :

- `PUBLISHED` — publiée
- `ARCHIVED` — archivée

Le statut `DRAFT` / Brouillon n'est plus utilisé.

Pour une offre hôtel, activer l'option hôtel afin de gérer les tarifs :

- Logement seul
- Demi-pension
- Pension complète
- All Inclusive

Une offre peut contenir plusieurs images.

## 6. Catégories et images

Chaque catégorie possède une seule image.

Une offre peut avoir plusieurs images avec une image principale.

Les images sont traitées automatiquement :

- validation du fichier
- conversion WebP
- génération de plusieurs tailles
- nom de fichier UUID
- cache pour accélérer l'affichage

Formats recommandés :

```text
JPEG / PNG / WebP
```

Ne jamais stocker de fichiers sensibles dans `uploads`.

## 7. Promotions

Une promotion contient :

- offre concernée
- ancien prix
- nouveau prix
- date de début
- date de fin
- statut
- affichage éventuel sur la page d'accueil

Pour un hôtel, la promotion peut être associée à une formule tarifaire.

Le prix promotionnel doit rester inférieur au prix normal.

## 8. Réservations et disponibilités

Le client sélectionne :

- offre
- date d'arrivée
- date de départ
- nombre de personnes
- coordonnées

Après traitement par l'administration :

```text
Confirmation + Paiement
        ↓
Blocage automatique de la période
        ↓
La période n'est plus proposée au client
```

Le dashboard contient également un calendrier de disponibilités pour permettre à l'administrateur de vérifier les périodes bloquées.

Plusieurs offres peuvent être bloquées sur la même date.

## 9. WhatsApp

La réservation peut être envoyée à l'administrateur via WhatsApp.

Le système utilise un lien compatible avec :

- Android
- iPhone
- navigateur
- WhatsApp Web

Le message contient notamment :

- référence de réservation
- nom du client
- téléphone
- offre
- dates
- nombre de personnes
- formule hôtel si nécessaire
- informations complémentaires

## 10. Administration

Le dashboard permet notamment de gérer :

- statistiques
- offres
- catégories
- réservations
- disponibilités
- promotions
- paramètres de la page d'accueil
- logo
- coordonnées de contact

L'interface est responsive et adaptée aux ordinateurs, tablettes et téléphones.

## 11. SEO

Les pages publiques doivent utiliser :

- titres uniques
- descriptions
- URLs propres
- slugs
- canonical
- sitemap
- robots.txt
- Open Graph
- données structurées lorsque nécessaire

Les pages privées comme le dashboard, la connexion et les API ne doivent pas être indexées.

## 12. Sécurité

Ne jamais publier :

```text
.env
.env.local
DATABASE_URL
JWT_SECRET
mots de passe
clés API
tokens
```

Recommandations :

- HTTPS en production
- validation des données côté serveur
- authentification pour l'administration
- contrôle des rôles
- rate limiting
- CORS configuré
- Helmet
- sauvegardes PostgreSQL
- sauvegardes des images
- permissions minimales pour les comptes techniques

## 13. Build production

Backend :

```bash
cd backend
npm run build
npm start
```

Frontend :

```bash
cd frontend
npm run build
npm start
```

Avant la mise en production :

```text
✓ Tester le frontend
✓ Tester l'API
✓ Tester la base de données
✓ Tester les réservations
✓ Tester le blocage des dates
✓ Tester WhatsApp
✓ Tester les images
✓ Tester le responsive mobile
✓ Vérifier le SEO
✓ Vérifier HTTPS
✓ Faire une sauvegarde
```

## 14. Déploiement

Pour la production :

1. Acheter le domaine au nom du propriétaire.
2. Configurer l'hébergement.
3. Configurer PostgreSQL.
4. Déployer le backend.
5. Déployer le frontend.
6. Configurer les variables d'environnement.
7. Configurer le DNS.
8. Activer HTTPS.
9. Tester le site.
10. Faire une sauvegarde finale.

## 15. Important

Le propriétaire doit conserver la propriété du :

- nom de domaine
- compte d'hébergement
- compte de facturation
- compte de messagerie professionnel

Le développeur doit recevoir uniquement les accès techniques nécessaires.

---

**IHOST V11 — README**
