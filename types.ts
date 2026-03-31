export interface User {
  id: string;
  phone: string;
  name: string;
  created_at: string;
}

export interface Salon {
  id: string;
  name: string;
  created_at: string;
}

export interface Client {
  id: string;
  business_id: string;
  user_id: string;
  name: string;
  phone: string;
  visits: number;
  reward_claimed: boolean;
  claimed_at: string | null;
  created_at: string;
  pin_hash?: string;
}

export interface Business {
  id: string;
  owner_id: string | null;
  name: string;
  visit_goal: number;
  reward_description: string | null;
  created_at: string;
}

export interface Operator {
  id: string;
  business_id: string;
  phone: string;
  name: string;
  created_at: string;
  pin_hash?: string;
}

export interface VisitLog {
  id: string;
  client_id: string;
  operator_id: string;
  action: number;
  created_at: string;
}