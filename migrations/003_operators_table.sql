-- Migration 003: operators table
-- Each operator is tied to exactly one business.
-- Operators log in by phone number; the JWT they receive contains their businessId.

CREATE TABLE IF NOT EXISTS operators (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  phone       text        NOT NULL,
  name        text        NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (phone, business_id)
);

-- Seed: migrate the existing single-password operator to the default business.
-- Replace the phone number below with the actual operator phone before running.
-- INSERT INTO operators (business_id, phone, name)
-- VALUES ('00000000-0000-0000-0000-000000000001', '+40700000000', 'Operator Principal');
