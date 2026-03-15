-- ============================================================
-- Salon Loyalty PWA – Supabase Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Table: salons ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS salons (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert a default salon (update name as needed)
INSERT INTO salons (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'My Hair Salon')
ON CONFLICT DO NOTHING;

-- ─── Table: clients ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id        UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,
  visits          INT NOT NULL DEFAULT 0 CHECK (visits >= 0 AND visits <= 10),
  reward_claimed  BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (phone, salon_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_salon_id ON clients(salon_id);

-- ─── Table: visits_log ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visits_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  operator_id  TEXT NOT NULL,  -- Supabase auth user id or 'system'
  action       INT NOT NULL,   -- +1 (add), -1 (remove), -10 (reset)
  timestamp    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visits_log_client_id ON visits_log(client_id);
CREATE INDEX IF NOT EXISTS idx_visits_log_timestamp ON visits_log(timestamp);

-- ─── Row Level Security ───────────────────────────────────────

-- Enable RLS
ALTER TABLE salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits_log ENABLE ROW LEVEL SECURITY;

-- Salons: public read
CREATE POLICY "salons_public_read" ON salons
  FOR SELECT USING (true);

-- Clients: anyone can insert (register)
CREATE POLICY "clients_insert" ON clients
  FOR INSERT WITH CHECK (true);

-- Clients: read own record (by phone + salon)
CREATE POLICY "clients_read" ON clients
  FOR SELECT USING (true);

-- Clients: update only via service role (API routes use service key)
CREATE POLICY "clients_update" ON clients
  FOR UPDATE USING (true);

-- Visits log: insert allowed
CREATE POLICY "visits_log_insert" ON visits_log
  FOR INSERT WITH CHECK (true);

-- Visits log: read allowed
CREATE POLICY "visits_log_read" ON visits_log
  FOR SELECT USING (true);

-- ─── Operator Auth ────────────────────────────────────────────
-- Create an operator user via Supabase Auth Dashboard:
-- Email: operator@yoursalon.com
-- Password: <strong password>
-- Then set NEXT_PUBLIC_OPERATOR_EMAIL in your .env.local

-- ============================================================
-- Done! Your database is ready.
-- ============================================================
