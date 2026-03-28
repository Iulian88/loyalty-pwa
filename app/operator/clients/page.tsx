'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Client } from '@/types';
import { supabase } from '@/lib/supabase';
import NavBar from '@/components/NavBar';
import ClientCard from '@/components/ClientCard';

// DEFAULT_BUSINESS_ID removed — businessId now comes from operator session

type SortKey = 'newest' | 'visits' | 'closest';
type FilterKey = 'all' | 'reward' | 'near' | 'inactive';

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [visitGoal, setVisitGoal] = useState(10);
  const [operatorId, setOperatorId] = useState('');
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>('newest');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [adding, setAdding] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch('/api/operator/session', { credentials: 'include', cache: 'no-store' })
      .then(res => {
        if (!res.ok) { if (mounted) { router.replace('/operator/login'); } return null; }
        return res.json();
      })
      .then(async data => {
        if (!mounted || !data) return;
        const vg: number = data.visitGoal ?? 10;
        setVisitGoal(vg);
        setOperatorId(data.data?.operatorId || '');
        const { data: clientsData } = await supabase
          .from('clients')
          .select('*')
          .eq('business_id', data.businessId || '');
        if (mounted && clientsData) setClients(clientsData as Client[]);
        if (mounted) setLoading(false);
      })
      .catch(() => { if (mounted) router.replace('/operator/login'); });
    return () => { mounted = false; };
  }, [router]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleAddVisit = async (client: Client) => {
    const vg = visitGoal;
    if (adding || client.visits >= vg) return;
    setAdding(client.id);
    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, operatorId, action: 1 }),
      });
      const data = await res.json();
      if (res.ok && data.client) {
        const updated = data.client as Client;
        setClients(prev => prev.map(c => c.id === client.id ? updated : c));
        if (selectedClient?.id === client.id) setSelectedClient(updated);
        showToast(`Vizită adăugată · ${client.name} · ${updated.visits}/${vg}`);
      }
    } catch {
      // noop
    } finally {
      setAdding(null);
    }
  };

  const sorted = [...clients].sort((a, b) => {
    if (sort === 'visits')  return b.visits - a.visits;
    if (sort === 'closest') return (visitGoal - a.visits) - (visitGoal - b.visits);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const filtered = sorted.filter(c => {
    if (filter === 'reward')   return c.visits >= visitGoal;
    if (filter === 'near')     return (c.visits / visitGoal) >= 0.8 && c.visits < visitGoal;
    if (filter === 'inactive') return c.visits === 0;
    return true;
  });

  const counts: Record<FilterKey, number> = {
    all:      clients.length,
    reward:   clients.filter(c => c.visits >= visitGoal).length,
    near:     clients.filter(c => (c.visits / visitGoal) >= 0.8 && c.visits < visitGoal).length,
    inactive: clients.filter(c => c.visits === 0).length,
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[var(--gold-dim)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <main className="min-h-screen flex flex-col pb-24">
      <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-[var(--gold-dim)]/4 blur-3xl pointer-events-none" />

      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="fade-up bg-[#1a1a1a] border border-[var(--gold-dim)]/40 rounded-2xl px-5 py-3 shadow-2xl">
            <p className="text-sm font-semibold text-[var(--gold)] whitespace-nowrap">{toast}</p>
          </div>
        </div>
      )}

      <header className="p-6 pt-8 fade-up">
        <p className="text-xs uppercase tracking-widest text-[var(--muted)] mb-1">Operator</p>
        <h1 className="font-display text-3xl font-bold text-[var(--text)]">{"Clien\u021bi"}</h1>
        <p className="text-sm text-[var(--muted)] mt-1">{clients.length} {"clien\u021bi \u00eenregistra\u021bi"}</p>
      </header>

      <div className="px-4 space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1 fade-up delay-100" style={{ scrollbarWidth: 'none' }}>
          {([
            { key: 'all'      as FilterKey, label: 'To\u021bi' },
            { key: 'reward'   as FilterKey, label: 'Bonus' },
            { key: 'near'     as FilterKey, label: 'Aproape' },
            { key: 'inactive' as FilterKey, label: 'Inactivi' },
          ]).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filter === f.key
                  ? 'bg-[var(--gold-dim)] text-[var(--dark)]'
                  : 'bg-[#1a1a1a] text-[var(--muted)] border border-[var(--border)]'
              }`}
            >
              {f.label}
              {f.key === 'all' ? ` (${counts.all})` : ''}
              {f.key !== 'all' && counts[f.key] > 0 ? ` (${counts[f.key]})` : ''}
            </button>
          ))}
        </div>

        <div className="flex gap-2 fade-up delay-150">
          {([
            { key: 'newest'  as SortKey, label: 'Noi' },
            { key: 'visits'  as SortKey, label: 'Vizite' },
            { key: 'closest' as SortKey, label: 'Aproape bonus' },
          ]).map(s => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all border ${
                sort === s.key
                  ? 'border-[var(--gold-dim)]/60 text-[var(--gold-dim)] bg-[var(--gold-dim)]/10'
                  : 'border-[var(--border)] text-[var(--muted)]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 fade-up delay-200">
            <p className="text-[var(--muted)] text-sm">{"Niciun client \u00een aceast\u0103 categorie."}</p>
          </div>
        ) : (
          <div className="space-y-2 fade-up delay-200">
            {filtered.map(client => {
              const pct        = visitGoal > 0 ? Math.min((client.visits / visitGoal) * 100, 100) : 0;
              const isComplete = client.visits >= visitGoal;
              const isNear     = pct >= 80 && !isComplete;
              const isAdding   = adding === client.id;
              let barColor = '#8a6f2e';
              if (isComplete) barColor = '#c9a84c';
              else if (isNear) barColor = 'linear-gradient(90deg, #8a6f2e, #e2c87a)';

              return (
                <div
                  key={client.id}
                  className={`glass-card rounded-2xl p-4 border transition-all ${
                    isComplete ? 'border-[var(--gold-dim)]/40 reward-glow' : 'border-[var(--border)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedClient(client)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--gold-dim)]/40 to-[var(--gold-light)]/40 flex items-center justify-center text-[var(--gold)] font-display font-bold text-sm flex-shrink-0">
                      {/^\d/.test(client.name) ? '#' : client.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="font-semibold text-sm text-[var(--text)] truncate">{client.name}</p>
                        <span className={`text-xs font-bold ml-2 flex-shrink-0 ${isComplete ? 'text-[var(--gold)]' : 'text-[var(--text-dim)]'}`}>
                          {client.visits}/{visitGoal}
                        </span>
                      </div>
                      <div className="h-1.5 bg-[#1e1e1e] rounded-full overflow-hidden mb-1">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: barColor,
                          }}
                        />
                      </div>
                      {isComplete ? (
                        <p className="text-xs text-[var(--gold)]">Bonus disponibil</p>
                      ) : (
                        <p className="text-xs text-[var(--muted)]">{visitGoal - client.visits} {"r\u0103mase"}</p>
                      )}
                    </div>
                    </button>

                    <button
                      onClick={() => { void handleAddVisit(client); }}
                      disabled={!!adding || isComplete}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${
                        isComplete
                          ? 'opacity-20 cursor-not-allowed bg-[#1e1e1e]'
                          : 'btn-gold'
                      }`}
                    >
                      {isAdding ? (
                        <div className="w-3.5 h-3.5 border-2 border-[var(--dark)] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Client detail modal */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Închide"
            onClick={() => setSelectedClient(null)}
            className="absolute inset-0 w-full h-full"
          />
          <div className="relative z-10 w-full max-w-lg fade-up max-h-[90vh] overflow-y-auto rounded-3xl">
            <div className="px-4 pt-4 pb-6">
              <button
                onClick={() => setSelectedClient(null)}
                className="flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors mb-3"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                </svg>
                Înapoi la listă
              </button>
              <ClientCard
                client={selectedClient}
                onUpdate={updated => {
                  setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
                  if (updated.reward_claimed && updated.visits === 0) {
                    setSelectedClient(null);
                    setToast(`Bonus acordat · ${updated.name} ✔️`);
                  } else {
                    setSelectedClient(updated);
                  }
                }}
                operatorId={operatorId}
                visitGoal={visitGoal}
              />
            </div>
          </div>
        </div>
      )}

      <NavBar role="operator" />
    </main>
  );
}
