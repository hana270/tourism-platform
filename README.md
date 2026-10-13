# IHOST — Plateforme touristique (v21)

Site de tourisme avec un **espace client** (recherche, fiches d'offres, demande de réservation en un clic) et un **espace administrateur** (catalogue, réservations, calendrier, promotions, analyses, réglages).

| Couche | Technologie | Hébergement |
|---|---|---|
| Frontend | Next.js 14 (App Router), React, Tailwind CSS | Vercel |
| Backend | Node.js, Express, Prisma, Zod | Render |
| Base de données | PostgreSQL | Supabase |
| Images | Supabase Storage (bucket public `media`) | Supabase |
| E-mails | Brevo / Resend (API HTTPS) ou SMTP | au choix |

```
backend/    API : src/modules (offers, reservations, promotions, insights…), cache public en mémoire, src/lib (mailer, smtp, storage…), prisma/
frontend/   Site + admin : src/app, src/components, src/lib
.githooks/  Garde-fou Git anti-fuite de secrets
```

---

## 1. Démarrage local

Prérequis : Node.js 20+ (frontend : 24 recommandé), un projet Supabase.

```bash
# Terminal 1 — API → http://localhost:4000
cd backend
cp .env.example .env                 # renseigner les valeurs (§2)
npm ci
npm run prisma:migrate:deploy        # applique les migrations
npm run dev                          # régénère automatiquement le client Prisma (predev)

# Terminal 2 — Site → http://localhost:3000
cd frontend
cp .env.local.example .env.local     # NEXT_PUBLIC_API_ORIGIN=http://localhost:4000
npm ci
npm run dev
```

Admin : `http://localhost:3000/fr/login`. Avant de livrer : `cd backend && npx tsc --noEmit && npm run build`, puis `cd frontend && npm run build`.

## 2. Variables d'environnement

Les valeurs **secrètes** vivent uniquement dans `backend/.env` (local) et dans les variables Render (production). Jamais dans le code, jamais dans Git, jamais dans un ZIP.

| Variable (backend) | Rôle | Secret |
|---|---|:--:|
| `DATABASE_URL`, `DIRECT_URL` | Base Supabase (pooler 6543 / directe 5432) | ✅ |
| `SUPABASE_URL`, `SUPABASE_BUCKET` | Stockage des images | — |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé `service_role` Supabase | ✅ |
| `CORS_ORIGIN` | URL(s) exacte(s) du frontend (sert aussi de protection CSRF) | — |
| `APP_BASE_URL` | URL publique du **frontend** (liens des e-mails) | — |
| `SESSION_COOKIE_NAME`, `SESSION_DAYS` | Session administrateur | — |
| `MAIL_FROM` | Expéditeur, ex. `IHOST <no-reply@domaine.com>` | — |
| `BREVO_API_KEY` ou `RESEND_API_KEY` | E-mails par API HTTPS | ✅ |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | E-mails par SMTP (§3) | ✅ (`SMTP_PASS`) |
| `WHATSAPP_SERVER_NOTIFY` | `false` par défaut (voir §4) | — |
| `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | Notification serveur (facultatif) | ✅ |
| `DEEPL_API_KEY` | Traduction (si utilisée) | ✅ |

Frontend (publiques, aucun secret) : `NEXT_PUBLIC_API_ORIGIN` (sans `/api/v1`), `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` (facultatif). Tout ce qui commence par `NEXT_PUBLIC_` est visible par tous les visiteurs.

## 3. E-mails (mot de passe oublié)

Parcours : lien par e-mail (60 min, usage unique) → nouveau mot de passe → e-mail de confirmation → sessions fermées. Ordre de priorité : Brevo → Resend → SMTP.

| Option | Quand l'utiliser |
|---|---|
| **Brevo** (API, gratuit ~300/jour) | **Production** — recommandé, fonctionne sur l'offre gratuite de Render |
| **Resend** (API, gratuit ~3 000/mois) | Production, avec un domaine vérifié |
| **SMTP** (ex. Gmail) | Local, serveur dédié ou Render payant. ⚠ Render **bloque les ports SMTP** sur l'offre gratuite |

**Gmail en SMTP** (compte avec validation en 2 étapes) : Compte Google → Sécurité → *Mots de passe des applications* → créer un mot de passe (16 lettres), puis dans `backend/.env` :

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=adresse@gmail.com
SMTP_PASS=mot-de-passe-d-application
MAIL_FROM=IHOST <adresse@gmail.com>
```

> **Sécurité** : un mot de passe d'application ne se colle jamais dans le code, un README, un chat ou un ticket. S'il a été partagé quelque part, **supprimez-le** dans votre compte Google et créez-en un nouveau. Pour un site livré à un client, utilisez la boîte du **client** (ou Brevo à son nom), pas un compte personnel.

Sans fournisseur, en local, le lien s'affiche dans la console du backend (jamais en production).

## 4. Règles métier

**Réservation** — le client choisit ses dates et, pour un hôtel, **sa formule** ; un seul clic enregistre la demande et ouvre WhatsApp avec le message prêt (offre, formule, tarif appliqué, dates, total estimé). Le message part **une seule fois** : le bouton se verrouille après l'envoi, et un anti-doublon serveur ignore un renvoi identique (même offre, téléphone et dates, 15 min). La demande est « En attente » et ne bloque aucune date ; l'administrateur **confirme**, et les dates sont alors bloquées (jour de départ libre). Le tarif est toujours recalculé par le serveur, jamais pris du navigateur. La notification WhatsApp serveur (`WHATSAPP_SERVER_NOTIFY=true`) est facultative : active, l'administrateur recevrait deux messages.

**Disponibilité et chambres d'hôtel** — un studio, un appartement ou une activité est une **unité unique** : une fois la réservation confirmée, les dates sont grisées pour les autres clients. Un **hôtel** a plusieurs chambres : plusieurs clients peuvent réserver les mêmes dates. Dans la fiche de l'hôtel (admin), le champ **« Nombre de chambres »** (facultatif) fixe le plafond : les dates ne sont grisées que lorsque toutes les chambres sont réservées ; vide = aucune limite. Le calendrier admin et la confirmation appliquent la même règle.

**Promotions** — une promotion par prix :

| Offre | Prix promouvables |
|---|---|
| Appartement, studio, villa, activité | Un seul prix |
| Hôtel | Logement seul, demi-pension, pension complète, all inclusive : **un à quatre**, au choix |

L'ancien prix est lu sur l'offre ; si le prix change, la promotion se resynchronise ou se désactive. Elles apparaissent sur la section « Offres spéciales » de l'accueil (si « mettre en avant » est coché), sur les cartes, dans la fiche de l'offre (bandeau, remises par formule, compte à rebours) et dans l'admin (fiche de l'offre → Promotions).

**Accueil** — l'ordre et la visibilité des sections se règlent dans *Paramètres → Disposition du site* ; les destinations avec offres passent avant les autres.

## 5. Tableau de bord (analyses)

La page d'accueil de l'admin répond en langage simple à quatre questions :

| Bloc | Ce que l'administrateur y voit |
|---|---|
| **À faire maintenant** | Demandes à traiter, arrivées de la semaine, promotions en cours, offres en ligne — chaque carte mène à la bonne page |
| **Votre activité** | Demandes reçues, réservations confirmées, « demandes acceptées sur 100 », montant estimé — chacun avec une explication d'une ligne et la comparaison avec la période d'avant (7 jours, 30 jours, 3 ou 12 mois) |
| **Jour par jour** | Courbe des demandes et confirmations, jour le plus actif, répartition confirmées / à traiter / refusées |
| **Ce qui plaît le plus** | Offres, destinations, types d'offres et formules d'hôtel les plus demandés, plus « À retenir » (conseils en phrases) |

Le **montant estimé** = tarif appliqué × nuits ou personnes des réservations confirmées : c'est une estimation, le paiement se fait hors du site. Export Excel (CSV) disponible. La **fréquentation du site** (visiteurs, provenance) n'est pas mesurée : elle demande un outil dédié et respectueux de la vie privée (Plausible, Matomo, Google Analytics).

## 6. Tester en local

| Fonction | Test | Résultat attendu |
|---|---|---|
| Fiche offre | Ouvrir une offre | Galerie, sections, carte de réservation ; `/fr/offers/inconnu` → 404 |
| Hôtel | Choisir une formule, des dates, envoyer | WhatsApp s'ouvre une fois, message avec la formule et le prix |
| Liste admin | Réservations (actualisation toutes les 30 s) | Demande « En attente » avec la formule |
| Doublon | Cliquer deux fois / renvoyer | Une seule réservation |
| Promotion hôtel | Promotions → hôtel → cocher 1 à 4 prix | Remise sur chaque prix coché (accueil, carte, fiche) |
| Promotion studio | Même écran, offre à prix unique | Un seul prix proposé |
| Mot de passe oublié | `/fr/forgot-password` | E-mail (ou lien en console) → nouveau mot de passe |
| Hôtel plusieurs chambres | Confirmer 2 réservations sur les mêmes dates d'un hôtel | Dates toujours disponibles côté client (sauf si « Nombre de chambres » est atteint) |
| Tableau de bord | Page d'accueil de l'admin | « À faire », activité, courbe, classements, export |
| Disposition | Paramètres → Disposition du site (mobile aussi) | Ordre et visibilité enregistrés |

## 7. Sécurité

### Fichiers sensibles — ne jamais les commiter ni les envoyer

| Fichier | Contenu |
|---|---|
| `backend/.env` | Mot de passe de la base, clés Supabase, e-mail, WhatsApp, DeepL |
| `frontend/.env.local` | Variables locales du frontend |
| `*.pem`, `*.key`, `*service-account*.json` | Clés privées, comptes de service |
| `dump*.sql`, `*.dump`, `backups/` | Copies de la base (données clients) |
| `backend/uploads/`, `*.zip` | Fichiers locaux et archives qui peuvent embarquer tout ce qui précède |

Le `.gitignore` les exclut ; seuls `.env.example` et `.env.local.example` (sans valeurs réelles) sont versionnés.

### Protéger le dépôt contre les personnes extérieures

1. **Dépôt GitHub privé** : *Settings → General → Danger Zone → Change visibility → Private*. Un dépôt public est lisible (et copiable) par tout le monde.
2. **Authentification à deux facteurs** sur GitHub, Supabase, Render, Vercel et la boîte e-mail utilisée.
3. **Aucun secret dans le dépôt** : les mots de passe et clés vivent seulement dans `backend/.env` (poste local, ignoré par Git) et dans les variables Render/Vercel. Ne les envoyez jamais par chat, e-mail ou ZIP.
4. **Accès minimal** : n'invitez sur le dépôt que les personnes nécessaires, avec le rôle le plus faible ; retirez l'accès en fin de mission.
5. Si un secret a déjà été partagé quelque part (chat, ZIP, capture) : **changez-le** (voir « Si un secret a fuité »).

### Garde-fou anti-fuite (à activer une fois par poste)

```bash
git config core.hooksPath .githooks
```

Avant chaque commit, le hook **refuse** : les fichiers `.env`/clés/dumps, les mots de passe ou jetons écrits en dur, les URL de base de données avec mot de passe, les clés privées. Contrôle manuel : `bash .githooks/pre-commit`.

### Protections en place

- **Mots de passe** : bcrypt (coût 12), politique 10 caractères + lettre + chiffre ; jamais journalisés.
- **Réinitialisation** : jeton de 256 bits stocké haché, 60 min, usage unique, réponse identique que le compte existe ou non, e-mail d'alerte après changement.
- **Connexion** : limitation des essais, temps de réponse uniforme, redirection limitée aux chemins internes, aucune inscription publique.
- **Session** : cookie `HttpOnly`/`Secure` ; **anti-CSRF** par contrôle d'origine (`CORS_ORIGIN`).
- **E-mails** : retours à la ligne neutralisés (aucune injection d'en-têtes), SMTP refusé sans STARTTLS.
- **En-têtes** : Helmet (API) ; HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, CSP `frame-ancestors 'none'` (site).
- **Données** : validation Zod partout ; prix de réservation recalculés côté serveur ; erreurs sans détail technique.

### Si un secret a fuité

1. **Changez-le immédiatement** chez le fournisseur (base : Supabase → *Reset database password* ; clés Supabase, Brevo/Resend, DeepL, WhatsApp ; mot de passe d'application Google), puis mettez à jour Render.
2. Si un `.env` a été commité : `git rm --cached backend/.env frontend/.env.local`, commit, push — **puis** changez les secrets (l'historique les conserve).
3. Pour l'effacer de l'historique : `git filter-repo --path backend/.env --invert-paths`, puis `git push --force`.

## 8. Commit et push

```bash
git config core.hooksPath .githooks          # une fois
git status                                   # aucun .env dans la liste
git add .
git commit -m "Description claire du changement"
git push
```

Première fois :

```bash
git init && git branch -M main
git remote add origin https://github.com/<compte>/<depot>.git
git add . && git commit -m "IHOST v20" && git push -u origin main
```

Render et Vercel redéploient automatiquement. Vérification complémentaire : `git ls-files | grep -E "\.env"` ne doit afficher que les `*.example`.

## 9. Déploiement et migrations

1. **Supabase** : `npm run storage:init` puis `npm run prisma:migrate:deploy` (depuis `backend/`).
2. **Migrations récentes** : `20261011120000_reservation_formula` (formule et prix des réservations), `20261012100000_hotel_rooms` (nombre de chambres des hôtels) — `prisma:migrate:deploy` les applique. Puis arrêter le backend et lancer `npm run prisma:generate`.
3. **Render** (backend) : variables du §2 · Build `npm run build` · Start `npm start`.
4. **Vercel** (frontend) : `NEXT_PUBLIC_API_ORIGIN`, `NEXT_PUBLIC_SITE_URL` · redéployer **après** le backend.
5. Réservations confirmées avant la v17 : `npm run bookings:backfill` (simulation), puis `-- --apply`.

## 10. Référencement (SEO) international

En place : pages d'offres et accueil rendus côté serveur, vraie 404, titres/descriptions uniques, URL canoniques et stables, Open Graph / Twitter, `sitemap.xml`, `robots.txt` (admin et connexion exclus), `lang="fr"`, `og:locale fr_TN`, données structurées JSON-LD : **Organization/TravelAgency + WebSite (recherche)** sur l'accueil, **Hotel / Product + fil d'Ariane** sur les offres, avec **une `Offer` par formule** et `priceValidUntil` pour les promotions (éligible aux résultats enrichis de prix).

Performance : les lectures publiques (offres, catégories, destinations, réglages) sont servies depuis un cache mémoire de quelques secondes, vidé à chaque modification dans l'admin (en-tête `X-Cache: HIT/MISS`), en plus de la compression et des en-têtes `Cache-Control`.

Limite : le site est en français ; les autres langues du sélecteur sont des traductions automatiques, **non indexables**. Pour référencer d'autres pays/langues, il faudra des URL dédiées (`/en`, `/ar`) avec contenu traduit et balises `hreflang`.

Après la mise en ligne : Google Search Console (code via `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`), envoi de `/sitemap.xml`, test d'une fiche avec « Test des résultats enrichis », `NEXT_PUBLIC_SITE_URL` = domaine final en HTTPS.

## 11. Dépannage

| Problème | Solution |
|---|---|
| `Unknown argument priceType` / client Prisma obsolète | Arrêter le backend, `npm run prisma:generate`, relancer (`npm run dev` le fait désormais seul) |
| Aucun e-mail reçu | Fournisseur configuré (§3) ; expéditeur vérifié ; logs Render ; spams. SMTP impossible sur Render gratuit → Brevo |
| Lien de réinitialisation vers `localhost` | `APP_BASE_URL` = URL publique du frontend |
| Erreur 403 « Origine non autorisée » | `CORS_ORIGIN` = URL **exacte** du frontend, sans `/` final |
| WhatsApp ne s'ouvre pas | Fenêtre bloquée : bouton vert de l'écran de confirmation (la demande est déjà enregistrée) |
| Promotion refusée | Le prix promo doit être inférieur au prix de l'offre, qui doit être renseigné |
| Commit refusé par le hook | Un secret ou un `.env` est dans les fichiers ajoutés : le retirer, puis recommencer |
| `Can't reach database server …:6543` | Base inaccessible : projet Supabase en pause (le réveiller), VPN/pare-feu qui bloque le port 6543, ou connexion internet. En local, tester avec le port 5432 dans `DATABASE_URL` |
| Next : `Cannot read properties of undefined (reading 'clientModules')` | Cache de compilation corrompu : arrêter le frontend, supprimer le dossier `frontend/.next`, relancer `npm run dev` |
| Images en 404 | Variables `SUPABASE_*` ; `npm run images:verify` |
