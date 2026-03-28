-- Migration 004: Owner model
-- Introduces the OWNER → BUSINESS → OPERATOR hierarchy.

-- ─── 1. Add owner_id to businesses ───────────────────────────
-- Each business is owned by a user (owner).
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON businesses(owner_id);

-- ─── 2. Add PIN hash to operators ────────────────────────────
-- Operators log in with phone + PIN. The PIN is stored as a bcrypt hash.
ALTER TABLE operators
  ADD COLUMN IF NOT EXISTS pin_hash text NOT NULL DEFAULT '';

-- ─── Notes ───────────────────────────────────────────────────
-- To assign an owner to the default business:
--   UPDATE businesses
--   SET owner_id = '<your-user-uuid>'
--   WHERE id = '00000000-0000-0000-0000-000000000001';
--
-- When creating a new operator via the owner UI, pin_hash is
-- generated server-side with bcrypt (rounds=12). Raw PINs are
-- never stored.
