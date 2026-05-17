import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Client, User, Business } from '../types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Service-role Supabase client.
 * Bypasses all RLS policies — MUST ONLY be used in server-side code
 * (API routes, Server Components, server actions).
 *
 * The `import 'server-only'` guard at the top of this file causes a
 * build-time error if this module is imported into a browser bundle.
 * Never remove that guard.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ── Helper functions (migrated from lib/supabase.ts) ──────────────────────────
// All helpers below use supabaseAdmin (service_role key).
// Function signatures are identical to the originals — callers are unaware of the key change.

export async function getBusinessById(businessId: string): Promise<Business | null> {
  const { data, error } = await supabaseAdmin
    .from('businesses')
    .select('id, name, visit_goal, reward_description, created_at')
    .eq('id', businessId)
    .single();
  if (error || !data) return null;
  return data as Business;
}

export async function getUserByPhone(phone: string): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, phone, name, created_at')
    .eq('phone', phone)
    .single();
  if (error || !data) return null;
  return data as User;
}

export async function getUserById(userId: string): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, phone, name, created_at')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return data as User;
}

/** Returns the first loyalty card for a user, ordered by creation date. */
export async function getFirstCardByUserId(userId: string): Promise<Client | null> {
  const { data, error } = await supabaseAdmin
    .from('clients')
    .select('id, name, phone, visits, reward_claimed, claimed_at, created_at, business_id, user_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();
  if (error || !data) return null;
  return data as Client;
}

export async function getBusinessesByOwnerId(ownerId: string): Promise<Business[]> {
  const { data, error } = await supabaseAdmin
    .from('businesses')
    .select('id, owner_id, name, visit_goal, reward_description, created_at')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data as Business[];
}
