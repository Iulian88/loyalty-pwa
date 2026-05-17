import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Anon-key Supabase client — browser-safe.
 * Used only where a public (non-sensitive) query is necessary.
 * All server-side data access uses supabaseAdmin from lib/supabase-admin.ts.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Default visit goal if the business record does not specify one.
 * Kept here because it is a non-sensitive constant imported by both
 * browser and server modules.
 */
export const VISIT_GOAL = Number.parseInt(process.env.LOYALTY_VISIT_GOAL || '10');

export type { Client, User, Salon, Business, Operator, VisitLog } from '../types';
