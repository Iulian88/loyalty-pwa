'use client';

import { useState } from 'react';
import { Client } from '@/lib/supabase';
import { addVisit, removeVisit, resetVisits } from '@/lib/visits';

interface ClientCardProps {
  client: Client;
  onUpdate: (updated: Client) => void;
  operatorId: string;
}

export default function ClientCard({ client, onUpdate, operatorId }: ClientCardProps) {
  const [loading, setLoading] = useState<'add' | 'remove' | 'reset' | null>(null);
  const [error, setError] = useState('');
  const [showRewardModal, setShowRewardModal] = useState(false);

  const VISIT_GOAL = 10;
  const isComplete = client.visits >= VISIT_GOAL;
  const progress = Math.min((client.visits / VISIT_GOAL) * 100, 100);

  const handleAction = async (action: 'add' | 'remove') => {
    setLoading(action);
    setError('');
    try {
      console.log('SENDING:', {
        clientId: client.id,
        operatorId,
        action: action === 'add' ? 1 : -1
      });

      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          operatorId,
          action: action === 'add' ? 1 : -1
        }),
      });

      console.log('STATUS:', res.status);

      const text = await res.text();
      console.log('RAW RESPONSE:', text);

      let data;

      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('JSON PARSE ERROR:', e);
        throw new Error('Invalid server response');
      }

      console.log('PARSED:', data);

      if (!res.ok) {
        throw new Error(data?.error || 'Request failed');
      }

      const updated = data.client;
      onUpdate(updated);
      if (updated.visits >= VISIT_GOAL) setShowRewardModal(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(null);
    }
  };

  const handleReset = async () => {
    setLoading('reset');
    setError('');
    try {
      const updated = await resetVisits(client.id, operatorId);
      onUpdate(updated);
      setShowRewardModal(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <div className={`glass-card rounded-2xl p-6 w-full ${isComplete ? 'reward-glow' : ''}`}>
        {/* Client info */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--gold-dim)] to-[var(--gold-light)] flex items-center justify-center text-[var(--dark)] font-display font-bold text-lg">
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h3 className="font-display text-xl font-semibold text-[var(--text)]">{client.name}</h3>
            <p className="text-sm text-[var(--muted)]">{client.phone}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-display font-bold text-gold-shimmer">{client.visits}</p>
            <p className="text-xs text-[var(--muted)]">/ {VISIT_GOAL} visits</p>
          </div>
        </div>

        {/* Mini stamp grid */}
        <div className="grid grid-cols-10 gap-1.5 mb-4">
          {Array.from({ length: VISIT_GOAL }).map((_, i) => (
            <div
              key={i}
              className={`aspect-square rounded-md flex items-center justify-center transition-all duration-200
                ${i < client.visits
                  ? 'bg-gradient-to-br from-[var(--gold-dim)] to-[var(--gold-light)]'
                  : 'bg-[#1e1e1e] border border-[var(--border)]'
                }`}
            >
              {i < client.visits && (
                <svg viewBox="0 0 24 24" className="w-3 h-3 text-[var(--dark)]" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              )}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-[#1e1e1e] rounded-full overflow-hidden mb-5">
          <div className="progress-bar h-full rounded-full" style={{ width: `${progress}%` }} />
        </div>

        {/* Status badge */}
        {isComplete && (
          <div className="bg-[var(--gold-dim)]/10 border border-[var(--gold-dim)]/30 rounded-xl p-3 mb-4 text-center">
            <p className="text-sm font-semibold text-[var(--gold)]">🎉 Reward unlocked! Free haircut ready.</p>
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
            onClick={() => handleAction('remove')}
            disabled={loading !== null || client.visits <= 0}
            className="btn-ghost flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {loading === 'remove' ? (
              <div className="w-4 h-4 border-2 border-[var(--muted)] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M19 13H5v-2h14v2z"/></svg>
                Remove Visit
              </>
            )}
          </button>

          <button
            onClick={() => handleAction('add')}
            disabled={loading !== null || client.visits >= VISIT_GOAL}
            className="btn-gold flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {loading === 'add' ? (
              <div className="w-4 h-4 border-2 border-[var(--dark)] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                Add Visit
              </>
            )}
          </button>
        </div>

        {isComplete && (
          <button
            onClick={handleReset}
            disabled={loading !== null}
            className="w-full mt-3 py-3 rounded-xl text-sm font-semibold border border-[var(--gold-dim)]/40 text-[var(--gold)] hover:bg-[var(--gold-dim)]/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-30"
          >
            {loading === 'reset' ? (
              <div className="w-4 h-4 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
                Redeem Reward & Reset
              </>
            )}
          </button>
        )}
      </div>

      {/* Reward Modal */}
      {showRewardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card reward-glow rounded-3xl p-8 max-w-sm w-full text-center fade-up">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="font-display text-2xl font-bold text-[var(--gold)] mb-2">Reward Unlocked!</h2>
            <p className="text-[var(--text-dim)] mb-6">{client.name} has reached {VISIT_GOAL} visits and earned a <strong className="text-[var(--text)]">free haircut</strong>!</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleReset}
                disabled={loading !== null}
                className="btn-gold py-3 rounded-xl text-sm font-semibold"
              >
                Redeem & Reset Counter
              </button>
              <button
                onClick={() => setShowRewardModal(false)}
                className="btn-ghost py-3 rounded-xl text-sm"
              >
                Redeem Later
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
