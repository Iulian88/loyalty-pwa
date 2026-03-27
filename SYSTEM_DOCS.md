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
| Production (latest) | `main` | `a461fe7` | Currently same as backup |
