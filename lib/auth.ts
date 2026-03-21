import { supabase } from './supabase';
import jwt from 'jsonwebtoken';
import type { Client, VisitLog } from '../types';

function getClientJwtSecret(): string {
  const secret = process.env.CLIENT_JWT_SECRET;
  if (!secret) {
    throw new Error('CLIENT_JWT_SECRET environment variable is not set. Refusing to start.');
  }
  return secret;
}

function getOperatorJwtSecret(): string {
  const secret = process.env.OPERATOR_JWT_SECRET;
  if (!secret) {
    throw new Error('OPERATOR_JWT_SECRET environment variable is not set. Refusing to start.');
  }
  return secret;
}

export type { Client, VisitLog } from '../types';

export interface ClientSession {
  id: string;
  name: string;
  phone: string;
}

export async function registerClient(name: string, phone: string, salonId: string): Promise<Client> {
  // Check if phone already registered
  const { data: existing, error: checkError } = await supabase
    .from('clients')
    .select('*')
    .eq('phone', phone)
    .eq('salon_id', salonId)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    throw new Error(checkError.message);
  }

  if (existing) {
    throw new Error('Phone number already registered.');
  }

  const { data, error: insertError } = await supabase
    .from('clients')
    .insert({ name, phone, salon_id: salonId, visits: 0, reward_claimed: false })
    .select()
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return data as Client;
}

export async function loginClient(phone: string, salonId: string): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('phone', phone)
    .eq('salon_id', salonId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }

  if (!data) {
    // Create a new client when not found
    return registerClient(phone, phone, salonId);
  }

  return data as Client;
}

export async function getClientById(id: string): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, phone, visits, reward_claimed, created_at, salon_id, claimed_at')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new Error('Client not found.');
  }
  return data as Client;
}

export function setSession(client: Client) {
  const token = jwt.sign(
    { id: client.id, name: client.name, phone: client.phone },
    getClientJwtSecret(),
    { expiresIn: '7d' }
  );
  return token;
}

export function getSession(token: string): ClientSession | null {
  try {
    const decoded = jwt.verify(token, getClientJwtSecret()) as ClientSession;
    return decoded;
  } catch {
    return null;
  }
}

export function clearSession() {
  // This is a no-op for JWT-based sessions
}

export function saveClientSession(client: Client) {
  localStorage.setItem('client_session', JSON.stringify(client));
}

// ── Operator session helpers ──────────────────────────────────────────────────

export function signOperatorToken(): string {
  return jwt.sign(
    { operatorId: 'operator', role: 'operator' },
    getOperatorJwtSecret(),
    { expiresIn: '1d' }
  );
}

export function verifyOperatorToken(token: string): string | null {
  try {
    const decoded = jwt.verify(
      token,
      getOperatorJwtSecret()
    ) as { operatorId: string; role: string };
    if (decoded.role !== 'operator') return null;
    return decoded.operatorId;
  } catch {
    return null;
  }
}

export function loadClientSession(): Client | null {
  const raw = localStorage.getItem('client_session');
  return raw ? JSON.parse(raw) : null;
}

export function clearClientSession() {
  localStorage.removeItem('client_session');
}

export function saveOperatorSession(operatorId: string) {
  localStorage.setItem('operator_session', operatorId);
}

export function loadOperatorSession(): string | null {
  return localStorage.getItem('operator_session');
}

export function clearOperatorSession() {
  localStorage.removeItem('operator_session');
}
