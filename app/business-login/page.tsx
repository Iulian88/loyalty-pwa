'use client';

import Link from 'next/link';

export default function BusinessLoginPage() {
  return (
    <main className="min-h-screen flex flex-col p-6 relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-[var(--gold-dim)]/4 blur-3xl pointer-events-none" />

      <Link
        href="/"
        className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--text)] transition-colors mb-10 w-fit"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
        </svg>
        Înapoi
      </Link>

      <div className="flex-1 flex flex-col justify-center max-w-xs mx-auto w-full">
        <div className="mb-10 fade-up">
          <h1 className="font-display text-3xl font-bold text-[var(--text)]">Acces Business</h1>
          <p className="text-[var(--muted)] text-sm mt-1">Alege rolul tău</p>
        </div>

        <div className="flex flex-col gap-4 fade-up delay-100">
          <Link
            href="/admin/login"
            className="w-full px-5 py-4 rounded-2xl bg-[var(--gold)] text-black transition-opacity hover:opacity-90 active:opacity-80"
          >
            <div className="flex flex-col items-start">
              <span className="font-semibold text-base">Administrator</span>
              <span className="text-sm opacity-70 font-normal">Gestionează business-ul și setările</span>
            </div>
          </Link>

          <Link
            href="/operator/login"
            className="w-full px-5 py-4 rounded-2xl border border-[var(--border)] text-[var(--text)] transition-colors hover:border-[var(--gold-dim)] hover:text-[var(--gold-dim)]"
          >
            <div className="flex flex-col items-start">
              <span className="font-semibold text-base">Operator</span>
              <span className="text-sm opacity-60 font-normal">Scanează coduri și validează vizite</span>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
