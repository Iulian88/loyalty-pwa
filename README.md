# 💈 Salon Loyalty PWA

A Progressive Web App loyalty system for hair salons. Clients collect visit stamps and earn rewards — no App Store required.

---

## ✨ Features

### Client
- Register & login by phone number
- Loyalty card with animated stamp grid (10 visits → free haircut)
- Personal QR code for stylist to scan
- PWA install prompt (works on Android & iOS)
- Offline support via service worker

### Operator
- Secure dashboard login (password-protected)
- Search client by phone number
- Add / remove visits with one tap
- QR code scanner (camera)
- Reward redemption & counter reset

---

## 🏗️ Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router) + React |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (operator) + localStorage (client) |
| QR Generate | `qrcode` |
| QR Scan | `html5-qrcode` |
| PWA | Service Worker + Web Manifest |

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone <your-repo>
cd salon-loyalty
npm install
```

### 2. Set Up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `supabase-schema.sql`
3. Go to **Authentication → Users** and create an operator user:
   - Email: `operator@yoursalon.com`
   - Password: *(choose a strong password)*

### 3. Configure Environment

```bash
cp .env.local.example .env.local
```

Fill in your values:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SALON_ID=00000000-0000-0000-0000-000000000001
NEXT_PUBLIC_OPERATOR_EMAIL=operator@yoursalon.com
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

Add your environment variables in the Vercel dashboard.

---

## 📁 Project Structure

```
salon-loyalty/
├── app/
│   ├── layout.tsx                  # Root layout + PWA setup
│   ├── page.tsx                    # Home / splash screen
│   ├── login/page.tsx              # Client login
│   ├── register/page.tsx           # Client registration
│   ├── dashboard/page.tsx          # Client loyalty card
│   ├── show-qr/page.tsx            # Client QR display
│   ├── operator/
│   │   ├── login/page.tsx          # Operator login
│   │   ├── dashboard/page.tsx      # Operator home
│   │   ├── search-client/page.tsx  # Search by phone
│   │   └── scan-qr/page.tsx        # QR scanner
│   └── api/
│       ├── clients/[id]/route.ts   # GET client by ID
│       ├── visits/route.ts         # POST add/remove/reset visit
│       └── operator/route.ts       # GET search client
├── components/
│   ├── LoyaltyCard.tsx             # Stamp grid card
│   ├── ClientCard.tsx              # Operator client view + controls
│   ├── NavBar.tsx                  # Bottom navigation
│   └── InstallPrompt.tsx           # PWA install banner
├── lib/
│   ├── supabase.ts                 # Supabase client + types
│   ├── auth.ts                     # Auth helpers + session
│   └── visits.ts                   # Visit management
├── public/
│   ├── manifest.json               # PWA manifest
│   ├── sw.js                       # Service worker
│   └── icons/                      # App icons
├── styles/
│   └── globals.css                 # Global styles + design tokens
└── supabase-schema.sql             # Database schema
```

---

## 🗄️ Database Schema

```sql
salons        id, name, created_at
clients       id, salon_id, name, phone, visits, reward_claimed, created_at
visits_log    id, client_id, operator_id, action, timestamp
```

**Business rules enforced:**
- `visits` ≥ 0 and ≤ 10 (database constraint)
- Unique `(phone, salon_id)` per client
- Reward triggers at `visits = 10`
- Reset sets `visits = 0` and marks `reward_claimed = true`

---

## 📱 PWA Installation

**Android (Chrome):**
- Open the app → tap "Add to Home Screen" in the browser menu
- Or use the in-app install banner

**iOS (Safari):**
- Open the app in Safari
- Tap the Share button → "Add to Home Screen"
- The in-app banner guides users through this

---

## 🔧 Configuration

| Variable | Description |
|---|---|
| `VISIT_GOAL` | Number of visits for reward (default: 10, set in `lib/supabase.ts`) |
| `DEFAULT_SALON_ID` | Your salon's UUID from the `salons` table |
| `NEXT_PUBLIC_OPERATOR_EMAIL` | Email used for operator Supabase Auth login |

---

## 🔐 Security Notes

- Client sessions are stored in `localStorage` (no Supabase Auth for clients — phone-based MVP)
- Operator login uses Supabase Auth with email/password
- The `SUPABASE_SERVICE_ROLE_KEY` is only used in server-side API routes
- Row Level Security (RLS) is enabled on all tables
- For production: add rate limiting on registration and visit endpoints

---

## 🚧 Optional Enhancements (Post-MVP)

- [ ] Push notifications when near reward
- [ ] Visit history per client
- [ ] Multi-salon support
- [ ] Salon analytics dashboard
- [ ] OTP login for clients (Supabase phone auth)
- [ ] Reward expiration dates
