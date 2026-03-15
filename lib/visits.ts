import { supabase, VISIT_GOAL } from './supabase';
import type { Client } from '../types';

export async function addVisit(clientId: string, operatorId: string): Promise<Client> {
  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();

  if (fetchError || !client) throw new Error('Client not found.');
  if (client.visits >= VISIT_GOAL) throw new Error('Client already reached the visit goal.');

  const newVisits = Math.min(client.visits + 1, VISIT_GOAL);

  const { data: updated, error: updateError } = await supabase
    .from('clients')
    .update({ visits: newVisits })
    .eq('id', clientId)
    .select()
    .single();

  if (updateError || !updated) throw new Error(updateError?.message || 'Update failed');

  await supabase.from('visits_log').insert({
    client_id: clientId,
    salon_id: client.salon_id,
    points: 1
  });

  return updated as Client;
}

export async function removeVisit(clientId: string, operatorId: string): Promise<Client> {
  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();

  if (fetchError || !client) throw new Error('Client not found.');
  if (client.visits <= 0) throw new Error('Visits cannot be negative.');

  const newVisits = Math.max(client.visits - 1, 0);

  const { data: updated, error: updateError } = await supabase
    .from('clients')
    .update({ visits: newVisits })
    .eq('id', clientId)
    .select()
    .single();

  if (updateError || !updated) throw new Error(updateError?.message || 'Update failed');

  await supabase.from('visits_log').insert({
    client_id: clientId,
    salon_id: client.salon_id,
    points: -1
  });

  return updated as Client;
}

export async function resetVisits(clientId: string, operatorId: string): Promise<Client> {
  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();

  if (fetchError || !client) throw new Error('Client not found.');

  const { data: updated, error: updateError } = await supabase
    .from('clients')
    .update({ visits: 0, reward_claimed: true })
    .eq('id', clientId)
    .select()
    .single();

  if (updateError || !updated) throw new Error(updateError?.message || 'Update failed');

  await supabase.from('visits_log').insert({
    client_id: clientId,
    salon_id: client.salon_id,
    points: -VISIT_GOAL
  });

  return updated as Client;
}

export async function searchClientByPhone(phone: string, salonId: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('phone', phone)
    .eq('salon_id', salonId)
    .single();

  if (error) return null;
  return data as Client;
}
