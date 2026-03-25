'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Client } from '@/types';
import ClientCard from '@/components/ClientCard';
import NavBar from '@/components/NavBar';

function SearchClientContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [allClients, setAllClients] = useState<Client[]>([]);
  const [query, setQuery] = useState(searchParams.get('phone') || '');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [client, setClient] = useState<Client | null>(null);
  const [loadingClients, setLoadingClients] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [operatorId, setOperatorId] = useState('');
  const [visitGoal, setVisitGoal] = useState(10);
  const [authChecking, setAuthChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auth check + load all clients once
  useEffect(() => {
    let mounted = true;
    fetch('/api/operator/session', { credentials: 'include', cache: 'no-store' })
      .then(res => {
        if (!res.ok) { if (mounted) { setAuthChecking(false); router.replace('/operator/login'); } return null; }
        return res.json();
      })
      .then(data => {
        if (!mounted || !data) return;
        setOperatorId(data.data?.operatorId || '');
        setVisitGoal(data.visitGoal || 10);
        setAuthenticated(true);
        setAuthChecking(false);
        loadAll(data.visitGoal || 10, searchParams.get('phone') || '');
      })
      .catch(() => { if (mounted) { setAuthChecking(false); router.replace('/operator/login'); } });
    return () => { mounted = false; };
  }, [router]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAll = async (goal: number, initialPhone: string) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('salon_id', process.env.NEXT_PUBLIC_SALON_ID || '00000000-0000-0000-0000-000000000001');
      if (error) throw error;
      const sorted = (data || []).sort((a: Client, b: Client) => b.visits - a.visits);
      setAllClients(sorted);
      // Auto-select if URL param matches
      if (initialPhone) {
        const norm = (s: string) => s.replaceAll(' ', '');
        const match = sorted.find(
          (c: Client) => norm(c.phone) === norm(initialPhone)
        );
        if (match) setClient(match);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingClients(false);
    }
  };

  // Debounce query → debouncedQuery (250 ms)
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query);
      setHighlighted(-1);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  // Suggestions: 2+ chars, max 8
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

  const showDropdown = dropdownOpen && !client && debouncedQuery.trim().length >= 2;

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
    setClient(c);
    setQuery(c.name);
    setDropdownOpen(false);
  };

  const clearSearch = () => {
    setQuery('');
    setClient(null);
    setDropdownOpen(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setClient(null);
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
        <h1 className="font-display text-3xl font-bold text-[var(--text)]">Caută client</h1>
      </header>

      <div className="px-6 space-y-4">

        {/* Search input + dropdown */}
        <div className="relative fade-up delay-100">
          <div className="relative">
            {/* Search icon */}
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
              placeholder="Nume sau telefon…"
              className="input-field w-full pl-9 pr-9 py-3 rounded-xl text-base"
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />

            {/* Clear button */}
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

          {/* Dropdown suggestions */}
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
                  {suggestions.map((c, i) => {
                    const isComplete = c.visits >= visitGoal;
                    return (
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
                          {/* Avatar */}
                          <div className="w-9 h-9 rounded-xl bg-[var(--gold-dim)]/15 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-[var(--gold)]">
                              {c.name.charAt(0).toUpperCase()}
                            </span>
                          </div>

                          {/* Name + phone */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[var(--text)] truncate">{c.name}</p>
                            <p className="text-xs text-[var(--muted)] truncate">{c.phone}</p>
                          </div>

                          {/* Visits badge */}
                          <div className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg ${
                            isComplete
                              ? 'bg-[var(--gold-dim)]/20 text-[var(--gold)]'
                              : 'bg-white/5 text-[var(--muted)]'
                          }`}>
                            {c.visits}/{visitGoal}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Selected client card */}
        {client && (
          <div className="fade-up">
            <button
              onClick={clearSearch}
              className="flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors mb-3"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
              Caută alt client
            </button>
            <ClientCard
              client={client}
              onUpdate={updated => {
                setClient(updated);
                setAllClients(prev => prev.map(c => c.id === updated.id ? updated : c));
              }}
              operatorId={operatorId}
              visitGoal={visitGoal}
            />
          </div>
        )}

        {/* Empty / prompt state */}
        {!client && !query && !loadingClients && (
          <div className="text-center py-10 fade-up delay-200">
            <div className="w-16 h-16 rounded-3xl bg-[var(--gold-dim)]/10 flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-[var(--gold-dim)]" fill="currentColor">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
            </div>
            <p className="text-[var(--muted)] text-sm">Scrie un nume sau număr de telefon</p>
          </div>
        )}

        {/* Typing but < 2 chars */}
        {!client && query.length === 1 && (
          <p className="text-center text-xs text-[var(--muted)] fade-up pt-2">
            Continuă să scrii…
          </p>
        )}

      </div>

      <NavBar role="operator" />
    </main>
  );
}

export default function SearchClientPage() {
  return (
    <Suspense>
      <SearchClientContent />
    </Suspense>
  );
}
