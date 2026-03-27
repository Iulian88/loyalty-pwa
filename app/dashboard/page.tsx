'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Client } from '@/lib/auth';
import { VisitLog } from '@/types';
import LoyaltyCard from '@/components/LoyaltyCard';
import NavBar from '@/components/NavBar';
import InstallPrompt from '@/components/InstallPrompt';

export default function DashboardPage() {
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [visitGoal, setVisitGoal] = useState(0);
  const [visitHistory, setVisitHistory] = useState<VisitLog[]>([]);
  const prevVisitsRef = useRef<number | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bumpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState('');
  const [cardBump, setCardBump] = useState(false);
  const [cards, setCards] = useState<Client[]>([]);
  const [activeCard, setActiveCard] = useState<Client | null>(null);
  const [businessNames, setBusinessNames] = useState<Record<string, string>>({});
  const [businessConfigs, setBusinessConfigs] = useState<Record<string, { visit_goal: number; reward_description: string | null }>>({});
  const [rewardDescription, setRewardDescription] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch('/api/auth/session', { credentials: 'include', cache: 'no-store' })
      .then(res => {
        if (!res.ok) { router.replace('/login'); return null; }
        return res.json();
      })
      .then(data => {
        if (!mounted || !data) return;
        setClient(data.client);
        setActiveCard(data.client);
        setVisitGoal(data.visitGoal);
        setRewardDescription(data.rewardDescription ?? null);
        prevVisitsRef.current = data.client.visits;
        Promise.all([
          fetch('/api/my-cards', { credentials: 'include', cache: 'no-store' }).then(r => r.ok ? r.json() : null),
          fetch('/api/businesses', { credentials: 'include', cache: 'no-store' }).then(r => r.ok ? r.json() : null),
        ]).then(([cardsData, bizData]) => {
          if (!mounted) return;
          if (cardsData?.cards) {
            setCards(cardsData.cards);
            if (cardsData.cards.length > 0) setActiveCard(cardsData.cards[0]);
          }
          if (bizData?.businesses) {
            const names: Record<string, string> = {};
            const configs: Record<string, { visit_goal: number; reward_description: string | null }> = {};
            for (const b of bizData.businesses) {
              names[b.id] = b.name;
              configs[b.id] = { visit_goal: b.visit_goal ?? 10, reward_description: b.reward_description ?? null };
            }
            setBusinessNames(names);
            setBusinessConfigs(configs);
          }
        }).catch(() => {});
      })
      .catch(() => { if (mounted) router.replace('/login'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [router]);

  useEffect(() => {
    if (!activeCard) return;
    fetch(`/api/visits/${activeCard.id}`)
      .then(res => res.json())
      .then(data => { if (data.history) setVisitHistory(data.history); })
      .catch(() => {});
  }, [activeCard?.id]);

  // Update visit goal and reward description when active card changes
  useEffect(() => {
    if (!activeCard) return;
    const cfg = businessConfigs[activeCard.business_id];
    if (cfg) {
      setVisitGoal(cfg.visit_goal);
      setRewardDescription(cfg.reward_description);
    }
  }, [activeCard?.business_id, businessConfigs]);

  useEffect(() => {
    if (!client) return;
    const interval = setInterval(() => {
      fetch('/api/auth/session')
        .then(res => {
          if (res.status === 401) {
            clearInterval(interval);
            return null;
          }
          return res.json();
        })
        .then(data => {
          if (!data || data.error) return;
          const newVisits = data.client.visits;
          if (prevVisitsRef.current !== null && newVisits > prevVisitsRef.current) {
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
            setToast('+1 vizită adăugată ✔️');
            toastTimerRef.current = setTimeout(() => setToast(''), 2000);
            if (bumpTimerRef.current) clearTimeout(bumpTimerRef.current);
            setCardBump(true);
            bumpTimerRef.current = setTimeout(() => setCardBump(false), 450);
          }
          prevVisitsRef.current = newVisits;
          setClient(data.client);
          setActiveCard(prev => prev?.id === data.client.id ? data.client : prev);
          setVisitGoal(data.visitGoal);
        })
        .catch(() => {});
    }, 3000);
    return () => {
      clearInterval(interval);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (bumpTimerRef.current) clearTimeout(bumpTimerRef.current);
    };
  }, [client?.id]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--gold-dim)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!client || !activeCard) return null;

  const isComplete = activeCard.visits >= visitGoal;

  return (
    <main className="min-h-screen flex flex-col pb-24">
      <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#1a1a1a] border border-[var(--gold-dim)]/40 rounded-2xl px-5 py-3 shadow-2xl pointer-events-none transition-all duration-300 ${toast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        <p className="text-sm font-semibold text-[var(--gold)] whitespace-nowrap">{toast}</p>
      </div>
      <InstallPrompt />

      {/* Background glow */}
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-[var(--gold-dim)]/4 blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="flex items-center justify-between p-6 pt-8">
        <div className="fade-up">
          <p className="text-xs uppercase tracking-widest text-[var(--muted)]">Bună ziua,</p>
          <h1 className="font-display text-2xl font-semibold text-[var(--text)]">{activeCard.name.split(' ')[0]}</h1>
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

      {/* Content */}
      <div className="flex-1 px-6 space-y-5">
        {/* Card Selector */}
        {cards.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 fade-up">
            {cards.map(card => (
              <button
                key={card.id}
                onClick={() => setActiveCard(card)}
                className={`flex-shrink-0 px-3 py-2 rounded-xl border text-sm transition-colors ${
                  activeCard?.id === card.id
                    ? 'border-[var(--gold-dim)] bg-[var(--gold-dim)]/10 text-[var(--gold)]'
                    : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                <span className="block font-medium leading-tight">
                  {businessNames[card.business_id] ?? card.business_id.slice(0, 8)}
                </span>
                <span className="block text-xs opacity-70">{card.visits} vizite</span>
              </button>
            ))}
          </div>
        )}

        {/* Loyalty Card */}
        <div className="relative fade-up delay-100">
          <LoyaltyCard visits={activeCard.visits} name={activeCard.name} visitGoal={visitGoal} bump={cardBump} />
          {rewardDescription && (
            <p className="text-xs text-[var(--muted)] text-center mt-2 px-2">{rewardDescription}</p>
          )}
        </div>

        {/* Reward Banner */}
        {isComplete && (
          <div className="glass-card rounded-2xl p-5 border border-[var(--gold-dim)]/30 reward-glow fade-up delay-200">
            <div className="flex items-center gap-4">
              <div className="text-3xl">🎉</div>
              <div>
                <h3 className="font-display font-semibold text-[var(--gold)] text-lg">🎉 Felicitări!</h3>
                <p className="text-sm text-[var(--text-dim)]">
                  {rewardDescription ?? 'Ai câștigat bonusul! Arată cardul stilistului.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3 fade-up delay-300">
          <Link
            href="/show-qr"
            className="glass-card rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-[var(--gold-dim)]/40 transition-colors active:scale-95 border border-[var(--border)]"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--gold-dim)]/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-[var(--gold-dim)]" fill="currentColor">
                <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM13 13h2v2h-2zM15 15h2v2h-2zM13 17h2v2h-2zM17 13h2v2h-2zM19 15h2v2h-2zM17 17h2v2h-2zM19 19h2v2h-2zM21 13h-2v2h2z"/>
              </svg>
            </div>
            <span className="text-sm font-medium text-[var(--text-dim)]">Arată codul</span>
          </Link>

          <div className="glass-card rounded-2xl p-4 flex flex-col items-center gap-2 border border-[var(--border)]">
            <div className="w-10 h-10 rounded-xl bg-[var(--gold-dim)]/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-[var(--gold-dim)]" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
              </svg>
            </div>
            <span className="text-sm font-medium text-[var(--text-dim)]">
              {visitGoal - activeCard.visits > 0 ? `Mai ai ${visitGoal - activeCard.visits}` : 'Finalizat!'}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="glass-card rounded-2xl p-5 fade-up delay-400">
          <h3 className="text-xs uppercase tracking-widest text-[var(--muted)] mb-4">Statistici</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="font-display text-2xl font-bold text-[var(--gold)]">{activeCard.visits}</p>
              <p className="text-xs text-[var(--muted)] mt-1">Vizite</p>
            </div>
            <div className="text-center border-x border-[var(--border)]">
              <p className="font-display text-2xl font-bold text-[var(--text)]">
                {activeCard.reward_claimed ? '1' : '0'}
              </p>
              <p className="text-xs text-[var(--muted)] mt-1">Bonusuri</p>
            </div>
            <div className="text-center">
              <p className="font-display text-2xl font-bold text-[var(--text-dim)]">
                {Math.max(visitGoal - activeCard.visits, 0)}
              </p>
              <p className="text-xs text-[var(--muted)] mt-1">Rămase</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        {visitHistory.length > 0 && (
          <div className="glass-card rounded-2xl p-5 fade-up delay-500">
            <h3 className="text-xs uppercase tracking-widest text-[var(--muted)] mb-4">Activitate recentă</h3>
            <div className="space-y-1">
              {visitHistory.map(log => {
                const metaMap: Record<number, { icon: string; label: string; color: string }> = {
                  1:  { icon: '✓', label: 'Vizită înregistrată', color: 'text-[var(--gold)]' },
                  2:  { icon: '🎁', label: 'Bonus colectat',       color: 'text-emerald-400' },
                  [-1]: { icon: '−', label: 'Vizită ștearsă',      color: 'text-red-400' },
                  0:  { icon: '↺', label: 'Card resetat',          color: 'text-[var(--muted)]' },
                };
                const meta = metaMap[log.action] ?? { icon: '·', label: 'Activitate', color: 'text-[var(--muted)]' };
                return (
                  <div key={log.id} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
                    <span className={`text-sm font-bold w-5 text-center flex-shrink-0 ${meta.color}`}>{meta.icon}</span>
                    <span className="flex-1 text-sm text-[var(--text-dim)]">{meta.label}</span>
                    <span className="text-xs text-[var(--muted)]">
                      {new Date(log.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <NavBar role="client" />
    </main>
  );
}
