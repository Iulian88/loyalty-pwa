'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Business } from '@/types';

export default function AdminOwnerPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [authChecking, setAuthChecking] = useState(true);

  // Create business modal
  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState('');
  const [formGoal, setFormGoal] = useState('10');
  const [formReward, setFormReward] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetch('/api/auth/session', { credentials: 'include', cache: 'no-store' })
      .then(res => {
        if (!res.ok) { router.replace('/business-login'); return null; }
        return res.json();
      })
      .then(data => {
        if (!data) return;
        // Re-verify owner role: if they own no businesses the page shows empty state,
        // and any API call to /api/owner/businesses returns 200 with an empty array.
        // A non-owner with no businesses is indistinguishable at session level,
        // so we proceed to loadBusinesses which will show the correct empty state.
        setAuthChecking(false);
        loadBusinesses();
      })
      .catch(() => router.replace('/business-login'));
  }, [router]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadBusinesses = async () => {
    setLoading(true);
    setLoadError('');
    const res = await fetch('/api/owner/businesses', { credentials: 'include', cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setBusinesses(data.businesses ?? []);
    } else if (res.status === 401) {
      router.replace('/business-login');
      return;
    } else {
      setLoadError('Eroare la încărcarea business-urilor.');
    }
    setLoading(false);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/business-login');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');

    const goalNum = parseInt(formGoal, 10);
    if (!formName.trim() || isNaN(goalNum) || goalNum < 1) {
      setCreateError('Completează toate câmpurile corect.');
      setCreating(false);
      return;
    }

    const res = await fetch('/api/business/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: formName.trim(),
        visit_goal: goalNum,
        reward_description: formReward.trim() || undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setCreateError(data.error ?? 'Eroare la creare.');
      setCreating(false);
      return;
    }

    setCreating(false);
    setShowCreate(false);
    setFormName('');
    setFormGoal('10');
    setFormReward('');
    showToast(`Business "${data.business.name}" creat!`);
    loadBusinesses();
  };

  if (authChecking) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--muted)] text-sm">Se verifică sesiunea...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col pb-24">
      <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-[var(--gold-dim)]/4 blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="p-6 pt-8 fade-up flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--gold-dim)] mb-1">Administrator</p>
          <h1 className="font-display text-3xl font-bold text-[var(--text)]">Afacerile mele</h1>
          <p className="text-sm text-[var(--muted)] mt-1">{businesses.length} {businesses.length === 1 ? 'business' : 'business-uri'}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-10 h-10 glass-card rounded-xl flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] transition-colors mt-1"
          title="Deconectează-te"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
          </svg>
        </button>
      </header>

      <div className="px-6 space-y-4">
        {/* Create button */}
        <button
          onClick={() => { setShowCreate(true); setCreateError(''); }}
          className="w-full py-3 rounded-xl border border-dashed border-[var(--gold-dim)]/40 text-[var(--gold-dim)] text-sm font-medium hover:bg-[var(--gold-dim)]/5 transition-colors flex items-center justify-center gap-2"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          Creează business
        </button>

        {/* Business list */}
        {loading ? (
          <p className="text-center text-[var(--muted)] text-sm py-8">Se încarcă...</p>
        ) : loadError ? (
          <p className="text-center text-red-400 text-sm py-8">{loadError}</p>
        ) : businesses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[var(--muted)] text-sm">Nu ai niciun business creat încă.</p>
            <p className="text-[var(--muted)] text-xs mt-2">Folosește butonul de mai sus pentru a crea primul business.</p>
          </div>
        ) : (
          businesses.map(b => (
            <div key={b.id} className="glass rounded-2xl p-5 fade-up">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-[var(--text)] text-lg leading-tight">{b.name}</h2>
                  <p className="text-xs text-[var(--muted)] mt-1">
                    Obiectiv: <span className="text-[var(--gold-dim)]">{b.visit_goal} vizite</span>
                    {b.reward_description ? ` · ${b.reward_description}` : ''}
                  </p>
                </div>
                <Link
                  href={`/owner/operators?businessId=${b.id}`}
                  className="shrink-0 px-4 py-2 rounded-xl bg-[var(--gold-dim)]/10 text-[var(--gold-dim)] text-xs font-medium hover:bg-[var(--gold-dim)]/20 transition-colors"
                >
                  Operatori
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create business modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-4">
          <div className="glass rounded-2xl w-full max-w-sm p-6 fade-up">
            <h2 className="font-display text-xl font-bold text-[var(--text)] mb-5">Creează business nou</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-[var(--muted)] mb-2">Nume business</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="ex. Salon Lumina"
                  className="input-field w-full px-4 py-3 rounded-xl text-base"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-[var(--muted)] mb-2">Obiectiv vizite</label>
                <input
                  type="number"
                  value={formGoal}
                  onChange={e => setFormGoal(e.target.value)}
                  min={1}
                  max={100}
                  className="input-field w-full px-4 py-3 rounded-xl text-base"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-[var(--muted)] mb-2">Recompensă (opțional)</label>
                <input
                  type="text"
                  value={formReward}
                  onChange={e => setFormReward(e.target.value)}
                  placeholder="ex. Tunsoare gratuită"
                  className="input-field w-full px-4 py-3 rounded-xl text-base"
                />
              </div>

              {createError && (
                <p className="text-red-400 text-sm">{createError}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-3 rounded-xl border border-[var(--muted)]/20 text-[var(--muted)] text-sm"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[var(--gold-dim)] to-[var(--gold-light)] text-[var(--dark)] text-sm font-semibold disabled:opacity-50"
                >
                  {creating ? 'Se creează...' : 'Creează'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-[var(--gold-dim)] text-[var(--dark)] px-5 py-2 rounded-full text-sm font-medium shadow-lg z-50">
          {toast}
        </div>
      )}
    </main>
  );
}
