'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Client } from '@/types';
import NavBar from '@/components/NavBar';

const SESSION_OPTIONS = [5, 10, 20];

export default function SubscriptionsPage() {
  const router = useRouter();

  const [allClients, setAllClients] = useState<Client[]>([]);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [loadingClients, setLoadingClients] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);

  // Activation modal state
  const [showModal, setShowModal] = useState(false);
  const [sessionCount, setSessionCount] = useState<number>(10);
  const [activating, setActivating] = useState(false);
  const [activatedSub, setActivatedSub] = useState<{ sessions: number; used: number } | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auth + load all clients
  useEffect(() => {
    let mounted = true;
    fetch('/api/operator/session', { credentials: 'include', cache: 'no-store' })
      .then(res => {
        if (!res.ok) { if (mounted) { setAuthChecking(false); router.replace('/operator/login'); } return null; }
        return res.json();
      })
      .then(data => {
        if (!mounted || !data) return;
        setAuthenticated(true);
        setAuthChecking(false);
        loadClients();
      })
      .catch(() => { if (mounted) { setAuthChecking(false); router.replace('/operator/login'); } });
    return () => { mounted = false; };
  }, [router]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('business_id', process.env.NEXT_PUBLIC_SALON_ID || '00000000-0000-0000-0000-000000000001');
      if (error) throw error;
      const sorted = (data || []).sort((a: Client, b: Client) => b.visits - a.visits);
      setAllClients(sorted);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingClients(false);
    }
  };

  // Debounce 250 ms
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query);
      setHighlighted(-1);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const suggestions =
    debouncedQuery.trim().length >= 2
      ? allClients
          .filter(c => {
            const q = debouncedQuery.toLowerCase();
            return (
              c.name.toLowerCase().includes(q) ||
              c.phone.replaceAll(' ', '').includes(q.replaceAll(' ', ''))
            );
          })
          .slice(0, 8)
      : [];

  const showDropdown = dropdownOpen && !selectedClient && debouncedQuery.trim().length >= 2;

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectClient = (c: Client) => {
    setSelectedClient(c);
    setQuery(c.name);
    setDropdownOpen(false);
    setActivatedSub(null);
  };

  const clearSearch = () => {
    setQuery('');
    setSelectedClient(null);
    setActivatedSub(null);
    setDropdownOpen(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setSelectedClient(null);
    setActivatedSub(null);
    setDropdownOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlighted >= 0 && suggestions[highlighted]) selectClient(suggestions[highlighted]);
    } else if (e.key === 'Escape') {
      setDropdownOpen(false);
    }
  };

  const handleActivate = async () => {
    setActivating(true);
    // Simulate slight delay (no backend yet)
    await new Promise(r => setTimeout(r, 400));
    setActivatedSub({ sessions: sessionCount, used: 0 });
    setActivating(false);
    setShowModal(false);
  };

  if (authChecking) return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-[var(--muted)] text-sm">Se verifică sesiunea...</p>
    </main>
  );
  if (!authenticated) return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-[var(--muted)] text-sm">Nu ești autentificat. Redirecționare către login...</p>
    </main>
  );

  return (
    <main className="min-h-screen flex flex-col pb-24">
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[var(--gold-dim)]/4 blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="p-6 pt-8 fade-up">
        <p className="text-xs uppercase tracking-widest text-[var(--muted)] mb-1">Operator</p>
        <h1 className="font-display text-3xl font-bold text-[var(--text)]">Abonament</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Gestionează pachete preplătite</p>
      </header>

      <div className="px-6 space-y-4">

        {/* Search */}
        <div className="relative fade-up delay-100">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--muted)]">
              {loadingClients ? (
                <div className="w-4 h-4 border-2 border-[var(--muted)] border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
              )}
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onFocus={() => { if (query.length >= 2) setDropdownOpen(true); }}
              onKeyDown={handleKeyDown}
              placeholder="Caută client după nume sau telefon…"
              className="input-field w-full pl-9 pr-9 py-3 rounded-xl text-base"
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); clearSearch(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                tabIndex={-1}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            )}
          </div>

          {/* Dropdown */}
          {showDropdown && (
            <div
              ref={dropdownRef}
              className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 glass-card rounded-2xl overflow-hidden shadow-2xl"
            >
              {suggestions.length === 0 ? (
                <div className="px-4 py-5 text-center text-[var(--muted)] text-sm">
                  Niciun client găsit
                </div>
              ) : (
                <ul>
                  {suggestions.map((c, i) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onMouseDown={() => selectClient(c)}
                        onMouseEnter={() => setHighlighted(i)}
                        onMouseLeave={() => setHighlighted(-1)}
                        className={[
                          'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-100',
                          i < suggestions.length - 1 ? 'border-b border-[var(--border)]/30' : '',
                          highlighted === i ? 'bg-[var(--gold-dim)]/10' : 'hover:bg-white/4',
                        ].join(' ')}
                      >
                        <div className="w-9 h-9 rounded-xl bg-[var(--gold-dim)]/15 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-[var(--gold)]">
                            {c.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[var(--text)] truncate">{c.name}</p>
                          <p className="text-xs text-[var(--muted)] truncate">{c.phone}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Selected client — subscription section */}
        {selectedClient && (
          <div className="fade-up space-y-3">
            {/* Back */}
            <button
              onClick={clearSearch}
              className="flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
              Caută alt client
            </button>

            {/* Client info pill */}
            <div className="glass-card rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--gold-dim)]/40 to-[var(--gold-light)]/40 flex items-center justify-center flex-shrink-0">
                <span className="font-display font-bold text-[var(--gold)]">
                  {selectedClient.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[var(--text)] truncate">{selectedClient.name}</p>
                <p className="text-xs text-[var(--muted)] truncate">{selectedClient.phone}</p>
              </div>
            </div>

            {/* Subscription status */}
            {activatedSub ? (
              /* Active subscription card */
              <div className="glass-card rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <p className="text-sm font-semibold text-[var(--text)]">Abonament activ</p>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs text-[var(--muted)] mb-2">
                    <span>Ședințe folosite</span>
                    <span className="text-[var(--gold)] font-semibold">
                      {activatedSub.used} / {activatedSub.sessions}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--gold-dim)] to-[var(--gold)] transition-all duration-500"
                      style={{ width: `${(activatedSub.used / activatedSub.sessions) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-2">
                    {activatedSub.sessions - activatedSub.used} ședințe rămase
                  </p>
                </div>
              </div>
            ) : (
              /* No subscription */
              <div className="glass-card rounded-2xl p-6 flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[var(--gold-dim)]/10 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-7 h-7 text-[var(--gold-dim)]" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2"/>
                    <path d="M2 10h20M7 15h.01M12 15h.01"/>
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-[var(--text)]">Nu există abonament activ</p>
                  <p className="text-xs text-[var(--muted)] mt-1">
                    Activează un pachet preplatit pentru acest client
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(true)}
                  className="btn-gold w-full py-3 rounded-xl font-semibold text-sm"
                >
                  Activează abonament
                </button>
              </div>
            )}
          </div>
        )}

        {/* Idle state */}
        {!selectedClient && !query && !loadingClients && (
          <div className="text-center py-10 fade-up delay-200">
            <div className="w-16 h-16 rounded-3xl bg-[var(--gold-dim)]/10 flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-[var(--gold-dim)]" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2"/>
                <path d="M2 10h20M7 15h.01M12 15h.01M17 15h.01"/>
              </svg>
            </div>
            <p className="text-[var(--muted)] text-sm">Selectează un client pentru a gestiona abonamentul</p>
          </div>
        )}

        {!selectedClient && query.length === 1 && (
          <p className="text-center text-xs text-[var(--muted)] fade-up pt-2">
            Continuă să scrii…
          </p>
        )}
      </div>

      {/* Activation modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center p-4 pb-8">
          <div className="glass-card rounded-3xl p-6 w-full max-w-sm fade-up space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[var(--text)]">Activează abonament</h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            {/* Client name */}
            <p className="text-sm text-[var(--muted)]">
              Client: <span className="text-[var(--text)] font-semibold">{selectedClient?.name}</span>
            </p>

            {/* Session picker */}
            <div>
              <p className="text-xs uppercase tracking-widest text-[var(--muted)] mb-3">Număr de ședințe</p>
              <div className="grid grid-cols-3 gap-2">
                {SESSION_OPTIONS.map(n => (
                  <button
                    key={n}
                    onClick={() => setSessionCount(n)}
                    className={[
                      'py-3 rounded-xl text-sm font-bold transition-all duration-150',
                      sessionCount === n
                        ? 'btn-gold'
                        : 'glass-card text-[var(--text-dim)] hover:text-[var(--text)]',
                    ].join(' ')}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Confirm / cancel */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleActivate}
                disabled={activating}
                className="btn-gold w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {activating ? (
                  <div className="w-5 h-5 border-2 border-[var(--dark)] border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Activează'
                )}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="btn-ghost w-full py-3 rounded-xl font-semibold text-sm"
              >
                Anulează
              </button>
            </div>
          </div>
        </div>
      )}

      <NavBar role="operator" />
    </main>
  );
}
