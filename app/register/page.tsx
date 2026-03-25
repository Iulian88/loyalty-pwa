'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('Completează toate câmpurile.');
      return;
    }
    if (phone.replace(/\D/g, '').length < 9) {
      setError('Introdu un număr de telefon valid.');
      return;
    }
    if (pin && !/^\d{4,}$/.test(pin)) {
      setError('PIN-ul trebuie să aibă minim 4 cifre.');
      return;
    }
    if (pin !== confirmPin) {
      setError('PIN-urile nu se potrivesc.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), pin: pin || undefined }),
        credentials: 'include',
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error);
      }
      router.push('/dashboard');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Înregistrare eșuată. Încearcă din nou.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[var(--gold-dim)]/5 blur-3xl pointer-events-none" />

      <Link
        href="/"
        className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--text)] transition-colors mb-10 w-fit"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
        </svg>
        Înapoi
      </Link>

      <div className="flex-1 flex flex-col justify-center max-w-xs mx-auto w-full">
        <div className="mb-8 fade-up">
          <h1 className="font-display text-3xl font-bold text-[var(--text)]">Intră în programul de fidelizare</h1>
          <p className="text-[var(--muted)] text-sm mt-1">Creează contul tău gratuit</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 fade-up delay-100">
          <div>
            <label htmlFor="name" className="block text-xs uppercase tracking-widest text-[var(--muted)] mb-2">
              Nume complet
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field w-full px-4 py-3 rounded-xl text-base"
              placeholder="Introdu numele tău"
              required
            />
          </div>

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
              PIN <span className="normal-case tracking-normal text-[var(--muted)]">(opțional, 4 cifre)</span>
            </label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="input-field w-full px-4 py-3 rounded-xl text-base"
              placeholder="••••"
              maxLength={6}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label htmlFor="confirmPin" className="block text-xs uppercase tracking-widest text-[var(--muted)] mb-2">
              Confirmă PIN
            </label>
            <input
              id="confirmPin"
              type="password"
              inputMode="numeric"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="input-field w-full px-4 py-3 rounded-xl text-base"
              placeholder="••••"
              maxLength={6}
              autoComplete="new-password"
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
            {loading ? 'Se creează contul…' : 'Creează cont'}
          </button>
        </form>

        <p className="mt-8 pt-6 border-t border-[var(--border)] text-[var(--muted)] text-center text-sm fade-up delay-200">
          Ai deja cont?{' '}
          <Link href="/login" className="text-[var(--gold-dim)] hover:text-[var(--gold)] transition-colors">
            Conectează-te
          </Link>
        </p>
      </div>
    </main>
  );
}
