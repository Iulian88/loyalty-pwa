import type { SupabaseClient } from '@supabase/supabase-js';
import { VISIT_GOAL } from './supabase';
import type { Client } from '../types';

export async function addVisit(supabase: SupabaseClient, clientId: string, operatorId: string): Promise<Client> {
  console.log('FETCH CLIENT BY ID:', clientId);

  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();

  console.log('FETCH RESULT:', client);

  if (fetchError || !client) {
    console.error('CLIENT FETCH ERROR:', fetchError);
    console.error('Supabase addVisit fetch error:', fetchError);
    throw new Error('Client not found.');
  }
  if (client.visits >= VISIT_GOAL) throw new Error('Client already reached the visit goal.');

  const newVisits = Math.min(client.visits + 1, VISIT_GOAL);

  const { data: updated, error: updateError } = await supabase
    .from('clients')
    .update({ visits: newVisits })
    .eq('id', clientId)
    .select()
    .single();

  if (updateError || !updated) {
    console.error('Supabase addVisit update error:', updateError);
    throw new Error(updateError?.message || 'Update failed');
  }

  const { error: logError } = await supabase
    .from('visits_log')
    .insert({
      client_id: clientId,
      operator_id: operatorId,
      action: 1
    });

  if (logError) {
    console.error('VISIT LOG ERROR:', logError);
  }

  return updated as Client;
}

export async function removeVisit(supabase: SupabaseClient, clientId: string, operatorId: string): Promise<Client> {
  console.log('FETCH CLIENT BY ID:', clientId);

  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();

  console.log('FETCH RESULT:', client);

  if (fetchError || !client) {
    console.error('CLIENT FETCH ERROR:', fetchError);
    console.error('Supabase removeVisit fetch error:', fetchError);
    throw new Error('Client not found.');
  }
  if (client.visits <= 0) throw new Error('Visits cannot be negative.');

  const newVisits = Math.max(client.visits - 1, 0);

  const { data: updated, error: updateError } = await supabase
    .from('clients')
    .update({ visits: newVisits })
    .eq('id', clientId)
    .select()
    .single();

  if (updateError || !updated) {
    console.error('Supabase removeVisit update error:', updateError);
    throw new Error(updateError?.message || 'Update failed');
  }

  const { error: logError } = await supabase
    .from('visits_log')
    .insert({
      client_id: clientId,
      operator_id: operatorId,
      action: -1
    });

  if (logError) {
    console.error('VISIT LOG ERROR:', logError);
  }

  return updated as Client;
}

export async function resetVisits(supabase: SupabaseClient, clientId: string, operatorId: string): Promise<Client> {
  console.log('FETCH CLIENT BY ID:', clientId);

  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();

  console.log('FETCH RESULT:', client);

  if (fetchError || !client) {
    console.error('CLIENT FETCH ERROR:', fetchError);
    console.error('Supabase resetVisits fetch error:', fetchError);
    throw new Error('Client not found.');
  }

  const { data: updated, error: updateError } = await supabase
    .from('clients')
    .update({ visits: 0, reward_claimed: true })
    .eq('id', clientId)
    .select()
    .single();

  if (updateError || !updated) {
    console.error('Supabase resetVisits update error:', updateError);
    throw new Error(updateError?.message || 'Update failed');
  }

  const { error: logError } = await supabase
    .from('visits_log')
    .insert({
      client_id: clientId,
      operator_id: operatorId,
      action: -10
    });

  if (logError) {
    console.error('VISIT LOG ERROR:', logError);
  }

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
