import { createClient } from '@supabase/supabase-js';
import type { Client, Salon, Business, VisitLog } from '../types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const VISIT_GOAL = parseInt(process.env.LOYALTY_VISIT_GOAL || '10');

export async function getBusinessById(businessId: string): Promise<Business | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, created_at')
    .eq('id', businessId)
    .single();
  if (error || !data) return null;
  return data as Business;
}

export type { Client, Salon, Business, VisitLog };
