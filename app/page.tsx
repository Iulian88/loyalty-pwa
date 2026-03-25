'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/session', { credentials: 'include', cache: 'no-store' })
      .then(res => {
        if (res.status === 401) return null;
        return res.json();
      })
      .then(data => {
        if (data && !data.error) router.replace('/dashboard');
        // no session → stay on home page, do NOT check operator session
      })
      .catch(() => {}); // network error → stay on home page
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
        <img
          src="/icons/logo-mark.svg"
          alt="Fidelizat"
          className="w-28 h-28 object-contain mx-auto mb-6 opacity-90 drop-shadow-[0_0_12px_rgba(255,255,255,0.10)]"
        />

        <h1 className="font-display text-4xl font-bold text-gold-shimmer mb-3">Fidelizat</h1>
        <p className="text-[var(--muted)] text-sm mb-10">Transformă vizitele în clienți fideli.</p>

        {/* CTA buttons */}
        <div className="space-y-3 fade-up delay-200">
          <Link href="/register" className="btn-gold w-full py-4 rounded-2xl text-base font-semibold block text-center">
            Începe acum
          </Link>
          <Link href="/login" className="btn-ghost w-full py-4 rounded-2xl text-base font-semibold block text-center">
            Am deja cont
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
            Acces operator
          </Link>
        </div>
      </div>
    </main>
  );
}
