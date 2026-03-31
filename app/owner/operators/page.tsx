'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import type { Operator } from '@/types';

function OperatorsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessId = searchParams.get('businessId') ?? '';

  const [operators, setOperators] = useState<Operator[]>([]);
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [formPhone, setFormPhone] = useState('');
  const [formName, setFormName] = useState('');
  const [formPin, setFormPin] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    if (!businessId) { router.replace('/owner/dashboard'); return; }

    fetch('/api/auth/session', { credentials: 'include', cache: 'no-store' })
      .then(res => {
        if (!res.ok) { router.replace('/login'); return null; }
        return res.json();
      })
      .then(data => {
        if (!data) return;
        setAuthChecking(false);
        loadAll();
      })
      .catch(() => router.replace('/login'));
  }, [businessId, router]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAll = async () => {
    setLoading(true);
    const [opsRes, bizRes] = await Promise.all([
      fetch(`/api/owner/operators?businessId=${businessId}`, { credentials: 'include', cache: 'no-store' }),
      fetch('/api/owner/businesses', { credentials: 'include', cache: 'no-store' }),
    ]);

    if (opsRes.ok) {
      const d = await opsRes.json();
      setOperators(d.operators ?? []);
    } else if (opsRes.status === 403) {
      router.replace('/owner/dashboard');
      return;
    }

    if (bizRes.ok) {
      const d = await bizRes.json();
      const biz = (d.businesses ?? []).find((b: { id: string; name: string }) => b.id === businessId);
      if (biz) setBusinessName(biz.name);
    }

    setLoading(false);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Ștergi acest operator?')) return;
    setDeleting(id);
    const res = await fetch(`/api/owner/operators/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      setOperators(prev => prev.filter(o => o.id !== id));
      showToast('Operator șters.');
    } else {
      const d = await res.json();
      showToast(d.error ?? 'Eroare la ștergere.');
    }
    setDeleting(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');

    if (!formPhone.trim() || !formName.trim() || formPin.length !== 4) {
      setCreateError('Completează toate câmpurile. PIN-ul trebuie să aibă exact 4 cifre.');
      setCreating(false);
      return;
    }

    const res = await fetch('/api/owner/operators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        businessId,
        phone: formPhone.trim(),
        name: formName.trim(),
        pin: formPin,
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
    setFormPhone('');
    setFormName('');
    setFormPin('');
    showToast(`Operator "${data.operator.name}" adăugat!`);
    setOperators(prev => [...prev, data.operator as Operator]);
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
      <header className="p-6 pt-8 fade-up">
        <Link href="/owner/dashboard" className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--text)] transition-colors mb-4 w-fit text-sm">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          Afacerile mele
        </Link>
        <p className="text-xs uppercase tracking-widest text-[var(--gold-dim)] mb-1">Owner · {businessName}</p>
        <h1 className="font-display text-3xl font-bold text-[var(--text)]">Operatori</h1>
        <p className="text-sm text-[var(--muted)] mt-1">{operators.length} {operators.length === 1 ? 'operator' : 'operatori'}</p>
      </header>

      <div className="px-6 space-y-4">
        {/* Add operator button */}
        <button
          onClick={() => { setShowCreate(true); setCreateError(''); }}
          className="w-full py-3 rounded-xl border border-dashed border-[var(--gold-dim)]/40 text-[var(--gold-dim)] text-sm font-medium hover:bg-[var(--gold-dim)]/5 transition-colors flex items-center justify-center gap-2"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          Adaugă operator
        </button>

        {/* Operator list */}
        {loading ? (
          <p className="text-center text-[var(--muted)] text-sm py-8">Se încarcă...</p>
        ) : operators.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[var(--muted)] text-sm">Niciun operator adăugat încă.</p>
          </div>
        ) : (
          operators.map(op => (
            <div key={op.id} className="glass rounded-2xl p-5 fade-up flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-[var(--text)]">{op.name}</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">{op.phone}</p>
              </div>
              <button
                onClick={() => handleDelete(op.id)}
                disabled={deleting === op.id}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-red-900/20 text-red-400 text-xs font-medium hover:bg-red-900/30 transition-colors disabled:opacity-40"
              >
                {deleting === op.id ? '...' : 'Șterge'}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Create operator modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-4">
          <div className="glass rounded-2xl w-full max-w-sm p-6 fade-up">
            <h2 className="font-display text-xl font-bold text-[var(--text)] mb-5">Operator nou</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-[var(--muted)] mb-2">Telefon</label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={e => setFormPhone(e.target.value)}
                  placeholder="+40700000000"
                  className="input-field w-full px-4 py-3 rounded-xl text-base"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-[var(--muted)] mb-2">Nume</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="ex. Maria Pop"
                  className="input-field w-full px-4 py-3 rounded-xl text-base"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-[var(--muted)] mb-2">PIN (exact 4 cifre)</label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={formPin}
                  onChange={e => setFormPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="input-field w-full px-4 py-3 rounded-xl text-base tracking-widest"
                  maxLength={4}
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
                  {creating ? 'Se adaugă...' : 'Adaugă'}
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

export default function OwnerOperatorsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--muted)] text-sm">Se încarcă...</p>
      </main>
    }>
      <OperatorsContent />
    </Suspense>
  );
}
