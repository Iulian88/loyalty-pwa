'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import NavBar from '@/components/NavBar';

interface VisitEvent {
  id: string;
  client_id: string;
  action: number;
  created_at: string;
  clients: { name: string } | null;
}

const actionMeta: Record<number, { label: string; icon: string; color: string }> = {
  1:  { label: 'Vizită adăugată', icon: '+',  color: 'text-[var(--gold)]' },
  2:  { label: 'Bonus acordat',   icon: '🎁', color: 'text-emerald-400' },
  [-1]: { label: 'Vizită ștearsă', icon: '−',  color: 'text-red-400' },
  0:  { label: 'Card resetat',    icon: '↺',  color: 'text-[var(--muted)]' },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Azi';
  return d.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function ActivityPage() {
  const router = useRouter();
  const [events, setEvents] = useState<VisitEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayCount, setTodayCount] = useState(0);

  useEffect(() => {
    fetch('/api/operator/session', { credentials: 'include', cache: 'no-store' })
      .then(res => res.json())
      .then(async data => {
        if (data.error) { router.replace('/operator/login'); return; }

        const { data: logs } = await supabase
          .from('visits_log')
          .select('id, client_id, action, created_at, clients(name)')
          .order('created_at', { ascending: false })
          .limit(60);

        if (logs) {
          const typedLogs = logs as unknown as VisitEvent[];
          setEvents(typedLogs);
          const todayStr = new Date().toDateString();
          setTodayCount(typedLogs.filter(e => e.action === 1 && new Date(e.created_at).toDateString() === todayStr).length);
        }
        setLoading(false);
      })
      .catch(() => router.replace('/operator/login'));
  }, [router]);

  // Group events by date
  const groups = new Map<string, VisitEvent[]>();
  const groupOrder: string[] = [];
  for (const ev of events) {
    const key = new Date(ev.created_at).toDateString();
    if (!groups.has(key)) { groups.set(key, []); groupOrder.push(key); }
    groups.get(key)!.push(ev);
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[var(--gold-dim)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <main className="min-h-screen flex flex-col pb-24">
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[var(--gold-dim)]/4 blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="p-6 pt-8 fade-up">
        <p className="text-xs uppercase tracking-widest text-[var(--muted)] mb-1">Operator</p>
        <h1 className="font-display text-3xl font-bold text-[var(--text)]">Activitate</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          {todayCount > 0
            ? `${todayCount} vizit${todayCount === 1 ? 'ă' : 'e'} azi`
            : 'Nicio vizită azi'}
        </p>
      </header>

      <div className="px-4 space-y-5 fade-up delay-100">
        {groupOrder.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[var(--muted)] text-sm">Nicio activitate înregistrată.</p>
          </div>
        ) : (
          groupOrder.map(dateKey => {
            const label   = formatDateLabel(groups.get(dateKey)![0].created_at);
            const dayEvents = groups.get(dateKey)!;
            return (
              <div key={dateKey}>
                <p className="text-xs uppercase tracking-widest text-[var(--muted)] mb-2 px-1">{label}</p>
                <div className="space-y-1.5">
                  {dayEvents.map(ev => {
                    const meta = actionMeta[ev.action] ?? { label: 'Eveniment', icon: '•', color: 'text-[var(--muted)]' };
                    return (
                      <div
                        key={ev.id}
                        className="glass-card rounded-xl px-4 py-3 border border-[var(--border)] flex items-center gap-3"
                      >
                        {/* Icon badge */}
                        <div className={`w-8 h-8 rounded-xl bg-[#1e1e1e] flex items-center justify-center text-base flex-shrink-0 ${meta.color} font-bold`}>
                          {meta.icon}
                        </div>

                        {/* Label */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[var(--text)] truncate">
                            {ev.clients?.name ?? 'Client șters'}
                          </p>
                          <p className={`text-xs ${meta.color}`}>{meta.label}</p>
                        </div>

                        {/* Time */}
                        <p className="text-xs text-[var(--muted)] flex-shrink-0">{formatTime(ev.created_at)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      <NavBar role="operator" />
    </main>
  );
}
