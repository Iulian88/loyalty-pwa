'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { clearOperatorSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Client } from '@/types';
import NavBar from '@/components/NavBar';

export default function OperatorDashboardPage() {
  const router = useRouter();
  const [recentClients, setRecentClients] = useState<Client[]>([]);
  const [stats, setStats] = useState({ total: 0, rewarded: 0, todayVisits: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/operator/session', { credentials: 'include', cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          router.replace('/operator/login');
        } else {
          fetchData();
        }
      })
      .catch(() => router.replace('/operator/login'));
  }, [router]);

  const fetchData = async () => {
    try {
      const salonId = '00000000-0000-0000-0000-000000000001';

      const { data: salonClients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('salon_id', salonId);

      if (clientsError || !salonClients) {
        throw new Error(clientsError?.message || 'Failed to load clients');
      }

      const recent = [...salonClients]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      setRecentClients(recent);

      // Stats
      const total = salonClients.length;
      const rewarded = salonClients.filter(c => c.reward_claimed).length;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: visitLogs, error: visitsError } = await supabase
        .from('visits_log')
        .select('*')
        .gte('created_at', today.toISOString())
        .eq('action', 1);

      if (visitsError) {
        throw new Error(visitsError.message);
      }

      const todayVisits = (visitLogs ?? []).filter(log =>
        salonClients.some(c => c.id === log.client_id)
      ).length;

      setStats({
        total,
        rewarded,
        todayVisits,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearOperatorSession();
    router.push('/operator/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--gold-dim)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col pb-24">
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-[var(--gold-dim)]/4 blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="flex items-center justify-between p-6 pt-8">
        <div className="fade-up">
          <p className="text-xs uppercase tracking-widest text-[var(--muted)]">Salon</p>
          <h1 className="font-display text-2xl font-semibold text-[var(--text)]">Operator Panel</h1>
        </div>
        <button
          onClick={handleLogout}
          className="w-10 h-10 glass-card rounded-xl flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
          </svg>
        </button>
      </header>

      <div className="px-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 fade-up delay-100">
          {/* Clienți — navigates to /operator/clients */}
          <Link
            href="/operator/clients"
            className="glass-card rounded-2xl p-4 text-center cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] select-none"
          >
            <div className="flex justify-center mb-1">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-[var(--gold-dim)] transition-colors duration-200 group-hover:text-[var(--gold)]" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <p className="font-display text-2xl font-bold text-[var(--gold)]">{stats.total}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">Clienți</p>
          </Link>

          <div className="glass-card rounded-2xl p-4 text-center transition-all duration-200 hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]">
            <div className="flex justify-center mb-1">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-[var(--gold-dim)]" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </div>
            <p className="font-display text-2xl font-bold text-[var(--gold)]">{stats.todayVisits}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">Vizite azi</p>
          </div>

          <div className="glass-card rounded-2xl p-4 text-center transition-all duration-200 hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]">
            <div className="flex justify-center mb-1">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-[var(--gold-dim)]" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 12 20 22 4 22 4 12"/>
                <rect x="2" y="7" width="20" height="5"/>
                <line x1="12" y1="22" x2="12" y2="7"/>
                <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
                <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
              </svg>
            </div>
            <p className="font-display text-2xl font-bold text-[var(--gold)]">{stats.rewarded}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">Bonusuri</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3 fade-up delay-200">
          <Link
            href="/operator/subscriptions"
            className="glass-card rounded-2xl p-5 flex flex-col items-center gap-3 hover:border-[var(--gold-dim)]/40 transition-colors active:scale-95 border border-[var(--border)]"
          >
            <div className="w-12 h-12 rounded-2xl bg-[var(--gold-dim)]/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-[var(--gold-dim)]" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2"/>
                <path d="M16 3v4M8 3v4M2 10h20"/>
                <path d="M7 15h.01M12 15h.01M17 15h.01"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-[var(--text-dim)]">Abonament</p>
              <p className="text-xs text-[var(--muted)] mt-0.5 leading-tight">Gestionează pachete preplătite</p>
            </div>
          </Link>

          <Link
            href="/operator/scan-qr"
            className="glass-card rounded-2xl p-5 flex flex-col items-center gap-3 hover:border-[var(--gold-dim)]/40 transition-colors active:scale-95 border border-[var(--border)] relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--gold-dim)] to-[var(--gold-light)] flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-[var(--dark)]" fill="currentColor">
                <path d="M9.5 6.5v3h-3v-3h3M11 5H5v6h6V5zm-1.5 9.5v3h-3v-3h3M11 13H5v6h6v-6zm6.5-6.5v3h-3v-3h3M19 5h-6v6h6V5zm-6 8h1.5v1.5H13V13zm1.5 1.5H16V16h-1.5v-1.5zM16 13h1.5v1.5H16V13zm-3 3h1.5v1.5H13V16zm1.5 1.5H16V19h-1.5v-1.5zM16 16h1.5v1.5H16V16zm1.5-1.5H19V16h-1.5v-1.5zm0 3H19V19h-1.5v-1.5z"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-[var(--text)]">Scan QR</span>
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          </Link>
        </div>

        {/* Recent clients */}
        {recentClients.length > 0 && (
          <div className="fade-up delay-300">
            <h2 className="text-xs uppercase tracking-widest text-[var(--muted)] mb-3">Recent Clients</h2>
            <div className="space-y-2">
              {recentClients.map(client => (
                <Link
                  key={client.id}
                  href={`/operator/search-client?phone=${client.phone}`}
                  className="glass-card rounded-xl p-4 flex items-center gap-3 hover:border-[var(--gold-dim)]/30 transition-colors border border-[var(--border)]"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--gold-dim)]/40 to-[var(--gold-light)]/40 flex items-center justify-center text-[var(--gold)] font-display font-bold flex-shrink-0">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[var(--text)] truncate">{client.name}</p>
                    <p className="text-xs text-[var(--muted)]">{client.phone}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-[var(--gold)]">{client.visits}</p>
                    <p className="text-xs text-[var(--muted)]">visits</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <NavBar role="operator" />
    </main>
  );
}
