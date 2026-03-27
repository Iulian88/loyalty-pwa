import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Client } from '@/types';

const DEFAULT_BUSINESS_ID = process.env.NEXT_PUBLIC_DEFAULT_BUSINESS_ID || '00000000-0000-0000-0000-000000000001';
const POLL_INTERVAL = 5000;

export function useClientsPolling(enabled: boolean, businessId?: string) {
  const effectiveBusinessId = businessId ?? DEFAULT_BUSINESS_ID;
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('business_id', effectiveBusinessId);
      if (error) throw error;
      setClients(data || []);
    } catch (e) {
      console.error('[useClientsPolling]', e);
    } finally {
      setLoading(false);
    }
  }, [effectiveBusinessId]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    fetchClients();
    intervalRef.current = setInterval(fetchClients, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, fetchClients]);

  const updateClient = useCallback((updated: Client) => {
    setClients(prev => prev.map(c => (c.id === updated.id ? updated : c)));
  }, []);

  const refresh = useCallback(() => {
    fetchClients();
  }, [fetchClients]);

  return { clients, loading, refresh, updateClient };
}
