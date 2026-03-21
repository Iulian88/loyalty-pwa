'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Client } from '@/types';
import ClientCard from '@/components/ClientCard';
import NavBar from '@/components/NavBar';

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [query, setQuery] = useState('');
  const [visitGoal, setVisitGoal] = useState(10);
  const [selected, setSelected] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [operatorId, setOperatorId] = useState('');

  useEffect(() => {
    fetch('/api/operator/session', { credentials: 'include', cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          router.replace('/operator/login');
        } else {
          setOperatorId(data.operatorId || 'operator');
          setVisitGoal(data.visitGoal || 10);
          fetchClients();
        }
      })
      .catch(() => router.replace('/operator/login'));
  }, [router]);

  const fetchClients = async () => {
    try {
      const salonId = '00000000-0000-0000-0000-000000000001';
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('salon_id', salonId);

      if (error) throw error;

      // Sort by visits desc — closest to reward first
      const sorted = (data || []).sort((a: Client, b: Client) => b.visits - a.visits);
      setClients(sorted);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = clients.filter(c => {
    const q = query.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--gold-dim)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col pb-24">
      <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-[var(--gold-dim)]/4 blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="p-6 pt-8 fade-up">
        {selected && (
          <button
            onClick={() => setSelected(null)}
            className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--text)] transition-colors mb-3"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
            <span className="text-sm">Toți clienții</span>
          </button>
        )}
        <p className="text-xs uppercase tracking-widest text-[var(--muted)] mb-1">Operator</p>
        <h1 className="font-display text-3xl font-bold text-[var(--text)]">
          {selected ? selected.name : 'Clienți'}
        </h1>
        {!selected && (
          <p className="text-sm text-[var(--muted)] mt-1">{clients.length} clienți înregistrați</p>
        )}
      </header>

      <div className="px-6 space-y-4">
        {selected ? (
          <div className="fade-up">
            <ClientCard
              client={selected}
              onUpdate={updated => {
                setSelected(updated);
                setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
              }}
              operatorId={operatorId}
              visitGoal={visitGoal}
            />
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="fade-up delay-100">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Caută după nume sau telefon..."
                className="input-field w-full px-4 py-3 rounded-xl text-base"
              />
            </div>

            {/* Client list */}
            <div className="fade-up delay-200 space-y-2">
              {filtered.length === 0 ? (
                <div className="glass-card rounded-2xl p-8 text-center">
                  <p className="text-[var(--muted)] text-sm">Niciun client găsit</p>
                </div>
              ) : (
                filtered.map(client => {
                  const isComplete = client.visits >= visitGoal;
                  return (
                    <button
                      key={client.id}
                      onClick={() => setSelected(client)}
                      className="w-full glass-card rounded-xl p-4 flex items-center gap-3 hover:border-[var(--gold-dim)]/30 transition-colors border border-[var(--border)] text-left"
                    >
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--gold-dim)]/40 to-[var(--gold-light)]/40 flex items-center justify-center text-[var(--gold)] font-display font-bold flex-shrink-0">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-[var(--text)] truncate">{client.name}</p>
                        <p className="text-xs text-[var(--muted)]">{client.phone}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-semibold ${isComplete ? 'text-[var(--gold)]' : 'text-[var(--text)]'}`}>
                          {client.visits} / {visitGoal}
                        </p>
                        {isComplete && <p className="text-xs text-[var(--gold-light)]">🎁 bonus</p>}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      <NavBar role="operator" />
    </main>
  );
}
