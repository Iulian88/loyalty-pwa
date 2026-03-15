export interface Salon {
  id: string;
  name: string;
  created_at: string;
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