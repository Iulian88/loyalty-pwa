'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Client } from '@/lib/supabase';

interface ClientCardProps {
  client: Client;
  onUpdate: (updated: Client) => void;
  operatorId: string;
  visitGoal: number;
}

export default function ClientCard({ client, onUpdate, operatorId, visitGoal }: Readonly<ClientCardProps>) {
  const [loading, setLoading] = useState<'add' | 'remove' | 'reset' | 'claim' | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isComplete = client.visits >= visitGoal;
  const progress = Math.min((client.visits / visitGoal) * 100, 100);

  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(''), 3000);
  };

  const postAction = async (action: number) => {
    const safeOperatorId = operatorId || 'operator';
    const res = await fetch('/api/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: client.id, operatorId: safeOperatorId, action }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Request failed');
    return data.client as Client;
  };

  const handleAdd = async () => {
    if (loading) return;
    setLoading('add');
    setError('');
    try {
      const updated = await postAction(1);
      onUpdate(updated);
      showToast(`✓ Vizită adăugată — ${updated.visits}/${visitGoal}`);
      if (updated.visits >= visitGoal) setShowRewardModal(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(null);
    }
  };

  const handleRemove = async () => {
    if (loading) return;
    setLoading('remove');
    setError('');
    try {
      const updated = await postAction(-1);
      onUpdate(updated);
      showToast(`Vizită ștearsă — ${updated.visits}/${visitGoal}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(null);
    }
  };

  const handleReset = async () => {
    if (loading) return;
    setLoading('reset');
    setError('');
    try {
      await new Promise<void>(resolve => setTimeout(resolve, 350));
      const updated = await postAction(0);
      onUpdate(updated);
      showToast('Card resetat la 0');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(null);
    }
  };

  const confirmReset = () => {
    setShowResetModal(false);
    handleReset();
  };

  const handleClaim = async () => {
    if (loading) return;
    setLoading('claim');
    setError('');
    try {
      showToast('✔️ Bonus acordat');
      await new Promise<void>(resolve => setTimeout(resolve, 700));
      const updated = await postAction(2);
      onUpdate(updated);
      setShowRewardModal(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(null);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <>
      {/* Toast — rendered via portal so fixed positioning is always relative to viewport */}
      {toast && typeof document !== 'undefined' && createPortal(
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">
          <div className="fade-up bg-[#1a1a1a] border border-[var(--gold-dim)]/40 rounded-2xl px-5 py-3 shadow-2xl">
            <p className="text-sm font-semibold text-[var(--gold)] whitespace-nowrap">{toast}</p>
          </div>
        </div>,
        document.body
      )}

      <div className={`glass-card rounded-2xl p-6 w-full ${isComplete ? 'reward-glow' : ''}`}>
        {/* Client info */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--gold-dim)] to-[var(--gold-light)] flex items-center justify-center text-[var(--dark)] font-display font-bold text-lg flex-shrink-0">
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-xl font-semibold text-[var(--text)] truncate">{client.name}</h3>
            <p className="text-sm text-[var(--muted)]">{client.phone}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-3xl font-display font-bold text-gold-shimmer">{client.visits}</p>
            <p className="text-xs text-[var(--muted)]">/ {visitGoal}</p>
          </div>
        </div>

        {/* Mini stamp grid */}
        <div className="grid grid-cols-10 gap-1.5 mb-4">
          {Array.from({ length: visitGoal }, (_, i) => i + 1).map((n) => (
            <div
              key={n}
              className={`aspect-square rounded-md flex items-center justify-center transition-all duration-300
                ${n <= client.visits
                  ? 'bg-gradient-to-br from-[var(--gold-dim)] to-[var(--gold-light)] scale-105'
                  : 'bg-[#1e1e1e] border border-[var(--border)]'
                }`}
            >
              {n <= client.visits && (
                <svg viewBox="0 0 24 24" className="w-3 h-3 text-[var(--dark)]" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              )}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-[#1e1e1e] rounded-full overflow-hidden mb-2">
          <div className="progress-bar h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        {/* Context helper */}
        <p className={`text-xs text-center mb-3 ${isComplete ? 'text-[var(--gold-light)]' : 'text-[var(--muted)]'}`}>
          {isComplete ? '🎁 Bonus disponibil' : `Mai ai ${visitGoal - client.visits} vizite până la bonus`}
        </p>

        {/* State: Reward available — operator must confirm claim */}
        {isComplete && (
          <div className="bg-[var(--gold-dim)]/10 border border-[var(--gold-dim)]/30 rounded-xl p-4 mb-4">
            <p className="text-sm font-semibold text-[var(--gold)] text-center mb-3">🎉 Bonus disponibil — confirmă cu clientul</p>
            <button
              onClick={handleClaim}
              disabled={loading !== null}
              className="btn-gold w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'claim' ? (
                <div className="w-4 h-4 border-2 border-[var(--dark)] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                  Confirmă bonus
                </>
              )}
            </button>
          </div>
        )}

        {/* State: Collecting again after previous reward */}
        {!isComplete && client.claimed_at && (
          <div className="flex items-center gap-2 mb-4 px-1">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[var(--muted)] flex-shrink-0" fill="currentColor">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
            </svg>
            <p className="text-xs text-[var(--muted)]">Last reward claimed: {formatDate(client.claimed_at)}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-900/40 rounded-xl p-3 mb-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleRemove}
            disabled={loading !== null || client.visits <= 0}
            className="btn-ghost flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {loading === 'remove' ? (
              <div className="w-4 h-4 border-2 border-[var(--muted)] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M19 13H5v-2h14v2z"/></svg>
                Elimină
              </>
            )}
          </button>

          <button
            onClick={handleAdd}
            disabled={loading !== null || client.visits >= visitGoal}
            className="btn-gold flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {loading === 'add' ? (
              <div className="w-4 h-4 border-2 border-[var(--dark)] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                Adaugă vizită
              </>
            )}
          </button>
        </div>

        {/* Reset — operator correction tool, shown only when there are visits */}
        {client.visits > 0 && !isComplete && (
          <button
            onClick={() => setShowResetModal(true)}
            disabled={loading !== null}
            className="w-full mt-3 py-2.5 rounded-xl text-xs text-[var(--muted)] hover:text-[var(--text-dim)] border border-[var(--border)] hover:border-[var(--border)]/60 transition-colors flex items-center justify-center gap-2 disabled:opacity-30"
          >
            {loading === 'reset' ? (
              <div className="w-3.5 h-3.5 border-2 border-[var(--muted)] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
                Resetează
              </>
            )}
          </button>
        )}
      </div>

      {/* Reset confirmation modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card rounded-3xl p-8 max-w-sm w-full text-center fade-up">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="font-display text-xl font-bold text-[var(--text)] mb-4">Resetezi vizitele?</h2>
            <div className="text-sm text-[var(--text-dim)] mb-2 space-y-1">
              <p className="font-semibold text-[var(--text)]">{client.name}</p>
              <p>{client.visits} {client.visits === 1 ? 'vizită va fi ștearsă' : 'vizite vor fi șterse'}</p>
            </div>
            <p className="text-xs text-red-400 mb-6">Această acțiune nu poate fi anulată</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={confirmReset}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-red-900/30 border border-red-900/50 text-red-400 hover:bg-red-900/50 transition-colors"
              >
                Confirmă resetarea
              </button>
              <button
                onClick={() => setShowResetModal(false)}
                className="btn-ghost py-3 rounded-xl text-sm"
              >
                Anulează
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reward confirmation modal */}
      {showRewardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card reward-glow rounded-3xl p-8 max-w-sm w-full text-center fade-up">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="font-display text-2xl font-bold text-[var(--gold)] mb-2">Bonus disponibil!</h2>
            <p className="text-[var(--text-dim)] mb-6">
              {client.name} a ajuns la {visitGoal} vizite și a câștigat o{' '}
              <strong className="text-[var(--text)]">tunsoare gratuită</strong>!
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleClaim}
                disabled={loading !== null}
                className="btn-gold py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading === 'claim' ? (
                  <div className="w-4 h-4 border-2 border-[var(--dark)] border-t-transparent rounded-full animate-spin" />
                ) : 'Confirmă și resetează'}
              </button>
              <button
                onClick={() => setShowRewardModal(false)}
                className="btn-ghost py-3 rounded-xl text-sm"
              >
                Mai târziu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
