import { createClient } from '@supabase/supabase-js';
import type { Client, User, Business } from '../types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const VISIT_GOAL = Number.parseInt(process.env.LOYALTY_VISIT_GOAL || '10');

export async function getBusinessById(businessId: string): Promise<Business | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, visit_goal, reward_description, created_at')
    .eq('id', businessId)
    .single();
  if (error || !data) return null;
  return data as Business;
}

export async function getUserByPhone(phone: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, phone, name, created_at')
    .eq('phone', phone)
    .single();
  if (error || !data) return null;
  return data as User;
}

export async function getUserById(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, phone, name, created_at')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return data as User;
}

/** Returns the first loyalty card for a user, ordered by creation date. */
export async function getFirstCardByUserId(userId: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, phone, visits, reward_claimed, claimed_at, created_at, business_id, user_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();
  if (error || !data) return null;
  return data as Client;
}

export type { Client, User, Salon, Business, VisitLog } from '../types';
