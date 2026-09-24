# IHOST — Plateforme touristique (Admin + Site public)

> Ce fichier remplace et fusionne `README.md`, `CORRECTIONS.md` et
> `PERFORMANCE_AND_BUSINESS_RULES.md`. Il reflète l'état **réel et actuel**
> du projet — certains points des anciens fichiers étaient devenus faux
> (ex. l'ancien README parlait de `next-intl` alors que le projet utilise
> maintenant Google Translate) et ont été corrigés ici.

Monorepo à deux applications :

```
tourism-platform/
├── backend/     → API REST (Node.js + Express + TypeScript + Prisma + PostgreSQL/Supabase)
└── frontend/    → Site public + Dashboard admin (Next.js 14 App Router + TypeScript + Tailwind)
```

Dépôt : https://github.com/hana270/tourism-platform

---

## 1. Emplacement recommandé sur votre machine

```
C:\Projects\ihost\tourism-platform\
```

Chemin court (évite les erreurs Windows liées aux `node_modules` trop
profonds), hors `Documents`/`Desktop` pour ne pas être synchronisé par
OneDrive (ce qui casse parfois les watchers de fichiers de Next.js).

## 2. Prérequis

| Outil | Version recommandée | Vérifier avec |
|---|---|---|
| Node.js | **20 LTS** (ex : 20.17.0) | `node -v` |
| npm | fourni avec Node 20 (≥10) | `npm -v` |
| Git | dernière version stable | `git --version` |

Next.js 14 et Prisma 5 sont validés sur Node 20. Node 22+ fonctionne en
pratique (juste un avertissement `EBADENGINE` sans conséquence), mais
n'est pas la version officiellement recommandée pour ce projet.

## 3. Sécurité — avant toute autre étape

Si un mot de passe Supabase a un jour été partagé en clair (email, chat,
capture d'écran…), **changez-le immédiatement** :

Supabase Dashboard → votre projet → Project Settings → Database → *Reset
database password*.

Mettez ensuite à jour uniquement vos fichiers `.env` locaux — **jamais
commités sur Git** (voir `.gitignore` à la racine, qui exclut déjà
`**/.env` et n'autorise que `**/.env.example`).

## 4. Récupérer le projet

```bash
cd C:\Projects\ihost
git clone https://github.com/hana270/tourism-platform.git
cd tourism-platform
```

---

## 5. Installation du backend

```bash
cd backend
npm install
copy .env.example .env
```

Ouvrez `.env` et renseignez au minimum :

```env
NODE_ENV=development
PORT=4000
CORS_ORIGIN=http://localhost:3000
APP_BASE_URL=http://localhost:3000

DATABASE_URL="postgresql://postgres.<PROJECT_REF>:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres"

SESSION_COOKIE_NAME=ihost_session
SESSION_DAYS=7

# Optionnelles — uniquement si vous activez l'envoi automatique WhatsApp
# côté serveur (voir section 8). Laissez vides pour rester sur le lien
# wa.me simple (recommandé pour démarrer).
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_GRAPH_VERSION=v23.0
```

Générer le client Prisma et synchroniser le schéma avec Supabase :

```bash
npx prisma generate
npx prisma migrate dev --name init
```

Démarrer l'API :

```bash
npm run dev
```

Vous devez voir : `🚀 IHOST API running on http://localhost:4000 [development]`.
Testez : `http://localhost:4000/health` → `{"status":"ok"}`.

Explorer les données visuellement (facultatif) :

```bash
npm run prisma:studio
```

## 6. Installation du frontend

Dans un **second terminal** :

```bash
cd frontend
npm install
copy .env.local.example .env.local
```

`.env.local` pointe par défaut vers `http://localhost:4000` — rien à
changer en local.

Démarrer le site :

```bash
npm run dev
```

Ouvrez `http://localhost:3000` → redirection automatique vers
`http://localhost:3000/fr`.

---

## 7. Traduction — architecture actuelle

**Le projet n'utilise plus `next-intl`.** L'interface est écrite en
français, langue unique de routage (`/fr/...` — toute autre URL comme
`/en/...` redirige automatiquement vers `/fr/...`). Les autres langues
sont produites par **Google Translate** directement dans le navigateur,
via un sélecteur dans le header (icône globe).

- `src/i18n/catalog.ts` : catalogue français unique, source de vérité
  pour tous les textes de l'interface.
- `src/i18n/translate.ts` : fournit `useTranslations()` / `useLocale()`
  avec la même signature qu'avant, pour ne pas casser les composants
  existants.
- `src/components/layout/GoogleTranslateEngine.tsx` : moteur Google
  Translate, monté une fois dans le layout racine.
- `src/components/layout/GoogleTranslateWidget.tsx` : sélecteur de
  langue visible (FR, EN, AR, DE, ES, IT, NL, PT), mémorise le choix
  d'une page à l'autre, bascule en RTL pour l'arabe.

Ce choix a été fait délibérément pour ce projet : pas de fichiers de
traduction à maintenir par langue, un seul texte source à corriger.
La contrepartie est une dépendance à la disponibilité du script Google
au chargement (acceptable ici).

### Traduction des données métier (offres, catégories)

Les titres/descriptions des offres et catégories restent gérés côté
backend, indépendamment de Google Translate :

- français : saisi par l'administrateur (source éditoriale) ;
- anglais : traduction générée automatiquement côté serveur (DeepL, si
  `DEEPL_API_KEY` est configurée) lors de la création/modification ;
- affichage public : lecture directe de la traduction déjà enregistrée
  en base — pas de traduction à la volée à chaque affichage.

---

## 8. Réservation + WhatsApp

Le parcours client fait deux choses, dans cet ordre :

1. enregistre la réservation en base (statut `PENDING`) ;
2. ouvre WhatsApp du **client** vers le numéro configuré dans
   **Paramètres → Contact du site** (dashboard admin), avec un message
   de réservation pré-rempli — le client clique ensuite sur *Envoyer*.

C'est le fonctionnement **par défaut et actuellement actif**. Aucune
configuration Meta n'est nécessaire : renseignez simplement le numéro
WhatsApp de l'administrateur (format international, ex. `+21652663607`)
dans le dashboard, **Paramètres → Contact**.

### Option avancée (désactivée par défaut) : notification serveur automatique

Le backend contient aussi `src/lib/whatsapp.ts`, capable d'envoyer une
notification **automatique** à l'admin via l'API officielle WhatsApp
Cloud (Meta), sans action du client. Cette voie nécessite :

1. un compte Meta Business + une app WhatsApp Business configurée ;
2. un **template de message pré-approuvé** par Meta (obligatoire : un
   message envoyé par le serveur sans que l'admin n'ait écrit avant est
   un message "business-initiated", refusé en texte libre par Meta) ;
3. les variables d'environnement `WHATSAPP_ACCESS_TOKEN` et
   `WHATSAPP_PHONE_NUMBER_ID` dans `backend/.env`.

Si ces variables sont absentes, la fonction s'arrête silencieusement —
**la réservation n'est jamais bloquée**, WhatsApp indisponible ou non
configuré n'empêche jamais l'enregistrement.

---

## 9. Fonctionnalités actuelles

- **Compte administrateur** : nom d'utilisateur, e-mail modifiable,
  prénom/nom, photo de profil, changement de mot de passe, connexion
  par e-mail **ou** nom d'utilisateur. Email et nom d'utilisateur
  demandent le mot de passe actuel avant modification. Les erreurs de
  validation (Zod) remontent en HTTP 400 avec le détail par champ.
- **Catégories** : création avec ou sans image de couverture (placeholder
  propre si absente), ordre persisté par `displayOrder`, réorganisation
  désactivée tant qu'un filtre/recherche est actif.
- **Offres** : disponibilité automatique ou sur demande
  (`availabilityOnDemand`), champs personnalisés libres
  (`OfferCustomField[]`) affichés sur la page publique de l'offre.
- **Promotions** : prix promo obligatoirement inférieur au prix
  d'origine (refusé sinon côté backend), pourcentage calculé
  automatiquement, lignes colorées selon le calendrier (vert = en
  cours, rouge = expirée, orange = à venir).
- **Réservations** : statuts réservation/paiement avec couleurs
  sémantiques légères.
- **Site public** : recherche centrale (destination/dates/voyageurs),
  navigation par catégories, cartes d'offres, CTA de réservation,
  header sticky après défilement, responsive mobile/tablette/desktop.

---

## 10. Règles métier — disponibilité

Champ : `availabilityOnDemand`.

- `false` → disponibilité automatique. Une réservation **confirmée**
  bloque l'offre entière sur `[startDate, endDate)`.
- `true` → disponibilité sur demande. **Aucun blocage** n'est créé.
  L'administrateur contacte le partenaire puis confirme manuellement.

Le passage à `CONFIRMED` s'exécute dans une transaction Prisma :
vérification des chevauchements → création du bloc lié à la réservation
→ confirmation, pour empêcher deux confirmations concurrentes de
réserver la même période.

## 11. Images — ⚠️ point d'attention avant mise en production

Le backend écrit actuellement les images uploadées (offres, catégories,
logo) sur le **disque local** du serveur (`backend/uploads/`, via
`multer` + `sharp`).

- En développement local : aucun problème.
- Sur un hébergeur gratuit (Render free, ou toute plateforme sans
  disque persistant) : **les fichiers uploadés disparaissent** à chaque
  redéploiement ou mise en veille. Acceptable pour une démo/test, **pas**
  pour livrer une version définitive au client.

**Avant la mise en ligne payante définitive**, migrer le stockage vers
un service persistant (Supabase Storage, déjà dans l'écosystème du
projet, ou un CDN équivalent), et faire retourner au backend des URLs
absolues HTTPS (`url`, `thumbnailUrl`, `mediumUrl`, `largeUrl`).

## 12. Performance

- API : timeout frontend fixé à 8 s pour éviter une attente infinie.
- Données fréquentes : cache côté serveur/API recommandé (10–30 s
  selon le module).
- Images : miniature dans les listes, medium dans les cartes, large
  uniquement en galerie/lightbox ; WebP déjà utilisé côté traitement
  `sharp`.
- Compression HTTP (Brotli/Gzip) activée côté Express (`compression`).
- Le changement de langue ne bloque plus l'affichage (Google Translate
  se charge de façon asynchrone, le contenu français s'affiche
  immédiatement).

---

## 13. Déploiement — tester gratuitement

Architecture recommandée pour une phase de test gratuite :

| Composant | Hébergeur | Pourquoi |
|---|---|---|
| `frontend/` | **Vercel** (plan Hobby, gratuit) | Fait pour Next.js, déploiement automatique depuis GitHub |
| `backend/` | **Render** (plan Free) | Process Node/Express persistant, contrairement aux fonctions serverless de Vercel |
| Base de données | **Supabase** (déjà utilisé) | Déjà en place, plan gratuit suffisant pour un test |

### Correctif nécessaire avant un déploiement multi-domaines

Le cookie de session utilise `sameSite: 'lax'`, ce qui **bloque** son
envoi entre deux domaines différents (ex. `*.vercel.app` →
`*.onrender.com`) : le login semblerait fonctionner mais chaque appel
API suivant échouerait en 401. Dans
`backend/src/middlewares/auth.ts` :

```ts
export function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    domain: env.COOKIE_DOMAIN,
    expires,
    path: '/',
  };
}
```

### Étapes

```bash
# 1. Pousser le code sur GitHub
cd C:\Projects\ihost\tourism-platform
git add .
git commit -m "chore: prêt pour déploiement test"
git push origin main
```

**Backend sur Render** (render.com → New Web Service → dépôt GitHub) :

| Champ | Valeur |
|---|---|
| Root Directory | `backend` |
| Build Command | `npm ci && npx prisma generate && npm run build` |
| Start Command | `npm start` |
| Variables | mêmes clés que `.env` (section 5), `CORS_ORIGIN` / `APP_BASE_URL` = URL Vercel |

Puis, une seule fois, depuis votre poste :
```bash
cd backend
npx prisma migrate deploy
```

**Frontend sur Vercel** (vercel.com → Add New Project → dépôt GitHub) :

| Champ | Valeur |
|---|---|
| Root Directory | `frontend` |
| `NEXT_PUBLIC_API_ORIGIN` | URL Render du backend |
| `NEXT_PUBLIC_SITE_URL` | URL Vercel du frontend |

Render free se met en veille après ~15 min d'inactivité (premier appel
suivant : ~30-50 s). Normal en test, à remplacer par un plan payant
avant la livraison définitive.

### Passage en production payante pour le client

1. Achat d'un nom de domaine (ex. `ihost-tunisia.com`).
2. Vercel : Project Settings → Domains → `www.ihost-tunisia.com`
   (DNS chez le registrar).
3. Backend : plan payant (Render Starter, Railway, ou VPS) + disque
   persistant ou stockage objet (section 11), sous-domaine
   `api.ihost-tunisia.com`.
4. Mise à jour des variables des deux côtés (`NEXT_PUBLIC_API_ORIGIN`,
   `CORS_ORIGIN`, `APP_BASE_URL`, `COOKIE_DOMAIN=.ihost-tunisia.com`).

---

## 14. Checklist avant démonstration client

```bash
cd backend  && npm ci && npm run build
cd frontend && npm ci && npm run build
```

Puis tester manuellement :

- `/fr/login` : connexion admin ;
- `/fr/dashboard/categories` : création, modification, suppression,
  réorganisation ;
- `/fr/dashboard/offers` : image, disponibilité automatique/sur demande ;
- `/fr/dashboard/availability` : bloc manuel uniquement pour les offres
  automatiques ;
- une réservation confirmée → bloc automatique côté backend ; une offre
  "sur demande" → aucun bloc ;
- clic "Réserver via WhatsApp" côté site public → WhatsApp s'ouvre avec
  le message pré-rempli, vers le numéro configuré ;
- sélecteur de langue (globe) → traduction visible sans rechargement
  bloquant ;
- en production : URLs d'images en HTTPS absolues.

---

## 15. Workflow Git

Convention de branches :

- `main` → toujours stable/déployable ;
- `develop` → intégration ;
- `feature/<nom>` → une fonctionnalité par branche.

```bash
git checkout develop
git checkout -b feature/nom-de-la-fonctionnalite
# ... coder ...
git add .
git commit -m "feat(module): description courte"
git push -u origin feature/nom-de-la-fonctionnalite
# Pull Request feature/... → develop sur GitHub
```

Convention de messages (Conventional Commits) :

- `feat: ...` nouvelle fonctionnalité
- `fix: ...` correction de bug
- `chore: ...` maintenance / config
- `refactor: ...` réorganisation sans changement de comportement
- `docs: ...` documentation

## 16. Prochaine étape logique

Chaque module en attente (Zones, Offres, Réservations...) suit le même
patron que Catégories :

- **Backend** : `src/modules/<module>/` avec `*.validation.ts`,
  `*.service.ts`, `*.controller.ts`, `*.routes.ts`, puis
  l'enregistrer dans `src/routes/index.ts`.
- **Frontend** : page dans `app/[locale]/(dashboard)/dashboard/<module>/`,
  `enabled: true` dans `nav-config.ts`, textes ajoutés dans
  `src/i18n/catalog.ts`.

---

## Historique des décisions importantes

Pour éviter toute confusion si vous relisez d'anciennes notes ou zips :

- **i18n** : le projet est passé de `next-intl` (fichiers `fr.json` /
  `en.json`) à Google Translate + catalogue français unique. `next-intl`
  a été désinstallé, `src/messages/` supprimé.
- **WhatsApp** : le parcours client (`wa.me`) est la solution retenue et
  active. L'intégration Meta Cloud API existe dans le code mais reste
  **optionnelle et désactivée par défaut**.
- **Cookie de session** : `sameSite` dynamique (`none` en production,
  `lax` en développement) pour supporter un déploiement frontend/backend
  sur deux domaines différents.
