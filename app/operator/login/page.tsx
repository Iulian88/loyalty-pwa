'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function OperatorLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/operator/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Invalid password.');
      }
      router.push('/operator/dashboard');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col p-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-0 left-0 w-72 h-72 rounded-full bg-[var(--gold-dim)]/4 blur-3xl pointer-events-none" />

      <Link
        href="/"
        className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--text)] transition-colors mb-10 w-fit"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
        </svg>
        Back
      </Link>

      <div className="flex-1 flex flex-col justify-center max-w-xs mx-auto w-full">
        {/* Header */}
        <div className="mb-8 fade-up">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--gold-dim)] to-[var(--gold-light)] flex items-center justify-center mb-5">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-[var(--dark)]" fill="currentColor">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
            </svg>
          </div>
          <p className="text-xs uppercase tracking-widest text-[var(--gold-dim)] mb-2">Operator</p>
          <h1 className="font-display text-3xl font-bold text-[var(--text)]">Dashboard Access</h1>
          <p className="text-[var(--muted)] text-sm mt-1">Salon staff only</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 fade-up delay-100">
          <div>
            <label className="block text-xs uppercase tracking-widest text-[var(--muted)] mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-field w-full px-4 py-3 rounded-xl text-base"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-900/40 rounded-xl p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-gold w-full py-4 rounded-2xl text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-[var(--dark)] border-t-transparent rounded-full animate-spin" />
                Signing in…
              </>
            ) : (
              'Access Dashboard'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[var(--border)] fade-up delay-200">
          <p className="text-xs text-[var(--muted)] text-center">
            Client?{' '}
            <Link href="/login" className="text-[var(--gold-dim)] hover:text-[var(--gold)] transition-colors">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
