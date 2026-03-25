'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { clearOperatorSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import NavBar from '@/components/NavBar';
import type { Client } from '@/types';

const SALON_ID = process.env.NEXT_PUBLIC_SALON_ID || '00000000-0000-0000-0000-000000000001';

export default function OperatorDashboardPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [todayVisits, setTodayVisits] = useState(0);
  const [visitGoal, setVisitGoal] = useState(10);
  const [rewardName, setRewardName] = useState('Tunsoare gratuită');
  const [showRewardConfig, setShowRewardConfig] = useState(false);
  const [editingReward, setEditingReward] = useState(false);
  const [pendingRewardName, setPendingRewardName] = useState('');

  // Derived from clients
  const total = clients.length;
  const rewarded = clients.filter(c => c.reward_claimed).length;
  const stats = { total, rewarded, todayVisits };

  useEffect(() => {
    const stored = localStorage.getItem('reward_name');
    if (stored) setRewardName(stored);
  }, []);

  // Keep a stable ref to clients for use inside the visits_log interval
  const clientsRef = useRef(clients);
  useEffect(() => { clientsRef.current = clients; }, [clients]);

  useEffect(() => {
    fetch('/api/operator/session', { credentials: 'include', cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setAuthChecking(false);
          router.replace('/operator/login');
        } else {
          setVisitGoal(data.visitGoal ?? 10);
          setAuthenticated(true);
          setAuthChecking(false);
        }
      })
      .catch(() => { setAuthChecking(false); router.replace('/operator/login'); });
  }, [router]);

  const fetchClients = useCallback(async () => {
    const { data, error } = await supabase.from('clients').select('*').eq('salon_id', SALON_ID);
    if (!error) setClients(data || []);
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    fetchClients();
    const id = setInterval(fetchClients, 5000);
    return () => clearInterval(id);
  }, [authenticated, fetchClients]);

  const fetchTodayVisits = useCallback(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from('visits_log')
      .select('client_id')
      .gte('created_at', today.toISOString())
      .eq('action', 1);
    const count = (data ?? []).filter(log =>
      clientsRef.current.some(c => c.id === log.client_id)
    ).length;
    setTodayVisits(count);
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    fetchTodayVisits();
    const id = setInterval(fetchTodayVisits, 5000);
    return () => clearInterval(id);
  }, [authenticated, fetchTodayVisits]);

  const handleLogout = () => {
    clearOperatorSession();
    router.push('/operator/login');
  };

  if (authChecking) return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-[var(--muted)] text-sm">Se verifică sesiunea...</p>
    </main>
  );
  if (!authenticated) return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-[var(--muted)] text-sm">Nu ești autentificat. Redirecționare către login...</p>
    </main>
  );

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

          <Link
            href="/operator/activity"
            className="glass-card rounded-2xl p-4 text-center cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] select-none"
          >
            <div className="flex justify-center mb-1">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-[var(--gold-dim)]" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <p className="font-display text-2xl font-bold text-[var(--gold)]">{stats.todayVisits}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">Vizite azi</p>
          </Link>

          <button
            onClick={() => setShowRewardConfig(prev => !prev)}
            className="glass-card rounded-2xl p-4 text-center cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] select-none"
          >
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
          </button>
        </div>

        {/* Reward config panel */}
        {showRewardConfig && (
          <div className="glass-card rounded-2xl p-4 border border-[var(--gold-dim)]/30 fade-up space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-[var(--muted)]">Configurare bonus</p>
              <button
                onClick={() => { setShowRewardConfig(false); setEditingReward(false); }}
                className="w-6 h-6 flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] transition-colors text-lg leading-none"
              >×</button>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--muted)]">Numele recompensei</p>
              {editingReward ? (
                <div className="flex items-center gap-2">
                  <input
                    value={pendingRewardName}
                    onChange={e => setPendingRewardName(e.target.value)}
                    className="input-field px-2 py-1 rounded-lg text-sm w-40"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      const name = pendingRewardName.trim() || rewardName;
                      setRewardName(name);
                      localStorage.setItem('reward_name', name);
                      setEditingReward(false);
                    }}
                    className="btn-gold px-3 py-1 rounded-lg text-xs font-semibold"
                  >Salvează</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[var(--text)]">{rewardName}</p>
                  <button
                    onClick={() => { setPendingRewardName(rewardName); setEditingReward(true); }}
                    className="text-[var(--muted)] hover:text-[var(--gold)] transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--muted)]">Vizite necesare</p>
              <p className="text-sm font-semibold text-[var(--text)]">{visitGoal}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--muted)]">Bonusuri disponibile</p>
              <p className="text-sm font-semibold text-[var(--gold)]">{clients.filter(c => c.visits >= visitGoal).length}</p>
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3 fade-up delay-200">
          <div
            className="glass-card rounded-2xl p-5 flex flex-col items-center gap-3 border border-[var(--border)] opacity-50 cursor-not-allowed select-none relative overflow-hidden"
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
            <span className="absolute top-2 right-2 text-[10px] font-bold bg-[var(--border)] text-[var(--muted)] px-2 py-0.5 rounded-full">Curând</span>
          </div>

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

      </div>

      <NavBar role="operator" />
    </main>
  );
}
