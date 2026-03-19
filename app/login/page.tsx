'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError('Please enter your phone number.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error);
      }
      const { token } = await res.json();
      document.cookie = `token=${token}; path=/; max-age=604800`; // 7 days
      router.push('/dashboard');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col p-6 relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-[var(--gold-dim)]/4 blur-3xl pointer-events-none" />

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
        <div className="mb-8 fade-up">
          <h1 className="font-display text-3xl font-bold text-[var(--text)]">Welcome Back</h1>
          <p className="text-[var(--muted)] text-sm mt-1">Sign in with your phone number</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 fade-up delay-100">
          <div>
            <label htmlFor="phone" className="block text-xs uppercase tracking-widest text-[var(--muted)] mb-2">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-field w-full px-4 py-3 rounded-xl text-base"
              placeholder="Enter your phone number"
              required
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
            className="btn-gold w-full py-4 rounded-2xl text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="mt-8 pt-6 border-t border-[var(--border)] text-[var(--muted)] text-center text-sm fade-up delay-200">
          New here?{' '}
          <Link href="/register" className="text-[var(--gold-dim)] hover:text-[var(--gold)] transition-colors">
            Create account
          </Link>
        </p>
      </div>
    </main>
  );
}
