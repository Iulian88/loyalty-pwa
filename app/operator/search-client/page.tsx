'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Client } from '@/lib/supabase';
import ClientCard from '@/components/ClientCard';
import NavBar from '@/components/NavBar';

function SearchClientContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState(searchParams.get('phone') || '');
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [operatorId, setOperatorId] = useState<string>('');

  useEffect(() => {
    fetch('/api/operator/session', { credentials: 'include', cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          router.replace('/operator/login');
        } else {
          setOperatorId(data.operatorId);
          // Auto-search if phone param present
          if (searchParams.get('phone')) {
            handleSearch(searchParams.get('phone')!);
          }
        }
      })
      .catch(() => router.replace('/operator/login'));
  }, [router, searchParams]);

  const handleSearch = async (searchPhone?: string) => {
    const q = (searchPhone || phone).trim();
    if (!q) return;

    setLoading(true);
    setSearched(true);
    setError('');
    setClient(null);

    try {
      const salonId = '00000000-0000-0000-0000-000000000001';
      const response = await fetch(`/api/operator?phone=${encodeURIComponent(q)}&salon_id=${encodeURIComponent(salonId)}`);

      if (response.status === 404) {
        setClient(null);
        setError('No client found with this phone number.');
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Search failed.');
      }

      const result = await response.json();
      setClient(result);
      if (!result) setError('No client found with this phone number.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Search failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  return (
    <main className="min-h-screen flex flex-col pb-24">
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[var(--gold-dim)]/4 blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="p-6 pt-8 fade-up">
        <p className="text-xs uppercase tracking-widest text-[var(--muted)] mb-1">Operator</p>
        <h1 className="font-display text-3xl font-bold text-[var(--text)]">Find Client</h1>
      </header>

      <div className="px-6 space-y-5">
        {/* Search form */}
        <form onSubmit={handleSubmit} className="fade-up delay-100">
          <div className="flex gap-3">
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="0745 123 456"
              className="input-field flex-1 px-4 py-3 rounded-xl text-base"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className="btn-gold px-5 py-3 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[var(--dark)] border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
              )}
            </button>
          </div>
        </form>

        {/* Results */}
        {searched && !loading && (
          <div className="fade-up">
            {client ? (
              <ClientCard
                client={client}
                onUpdate={updated => setClient(updated)}
                operatorId={operatorId}
              />
            ) : (
              <div className="glass-card rounded-2xl p-8 text-center">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-[var(--text-dim)] font-medium">{error || 'No client found.'}</p>
                <p className="text-sm text-[var(--muted)] mt-1">Check the phone number and try again</p>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!searched && (
          <div className="text-center py-10 fade-up delay-200">
            <div className="w-16 h-16 rounded-3xl bg-[var(--gold-dim)]/10 flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-[var(--gold-dim)]" fill="currentColor">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
            </div>
            <p className="text-[var(--muted)] text-sm">Enter a phone number to find a client</p>
          </div>
        )}
      </div>

      <NavBar role="operator" />
    </main>
  );
}

export default function SearchClientPage() {
  return (
    <Suspense>
      <SearchClientContent />
    </Suspense>
  );
}
