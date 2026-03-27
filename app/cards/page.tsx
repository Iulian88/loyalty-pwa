'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Client, Business } from '@/types';
import NavBar from '@/components/NavBar';

export default function CardsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<Client[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [bizMap, setBizMap] = useState<Record<string, Business>>({});
  const [showChooser, setShowChooser] = useState(false);
  const [addingCard, setAddingCard] = useState(false);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    let mounted = true;
    fetch('/api/auth/session', { credentials: 'include', cache: 'no-store' })
      .then(res => {
        if (!res.ok) { router.replace('/login'); return null; }
        return res.json();
      })
      .then(async data => {
        if (!mounted || !data) return;
        const [cardsRes, bizRes] = await Promise.all([
          fetch('/api/my-cards', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/my-business-options', { credentials: 'include', cache: 'no-store' }),
        ]);
        if (!mounted) return;
        if (cardsRes.ok) {
          const { cards: c } = await cardsRes.json();
          setCards(c ?? []);
        }
        if (bizRes.ok) {
          const { businesses: b } = await bizRes.json();
          setBusinesses(b ?? []);
          const map: Record<string, Business> = {};
          for (const biz of (b ?? [])) map[biz.id] = biz;
          setBizMap(map);
        }
      })
      .catch(() => { if (mounted) router.replace('/login'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [router]);

  const handleAddCard = async (businessId: string) => {
    setAddingCard(true);
    setAddError('');
    try {
      const res = await fetch('/api/add-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ businessId }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error);
      }
      const cardsRes = await fetch('/api/my-cards', { credentials: 'include', cache: 'no-store' });
      if (cardsRes.ok) {
        const { cards: newCards } = await cardsRes.json();
        const added = newCards?.find((c: Client) => c.business_id === businessId) ?? newCards?.[newCards.length - 1];
        if (added) {
          router.push(`/dashboard?cardId=${added.id}`);
        }
      }
    } catch (e) {
      setAddError((e as Error).message);
    } finally {
      setAddingCard(false);
    }
  };

  const availableBusinesses = businesses.filter(b => !cards.some(c => c.business_id === b.id));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--gold-dim)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col pb-24">
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[var(--gold-dim)]/5 blur-3xl pointer-events-none" />

      <header className="p-6 pt-8 fade-up">
        <p className="text-xs uppercase tracking-widest text-[var(--muted)]">Cardurile mele</p>
        <h1 className="font-display text-2xl font-semibold text-[var(--text)] mt-0.5">Fidelitate</h1>
      </header>

      <div className="flex-1 px-6 space-y-3">
        {cards.length === 0 ? (
          <div className="glass-card rounded-2xl p-6 text-center border border-dashed border-[var(--border)] fade-up">
            <p className="text-[var(--muted)] text-sm">Nu ai carduri încă.</p>
            <p className="text-[var(--muted)] text-xs mt-1">Adaugă un salon pentru a începe.</p>
          </div>
        ) : (
          cards.map((card, i) => {
            const biz = bizMap[card.business_id];
            const visitGoal = biz?.visit_goal ?? 10;
            const isComplete = card.visits >= visitGoal;
            const pct = visitGoal > 0 ? Math.min((card.visits / visitGoal) * 100, 100) : 0;
            return (
              <button
                key={card.id}
                onClick={() => router.push(`/dashboard?cardId=${card.id}`)}
                className={`fade-up w-full glass-card rounded-2xl p-4 flex items-center gap-4 border transition-colors active:scale-95 text-left ${
                  isComplete ? 'border-[var(--gold-dim)]/40 reward-glow' : 'border-[var(--border)]'
                }`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--gold-dim)]/30 to-[var(--gold-light)]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[var(--gold)] font-display font-bold text-lg">
                    {biz?.name?.charAt(0)?.toUpperCase() ?? '?'}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-[var(--text)] truncate">{biz?.name ?? 'Salon'}</p>
                    <span className={`text-xs font-bold ml-2 flex-shrink-0 ${isComplete ? 'text-[var(--gold)]' : 'text-[var(--text-dim)]'}`}>
                      {card.visits}/{visitGoal}
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#1e1e1e] rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: isComplete ? '#c9a84c' : '#8a6f2e' }}
                    />
                  </div>
                  {biz?.reward_description ? (
                    <p className="text-xs text-[var(--muted)] truncate">{biz.reward_description}</p>
                  ) : isComplete ? (
                    <p className="text-xs text-[var(--gold)]">Bonus disponibil!</p>
                  ) : (
                    <p className="text-xs text-[var(--muted)]">{visitGoal - card.visits} rămase</p>
                  )}
                </div>

                <svg viewBox="0 0 24 24" className="w-4 h-4 text-[var(--muted)] flex-shrink-0" fill="currentColor">
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                </svg>
              </button>
            );
          })
        )}

        {/* Add card button / inline chooser */}
        {!showChooser ? (
          <button
            onClick={() => setShowChooser(true)}
            disabled={availableBusinesses.length === 0}
            className="fade-up w-full glass-card rounded-2xl p-4 flex items-center justify-center gap-2 border border-dashed border-[var(--gold-dim)]/50 text-[var(--gold-dim)] hover:border-[var(--gold-dim)] hover:text-[var(--gold)] transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
            </svg>
            <span className="text-sm font-medium">
              {availableBusinesses.length === 0 ? 'Ai toate cardurile disponibile' : 'Adaugă card'}
            </span>
          </button>
        ) : (
          <div className="glass-card rounded-2xl p-4 border border-[var(--gold-dim)]/30 space-y-3 fade-up">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--text)]">Alege un salon</p>
              <button
                onClick={() => { setShowChooser(false); setAddError(''); }}
                className="text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            {addError && <p className="text-xs text-red-400">{addError}</p>}

            {availableBusinesses.map(biz => (
              <button
                key={biz.id}
                disabled={addingCard}
                onClick={() => handleAddCard(biz.id)}
                className="w-full glass-card rounded-xl p-3 flex items-center justify-between border border-[var(--border)] hover:border-[var(--gold-dim)]/40 transition-colors active:scale-95 disabled:opacity-50"
              >
                <div className="text-left">
                  <p className="font-medium text-sm text-[var(--text)]">{biz.name}</p>
                  {biz.reward_description && (
                    <p className="text-xs text-[var(--muted)] mt-0.5">{biz.reward_description}</p>
                  )}
                </div>
                {addingCard ? (
                  <div className="w-4 h-4 border-2 border-[var(--gold-dim)] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-[var(--gold-dim)]" fill="currentColor">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <NavBar role="client" />
    </main>
  );
}
