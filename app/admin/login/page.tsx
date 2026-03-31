'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError('Te rugăm introduci numărul de telefon.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), pin: pin || undefined }),
        credentials: 'include',
      });
      if (!res.ok) {
        const { error } = await res.json();
        if (error === 'PIN required') throw new Error('Te rugăm introduci PIN-ul.');
        if (error === 'Invalid PIN') throw new Error('PIN incorect. Încearcă din nou.');
        throw new Error(error);
      }
      const data = await res.json();
      if (!data.isOwner) {
        setError('Acest cont nu are un business asociat. Creează mai întâi un business.');
        return;
      }
      router.push('/admin/owner');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Autentificare eșuată.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[var(--gold-dim)]/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-[var(--gold-dim)]/3 blur-3xl pointer-events-none" />

      <Link
        href="/business-login"
        className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--text)] transition-colors mb-10 w-fit"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
        </svg>
        Înapoi
      </Link>

      <div className="flex-1 flex flex-col justify-center max-w-xs mx-auto w-full">
        {/* Icon */}
        <div className="mb-8 fade-up flex flex-col items-start">
          <div className="w-16 h-16 rounded-2xl bg-[var(--gold-dim)]/15 flex items-center justify-center mb-5">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-[var(--gold)]" fill="currentColor">
              <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
            </svg>
          </div>
          <h1 className="font-display text-3xl font-bold text-[var(--text)]">Acces Administrator</h1>
          <p className="text-[var(--muted)] text-sm mt-1">Gestionează business-ul tău</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 fade-up delay-100">
          <div>
            <label htmlFor="phone" className="block text-xs uppercase tracking-widest text-[var(--muted)] mb-2">
              Număr de telefon
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-field w-full px-4 py-3 rounded-xl text-base"
              placeholder="Introdu numărul tău"
              required
            />
          </div>

          <div>
            <label htmlFor="pin" className="block text-xs uppercase tracking-widest text-[var(--muted)] mb-2">
              PIN <span className="normal-case tracking-normal text-[var(--muted)]">(dacă e setat)</span>
            </label>
            <input
              id="pin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="input-field w-full px-4 py-3 rounded-xl text-base"
              placeholder="••••"
              autoComplete="current-password"
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
            {loading ? 'Se conectează…' : 'Conectează-te'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[var(--border)] fade-up delay-200">
          <p className="text-[var(--muted)] text-sm text-center">
            Nu ai business?{' '}
            <Link href="/admin/register" className="text-[var(--gold-dim)] hover:text-[var(--gold)] transition-colors">
              Creează unul
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
