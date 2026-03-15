'use client';

interface LoyaltyCardProps {
  visits: number;
  name: string;
}

export default function LoyaltyCard({ visits, name }: LoyaltyCardProps) {
  const VISIT_GOAL = 10;
  const isComplete = visits >= VISIT_GOAL;
  const progress = Math.min((visits / VISIT_GOAL) * 100, 100);

  return (
    <div className={`glass-card rounded-2xl p-6 w-full max-w-sm mx-auto ${isComplete ? 'reward-glow' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--muted)] font-body mb-1">Loyalty Card</p>
          <h2 className="font-display text-lg font-semibold text-[var(--text)]">{name}</h2>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--muted)] mb-1">Progress</p>
          <p className="font-display text-2xl font-bold text-gold-shimmer">{visits}<span className="text-[var(--muted)] text-lg">/{VISIT_GOAL}</span></p>
        </div>
      </div>

      {/* Stamp Grid */}
      <div className="grid grid-cols-5 gap-2 mb-5">
        {Array.from({ length: VISIT_GOAL }).map((_, i) => {
          const filled = i < visits;
          return (
            <div
              key={i}
              className={`stamp aspect-square rounded-xl flex items-center justify-center
                ${filled
                  ? 'bg-gradient-to-br from-[var(--gold-dim)] to-[var(--gold-light)] shadow-lg'
                  : 'bg-[#1e1e1e] border border-[var(--border)]'
                }`}
              style={{ animationDelay: filled ? `${i * 50}ms` : '0ms' }}
            >
              {filled ? (
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-[var(--dark)]" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              ) : (
                <span className="text-[var(--border)] text-xs font-bold">{i + 1}</span>
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
          <div className="flex items-center justify-center gap-2">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-[var(--gold)]" fill="currentColor">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
            </svg>
            <p className="text-sm font-semibold text-[var(--gold)]">Reward unlocked! 🎉</p>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            {VISIT_GOAL - visits} more visit{VISIT_GOAL - visits !== 1 ? 's' : ''} to your free haircut
          </p>
        )}
      </div>

      {/* Decorative scissors */}
      <div className="absolute top-4 right-4 opacity-5 pointer-events-none">
        <svg viewBox="0 0 24 24" className="w-16 h-16" fill="currentColor">
          <path d="M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm0 12c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM19 3l-6 6 2 2 7-7V3z"/>
        </svg>
      </div>
    </div>
  );
}
