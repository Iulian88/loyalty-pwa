'use client';

interface LoyaltyCardProps {
  visits: number;
  name: string;
  visitGoal: number;
  bump?: boolean;
}

function getProximityMessage(visits: number, visitGoal: number): string {
  if (visitGoal === 0) return '';
  if (visits === 0) return 'Începe acum';
  const progress = visits / visitGoal;
  if (progress >= 1)    return '🎉 Ai bonus!';
  if (progress >= 0.9)  return 'Încă puțin!';
  if (progress >= 0.75) return 'Aproape acolo!';
  if (progress >= 0.6)  return 'Se apropie';
  return `Mai ai ${visitGoal - visits} vizite`;
}

export default function LoyaltyCard({ visits, name, visitGoal, bump }: Readonly<LoyaltyCardProps>) {
  const isComplete = visits >= visitGoal;
  const progress = visitGoal > 0 ? Math.min((visits / visitGoal) * 100, 100) : 0;

  return (
    <div className={`glass-card relative overflow-hidden rounded-2xl p-6 w-full max-w-sm mx-auto ${isComplete ? 'reward-glow' : ''} ${bump ? 'card-bump' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--muted)] font-body mb-1">Card fidelitate</p>
          <h2 className="font-display text-lg font-semibold text-[var(--text)]">{name}</h2>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--muted)] mb-1">Progres</p>
          <p className="font-display text-2xl font-bold text-gold-shimmer">{visits}<span className="text-[var(--muted)] text-lg">/{visitGoal}</span></p>
        </div>
      </div>

      {/* Stamp Grid */}
      <div className="grid gap-2 mb-5" style={{ gridTemplateColumns: `repeat(${visitGoal}, minmax(0, 1fr))` }}>
        {Array.from({ length: visitGoal }, (_, i) => i).map((pos) => {
          const filled = pos < visits;
          return (
            <div
              key={pos}
              className={`stamp aspect-square rounded-xl flex items-center justify-center
                ${filled
                  ? 'bg-gradient-to-br from-[var(--gold-dim)] to-[var(--gold-light)] shadow-lg'
                  : 'bg-[#1e1e1e] border border-[var(--border)]'
                }`}
              style={{ animationDelay: filled ? `${pos * 50}ms` : '0ms' }}
            >
              {filled ? (
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-[var(--dark)]" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              ) : (
                <span className="text-[var(--border)] text-xs font-bold">{pos + 1}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 bg-[#1e1e1e] rounded-full overflow-hidden mb-4">
        <div
          className="progress-bar h-full rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Status */}
      <div className="text-center">
        {isComplete ? (
          <div className="flex flex-col items-center gap-1">
            <span className="text-3xl leading-none">🎉</span>
            <p className="font-display font-bold text-[var(--gold)] text-base">Felicitări!</p>
            <p className="text-xs text-[var(--gold-light)] mt-0.5">Ai câștigat bonusul!</p>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            {getProximityMessage(visits, visitGoal)}
          </p>
        )}
      </div>

      {/* Decorative logo watermark */}
      <div className="absolute -top-4 -right-4 opacity-[0.06] pointer-events-none">
        <img src="/icons/logo-mark.png" alt="" className="w-40 h-40 object-contain mix-blend-screen" />
      </div>
    </div>
  );
}
