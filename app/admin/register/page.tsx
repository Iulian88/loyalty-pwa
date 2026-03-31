'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminRegisterPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [visitGoal, setVisitGoal] = useState('10');
  const [reward, setReward] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !name.trim() || !businessName.trim()) {
      setError('Telefon, nume și nume business sunt obligatorii.');
      return;
    }
    const goalNum = parseInt(visitGoal, 10);
    if (isNaN(goalNum) || goalNum < 1) {
      setError('Numărul de vizite trebuie să fie minim 1.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          name: name.trim(),
          businessName: businessName.trim(),
          visitGoal: goalNum,
          reward: reward.trim() || undefined,
        }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Eroare la înregistrare.');
      router.push('/admin/owner');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Înregistrare eșuată.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[var(--gold-dim)]/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-[var(--gold-dim)]/3 blur-3xl pointer-events-none" />

      <Link
        href="/admin/login"
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
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h1 className="font-display text-3xl font-bold text-[var(--text)]">Creează business</h1>
          <p className="text-[var(--muted)] text-sm mt-1">Configurează-ți afacerea în câteva secunde</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 fade-up delay-100">
          <div>
            <label htmlFor="phone" className="block text-xs uppercase tracking-widest text-[var(--muted)] mb-2">
              Telefon
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-field w-full px-4 py-3 rounded-xl text-base"
              placeholder="ex. 0740 000 000"
              required
            />
          </div>

          <div>
            <label htmlFor="name" className="block text-xs uppercase tracking-widest text-[var(--muted)] mb-2">
              Numele tău
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field w-full px-4 py-3 rounded-xl text-base"
              placeholder="ex. Ana Ionescu"
              required
            />
          </div>

          <div className="pt-1 border-t border-[var(--border)]">
            <p className="text-xs uppercase tracking-widest text-[var(--gold-dim)] mb-4 mt-3">Business</p>

            <div className="flex flex-col gap-5">
              <div>
                <label htmlFor="businessName" className="block text-xs uppercase tracking-widest text-[var(--muted)] mb-2">
                  Nume business
                </label>
                <input
                  id="businessName"
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="input-field w-full px-4 py-3 rounded-xl text-base"
                  placeholder="ex. Salon Lumina"
                  required
                />
              </div>

              <div>
                <label htmlFor="visitGoal" className="block text-xs uppercase tracking-widest text-[var(--muted)] mb-2">
                  Vizite necesare pentru recompensă
                </label>
                <input
                  id="visitGoal"
                  type="number"
                  value={visitGoal}
                  onChange={(e) => setVisitGoal(e.target.value)}
                  min={1}
                  max={100}
                  className="input-field w-full px-4 py-3 rounded-xl text-base"
                />
              </div>

              <div>
                <label htmlFor="reward" className="block text-xs uppercase tracking-widest text-[var(--muted)] mb-2">
                  Recompensă <span className="normal-case tracking-normal">(opțional)</span>
                </label>
                <input
                  id="reward"
                  type="text"
                  value={reward}
                  onChange={(e) => setReward(e.target.value)}
                  className="input-field w-full px-4 py-3 rounded-xl text-base"
                  placeholder="ex. Tunsoare gratuită"
                />
              </div>
            </div>
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
            {loading ? 'Se creează…' : 'Creează business'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[var(--border)] fade-up delay-200">
          <p className="text-[var(--muted)] text-sm text-center">
            Ai deja un business?{' '}
            <Link href="/admin/login" className="text-[var(--gold-dim)] hover:text-[var(--gold)] transition-colors">
              Conectează-te
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
