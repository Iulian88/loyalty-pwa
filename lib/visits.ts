import type { SupabaseClient } from '@supabase/supabase-js';
import { VISIT_GOAL } from './supabase';
import type { Client } from '../types';

const CLIENT_COLUMNS = 'id,name,phone,visits,reward_claimed,created_at,salon_id,claimed_at';

export async function addVisit(supabase: SupabaseClient, clientId: string, operatorId: string): Promise<Client> {
  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select(CLIENT_COLUMNS)
    .eq('id', clientId)
    .single();

  if (fetchError || !client) {
    throw new Error('Client not found.');
  }
  if (client.visits >= VISIT_GOAL) throw new Error('Client already reached the visit goal.');

  const newVisits = Math.min(client.visits + 1, VISIT_GOAL);

  const { data: updated, error: updateError } = await supabase
    .from('clients')
    .update({ visits: newVisits })
    .eq('id', clientId)
    .select(CLIENT_COLUMNS)
    .single();

  if (updateError || !updated) {
    throw new Error(updateError?.message || 'Update failed');
  }

  await supabase
    .from('visits_log')
    .insert({ client_id: clientId, operator_id: operatorId, action: 1 });

  return updated as Client;
}

export async function removeVisit(supabase: SupabaseClient, clientId: string, operatorId: string): Promise<Client> {
  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select(CLIENT_COLUMNS)
    .eq('id', clientId)
    .single();

  if (fetchError || !client) {
    throw new Error('Client not found.');
  }
  if (client.visits <= 0) throw new Error('Visits cannot be negative.');

  const newVisits = Math.max(client.visits - 1, 0);

  const { data: updated, error: updateError } = await supabase
    .from('clients')
    .update({ visits: newVisits })
    .eq('id', clientId)
    .select(CLIENT_COLUMNS)
    .single();

  if (updateError || !updated) {
    throw new Error(updateError?.message || 'Update failed');
  }

  await supabase
    .from('visits_log')
    .insert({ client_id: clientId, operator_id: operatorId, action: -1 });

  return updated as Client;
}

export async function resetVisits(supabase: SupabaseClient, clientId: string, operatorId: string): Promise<Client> {
  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select(CLIENT_COLUMNS)
    .eq('id', clientId)
    .single();

  if (fetchError || !client) {
    throw new Error('Client not found.');
  }

  const { data: updated, error: updateError } = await supabase
    .from('clients')
    .update({ visits: 0 })
    .eq('id', clientId)
    .select(CLIENT_COLUMNS)
    .single();

  if (updateError || !updated) {
    throw new Error(updateError?.message || 'Update failed');
  }

  await supabase
    .from('visits_log')
    .insert({ client_id: clientId, operator_id: operatorId, action: 0 });

  return updated as Client;
}

export async function claimReward(supabase: SupabaseClient, clientId: string, operatorId: string): Promise<Client> {
  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select(CLIENT_COLUMNS)
    .eq('id', clientId)
    .single();

  if (fetchError || !client) throw new Error('Client not found.');
  if (client.visits < VISIT_GOAL) throw new Error('Client has not reached the visit goal yet.');

  const { data: updated, error: updateError } = await supabase
    .from('clients')
    .update({ visits: 0, reward_claimed: true, claimed_at: new Date().toISOString() })
    .eq('id', clientId)
    .select(CLIENT_COLUMNS)
    .single();

  if (updateError || !updated) throw new Error(updateError?.message || 'Claim failed');

  await supabase
    .from('visits_log')
    .insert({ client_id: clientId, operator_id: operatorId, action: 2 });

  return updated as Client;
}

export async function searchClientByPhone(supabase: SupabaseClient, phone: string, salonId: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('phone', phone)
    .eq('salon_id', salonId)
    .single();

  if (error) return null;
  return data as Client;
}
