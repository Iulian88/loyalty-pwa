import { clients, visitLogs, Client, VisitLog } from './auth';

const VISIT_GOAL = 10;

export async function addVisit(clientId: string, operatorId: string): Promise<Client> {
  const clientIndex = clients.findIndex(c => c.id === clientId);
  if (clientIndex === -1) throw new Error('Client not found.');
  const client = clients[clientIndex];

  if (client.visits >= VISIT_GOAL) throw new Error('Client already reached the visit goal.');

  const newVisits = Math.min(client.visits + 1, VISIT_GOAL);
  client.visits = newVisits;

  // Log the visit
  const visitLog: VisitLog = {
    id: `visit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    client_id: clientId,
    operator_id: operatorId,
    action: 1,
    timestamp: new Date().toISOString(),
  };
  visitLogs.push(visitLog);

  return client;
}

export async function removeVisit(clientId: string, operatorId: string): Promise<Client> {
  const clientIndex = clients.findIndex(c => c.id === clientId);
  if (clientIndex === -1) throw new Error('Client not found.');
  const client = clients[clientIndex];

  if (client.visits <= 0) throw new Error('Visits cannot be negative.');

  const newVisits = Math.max(client.visits - 1, 0);
  client.visits = newVisits;

  // Log the visit
  const visitLog: VisitLog = {
    id: `visit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    client_id: clientId,
    operator_id: operatorId,
    action: -1,
    timestamp: new Date().toISOString(),
  };
  visitLogs.push(visitLog);

  return client;
}

export async function resetVisits(clientId: string, operatorId: string): Promise<Client> {
  const clientIndex = clients.findIndex(c => c.id === clientId);
  if (clientIndex === -1) throw new Error('Client not found.');
  const client = clients[clientIndex];

  client.visits = 0;
  client.reward_claimed = true;

  // Log the reset
  const visitLog: VisitLog = {
    id: `visit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    client_id: clientId,
    operator_id: operatorId,
    action: -VISIT_GOAL,
    timestamp: new Date().toISOString(),
  };
  visitLogs.push(visitLog);

  return client;
}

export async function searchClientByPhone(phone: string, salonId: string): Promise<Client | null> {
  const client = clients.find(c => c.phone === phone && c.salon_id === salonId);
  return client || null;
}
