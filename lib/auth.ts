import jwt from 'jsonwebtoken';

// In-memory storage for demo purposes
let clients: Client[] = [];
let visitLogs: VisitLog[] = [];

export interface ClientSession {
  id: string;
  name: string;
  phone: string;
}

export interface Client {
  id: string;
  salon_id: string;
  name: string;
  phone: string;
  visits: number;
  reward_claimed: boolean;
  created_at: string;
}

export interface VisitLog {
  id: string;
  client_id: string;
  operator_id: string;
  action: number;
  timestamp: string;
}

export async function registerClient(name: string, phone: string, salonId: string): Promise<Client> {
  // Check if phone already registered
  const existing = clients.find(c => c.phone === phone && c.salon_id === salonId);
  if (existing) {
    throw new Error('Phone number already registered.');
  }

  // Create new client
  const client: Client = {
    id: `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    salon_id: salonId,
    name,
    phone,
    visits: 0,
    reward_claimed: false,
    created_at: new Date().toISOString(),
  };

  clients.push(client);
  return client;
}

export async function loginClient(phone: string, salonId: string): Promise<Client> {
  const client = clients.find(c => c.phone === phone && c.salon_id === salonId);
  if (!client) {
    throw new Error('Client not found. Please register first.');
  }
  return client;
}

export async function getClientById(id: string): Promise<Client> {
  const client = clients.find(c => c.id === id);
  if (!client) {
    throw new Error('Client not found.');
  }
  return client;
}

export function setSession(client: Client) {
  const token = jwt.sign(
    { id: client.id, name: client.name, phone: client.phone },
    process.env.NEXTAUTH_SECRET || 'fallback-secret',
    { expiresIn: '7d' }
  );
  return token;
}

export function getSession(token: string): ClientSession | null {
  try {
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'fallback-secret') as ClientSession;
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
