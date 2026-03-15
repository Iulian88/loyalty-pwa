'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loadClientSession, loadOperatorSession } from '@/lib/auth';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const client = loadClientSession();
    const operator = loadOperatorSession();
    if (client) router.replace('/dashboard');
    else if (operator) router.replace('/operator/dashboard');
  }, [router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-[var(--gold-dim)]/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-64 h-64 rounded-full bg-[var(--gold)]/3 blur-3xl" />
      </div>

      <div className="text-center max-w-xs w-full relative z-10">
        {/* Logo */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[var(--gold-dim)] to-[var(--gold-light)] flex items-center justify-center mx-auto mb-6 shadow-2xl">
          <svg viewBox="0 0 24 24" className="w-10 h-10 text-[var(--dark)]" fill="currentColor">
            <path d="M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm0 12c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM19 3l-6 6 2 2 7-7V3z"/>
          </svg>
        </div>

        <h1 className="font-display text-4xl font-bold text-gold-shimmer mb-2">Salon</h1>
        <h2 className="font-display text-4xl font-light text-[var(--text)] mb-3">Loyalty</h2>
        <p className="text-[var(--muted)] text-sm mb-10">Collect visits. Earn rewards.</p>

        {/* CTA buttons */}
        <div className="space-y-3 fade-up delay-200">
          <Link href="/register" className="btn-gold w-full py-4 rounded-2xl text-base font-semibold block text-center">
            Get Started
          </Link>
          <Link href="/login" className="btn-ghost w-full py-4 rounded-2xl text-base font-semibold block text-center">
            I have an account
          </Link>
        </div>

        {/* Operator link */}
        <div className="mt-8 pt-6 border-t border-[var(--border)]">
          <Link
            href="/operator/login"
            className="text-sm text-[var(--muted)] hover:text-[var(--text-dim)] transition-colors flex items-center justify-center gap-2"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
            </svg>
            Salon Operator Login
          </Link>
        </div>
      </div>
    </main>
  );
}
