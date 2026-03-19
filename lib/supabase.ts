import { createClient } from '@supabase/supabase-js';
import type { Client, Salon, VisitLog } from '../types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log('SUPABASE URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const VISIT_GOAL = parseInt(process.env.LOYALTY_VISIT_GOAL || '10');

export type { Client, Salon, VisitLog };
