import { supabase } from './supabase';
import jwt from 'jsonwebtoken';
import type { Client } from '../types';

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

export type { Client, User, VisitLog } from '../types';

/** Shape stored inside the JWT (new format). */
export interface UserSession {
  userId: string;
  name: string;
  phone: string;
}

/** Legacy shape — old JWTs signed before the users table migration. */
interface LegacySession {
  id: string;
  name: string;
  phone: string;
}

// Keep old name as alias so existing imports still compile
export type ClientSession = UserSession;

export async function getClientById(id: string, salonId?: string): Promise<Client> {
  let query = supabase
    .from('clients')
    .select('id, name, phone, visits, reward_claimed, created_at, business_id, claimed_at')
    .eq('id', id);
  if (salonId) query = query.eq('business_id', salonId);
  const { data, error } = await query.single();

  if (error || !data) {
    throw new Error('Client not found.');
  }
  return data as Client;
}

/** Sign a JWT for a User (new) or a legacy Client (backward compat). */
export function setSession(subject: { id: string; name: string; phone: string }) {
  const token = jwt.sign(
    { userId: subject.id, name: subject.name, phone: subject.phone },
    getClientJwtSecret(),
    { expiresIn: '7d' }
  );
  return token;
}

/**
 * Verify a client JWT and normalise to UserSession.
 * Handles both new JWTs ({ userId, name, phone }) and
 * legacy JWTs ({ id, name, phone }) transparently.
 */
export function getSession(token: string): UserSession | null {
  try {
    const decoded = jwt.verify(token, getClientJwtSecret()) as UserSession & LegacySession;
    // New format
    if (decoded.userId) return { userId: decoded.userId, name: decoded.name, phone: decoded.phone };
    // Legacy format — id was the client id; treat it as userId for fallback paths
    if (decoded.id) return { userId: decoded.id, name: decoded.name, phone: decoded.phone };
    return null;
  } catch {
    return null;
  }
}

// ── Operator session helpers ──────────────────────────────────────────────────

export interface OperatorSession {
  operatorId: string;
  businessId: string;
  operatorName: string;
  businessName: string;
}

export function signOperatorToken(
  operatorId: string,
  businessId: string,
  operatorName: string,
  businessName: string
): string {
  return jwt.sign(
    { operatorId, businessId, operatorName, businessName, role: 'operator' },
    getOperatorJwtSecret(),
    { expiresIn: '1d' }
  );
}

export function verifyOperatorToken(token: string): OperatorSession | null {
  try {
    const decoded = jwt.verify(
      token,
      getOperatorJwtSecret()
    ) as { operatorId: string; businessId: string; operatorName?: string; businessName?: string; role: string };
    if (decoded.role !== 'operator' || !decoded.businessId) return null;
    return {
      operatorId: decoded.operatorId,
      businessId: decoded.businessId,
      operatorName: decoded.operatorName ?? '',
      businessName: decoded.businessName ?? '',
    };
  } catch {
    return null;
  }
}

export function clearOperatorSession() {
  localStorage.removeItem('operator_session');
}
