# Documentație Tehnică - Salon Loyalty PWA

## Introducere

Salon Loyalty PWA este o aplicație web progresivă (Progressive Web App) pentru sisteme de loialitate în saloane de coafură. Aplicația permite clienților să acumuleze ștampile pentru fiecare vizită și să primească recompense gratuite după 10 vizite. Operatorii (stiliștii) pot gestiona clienții prin scanarea codurilor QR.

Această documentație este destinată developerilor noi care continuă dezvoltarea acestui SaaS (Software as a Service). Proiectul este construit cu Next.js 14, Supabase și este optimizat pentru dispozitive mobile.

## Arhitectura Aplicației

### Tehnologii Principale
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Stiluri**: Tailwind CSS
- **Backend/Bază de Date**: Supabase (PostgreSQL + Auth)
- **PWA**: Service Worker, Web Manifest
- **Alte**: QR Code generation/scanning, JWT pentru autentificare

### Structura Folderelor
```
salon-loyalty/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes (server-side)
│   │   ├── auth/                 # Autentificare (login, register, session)
│   │   ├── clients/              # Gestionare clienți
│   │   ├── operator/             # Autentificare operatori
│   │   └── visits/               # Logica vizitelor
│   ├── dashboard/                # Pagina dashboard client
│   ├── login/                    # Pagina login client
│   ├── operator/                 # Pagini operatori
│   │   ├── dashboard/
│   │   ├── login/
│   │   ├── scan-qr/
│   │   └── search-client/
│   ├── register/                 # Pagina înregistrare client
│   ├── show-qr/                  # Pagina QR code client
│   ├── layout.tsx                # Layout global
│   └── page.tsx                  # Pagina principală
├── components/                   # Componente React reutilizabile
│   ├── ClientCard.tsx
│   ├── InstallPrompt.tsx
│   ├── LoyaltyCard.tsx
│   └── NavBar.tsx
├── lib/                          # Logica de business
│   ├── auth.ts                   # Funcții autentificare
│   ├── supabase.ts               # Conexiune Supabase
│   └── visits.ts                 # Logica vizitelor
├── public/                       # Fișiere statice
│   ├── icons/                    # Iconițe PWA
│   ├── manifest.json             # Manifest PWA
│   └── sw.js                     # Service Worker
├── styles/                       # Stiluri globale
│   └── globals.css
├── types/                        # Tipuri TypeScript
│   └── index.ts
├── next.config.js                # Configurare Next.js
├── package.json                  # Dependențe și scripturi
├── supabase-schema.sql           # Schema bază de date
├── tailwind.config.ts            # Configurare Tailwind
├── tsconfig.json                 # Configurare TypeScript
└── README.md                     # Documentație scurtă
```

### Arhitectura Generală
- **Client-Side**: React components pentru UI, gestionarea stării locale
- **Server-Side**: Next.js API Routes pentru logică backend, integrare cu Supabase
- **Bază de Date**: Supabase PostgreSQL cu tabele pentru saloane, clienți și log-uri vizite
- **Autentificare**: Hibridă - JWT pentru clienți, Supabase Auth pentru operatori
- **PWA**: Offline support prin Service Worker, instalabilă pe mobile

## Fluxul Utilizatorului

### Flux Client
1. **Înregistrare/Login**: Utilizatorul introduce nume și număr de telefon → Sistemul verifică/creează cont în baza de date → Sesiune JWT salvată în localStorage
2. **Dashboard**: Afișează cardul de loialitate cu ștampile curente (ex: 3/10)
3. **Generare QR**: Buton "Show QR" → Generează cod QR unic cu ID client
4. **Vizită**: Operatorul scanează QR-ul → Vizită adăugată (+1 ștampilă)
5. **Reward**: După 10 vizite → Cardul se luminează → Operatorul resetează contorul

### Flux Operator
1. **Login**: Email/parolă prin Supabase Auth → Acces la dashboard operator
2. **Căutare Client**: Introduce număr telefon → Sistemul găsește/afişează clientul
3. **Scan QR**: Deschide camera → Scanează QR client → Adaugă vizită
4. **Gestionare**: Poate adăuga/elimina vizite manual, reseta pentru reward

### Fluxuri Alternative
- **Offline**: PWA funcționează offline prin cache Service Worker
- **Instalare**: Prompt automat pentru instalare pe dispozitive mobile
- **Reset Reward**: Operatorul poate reseta contorul după acordarea recompensei

## Schema Bazei de Date

Baza de date folosește Supabase (PostgreSQL). Schema este definită în `supabase-schema.sql`.

### Tabele Principale

#### `salons`
- `id` (UUID, PRIMARY KEY): ID unic salon
- `name` (TEXT, NOT NULL): Nume salon
- `created_at` (TIMESTAMPTZ): Dată creare

#### `clients`
- `id` (UUID, PRIMARY KEY): ID unic client
- `salon_id` (UUID, FOREIGN KEY): Referință la salon
- `name` (TEXT, NOT NULL): Nume client
- `phone` (TEXT, NOT NULL): Număr telefon
- `visits` (INT, DEFAULT 0): Număr vizite (0-10)
- `reward_claimed` (BOOLEAN, DEFAULT FALSE): Dacă recompensa a fost revendicată
- `created_at` (TIMESTAMPTZ): Dată creare
- UNIQUE: (phone, salon_id) - Un număr de telefon per salon

#### `visits_log`
- `id` (UUID, PRIMARY KEY): ID unic log
- `client_id` (UUID, FOREIGN KEY): Referință la client
- `operator_id` (TEXT, NOT NULL): ID operator (din Supabase Auth)
- `action` (INT, NOT NULL): Acțiune (+1 adăugare, -1 eliminare, -10 reset)
- `timestamp` (TIMESTAMPTZ): Timestamp acțiune

### Indexes
- `idx_clients_phone`: Pe `clients.phone`
- `idx_clients_salon_id`: Pe `clients.salon_id`
- `idx_visits_log_client_id`: Pe `visits_log.client_id`
- `idx_visits_log_timestamp`: Pe `visits_log.timestamp`

### Conexiune
- Client Supabase creat în `lib/supabase.ts`
- Variabile de mediu: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## API Endpoints

API-urile sunt implementate ca Next.js API Routes în `app/api/`. Toate returnează JSON.

### Auth Endpoints
- `POST /api/auth/login`
  - Body: `{ name: string, phone: string }`
  - Return: `{ success: boolean, token: string, client: Client }`
  - Descriere: Login/register client, creează sesiune JWT

- `POST /api/auth/register`
  - Body: `{ name: string, phone: string }`
  - Return: `{ success: boolean, token: string, client: Client }`
  - Descriere: Înregistrare explicită client

- `GET /api/auth/session`
  - Headers: `Authorization: Bearer <token>`
  - Return: `{ client: Client }` sau `{ error: string }`
  - Descriere: Verificare sesiune client

- `POST /api/auth/logout`
  - Return: `{ success: boolean }`
  - Descriere: Ștergere sesiune client

### Operator Endpoints
- `POST /api/operator/login`
  - Body: `{ email: string, password: string }`
  - Return: `{ success: boolean, user: User }`
  - Descriere: Login operator prin Supabase Auth

- `GET /api/operator/session`
  - Return: `{ user: User }` sau `{ error: string }`
  - Descriere: Verificare sesiune operator

### Client Endpoints
- `GET /api/clients/[id]`
  - Params: `id` (UUID client)
  - Return: `{ client: Client }`
  - Descriere: Detalii client pentru căutare

### Visits Endpoints
- `POST /api/visits`
  - Body: `{ clientId: string, operatorId: string, action: number }`
  - Return: `{ client: Client }`
  - Descriere: Adaugă/elimina vizită (action: 1 = +1, -1 = -1)

- `GET /api/visits/[clientId]`
  - Params: `clientId` (UUID)
  - Return: `{ visits: VisitLog[] }`
  - Descriere: Istoric vizite pentru client

## Componente Frontend

Componentele sunt scrise în TypeScript și folosesc Tailwind CSS. Toate sunt client-side (`'use client'`).

### Componente Principale

#### `LoyaltyCard`
- **Props**: `{ visits: number, name: string }`
- **Funcționalitate**: Afișează cardul de loialitate cu grid 5x2 ștampile animate
- **Stiluri**: Efecte aurii când `visits >= 10` (reward-glow)
- **Utilizare**: Dashboard client

#### `ClientCard`
- **Props**: `{ client: Client }`
- **Funcționalitate**: Afișează informații client (nume, telefon, vizite)
- **Utilizare**: Dashboard operator, rezultate căutare

#### `NavBar`
- **Props**: Niciunul (folosește context)
- **Funcționalitate**: Bara de navigare cu butoane pentru dashboard/logout
- **Utilizare**: Layout global

#### `InstallPrompt`
- **Props**: Niciunul
- **Funcționalitate**: Prompt pentru instalarea PWA pe dispozitive mobile
- **Utilizare**: Layout global

### Alte Componente
- Formulare pentru login/register (în pagini specifice)
- Scanner QR în `operator/scan-qr`
- Generator QR în `show-qr`

## Dependențe Principale

Din `package.json`:

### Runtime Dependencies
- `@supabase/supabase-js@^2.99.1`: Client Supabase pentru DB și Auth
- `@types/jsonwebtoken@^9.0.10`: Tipuri pentru JWT
- `jsonwebtoken@^9.0.3`: Generare/verificare JWT pentru clienți
- `next@14.1.0`: Framework Next.js
- `react@^18`: Biblioteca React
- `react-dom@^18`: DOM React
- `qrcode@^1.5.3`: Generare coduri QR
- `html5-qrcode@^2.3.8`: Scanare coduri QR
- `zod@^4.3.6`: Validare date (nu intens folosit încă)

### Dev Dependencies
- `@types/node@^20`: Tipuri Node.js
- `@types/qrcode@^1.5.5`: Tipuri pentru qrcode
- `@types/react@^18`: Tipuri React
- `@types/react-dom@^18`: Tipuri React DOM
- `autoprefixer@^10.0.1`: PostCSS autoprefixer
- `postcss@^8`: PostCSS
- `tailwindcss@^3.3.0`: Tailwind CSS
- `typescript@^5`: TypeScript

### Scripturi
- `npm run dev`: Dezvoltare cu hot reload
- `npm run build`: Build pentru producție
- `npm run start`: Server producție
- `npm run lint`: ESLint

## Setup și Deployment

### Setup Local
1. Clone repository: `git clone <repo-url>`
2. Install dependencies: `npm install`
3. Configure Supabase:
   - Creează proiect Supabase
   - Rulează `supabase-schema.sql` în SQL Editor
   - Copiază URL și anon key în `.env.local`:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
     NEXTAUTH_SECRET=your_jwt_secret
     LOYALTY_VISIT_GOAL=10
     DEFAULT_SALON_ID=00000000-0000-0000-0000-000000000001
     ```
4. Run development: `npm run dev`

### Deployment
- **Frontend**: Vercel, Netlify sau orice platformă care suportă Next.js
- **Supabase**: Proiect Supabase în cloud
- **PWA**: Asigură-te că `public/manifest.json` și `sw.js` sunt servite cu headers corecte

### Variabile de Mediu
- `NEXT_PUBLIC_SUPABASE_URL`: URL Supabase project
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key
- `NEXTAUTH_SECRET`: Secret pentru JWT (generează unul random)
- `LOYALTY_VISIT_GOAL`: Număr vizite pentru reward (default 10)
- `DEFAULT_SALON_ID`: ID salon implicit

## Ghid de Dezvoltare

### Convenții Cod
- **TypeScript**: Toate fișierele folosesc TSX/TS
- **Componente**: Funcționale cu hooks, `'use client'` pentru client-side
- **API Routes**: Async functions, error handling cu try/catch
- **Stiluri**: Tailwind classes, variabile CSS pentru teme
- **Nume**: camelCase pentru variabile, PascalCase pentru componente

### Adăugare Funcționalități
1. **Nou endpoint API**: Creează folder în `app/api/`, fișier `route.ts`
2. **Nouă componentă**: Adaugă în `components/`, export în `index.ts` dacă necesar
3. **Nouă pagină**: Folder în `app/` cu `page.tsx`
4. **Modificare DB**: Actualizează `supabase-schema.sql`, rulează în Supabase

### Testare
- Testează pe mobile (iOS/Android) pentru PWA
- Verifică offline functionality
- Testează autentificare și fluxuri complete

### Securitate
- JWT pentru clienți (expiră în 7 zile)
- Supabase Auth pentru operatori
- Validare input-uri în API routes
- RLS (Row Level Security) în Supabase pentru izolare date

### Performanță
- Lazy loading pentru componente mari
- Cache Service Worker pentru offline
- Optimizare imagini în `public/`

Pentru întrebări sau contribuții, contactează echipa de dezvoltare.</content>
<filePath>filePath">c:\Users\esell\OneDrive\Desktop\salon-loyalty-pwa\salon-loyalty\TECHNICAL_DOCS.md