'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Client } from '@/lib/auth';
import LoyaltyCard from '@/components/LoyaltyCard';
import NavBar from '@/components/NavBar';
import InstallPrompt from '@/components/InstallPrompt';

export default function DashboardPage() {
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          router.replace('/login');
        } else {
          setClient(data.client);
        }
      })
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false));
  }, [router]);

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

  if (!client) return null;

  const VISIT_GOAL = 10; // or from env
  const isComplete = client.visits >= VISIT_GOAL;

  return (
    <main className="min-h-screen flex flex-col pb-24">
      <InstallPrompt />

      {/* Background glow */}
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-[var(--gold-dim)]/4 blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="flex items-center justify-between p-6 pt-8">
        <div className="fade-up">
          <p className="text-xs uppercase tracking-widest text-[var(--muted)]">Good day,</p>
          <h1 className="font-display text-2xl font-semibold text-[var(--text)]">{client.name.split(' ')[0]}</h1>
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
        {/* Loyalty Card */}
        <div className="relative fade-up delay-100">
          <LoyaltyCard visits={client.visits} name={client.name} />
        </div>

        {/* Reward Banner */}
        {isComplete && (
          <div className="glass-card rounded-2xl p-5 border border-[var(--gold-dim)]/30 reward-glow fade-up delay-200">
            <div className="flex items-center gap-4">
              <div className="text-3xl">🎉</div>
              <div>
                <h3 className="font-display font-semibold text-[var(--gold)] text-lg">Reward Unlocked!</h3>
                <p className="text-sm text-[var(--text-dim)]">Show this to your stylist to claim your free haircut</p>
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
            <span className="text-sm font-medium text-[var(--text-dim)]">Show QR</span>
          </Link>

          <div className="glass-card rounded-2xl p-4 flex flex-col items-center gap-2 border border-[var(--border)]">
            <div className="w-10 h-10 rounded-xl bg-[var(--gold-dim)]/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-[var(--gold-dim)]" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
              </svg>
            </div>
            <span className="text-sm font-medium text-[var(--text-dim)]">
              {VISIT_GOAL - client.visits > 0 ? `${VISIT_GOAL - client.visits} to go` : 'Completed!'}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="glass-card rounded-2xl p-5 fade-up delay-400">
          <h3 className="text-xs uppercase tracking-widest text-[var(--muted)] mb-4">Your Stats</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="font-display text-2xl font-bold text-[var(--gold)]">{client.visits}</p>
              <p className="text-xs text-[var(--muted)] mt-1">Visits</p>
            </div>
            <div className="text-center border-x border-[var(--border)]">
              <p className="font-display text-2xl font-bold text-[var(--text)]">
                {client.reward_claimed ? '1' : '0'}
              </p>
              <p className="text-xs text-[var(--muted)] mt-1">Rewards</p>
            </div>
            <div className="text-center">
              <p className="font-display text-2xl font-bold text-[var(--text-dim)]">
                {Math.max(VISIT_GOAL - client.visits, 0)}
              </p>
              <p className="text-xs text-[var(--muted)] mt-1">Remaining</p>
            </div>
          </div>
        </div>
      </div>

      <NavBar role="client" />
    </main>
  );
}
