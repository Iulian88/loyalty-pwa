-- ============================================================
-- Migration 002: Introduce global users table
-- Run in Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Create users table
CREATE TABLE IF NOT EXISTS users (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone      TEXT        NOT NULL UNIQUE,
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add user_id column to clients (nullable first)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_id UUID;

-- 3. Populate users from existing clients (deduplicate by phone)
INSERT INTO users (phone, name)
SELECT DISTINCT phone, name FROM clients
ON CONFLICT (phone) DO NOTHING;

-- 4. Back-fill user_id on each client row
UPDATE clients c
SET user_id = u.id
FROM users u
WHERE c.phone = u.phone;

-- 5. Make user_id required
ALTER TABLE clients ALTER COLUMN user_id SET NOT NULL;

-- 6. Add FK safely (Postgres-compatible — no IF NOT EXISTS on ADD CONSTRAINT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'clients_user_id_fkey'
      AND table_name = 'clients'
  ) THEN
    ALTER TABLE clients
      ADD CONSTRAINT clients_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 7. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);

-- NOTE: phone column intentionally kept on clients for backward compat
