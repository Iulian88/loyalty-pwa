# Fidelizat — System State Documentation & Recovery Manual

**Last updated:** 2026-03-27  
**Git branch snapshot:** `pre-multitenant-migration` (commit `a461fe7`)  
**Repository:** https://github.com/Iulian88/loyalty-pwa

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Database Documentation](#2-database-documentation)
3. [Authentication System](#3-authentication-system)
4. [Environment Variables](#4-environment-variables)
5. [API Routes](#5-api-routes)
6. [Frontend Structure](#6-frontend-structure)
7. [Critical Flows](#7-critical-flows)
8. [Known Limitations](#8-known-limitations)
9. [Deployment & Infrastructure](#9-deployment--infrastructure)
10. [Recovery Manual](#10-recovery-manual)

---

## 1. Project Overview

### What the App Does

**Fidelizat** is a PWA (Progressive Web App) loyalty platform for local businesses (salons, barbershops, etc.). It replaces paper stamp cards with a digital system.

**Client flow:**
1. Client registers with name + phone number (+ optional PIN)
2. Receives a digital loyalty card with a QR code
3. Shows QR code at the business during each visit
4. Operator scans the QR → adds a visit stamp
5. When the client reaches `VISIT_GOAL` visits, a reward is unlocked
6. Operator claims the reward, card resets to 0

**Operator flow:**
1. Operator logs in with a shared password
2. Accesses dashboard showing all clients, stats, today's visits
3. Scans client QR codes to add visits
4. Can search clients by phone number
5. Can view all visit activity
6. Can manually add/remove visits, reset cards, claim rewards

### High-Level Architecture

```
Browser (PWA)
│
├── Client-side pages (Next.js App Router, /app)
│    ├── Uses Supabase anon key directly for read-only list queries
│    └── Uses /api/* routes for all auth + write operations
│
├── API Routes (Next.js, serverless)
│    ├── Use Supabase service role key (bypasses RLS)
│    └── Handle all auth, write operations, session validation
│
└── Supabase (Postgres)
     ├── Tables: salons, clients, visits_log
     └── RLS enabled (but bypassed by service role in API routes)

Service Worker (sw.js):
  - Passes all /api/ requests through natively (no interception)
  - For non-API requests: network-first, offline fallback
```

**Tech Stack:**
- Framework: Next.js 14+ (App Router, TypeScript)
- Database: Supabase (Postgres)
- Auth: Custom JWT (jsonwebtoken library), httpOnly cookies
- Styling: Tailwind CSS
- PWA: Web App Manifest + custom Service Worker
- QR: `qrcode` (generation) + `html5-qrcode` (scanning)
- Password hashing: `bcryptjs`
- Deployment: Vercel

---

## 2. Database Documentation

### Table: `salons`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, default `uuid_generate_v4()` | One hardcoded row: `00000000-0000-0000-0000-000000000001` |
| `name` | TEXT | NOT NULL | Display name of the business |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |

**Purpose:** Represents one business. Currently a single static row. The `id` is used as the `business_id` foreign key for all clients.

**Note:** In the application code, this entity is referred to as "business" (not "salon"). The `Salon` TypeScript type is defined but the `salons` table is never actively queried at runtime — its UUID is passed as a hardcoded constant via `DEFAULT_BUSINESS_ID` env var.

---

### Table: `clients`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, default `uuid_generate_v4()` | |
| `business_id` | UUID | NOT NULL, FK → `salons.id` ON DELETE CASCADE | Tenant discriminator; renamed from `salon_id` |
| `name` | TEXT | NOT NULL | Client display name |
| `phone` | TEXT | NOT NULL | Used as login identifier |
| `visits` | INT | NOT NULL, default 0, CHECK (0–10) | Current stamp count |
| `reward_claimed` | BOOLEAN | NOT NULL, default false | Whether reward has been claimed |
| `claimed_at` | TIMESTAMPTZ | nullable | Timestamp of last reward claim |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | Registration timestamp |
| `pin_hash` | TEXT | nullable | bcrypt hash of optional PIN (in code only, add to schema) |
| UNIQUE | `(phone, business_id)` | | One loyalty card per phone per business |

**Purpose:** Each row is one client's loyalty card at one business. A client identified by phone can have multiple rows across different businesses (UNIQUE constraint allows this), but currently the app only ever uses one `business_id`.

**Indexes:** `idx_clients_phone` on `phone`, `idx_clients_salon_id` on `business_id`.

---

### Table: `visits_log`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, default `uuid_generate_v4()` | |
| `client_id` | UUID | NOT NULL, FK → `clients.id` ON DELETE CASCADE | |
| `operator_id` | TEXT | NOT NULL | JWT `sub` of operator, or `'system'` |
| `action` | INT | NOT NULL | `1`=add visit, `-1`=remove visit, `0`=reset card, `2`=claim reward |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |

**Purpose:** Immutable audit log of every operator action. Used to display activity history and calculate today's visit count.

**Relationships:** Links to `clients` via `client_id`. No direct `business_id` — tenant is inferred via `client_id → clients.business_id`.

**Indexes:** `idx_visits_log_client_id` on `client_id`, `idx_visits_log_created_at` on `created_at`.

---

### Relationships Diagram

```
salons (1)
  └── clients (N) ─── business_id → salons.id
        └── visits_log (N) ─── client_id → clients.id
```

### How Multi-Tenancy Is Implemented

Every query that reads or writes `clients` must include `.eq('business_id', businessId)`. This is the sole tenant isolation mechanism. The `businessId` value comes from:

- **Server-side API routes:** `process.env.DEFAULT_BUSINESS_ID` (throws if unset)
- **Client-side pages:** `process.env.NEXT_PUBLIC_SALON_ID` (with hardcoded fallback — known limitation)

---

## 3. Authentication System

### Client Authentication

**Mechanism:** Custom JWT in an httpOnly cookie named `token`.

**Registration (`POST /api/auth/register`):**
1. Validates `name`, `phone`, optional `pin` from request body
2. Reads `DEFAULT_BUSINESS_ID` from env (throws if unset)
3. Checks for duplicate phone in `clients` for that `business_id`
4. Hashes PIN with bcrypt (cost factor 12) if provided
5. Inserts new client row
6. Signs JWT and sets `token` cookie (7-day expiry, httpOnly, lax SameSite)

**Login (`POST /api/auth/login`):**
1. Validates `phone`, optional `pin`
2. Reads `DEFAULT_BUSINESS_ID` from env
3. Fetches client by `(phone, business_id)`
4. If `pin_hash` exists: verifies PIN with bcrypt — rejects if wrong
5. Signs JWT and sets `token` cookie

**Session check (`GET /api/auth/session`):**
1. Reads `token` cookie
2. Verifies JWT with `CLIENT_JWT_SECRET`
3. Fetches fresh client data from DB by `session.id`
4. Returns `{ client, visitGoal }`

**Logout (`POST /api/auth/logout`):**
- Clears both `token` and `operator_session` cookies (maxAge: 0)

**Client JWT Payload:**
```json
{
  "id": "<client UUID>",
  "name": "<client name>",
  "phone": "<phone number>",
  "iat": <issued at unix ts>,
  "exp": <expires unix ts (7 days)>
}
```

---

### Operator Authentication

**Mechanism:** Custom JWT in an httpOnly cookie named `operator_session`.

**Login (`POST /api/operator/login`):**
1. Reads `OPERATOR_PASSWORD` from env (throws if unset)
2. Compares submitted password with env value (plain string comparison)
3. Signs operator JWT with `OPERATOR_JWT_SECRET`
4. Sets `operator_session` cookie (24-hour expiry, httpOnly, lax SameSite)

**Session check (`GET /api/operator/session`):**
1. Reads `operator_session` cookie
2. Verifies JWT with `OPERATOR_JWT_SECRET`
3. Returns `{ success: true, visitGoal, data: { operatorId } }`

**Operator JWT Payload:**
```json
{
  "sub": "<random UUID generated at sign time>",
  "iat": <issued at unix ts>,
  "exp": <expires unix ts (24 hours)>
}
```

**Critical limitation:** There is one shared `OPERATOR_PASSWORD` per deployment. Any person who knows it gets full operator access. There is no per-operator or per-business isolation.

---

## 4. Environment Variables

### Server-Side (never exposed to browser)

| Variable | Required | Purpose |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ CRITICAL | Supabase service role key. Bypasses RLS. Used in all API routes for privileged DB access. Do NOT expose to client. |
| `DEFAULT_BUSINESS_ID` | ✅ CRITICAL | UUID of the single business this deployment serves. All client registrations, logins, and write operations use this value. System will throw at request time if unset. |
| `OPERATOR_PASSWORD` | ✅ CRITICAL | Plain-text password for operator login. System throws at request time if unset. |
| `CLIENT_JWT_SECRET` | ✅ CRITICAL | Secret for signing/verifying client session JWTs. Minimum 32 random characters. Changing this invalidates all active client sessions. |
| `OPERATOR_JWT_SECRET` | ✅ CRITICAL | Secret for signing/verifying operator session JWTs. Minimum 32 random characters. Changing this invalidates all operator sessions. |

### Public (safe to expose to browser — must be `NEXT_PUBLIC_` prefixed)

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ CRITICAL | Supabase project URL. Used in both server routes and client-side code. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ CRITICAL | Supabase anon key. Used in client-side pages for direct Supabase queries (reads only). |
| `NEXT_PUBLIC_SALON_ID` | ✅ CRITICAL | Business UUID used in client-side pages for filtering. Must match `DEFAULT_BUSINESS_ID`. Falls back to hardcoded UUID if unset (unsafe — always set this explicitly). |

### Optional (with defaults)

| Variable | Default | Purpose |
|---|---|---|
| `LOYALTY_VISIT_GOAL` | `10` | Number of visits required to earn a reward. Global across all clients. |
| `NODE_ENV` | Set by Next.js/Vercel | Controls `secure: true` on cookies. Automatically `production` on Vercel. |

### `.env.local` Template

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>

# Business
NEXT_PUBLIC_SALON_ID=<business UUID>
DEFAULT_BUSINESS_ID=<same UUID as above>

# Auth
CLIENT_JWT_SECRET=<min 32 random chars>
OPERATOR_JWT_SECRET=<min 32 random chars>
OPERATOR_PASSWORD=<strong password>

# Optional
LOYALTY_VISIT_GOAL=10
```

---

## 5. API Routes

### Auth Routes

---

#### `POST /api/auth/register`

**Purpose:** Register a new client.

**Auth required:** None  
**Input (JSON body):**
```json
{ "name": "string", "phone": "string", "pin": "string (optional)" }
```
**Output (success):**
```json
{ "success": true }
```
Sets `token` cookie (7 days, httpOnly).

**Output (error):**
```json
{ "error": "Phone number already registered." }
```
**Business logic:** Checks duplicate phone per `business_id`, hashes PIN, inserts client, issues JWT.

---

#### `POST /api/auth/login`

**Purpose:** Log in an existing client.

**Auth required:** None  
**Input (JSON body):**
```json
{ "phone": "string", "pin": "string (optional)" }
```
**Output (success):**
```json
{ "success": true, "client": { ...Client fields minus pin_hash } }
```
Sets `token` cookie.

**Output (error):** `404` if phone not found, `401` if PIN invalid.

**Business logic:** Looks up client by `(phone, business_id)`, verifies PIN if set, issues JWT.

---

#### `GET /api/auth/session`

**Purpose:** Validate client session and return fresh client data.

**Auth required:** `token` cookie  
**Input:** None  
**Output (success):**
```json
{ "client": { ...Client }, "visitGoal": 10 }
```
**Output (error):** `401` if cookie missing or JWT invalid.

**Business logic:** Decodes JWT → fetches fresh client row from DB by `id`.

---

#### `POST /api/auth/logout`

**Purpose:** Clear all session cookies.

**Auth required:** None  
**Input:** None  
**Output:** `{ "success": true }` — clears both `token` and `operator_session` cookies.

---

### Operator Routes

---

#### `POST /api/operator/login`

**Purpose:** Authenticate an operator.

**Auth required:** None  
**Input (JSON body):**
```json
{ "password": "string" }
```
**Output (success):** `{ "success": true }` — sets `operator_session` cookie (24h, httpOnly).  
**Output (error):** `401` if password wrong.

---

#### `GET /api/operator/session`

**Purpose:** Validate operator session.

**Auth required:** `operator_session` cookie  
**Input:** None  
**Output (success):**
```json
{ "success": true, "visitGoal": 10, "data": { "operatorId": "<uuid>" } }
```
**Output (error):** `401`.  

**Note:** `Cache-Control: no-store` is always set on the response.

---

#### `GET /api/operator?phone=<phone>&business_id=<uuid>`

**Purpose:** Search a client by phone number.

**Auth required:** `operator_session` cookie  
**Input:** Query params `phone` and `business_id`  
**Output (success):** Full `Client` object  
**Output (error):** `400` if params missing, `404` if not found, `401` if not authenticated.

---

### Client Management Routes

---

#### `GET /api/clients/[id]`

**Purpose:** Fetch a single client by ID.

**Auth required:** Either `operator_session` cookie OR `token` cookie where `session.id === params.id`  
**Input:** `id` path param  
**Output (success):**
```json
{
  "id": "string",
  "name": "string",
  "phone": "string",
  "visits": 0,
  "reward_claimed": false,
  "created_at": "ISO string"
}
```
**Output (error):** `403` if not authorized, `404` if not found.

**Business logic:** Fetches via `getClientById(id, businessId)` — scoped to `DEFAULT_BUSINESS_ID`.

---

### Visit Routes

---

#### `GET /api/visits/[clientId]`

**Purpose:** Return last 10 visit history entries for a client.

**Auth required:** `token` cookie where `session.id === params.clientId`  
**Input:** `clientId` path param  
**Output:**
```json
{ "history": [{ "id": "...", "action": 1, "created_at": "..." }] }
```

---

#### `POST /api/visits/[clientId]`

**Purpose:** Add or remove a visit for a client (scan-based, per-client action).

**Auth required:** `operator_session` cookie  
**Input (JSON body):**
```json
{ "action": "add" | "remove" }
```
**Output:** `{ "client": { ...updatedClient } }`  
**Business logic:** Delegates to `addVisit` or `removeVisit`, both scoped to `DEFAULT_BUSINESS_ID`.

---

#### `POST /api/visits`

**Purpose:** Operator dashboard action — add, remove, reset, or claim reward.

**Auth required:** `operator_session` cookie  
**Input (JSON body):**
```json
{ "clientId": "uuid", "action": 1 | -1 | 0 | 2 }
```

| action value | operation |
|---|---|
| `1` | Add visit |
| `-1` | Remove visit |
| `0` | Reset card to 0 |
| `2` | Claim reward (resets card, sets `reward_claimed=true`) |

**Output:** `{ "client": { ...updatedClient } }`  
**Business logic:** Existence check scoped by `business_id`, then delegates to the appropriate function in `lib/visits.ts`.

---

## 6. Frontend Structure

### Client Pages

| Route | Purpose | Auth |
|---|---|---|
| `/` | Landing page — redirects to `/dashboard` if session active | None |
| `/register` | Registration form (name, phone, optional PIN) | None |
| `/login` | Login form (phone, optional PIN) | None |
| `/dashboard` | Client loyalty card view, visit history, toast animations | `token` cookie |
| `/show-qr` | Displays client's QR code for scanning. Polls session every 3s | `token` cookie |

### Operator Pages

| Route | Purpose | Auth |
|---|---|---|
| `/operator/login` | Operator password form | None |
| `/operator/dashboard` | Overview: all clients, stats, today's visits counter | `operator_session` |
| `/operator/scan-qr` | Camera scanner — scans QR, loads client, shows action controls | `operator_session` |
| `/operator/clients` | Full client list with search and action buttons | `operator_session` |
| `/operator/search-client` | Phone-number search, direct action buttons | `operator_session` |
| `/operator/activity` | Chronological visit log with client names and action types | `operator_session` |
| `/operator/subscriptions` | Lists clients who have claimed rewards | `operator_session` |
| `/operator/visits` | Redirects to `/operator/dashboard` | — |

### Key Components

| Component | Purpose |
|---|---|
| `LoyaltyCard` | Renders the stamp grid, progress bar, visit count. Props: `visits`, `name`, `visitGoal`, `bump` (animation trigger) |
| `ClientCard` | Operator-facing card showing a client's data with action buttons (add/remove/reset/claim) |
| `NavBar` | Bottom navigation bar, shown on all authenticated pages |
| `InstallPrompt` | "Add to Home Screen" prompt for PWA installation |

### Data Flow

**Client pages:**
- All auth + writes go through `/api/*` (fetch with `credentials: 'include'`)
- Session polling: `/api/auth/session` every 3 seconds on dashboard + show-qr pages
- Visit history: fetched from `/api/visits/[clientId]` on dashboard load

**Operator pages:**
- Auth check: `GET /api/operator/session` on every page mount
- Client list: Direct Supabase anon client query (`.from('clients').select('*').eq('business_id', SALON_ID)`)
- Write actions: `POST /api/visits` or `POST /api/visits/[clientId]`
- Polling: `useClientsPolling` hook polls Supabase directly every 5 seconds
- Activity log: Direct Supabase query with join to `clients(name)`

---

## 7. Critical Flows

### Client Registration (step-by-step)

1. User opens `/register`, enters name, phone, optional PIN
2. Browser `POST /api/auth/register` with `{ name, phone, pin }`
3. Server reads `DEFAULT_BUSINESS_ID` from env (throws if missing)
4. Supabase service client checks: `SELECT id FROM clients WHERE phone=? AND business_id=?`
5. If found → return 400 "Phone number already registered"
6. Hash PIN with bcrypt (cost 12) if provided
7. `INSERT INTO clients (name, phone, business_id, visits, reward_claimed, pin_hash)`
8. Sign JWT: `{ id, name, phone }` with `CLIENT_JWT_SECRET`, expiry 7 days
9. Set `token` httpOnly cookie
10. Browser redirects to `/dashboard`

---

### Client Login (step-by-step)

1. User opens `/login`, enters phone + optional PIN
2. Browser `POST /api/auth/login` with `{ phone, pin }`
3. Server reads `DEFAULT_BUSINESS_ID`
4. Supabase: `SELECT * FROM clients WHERE phone=? AND business_id=?`
5. If not found → 404 "No account found"
6. If `pin_hash` exists: `bcrypt.compare(pin, pin_hash)` → 401 "Invalid PIN" on failure
7. Sign JWT and set cookie
8. Browser redirects to `/dashboard`

---

### Add Visit (step-by-step)

**Via QR scan:**
1. Operator opens `/operator/scan-qr`, camera activates
2. Client shows QR from `/show-qr`; QR value is `loyaltyapp/client/<clientId>`
3. Scanner decodes → extracts `clientId`
4. Operator page calls `GET /api/clients/[clientId]` to load client (shows ClientCard)
5. Operator taps "+ Visit" button
6. Browser `POST /api/visits/[clientId]` with `{ action: 'add' }` + `operator_session` cookie
7. Server verifies operator JWT
8. Reads `DEFAULT_BUSINESS_ID`
9. `lib/visits.ts → addVisit(supabase, clientId, operatorId, businessId)`:
   - `SELECT * FROM clients WHERE id=? AND business_id=?` — verifies client belongs to this business
   - Checks `visits < VISIT_GOAL`
   - `UPDATE clients SET visits=visits+1 WHERE id=? AND business_id=?`
   - `INSERT INTO visits_log (client_id, operator_id, action=1)`
10. Returns updated client
11. Client dashboard (polling every 3s) picks up new visit count on next poll

**Via dashboard action buttons:**
- Same logic but via `POST /api/visits` with `{ clientId, action: 1 }`

---

### Remove Visit (step-by-step)

1. Operator selects client, clicks "− Visit"
2. `POST /api/visits` with `{ clientId, action: -1 }`
3. `removeVisit` in `lib/visits.ts`:
   - Fetches client scoped by `business_id`
   - Checks `visits > 0`
   - `UPDATE clients SET visits=visits-1`
   - Inserts `visits_log` with `action=-1`
4. Returns updated client

---

### Claim Reward (step-by-step)

1. Operator sees client has reached `VISIT_GOAL`, clicks "Claim Reward"
2. `POST /api/visits` with `{ clientId, action: 2 }`
3. `claimReward` in `lib/visits.ts`:
   - Fetches client scoped by `business_id`
   - Checks `client.visits >= VISIT_GOAL` (throws if not)
   - `UPDATE clients SET visits=0, reward_claimed=true, claimed_at=now()`
   - Inserts `visits_log` with `action=2`
4. Returns updated client (visits=0, reward_claimed=true)

---

## 8. Known Limitations

| Limitation | Description | Impact |
|---|---|---|
| **Single business per deployment** | `DEFAULT_BUSINESS_ID` and `NEXT_PUBLIC_SALON_ID` are static env vars. Every request resolves to one hardcoded UUID. To run a second business you'd need a second Vercel deployment. | Blocks SaaS expansion |
| **Global `VISIT_GOAL`** | `LOYALTY_VISIT_GOAL` is a deployment-wide env var. All clients in all businesses share the same goal. Cannot be configured per business. | Blocks per-business reward configuration |
| **Operator auth is a shared password** | One `OPERATOR_PASSWORD` per deployment; no operator accounts in the DB; no per-business isolation of operator access. Any operator can see all clients of the tenant. | No audit trail per operator; no role-based access |
| **No per-business settings** | Reward name is stored in `localStorage` (not DB). Visit goal is env var. Business name/branding is hardcoded in the UI. | All customization is deploy-time only |
| **Client session has no `business_id`** | JWT payload contains `{ id, name, phone }` only. Client is implicitly locked to the deployment's single business. | Cannot support multi-card wallets per user |
| **`salons` table unused at runtime** | The DB has a `salons` table but no route ever reads from it. Business names and settings must be changed in code/env. | Table is vestigial; schema and code are out of sync |
| **`pin_hash` column not in schema SQL** | The `pin_hash` column is used in code and in production DB but is missing from `supabase-schema.sql`. Running the schema fresh would omit it. | Recovery from schema SQL alone would be incomplete |
| **Client-side fallback UUID** | `NEXT_PUBLIC_SALON_ID || '00000000-0000-0000-0000-000000000001'` in client-side operator pages. If env var is unset, queries silently return empty results. | Silent data loss if env var is misconfigured |
| **`visits_log` has no `business_id`** | Tenant is inferred indirectly via `client_id → clients.business_id`. Activity page queries have no tenant filter (all logs visible to any operator). | Acceptable now; will require migration for multi-tenant |

---

## 9. Deployment & Infrastructure

### Vercel

- **Project type:** Next.js (App Router, full-stack)
- **Deployment trigger:** Push to `main` branch on GitHub
- **Runtime:** Serverless (API routes are Lambda functions)
- **Environment variables:** Set in Vercel Dashboard → Project Settings → Environment Variables
- **Regions:** Default (Vercel Edge Network)
- **Cache headers:** `no-store` on all HTML routes and API routes (see `next.config.js`)
- **Service Worker:** Served with `no-cache, no-store` headers; skips `waitUntil` on install and claims clients immediately on activate

### Supabase

- **Tier:** Free tier or Pro depending on usage
- **Tables:** `salons`, `clients`, `visits_log`
- **RLS:** Enabled on all tables. Policies are permissive (allow all). Real enforcement is done in API routes using the service role key.
- **Connection:** Two clients used:
  - **Anon client** (`lib/supabase.ts`): Used in client-side pages for direct reads. Scoped by `business_id` in every query.
  - **Service role client** (created per-request in API routes): Full access, bypasses RLS. Used for all writes and auth lookups.
- **Extensions:** `uuid-ossp` (for `uuid_generate_v4()`)

### PWA

- **Manifest:** `/public/manifest.json` — name "Fidelizat", dark background, portrait orientation
- **Service Worker:** `/public/sw.js` — network-first strategy, never intercepts `/api/` calls
- **Icons:** `/public/icons/` — `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `logo-mark.svg`
- **Install prompt:** `InstallPrompt` component handles `beforeinstallprompt` event

---

## 10. Recovery Manual

### Prerequisites

- Node.js 18+
- npm or yarn
- Git
- Supabase account
- Vercel account (for deployment)

---

### Step 1 — Clone Repository

```bash
git clone https://github.com/Iulian88/loyalty-pwa.git
cd loyalty-pwa/salon-loyalty
npm install
```

---

### Step 2 — Create Supabase Project

1. Go to https://app.supabase.com → New Project
2. Choose region, set DB password (save it)
3. After project is ready, go to **Project Settings → API**
4. Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

---

### Step 3 — Run Database Migrations

Open **Supabase Dashboard → SQL Editor** and run the following in order:

**3a. Run base schema:**
```sql
-- Paste contents of supabase-schema.sql here
```

**3b. Add missing `pin_hash` column (not in schema file):**
```sql
ALTER TABLE clients ADD COLUMN IF NOT EXISTS pin_hash TEXT DEFAULT NULL;
```

**3c. Rename `salon_id` to `business_id` (if starting from old schema):**
```sql
-- Only needed if restoring from old backup where column is still salon_id
ALTER TABLE clients RENAME COLUMN salon_id TO business_id;
```

**3d. Get the inserted business UUID:**
```sql
SELECT id, name FROM salons;
```
Copy the UUID — this is your `DEFAULT_BUSINESS_ID` / `NEXT_PUBLIC_SALON_ID`.

---

### Step 4 — Configure Environment Variables

Create `salon-loyalty/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from Supabase>
SUPABASE_SERVICE_ROLE_KEY=<service role key from Supabase>

NEXT_PUBLIC_SALON_ID=<UUID from salons table>
DEFAULT_BUSINESS_ID=<same UUID>

CLIENT_JWT_SECRET=<generate: openssl rand -base64 32>
OPERATOR_JWT_SECRET=<generate: openssl rand -base64 32>
OPERATOR_PASSWORD=<choose a strong password>

LOYALTY_VISIT_GOAL=10
```

**Generate secrets:**
```bash
openssl rand -base64 32  # run twice, one for each JWT secret
```

---

### Step 5 — Run Locally

```bash
cd salon-loyalty
npm run dev
```

App will be available at http://localhost:3000.  
Operator panel at http://localhost:3000/operator/login.

---

### Step 6 — Deploy to Vercel

**Option A — Vercel CLI:**
```bash
npm install -g vercel
vercel login
vercel --prod
```
Follow prompts. Set root directory to `salon-loyalty` if asked.

**Option B — Vercel Dashboard:**
1. Go to https://vercel.com → New Project
2. Import from GitHub: `Iulian88/loyalty-pwa`
3. Set **Root Directory** to `salon-loyalty`
4. Add all environment variables from Step 4 under **Environment Variables**
5. Click deploy

---

### Step 7 — Verify Deployment

1. Visit the deployed URL
2. Register a test client
3. Log in as operator at `/operator/login`
4. Scan client QR and add a visit
5. Confirm the dashboard shows the updated count

---

### Restoring from Data Backup

If you have CSV exports from the old Supabase project:

1. In Supabase SQL Editor, re-insert `salons` row first (so the FK exists)
2. Import `clients.csv` via **Table Editor → Insert rows** or via SQL:
   ```sql
   -- Use Supabase Table Editor CSV import feature
   -- Or COPY command if using direct Postgres access
   ```
3. Import `visits_log.csv` after clients are restored (FK dependency)

If you have a full SQL dump from `supabase db dump`:
```bash
# Restore to a new Supabase project using psql
psql "postgresql://postgres:<password>@<host>:5432/postgres" < backup_2026-03-27.sql
```

---

### Quick Reference: Branch & Commit History

| Checkpoint | Branch | Commit | State |
|---|---|---|---|
| Pre-migration backup | `pre-multitenant-migration` | `a461fe7` | All single-business code, fully working |
| Multi-tenant refactor + multi-card UX | `main` | `3b12d45` (tag: v0.1-multibusiness) | users table, cards page, per-business config |
| Operator isolation (phone login + JWT businessId) | `main` | `d16d5d6` | All API routes scoped by businessId |
| Owner SaaS model (OWNER→BUSINESS→OPERATOR) | `main` | `47d58e0` | PIN login, owner dashboard, operator CRUD |
| Debug logs (temporary — removed next commit) | `main` | `7473d63` | Diagnostic only |
| **Current production** | `main` | `12f18b6` | operatorName+businessName in JWT+session+UI; activity isolated |

---

---

# ══════════════════════════════════════════════════════════════
# LIVE SYSTEM STATE — Updated 2026-03-28
# (Previous sections above reflect state at commit a461fe7.
#  This section documents the CURRENT architecture.)
# ══════════════════════════════════════════════════════════════

---

## CURRENT SYSTEM STATE

**Current commit:** `12f18b6`  
**Date:** 2026-03-28  
**Deployment:** Vercel (auto-deploy from `main`)

### What changed since Section 1–10 above was written

The architecture has been substantially upgraded across 10+ commits. The sections above (1–10) are now **outdated** in the following areas:

| Topic | Old (documented above) | Current (actual) |
|---|---|---|
| Operator login | Single shared `OPERATOR_PASSWORD` env var | Phone + PIN (bcrypt) per operator row in DB |
| Operator JWT | `{ sub: uuid, role: 'operator' }` | `{ operatorId, businessId, operatorName, businessName, role: 'operator' }` |
| Operator session API | Returns `{ operatorId }` | Returns `{ operatorId, operatorName, businessId, businessName, visitGoal }` |
| Client identity | JWT `{ id }` pointing to `clients.id` | JWT `{ userId }` pointing to `users.id` (separate table) |
| Database | `salons`, `clients`, `visits_log` | `users`, `clients`, `businesses`, `operators`, `visits_log` |
| Multi-tenancy | `DEFAULT_BUSINESS_ID` env var in all routes | `businessId` from JWT — fully dynamic |
| Owner system | Not implemented | `users` can own `businesses`; owner UI + CRUD exists |
| Per-business config | Global env var `LOYALTY_VISIT_GOAL` | `businesses.visit_goal` and `businesses.reward_description` per row |
| `supabase-schema.sql` | Reflects current schema | **Severely outdated** — still shows `salons`/`salon_id`, missing 4 tables |

---

## ARCHITECTURE SUMMARY (current)

### Database Tables

```
users
  id          UUID PK
  phone       TEXT UNIQUE NOT NULL
  name        TEXT NOT NULL
  created_at  TIMESTAMPTZ

businesses
  id                  UUID PK
  owner_id            UUID FK → users.id (SET NULL on delete)
  name                TEXT NOT NULL
  visit_goal          INT
  reward_description  TEXT
  created_at          TIMESTAMPTZ

clients  (loyalty cards — one row = one card at one business)
  id              UUID PK
  user_id         UUID FK → users.id   ← ties card to user
  business_id     UUID FK → businesses.id
  name            TEXT NOT NULL
  phone           TEXT NOT NULL
  visits          INT DEFAULT 0
  reward_claimed  BOOLEAN DEFAULT false
  claimed_at      TIMESTAMPTZ
  created_at      TIMESTAMPTZ
  UNIQUE (phone, business_id)

operators
  id          UUID PK
  business_id UUID FK → businesses.id ON DELETE CASCADE
  phone       TEXT NOT NULL
  name        TEXT NOT NULL DEFAULT ''
  pin_hash    TEXT NOT NULL DEFAULT ''   ← bcrypt(rounds=12)
  created_at  TIMESTAMPTZ
  UNIQUE (phone, business_id)

visits_log
  id          UUID PK
  client_id   UUID FK → clients.id ON DELETE CASCADE
  operator_id TEXT NOT NULL   ← operator UUID from JWT
  action      INT NOT NULL    ← 1=add, -1=remove, 0=reset, 2=claim reward
  created_at  TIMESTAMPTZ
```

### Relationship Diagram

```
users (owners) ──owner_id──▶ businesses ──business_id──▶ clients ──client_id──▶ visits_log
                                  │                           ▲
                                  └──business_id──▶ operators  │
                                                               │
users (clients) ──user_id──────────────────────────────────────┘
```

### Authentication Architecture

**Client auth** — cookie `token` (7 days, httpOnly)  
JWT payload: `{ userId, name, phone }`  
Identity resolves: `users` table by `userId`  
Card resolves: `clients` table by `user_id`

**Operator auth** — cookie `operator_session` (24h, httpOnly)  
JWT payload: `{ operatorId, businessId, operatorName, businessName, role: 'operator' }`  
Login: `POST /api/operator/login` — phone + PIN, bcrypt verify, fetches operator + business name  
Session: `GET /api/operator/session` — returns full context including `visitGoal` from DB

**Owner auth** — reuses client `token` cookie  
Session decoded: `{ userId }` → `businesses WHERE owner_id = userId` ownership check  
All owner routes verify ownership via `businesses.owner_id` before any write

### Migrations (run order)

| File | What it does | Status |
|---|---|---|
| `supabase-schema.sql` | Base tables (`salons`, `clients`, `visits_log`) — **OUTDATED** | Run once at project start (old schema) |
| `migrations/002_users_table.sql` | Add `users` table; add `user_id` to `clients`; backfill | Must be run |
| `migrations/003_operators_table.sql` | Add `operators` table | Must be run |
| `migrations/004_owner_model.sql` | Add `owner_id` to `businesses`; add `pin_hash` to `operators` | Must be run |

> ⚠️ `supabase-schema.sql` needs a full rewrite to match the current schema. Do not run it on a fresh DB without also running all migrations — it will produce an inconsistent state.

### API Route Map (current)

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/auth/register` | POST | none | Create user (`users` table), set `token` cookie |
| `/api/auth/login` | POST | none | Phone lookup in `users`, legacy fallback to `clients`; set `token` cookie |
| `/api/auth/session` | GET | `token` | Return user + active card + business config |
| `/api/auth/logout` | POST | none | Clear `token` + `operator_session` cookies |
| `/api/operator/login` | POST | none | Phone+PIN → bcrypt verify → set `operator_session` cookie with full context |
| `/api/operator/session` | GET | `operator_session` | Return `{ operatorId, operatorName, businessId, businessName, visitGoal }` |
| `/api/operator` | GET | `operator_session` | Search client by phone, scoped to `session.businessId` |
| `/api/clients/[id]` | GET | `operator_session` or `token` | Fetch single client, scoped by `businessId` |
| `/api/visits` | POST | `operator_session` | Add/remove/reset/claim — all scoped by `session.businessId` |
| `/api/visits/[clientId]` | GET/POST | `operator_session` / `token` | Visit history or per-client action |
| `/api/my-cards` | GET | `token` | All loyalty cards for current user |
| `/api/my-business-options` | GET | `token` | Businesses available to add a card for |
| `/api/add-card` | POST | `token` | Add a new loyalty card at a business — ⚠️ see risks |
| `/api/businesses` | GET | none | Public list of businesses |
| `/api/business/create` | POST | `token` | Create a new business (owner becomes `owner_id`) |
| `/api/owner/businesses` | GET | `token` | List businesses owned by current user |
| `/api/owner/operators` | GET/POST | `token` | List or create operators for an owned business |
| `/api/owner/operators/[id]` | DELETE | `token` | Delete operator (ownership verified) |

---

## KNOWN ISSUES / RISKS

### CRITICAL

| # | Issue | Location | Impact |
|---|---|---|---|
| 1 | **`supabase-schema.sql` is completely outdated** | `supabase-schema.sql` | Running it on a fresh DB misses `users`, `businesses`, `operators`; uses old `salons`/`salon_id` names. Fresh recovery requires running it + all 4 migrations in order. |
| 2 | **`add-card` businessId unverified** | `/api/add-card/route.ts` | `businessId` comes from the client request body. Any authenticated user can POST with any `businessId`. No check that the business actually exists and is accepting new cards. Should validate against `businesses` table. |
| 3 | **No rate limiting on auth/login endpoints** | All login routes | An attacker can brute-force operator PINs (4–6 digits) with no throttling. No lockout, no CAPTCHA, no delay. |
| 4 | **Debug `console.log` statements in auth/register + auth/login routes** | `app/api/auth/register/route.ts`, `app/api/auth/login/route.ts`, `app/api/auth/session/route.ts` | Logs phone numbers and user IDs to Vercel function logs. Privacy concern and log spam. |

### MEDIUM RISK

| # | Issue | Location | Impact |
|---|---|---|---|
| 5 | **`visits_log` has no direct `business_id`** | DB schema | Tenant isolation for activity log depends on `client_id → clients.business_id` join. Any query that forgets this join leaks cross-tenant data. Activity page now fixed (inner join), but future queries must remember this pattern. |
| 6 | **`operator.pin_hash` defaults to `''`** | `migrations/004_owner_model.sql` | Operators added before migration 004 have `pin_hash = ''`. `bcrypt.compare(pin, '')` always returns `false`, silently locking out those operators. Must explicitly SET pin hash for each existing operator. |
| 7 | **RLS is permissive (allows all)** | Supabase RLS policies | All tables have RLS enabled but policies allow full access. Real enforcement happens in API routes using the service role key. If the anon key is ever used for writes (client-side), there is no database-level protection. |
| 8 | **Client-side Supabase queries use anon key** | All operator UI pages | Pages query `clients` and `visits_log` directly with the anon key, filtered by `businessId` from session. This is safe only because RLS allows all + the filter is applied in JS. A determined user could bypass the filter. Proper fix: route all reads through API routes. |
| 9 | **Double-import bug in owner operators route** | `/api/owner/operators/route.ts` line 18 | `const { getSession: _gs } = await import('@/lib/auth')` re-imports `getSession` dynamically. It works but is a code smell and bypasses module caching. Should use the top-level import directly. |
| 10 | **Legacy fallback in auth/login creates confusion** | `/api/auth/login/route.ts` | Login tries `users` first, then falls back to `clients` for pre-migration rows. The fallback path does not verify PIN even if `pin_hash` is set on the legacy client. Users from before migration 002 with a PIN set will log in without PIN verification after migration. |

### LOW RISK

| # | Issue | Location | Impact |
|---|---|---|---|
| 11 | **Operator phone uniqueness is per-business** | `operators` table | Same phone can be an operator at multiple businesses. This is correct design but means the operator login must account for which business — currently phone lookup returns the first match only via `.single()`, which would return an error if phone exists at two businesses. Safe today (single business per operator), needs handling at scale. |
| 12 | **`NEXT_PUBLIC_DEFAULT_BUSINESS_ID` env var still in `.env.local`** | `.env.local` | No longer used in any code (all routes use JWT-scoped businessId). Leftover from old architecture. Remove to avoid confusion. |
| 13 | **`reward_name` stored in `localStorage`** | Operator dashboard | `localStorage` is per-device, per-browser. Not persisted in DB. Data loss on new device or cleared storage. Should be stored in `businesses.reward_description`. |

---

## PROGRESS

```
Core System        ████████████████░░░░ 80%   Registration, login, visits, QR, rewards all working
Multi-tenancy      ██████████████░░░░░░ 70%   Operator scope ✅ | Client scope partial | Unverified writes ⚠️
Security           ██████░░░░░░░░░░░░░░ 30%   No rate limiting, permissive RLS, debug logs, anon key reads
Owner System       ████████░░░░░░░░░░░░ 40%   CRUD routes + UI exist; ownership verified; no billing/plans
Commercial Ready   ██████░░░░░░░░░░░░░░ 30%   Can demo; not safe for production with real businesses yet

TOTAL: ~50%
```

---

## TODAY PROGRESS — 2026-03-28

### What was implemented
- `OperatorSession` interface expanded: `{ operatorId, businessId, operatorName, businessName }`
- `signOperatorToken()` now accepts and embeds `operatorName` + `businessName` into JWT
- `verifyOperatorToken()` now reads all four fields back (with empty-string fallback for old tokens)
- `POST /api/operator/login`: after PIN verification, fetches `businesses.name`, calls updated `signOperatorToken`
- `GET /api/operator/session`: returns `businessName`, `data.operatorName` in response body
- All 6 operator UI pages updated: `dashboard`, `clients`, `scan-qr`, `search-client`, `subscriptions`, `activity`
  - State variables `operatorName`, `businessName` added
  - Headers now show business name (e.g. "Salon Maria") instead of hardcoded "Operator"
- `activity/page.tsx`: fixed cross-tenant leak — query now uses `clients!inner(name, business_id)` with `.filter('clients.business_id', 'eq', bizId)`
- Debug `console.log` statements removed from `app/api/operator/login/route.ts`

### Problems solved
- Operators could not tell which business they were logged into (UI showed "Operator" everywhere)
- Activity page showed all visits_log entries globally, not filtered by business

### Decisions made
- `operatorName`/`businessName` embedded in JWT at login time (not re-fetched per session call)
  — tradeoff: stale name if business renames; acceptable since renaming is rare
- Empty-string fallback in `verifyOperatorToken` for tokens signed before this change (backwards compat)

### Risks surfaced
- `operator.phone` uniqueness is per-business: `.single()` in login returns error if operator is registered at 2 businesses — not a current concern but noted

---

## SYSTEM AUDIT

### Is data isolation safe for operators?

**YES for API writes.** All visit mutation routes (`/api/visits`, `/api/visits/[clientId]`, `/api/operator`) extract `businessId` from the JWT server-side. An operator cannot affect clients of another business.

**PARTIALLY for reads.** Operator UI pages query Supabase directly from the browser using the anon key, filtered by `businessId` from session. The filter is applied correctly in all current pages. However, anon key + permissive RLS means a motivated user with browser devtools could remove the filter and see all clients in the DB across all businesses.

**YES for activity log.** Fixed today — `activity/page.tsx` now uses an inner join on `clients.business_id`.

### Is data isolation safe for clients?

**PARTIALLY.** Client session knows the `userId` but not which `business_id` they're scoped to. The session route resolves the "active card" by `user_id`. Add-card endpoint (`/api/add-card`) accepts `businessId` from the request body without server-side verification — a client could add a card to any business ID, including one that doesn't exist or belongs to a competitor.

### Is the owner system secure?

**YES for read/write operations.** Every owner route verifies ownership via `businesses.owner_id = session.userId` before returning or modifying data. An owner cannot see or modify another owner's operators.

**NOT YET for business creation.** `POST /api/business/create` creates a business with `owner_id = session.userId`. There is no plan tier check — any registered user can create unlimited businesses. This is acceptable in early development but needs a subscription/plan gate before commercial launch.

### Can this system be used by real businesses safely?

**NOT YET.** The following must be addressed first:
1. Remove debug `console.log` statements (logs phone numbers)
2. Add rate limiting to operator login (4-digit PIN is brute-forceable in ~10,000 requests)
3. Fix `add-card` to verify `businessId` against `businesses` table
4. `supabase-schema.sql` must be rewritten to match actual schema (recovery risk)
5. Set proper RLS policies on `clients` and `operators` tables

---

## NEXT STEPS

### PRIORITY 1 — CRITICAL (do before any real user data)

1. **Remove debug `console.log` from auth routes** (`register`, `login`, `session`)
   - These log phone numbers and user UUIDs to Vercel — privacy violation
2. **Add rate limiting to operator login**
   - Use Vercel Edge middleware or an in-memory counter + `429` response
   - At minimum: exponential delay after 3 failed attempts per IP
3. **Fix `add-card` businessId validation**
   - Verify that `businessId` from request body exists in `businesses` table before inserting
4. **Rewrite `supabase-schema.sql`**
   - Replace content with the current complete schema: `users`, `businesses`, `clients`, `operators`, `visits_log`
   - Document migration order clearly

### PRIORITY 2 — Security & Data Integrity

5. **Set restrictive RLS policies on sensitive tables**
   - `operators`: only `service_role` can read/write (no anon access needed)
   - `clients`: anon can read own rows only (or route all reads through API)
6. **Route operator reads through API**
   - Operator pages currently query Supabase anon client directly for `clients` list
   - Move these to `/api/operator/clients` server route — eliminates anon key exposure
7. **Fix legacy login fallback PIN bypass** (Issue #10 above)
   - If legacy client has `pin_hash`, verify it even on the fallback path
8. **Store `reward_name` in `businesses.reward_description`** instead of `localStorage`

### PRIORITY 3 — Features & Commercial Readiness

9. **Owner dashboard: show live stats per business**
   - Current owner dashboard is skeleton; needs client count, visit count, operator count
10. **Operator visits redirect page** (`/operator/visits` → `/operator/dashboard`)
    - Already exists as a stub; may confuse users
11. **Plan/tier system for owner** — gate business creation behind subscription
12. **`supabase-schema.sql` rewrite** — complete schema for clean fresh installs

---

## IMPROVEMENTS

### Session handling
- Operator name/business name are embedded in JWT at login. If the business renames, the JWT carries stale data until it expires (24h). Consider re-fetching business name in `/api/operator/session` (one extra DB read per session check) vs. accepting occasional stale names.
- Client session route (`/api/auth/session`) currently has a legacy fallback path. Once all pre-002 migration clients have a `user_id`, this fallback should be removed and tested.

### Validation
- `zod` is listed as a dependency but used only in the owner operators route. Adopt Zod for all API route input validation (especially `add-card`, `visits`).
- Phone numbers are stored as raw strings with no normalization. `+40749397079` and `0749397079` are different records. A normalization step at registration and login would prevent duplicate/orphaned accounts.

### Security
- Add `helmet`-equivalent security headers to Next.js responses (CSP, X-Frame-Options, etc.)
- Rotate `OPERATOR_JWT_SECRET` and `CLIENT_JWT_SECRET` periodically; document the rollover process (all sessions invalidated on change)
- Consider short-lived operator tokens (4h instead of 24h) combined with silent refresh

### Scalability
- The `visits_log` table has no `business_id` column and no composite index on `(client_id, created_at)`. As visit volume grows, activity queries that join through `clients` will degrade. Add direct `business_id` column + index to `visits_log`.
- `clients` table is scanned per business on every dashboard load. Add `idx_clients_business_id` if not present.
- Supabase anon key reads in operator UI pages bypass the Next.js serverless layer — this is fast but loses auditability. Evaluate at scale.
