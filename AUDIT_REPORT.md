# 🔍 SMART SHOP — RAPPORT D'AUDIT TECHNIQUE COMPLET

**Date :** 2026-03-04  
**Auditeur :** Auditeur Technique Sénior (Next.js, PWA, SaaS B2C, Prisma, React)  
**Codebase :** `/home/z/smart-shop/`  
**Scope :** Architecture, Prisma, PWA, Scanner, Budget, Ticket, Dashboard, SaaS/Stripe, Sécurité, Performance

---

## 📈 1. SCORE GLOBAL DE PRÉPARATION PRODUCTION

| Catégorie | Score | Pondération | Score Pondéré |
|-----------|-------|-------------|---------------|
| Architecture & Structure | 30/100 | 15% | 4.5 |
| Prisma & Base de données | 35/100 | 12% | 4.2 |
| PWA & Offline-First | 15/100 | 12% | 1.8 |
| Scanner & UX Mobile | 65/100 | 10% | 6.5 |
| Budget & Temps Réel | 50/100 | 10% | 5.0 |
| Ticket & Export | 60/100 | 8% | 4.8 |
| Dashboard & Analytique | 55/100 | 8% | 4.4 |
| SaaS & Stripe | 10/100 | 12% | 1.2 |
| Sécurité & Validation | 25/100 | 13% | 3.25 |
| Performance & DX | 40/100 | — | — |

### 🏆 SCORE GLOBAL : **35 / 100** — 🔴 NON PRÊT POUR LA PRODUCTION

> Le projet est un **prototype fonctionnel bien structuré** avec des aspirations production, mais l'implémentation est de niveau **démo/prototype**. Les lacunes critiques en sécurité (pas d'auth middleware, IDOR, leak passwordHash), l'absence totale de Stripe, et l'absence de service worker rendent toute mise en production prématurée dangereuse.

---

## 🗂️ 2. TABLEAU RÉCAPITULATIF PAR MODULE

| Module | ✅ Implémenté | ⚠️ Partiel/À optimiser | ❌ Manquant/Critique |
|--------|--------------|------------------------|---------------------|
| **Architecture** | Lazy loading, standalone output, Zustand, ThemeProvider | Animations Framer Motion | SPA mono-page (`"use client"` unique), pas de App Router routing, admin sans auth gate, `ignoreBuildErrors: true` |
| **Prisma** | Cascade deletes, indexes, CUID IDs, champs Stripe | Enum en String, `itemsJson` anti-pattern | SQLite only, pas de migrations, `Float` pour l'argent, pas de modèle Subscription |
| **PWA** | Manifest complet, OfflineIndicator UI | localStorage queue, exponential backoff | **Pas de service worker**, pas de IndexedDB, pas de cache offline, pas de fallback page |
| **Scanner** | BarcodeDetector API, haptics, son, double-scan debounce (3s), lampe torche, saisie manuelle | Pas de throttle sur detectFrame | **Pas de fallback html5-qrcode** (Firefox/Safari = saisie manuelle uniquement) |
| **Budget** | Seuils 80%/100%, BudgetBar animée, optimistic UI scan, safe-helpers | Budget hardcodé 50€, pas de 110% | Pas de temps réel (pas de WebSocket/SSE/polling), pas de vérification serveur du budget |
| **Ticket** | jsPDF + autoTable, SHA-256 hash, CSV RFC 4180, idempotence | hash non-déterministe (timestamp), pas de QR code, Base64 stockage | Pas de génération offline (crypto Node-only), pas de QR code |
| **Dashboard** | Recharts (Bar+Line), M vs M-1, skeletons, empty states, responsive | Pas de filtres date/catégorie, pas de N-1 | Pas de drill-down, pas de budget vs actual chart |
| **SaaS/Stripe** | Plan field DB, FeatureFlags type, UI gating premium, table comparaison | FeatureFlags non enforceés, `onUpgradePlan` no-op | **Stripe SDK absent**, pas de checkout/webhook/portal, plan modifiable sans paiement |
| **Sécurité** | bcryptjs, HttpOnly cookies, Zod sur la plupart des routes, admin HMAC | Rate limiter in-memory, ADMIN_SECRET fallback hardcodé | **passwordHash leak**, IDOR sur lists/sessions, pas de middleware auth, demo user backdoor |
| **Performance** | Prisma singleton, useMemo, standalone output | `noImplicitAny: false`, query logging prod | Pas de error boundary, pas de dynamic imports heavy libs, pas de bundle analysis |

---

## 🔍 3. ANALYSE DÉTAILLÉE PAR CATÉGORIE

### 3.1 Architecture & Structure

**Écarts vs cahier des charges :**
- L'application entière vit dans un seul `"use client"` page (`src/app/page.tsx`). Pas de routing App Router — les vues sont gérées par un state `currentView` + hash URL (`#/admin`). Cela élimine SSR, code-splitting par route, SEO, et deep-linking.
- L'admin dashboard est accessible via `#/admin` sans aucune vérification serveur.

**Risques identifiés :**
- ❌ **P0** : `next.config.ts:7` — `ignoreBuildErrors: true` masque toutes les erreurs TypeScript au build
- ❌ **P0** : Pas de `middleware.ts` — aucune protection de route côté serveur
- ⚠️ **P1** : `tsconfig.json:13` — `noImplicitAny: false` invalide `strict: true`
- ⚠️ **P1** : `reactStrictMode: false` dans `next.config.ts`
- ⚠️ **P1** : Conflit Tailwind v3/v4 — `tailwind.config.ts` (v3) ignoré car `postcss.config.mjs` utilise `@tailwindcss/postcss` (v4)

**Code détecté :**
```typescript
// page.tsx L88-92 — admin sans auth
useEffect(() => {
  const handleHash = () => {
    if (window.location.hash === "#/admin") {
      setShowAdmin(true);   // ← n'importe qui accède à l'admin
    }
  };
```

---

### 3.2 Prisma & Base de données

**Écarts vs cahier des charges :**
- SQLite uniquement — le schéma commentaire dit "production would use PostgreSQL" mais aucune migration path
- Pas de répertoire `prisma/migrations/` — seul `db push` est utilisé (non sécurisé en production)
- `Float` pour les prix — problème IEEE 754 pour une app financière
- `itemsJson` (String JSON) sur ShoppingList — anti-pattern qui casse l'intégrité référentielle

**Risques identifiés :**
- ❌ **P0** : SQLite en production — pas de writes concurrents, pas de row-level locking
- ❌ **P0** : Pas de migrations — `db push` peut dropper des colonnes silencieusement
- ⚠️ **P1** : `Float` pour `price` (ScannedItem L92, Product L137) — `0.1 + 0.2 !== 0.3`
- ⚠️ **P1** : Pas de modèle `Subscription` — Stripe IDs plats sur User sans tracking
- ⚠️ **P1** : `plan` et `status` en `String` — pas d'enum (impossible en SQLite)
- ⚠️ **P1** : `Receipt.pdfData` en Base64 dans la DB — gonfle le fichier SQLite

**Code détecté :**
```prisma
// schema.prisma L22 — plan non contraint
plan    String  @default("free") // "free" | "premium" | "family"

// schema.prisma L92 — Float pour l'argent
price   Float   // ← IEEE 754: 0.1 + 0.2 = 0.30000000000000004
```

---

### 3.3 PWA & Offline-First

**Écarts vs cahier des charges :**
- **AUCUN service worker** — le manifest existe mais l'app ne fonctionne pas offline au niveau shell
- La queue offline utilise `localStorage` (~5MB max) au lieu de IndexedDB
- Quand un scan est fait offline, `scanProduct()` retourne `null` — l'utilisateur ne voit rien dans son panier

**Risques identifiés :**
- ❌ **P0** : Pas de service worker — la PWA ne peut pas s'installer fonctionnellement
- ⚠️ **P1** : localStorage vs IndexedDB — limite 5MB, synchrone (bloque le main thread)
- ⚠️ **P1** : Scan offline retourne `null` — pas d'optimistic item local
- ⚠️ **P1** : `dequeueActions()` retire TOUT avant retry — si crash mid-sync, données perdues

**Code détecté :**
```typescript
// use-scanner.ts L84-91 — offline scan = null
if (!navigator.onLine) {
  await enqueueAction({ type: "scan", payload: input });
  return null;  // ← l'utilisateur ne voit rien dans son panier
}
```

---

### 3.4 Scanner & UX Mobile

**Écarts vs cahier des charges :**
- `BarcodeDetector` API uniquement — pas de fallback `html5-qrcode` pour Firefox/Safari
- Pas de throttle sur la boucle de détection (60fps → gaspillage CPU/batterie)

**Ce qui fonctionne bien :**
- ✅ Détection multi-formats (EAN-13, EAN-8, UPC-A, UPC-E, Code-128, Code-39, QR)
- ✅ Haptic feedback (`navigator.vibrate(50)`)
- ✅ Audio feedback (Web Audio API)
- ✅ Double-scan prevention (3s debounce, `recentBarcodesRef` Set)
- ✅ Flashlight toggle
- ✅ Gestion permissions caméra avec messages français
- ✅ Saisie manuelle fallback

**Risques identifiés :**
- ⚠️ **P1** : Pas de fallback `html5-qrcode` → Firefox/Safari = saisie manuelle uniquement
- ⚠️ **P2** : Pas de throttle sur `detectFrame()` — 60 appels/s à `BarcodeDetector.detect()`

---

### 3.5 Budget & Temps Réel

**Écarts vs cahier des charges :**
- Pas de temps réel — pas de WebSocket, SSE, ni même polling
- Budget limit hardcodé à 50€ — pas de personnalisation
- Pas de vérification côté serveur lors d'un scan

**Ce qui fonctionne :**
- ✅ Seuils 80% (warning) et 100% (critical) avec animations
- ✅ BudgetBar accessible (`role="progressbar"`, aria)
- ✅ Optimistic UI dans ScannerView
- ✅ API budget analytics (catégorie, tendance 6 mois, M vs M-1)
- ✅ `safe-helpers.ts` — protection NaN/null

**Risques identifiés :**
- ⚠️ **P1** : Pas de canal temps réel — budget state diverge entre onglets/appareils
- ⚠️ **P1** : Budget hardcodé 50€ — `ScannerView.tsx:95`
- ⚠️ **P1** : Pas de budget check serveur dans `/api/scan`

---

### 3.6 Ticket & Export

**Écarts vs cahier des charges :**
- Hash SHA-256 inclus un timestamp → non déterministe, non vérifiable
- Pas de QR code sur le ticket
- Génération PDF Node-only (crypto.createHash) → impossible offline

**Ce qui fonctionne :**
- ✅ jsPDF + autoTable — format professionnel A4
- ✅ Hash SHA-256 affiché sur le PDF
- ✅ CSV RFC 4180 compliant (échappement, virgule française)
- ✅ Idempotence de reçu (vérifie existence avant régénération)
- ✅ Validation Zod complète

**Risques identifiés :**
- ⚠️ **P1** : `crypto.createHash` (Node-only) — impossible en client/service worker
- ⚠️ **P1** : Hash non-déterministe — `timestamp: new Date().toISOString()` dans les données
- ⚠️ **P2** : Pas de QR code sur le reçu
- ⚠️ **P2** : Base64 PDF en DB — ~33% plus volumineux que binaire

---

### 3.7 Dashboard & Analytique

**Écarts vs cahier des charges :**
- Pas de filtres date/catégorie/magasin
- Pas de comparaison année sur année (N-1)
- Pas de drill-down depuis les graphiques

**Ce qui fonctionne :**
- ✅ Recharts (BarChart catégories + LineChart tendance)
- ✅ Stat cards avec delta M vs M-1
- ✅ Skeleton loading + empty states animés
- ✅ Responsive (table desktop / cards mobile)
- ✅ useMemo sur les calculs lourds

**Risques identifiés :**
- ⚠️ **P1** : Pas de filtres date range / catégorie
- ⚠️ **P2** : Pas de drill-down, pas de budget vs actual chart

---

### 3.8 SaaS & Stripe

**Écarts vs cahier des charges :**
- **ZÉRO intégration Stripe** — le package `stripe` n'est même pas dans `package.json`
- Les feature flags sont définis en type mais jamais enforceés
- Le plan peut être changé via API sans paiement

**Ce qui existe (UI only) :**
- ✅ Champ `plan` dans la DB (String non contraint)
- ✅ Interface `FeatureFlags` dans `types/index.ts`
- ✅ UI gating (bouton premium grisé, badge Crown)
- ✅ Table comparaison Free/Premium dans Settings

**Risques identifiés :**
- ❌ **P0** : Pas de Stripe SDK — checkout/webhook/portal inexistants
- ❌ **P0** : `/api/user PATCH` accepte `plan` directement — n'importe qui peut se upgrader
- ❌ **P0** : FeatureFlags jamais enforceés côté serveur
- ⚠️ **P1** : Revenue hardcodé à 0 — `stats/route.ts:82`
- ⚠️ **P1** : `onUpgradePlan` est un no-op callback

**Code détecté :**
```typescript
// api/user/route.ts L82 — plan changeable sans paiement
if (plan !== undefined) updateData.plan = plan;
// Pas de vérification de session, pas de vérification Stripe

// stats/route.ts L82
revenueMonthly: 0, // TODO: implémenter avec Stripe si nécessaire
```

---

### 3.9 Sécurité & Validation

**Écarts vs cahier des charges :**
- Pas de middleware d'authentification
- Multiples vulnérabilités IDOR
- Leak de `passwordHash` via API
- Demo user backdoor sur plusieurs endpoints

**Risques identifiés :**
- ❌ **P0** : `/api/user GET` retourne `passwordHash`, `stripeCustomerId`, etc. — pas de `select`
- ❌ **P0** : `/api/lists/[id]` — IDOR: GET/PATCH/DELETE sans vérification userId
- ❌ **P0** : `/api/lists POST` — crée un demo user si pas de userId (L80-91)
- ❌ **P0** : `/api/user PATCH` — plan modifiable sans auth ni paiement
- ❌ **P0** : `/api/session/[id]` — GET/PATCH/DELETE sans vérification de propriété
- ⚠️ **P1** : Rate limiting uniquement sur `/api/scan` — pas sur login/register/admin
- ⚠️ **P1** : `ADMIN_SECRET` fallback hardcodé `"smartshop_admin_dev_secret_2024"`
- ⚠️ **P1** : Credentials admin affichés dans l'UI (`AdminDashboard.tsx:847`)
- ⚠️ **P1** : Pas de account lockout après échecs de login
- ⚠️ **P2** : Rate limiter in-memory — reset au redémarrage
- ⚠️ **P2** : Forgot password est un mock (`setTimeout(1500)`)

**Code détecté :**
```typescript
// api/user/route.ts L29-31 — passwordHash leak
const user = await db.user.findUnique({
  where: { id: parsed.data.userId },
  // PAS DE SELECT — retourne passwordHash, stripeCustomerId, etc.
});

// admin-auth.ts L15-16 — secret hardcodé
const ADMIN_SECRET =
  process.env.ADMIN_SECRET || "smartshop_admin_dev_secret_2024";
```

---

### 3.10 Performance & DX

**Écarts vs cahier des charges :**
- `ignoreBuildErrors: true` masque les erreurs TypeScript
- Pas de error boundaries React
- Pas de dynamic imports pour les libs lourdes

**Risques identifiés :**
- ❌ **P0** : `ignoreBuildErrors: true` — erreurs TS invisibles au build
- ⚠️ **P1** : Pas de error boundary — crash React = écran blanc
- ⚠️ **P1** : `noImplicitAny: false` — type safety réduite
- ⚠️ **P2** : `log: ['query']` en production — overhead + fuite PII
- ⚠️ **P2** : 12 fichiers importent framer-motion sans tree-shaking
- ⚠️ **P2** : Recharts importé statiquement (pas de lazy loading)
- ⚠️ **P2** : Dépendances mortes : `next-auth`, `@mdxeditor/editor`, `react-syntax-highlighter`, `cmdk`

---

### 3.11 Documentation & Déploiement

**Écarts vs cahier des charges :**
- ❌ Pas de README projet (seulement `download/README.md` = "Here are all the generated files.")
- ❌ Pas de `.env.example` — seul `.env` existe avec `DATABASE_URL`
- ⚠️ Pas de scripts de seed DB
- ⚠️ Pas de config Vercel/Cloudflare
- ⚠️ Pas de documentation API

---

## 🚨 4. MATRICE DE PRIORITÉS

### P0 — BLOQUANT / CRITIQUE (17 items)

| # | Module | Issue | Impact |
|---|--------|-------|--------|
| 1 | Sécurité | `/api/user GET` leak passwordHash | Fuite données sensibles |
| 2 | Sécurité | IDOR sur `/api/lists/[id]` | Accès non autorisé données autres utilisateurs |
| 3 | Sécurité | IDOR sur `/api/session/[id]` | Accès non autorisé sessions autres utilisateurs |
| 4 | Sécurité | `/api/user PATCH` plan modifiable sans paiement | Contournement monétisation |
| 5 | Sécurité | Demo user backdoor (lists/session routes) | Création comptes sans auth |
| 6 | Sécurité | Pas de middleware auth | Toutes les API ouvertes |
| 7 | SaaS | Pas de Stripe SDK | Impossible de monétiser |
| 8 | SaaS | Pas de checkout/webhook/portal | Zéro flux de paiement |
| 9 | SaaS | FeatureFlags jamais enforceés serveur | Premium gratuit |
| 10 | PWA | Pas de service worker | PWA non fonctionnelle |
| 11 | Architecture | `ignoreBuildErrors: true` | Erreurs TS invisibles |
| 12 | Architecture | Admin accessible sans auth serveur | Accès non autorisé admin |
| 13 | Prisma | SQLite en production | Pas de concurrence |
| 14 | Prisma | Pas de migrations | Risque de perte de données |
| 15 | Prisma | `Float` pour l'argent | Erreurs de calcul financières |
| 16 | Prisma | Pas de modèle Subscription | Impossible de tracker les abonnements |
| 17 | Architecture | SPA mono-page (pas de App Router) | Pas de SSR, code-splitting, SEO |

### P1 — IMPORTANT POUR UX OU CONFORMITÉ (16 items)

| # | Module | Issue |
|---|--------|-------|
| 1 | PWA | localStorage vs IndexedDB (limite 5MB) |
| 2 | PWA | Scan offline retourne `null` (rien dans le panier) |
| 3 | PWA | Queue data loss si crash mid-sync |
| 4 | Scanner | Pas de fallback html5-qrcode (Firefox/Safari) |
| 5 | Budget | Pas de temps réel (WebSocket/SSE/polling) |
| 6 | Budget | Budget hardcodé 50€ |
| 7 | Budget | Pas de vérification budget côté serveur |
| 8 | Ticket | `crypto.createHash` Node-only → pas de génération offline |
| 9 | Ticket | Hash non-déterministe (timestamp) |
| 10 | Sécurité | Rate limiting uniquement sur `/api/scan` |
| 11 | Sécurité | ADMIN_SECRET fallback hardcodé |
| 12 | Sécurité | Credentials admin dans l'UI |
| 13 | Sécurité | Pas de account lockout |
| 14 | Dashboard | Pas de filtres date/catégorie |
| 15 | DX | `noImplicitAny: false` |
| 16 | DX | Pas de error boundaries React |

### P2 — OPTIMISATION / SCALING / FEATURE FUTURE (15 items)

| # | Module | Issue |
|---|--------|-------|
| 1 | PWA | Pas de cache produit offline |
| 2 | Scanner | Pas de throttle sur detectFrame (60fps) |
| 3 | Scanner | Flashlight button re-render issue |
| 4 | Budget | Pas de seuil 110% |
| 5 | Ticket | Pas de QR code |
| 6 | Ticket | Base64 PDF en DB |
| 7 | Dashboard | Pas de comparaison N-1 |
| 8 | Dashboard | Pas de drill-down |
| 9 | Dashboard | Admin sans graphiques |
| 10 | Perf | Recharts/framer-motion pas lazy-loadés |
| 11 | Perf | Dépendances mortes dans package.json |
| 12 | DX | `reactStrictMode: false` |
| 13 | DX | Query logging Prisma en production |
| 14 | Sécurité | Rate limiter in-memory |
| 15 | Sécurité | Forgot password mock |

---

## 🛠️ 5. PLAN DE REMÉDIATION

### Phase 1 — SÉCURITÉ CRITIQUE (Effort: HIGH, 3-5 jours)

| Étape | Tâche | Détail | Effort |
|-------|-------|--------|--------|
| 1.1 | Créer `middleware.ts` | Valider session cookie sur toutes les routes `/api/*` (sauf login/register) | Med |
| 1.2 | Ajouter `select` sur `/api/user GET` | Exclure `passwordHash`, `stripeCustomerId`, `stripeSubscriptionId` | Low |
| 1.3 | Ajouter vérification userId sur toutes les routes | Chaque query Prisma doit inclure `where: { userId: sessionUserId }` | Med |
| 1.4 | Supprimer demo user creation | Retirer le code de création auto dans `/api/lists` et `/api/session` | Low |
| 1.5 | Retirer `plan` de `/api/user PATCH` | Le plan ne doit changer que via webhook Stripe | Low |
| 1.6 | Ajouter rate limiting sur login/register/admin | Étendre `rate-limit.ts` ou utiliser `upstash/ratelimit` | Med |
| 1.7 | Supprimer ADMIN_SECRET fallback | Lever une erreur si `ADMIN_SECRET` n'est pas configuré | Low |
| 1.8 | Retirer credentials admin de l'UI | Supprimer `admin@smartshop.app / admin1234` du formulaire | Low |

### Phase 2 — FONDATIONS PWA & OFFLINE (Effort: HIGH, 3-4 jours)

| Étape | Tâche | Détail | Effort |
|-------|-------|--------|--------|
| 2.1 | Ajouter `@serwist/next` | Configurer service worker avec CacheFirst (static) + NetworkFirst (API) | Med |
| 2.2 | Migrer queue vers IndexedDB | Utiliser `idb` library, garder localStorage comme fallback | Med |
| 2.3 | Scan offline optimistic | Retourner un `ScannedItem` local (`id: "offline_*"`) au lieu de `null` | Med |
| 2.4 | Corriger queue sync safety | Ne dequeuer qu'après succès confirmé, pas avant envoi | Low |
| 2.5 | Ajouter fallback html5-qrcode | Installer `html5-qrcode`, fallback quand `BarcodeDetector` absent | Med |

### Phase 3 — BASE DE DONNÉES & STRIPE (Effort: HIGH, 5-7 jours)

| Étape | Tâche | Détail | Effort |
|-------|-------|--------|--------|
| 3.1 | Migrer vers PostgreSQL | Changer provider Prisma, configurer connexion Supabase/Neon | Med |
| 3.2 | Changer `Float` → `Int` (cents) | Migration des prix existants ×100 | Med |
| 3.3 | Créer modèle `Subscription` | `status`, `currentPeriodEnd`, `cancelAt`, `plan` | Med |
| 3.4 | Ajouter enums PostgreSQL | `Plan`, `SessionStatus` comme vrais enums | Low |
| 3.5 | Remplacer `itemsJson` par `ShoppingListItem` model | Normalisation de la DB | Med |
| 3.6 | Initialiser migrations | `prisma migrate dev`, commit le répertoire migrations | Low |
| 3.7 | Installer `stripe` SDK | Checkout Session, Webhooks, Customer Portal | High |
| 3.8 | Créer `/api/webhooks/stripe` | Traiter `checkout.session.completed`, `customer.subscription.*` | High |
| 3.9 | Créer `/api/billing/checkout` | Créer Stripe Checkout Session pour upgrade | Med |
| 3.10 | Enforce feature flags serveur | Middleware qui vérifie `user.plan` avant d'autoriser les features premium | Med |

### Phase 4 — ARCHITECTURE & UX (Effort: MED, 3-4 jours)

| Étape | Tâche | Détail | Effort |
|-------|-------|--------|--------|
| 4.1 | Splitter le SPA en routes App Router | `/`, `/auth/login`, `/app`, `/app/dashboard`, `/admin` | High |
| 4.2 | Ajouter auth gate sur `/admin` | Vérification serveur dans layout.tsx admin | Low |
| 4.3 | Supprimer `ignoreBuildErrors: true` | Fixer les erreurs TS au lieu de les ignorer | Med |
| 4.4 | Mettre `noImplicitAny: true` | Fixer les erreurs résultantes | Med |
| 4.5 | Ajouter error boundaries | `error.tsx` au niveau racine + composants clés | Low |
| 4.6 | Budget personnalisable | Formulaire de budget à la création de session | Low |
| 4.7 | Ajouter vérification budget serveur | Refuser ou alerter si scan dépasse le budget | Low |

### Phase 5 — POLISH & OPTIMISATION (Effort: LOW-MED, 2-3 jours)

| Étape | Tâche | Détail | Effort |
|-------|-------|--------|--------|
| 5.1 | Remplacer `crypto.createHash` par `crypto.subtle` | PDF generation compatible client/service worker | Med |
| 5.2 | Rendre le hash déterministe | Retirer timestamp du hash input | Low |
| 5.3 | Ajouter QR code sur reçu | Installer `qrcode` package | Low |
| 5.4 | Filtres dashboard | Date range picker, filtres catégorie/magasin | Med |
| 5.5 | Dynamic imports | Recharts, framer-motion, jsPDF en lazy loading | Low |
| 5.6 | Nettoyer dépendances | Retirer `next-auth`, `@mdxeditor/editor`, etc. | Low |
| 5.7 | Résoudre conflit Tailwind v3/v4 | Supprimer `tailwind.config.ts` si v4 actif | Low |
| 5.8 | Ajouter `.env.example` | Documenter toutes les variables d'environnement | Low |
| 5.9 | Ajouter throttle detectFrame | ~200ms entre les appels BarcodeDetector.detect() | Low |
| 5.10 | Déplacer PDF hors DB | Stockage S3/R2, URL dans la DB | Med |

---

## ✅ 6. CHECKLIST DE VALIDATION PRÉ-PRODUCTION

### Tests Unitaires & Intégration
- [ ] Tests unitaires sur les schémas Zod (valid/invalid inputs)
- [ ] Tests d'intégration sur les API routes (auth, CRUD, scan)
- [ ] Tests de sécurité (IDOR, XSS, injection)
- [ ] Tests offline (queue, sync, optimistic UI)
- [ ] Tests E2E du flow complet (register → login → scan → receipt)
- [ ] Tests du service worker (cache hit/miss, offline fallback)
- [ ] Tests Stripe webhooks (signature verification, idempotency)

### Sécurité
- [ ] Audit OWASP Top 10 passé
- [ ] Toutes les API routes vérifient `userId === session.userId`
- [ ] Aucun leak de données sensibles (passwordHash, Stripe IDs)
- [ ] Rate limiting sur toutes les routes sensibles
- [ ] HTTPS enforced (Caddy TLS termination)
- [ ] Cookies Secure flag actif en production
- [ ] CSRF protection en place
- [ ] Input sanitization sur tous les endpoints
- [ ] Admin credentials retirés du code/UI

### Monitoring
- [ ] Error tracking (Sentry ou équivalent)
- [ ] Logging structuré (pas en SQLite)
- [ ] Health check endpoint
- [ ] Alertes sur erreurs 5xx
- [ ] Dashboard de métriques (latence, erreurs, scans/min)

### Stripe
- [ ] Webhook signature verification
- [ ] Idempotency keys sur les requêtes
- [ ] Test mode → Live mode migration plan
- [ ] Customer Portal configuré
- [ ] Plan enforcement sur toutes les features premium
- [ ] Billing history accessible aux utilisateurs

### PWA
- [ ] Lighthouse PWA audit > 90
- [ ] Service worker registration testé sur Chrome/Firefox/Safari
- [ ] Offline flow complet testé (scan → cart → receipt)
- [ ] Install prompt testé sur mobile
- [ ] Cache invalidation strategy validée
- [ ] IndexedDB persistence testé

### Performance
- [ ] Lighthouse Performance > 90
- [ ] Bundle size < 300KB initial load
- [ ] TTFB < 200ms
- [ ] FCP < 1.5s
- [ ] CLS < 0.1
- [ ] Dynamic imports sur les libs lourdes

### Documentation
- [ ] README avec setup instructions
- [ ] `.env.example` documenté
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Architecture decision records
- [ ] Deployment guide (Vercel/Cloudflare)

---

*Rapport généré le 2026-03-04 — Codebase Smart Shop v0.2.0*
