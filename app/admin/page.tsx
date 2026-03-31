'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type GatewayState = 'checking' | 'no-access';

export default function AdminGateway() {
  const router = useRouter();
  const [state, setState] = useState<GatewayState>('checking');

  useEffect(() => {
    async function detectRole() {
      // 1. Check user session (token cookie)
      const sessionRes = await fetch('/api/auth/session', {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!sessionRes.ok) {
        // No user session — check for operator session
        const opRes = await fetch('/api/operator/session', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (opRes.ok) {
          router.replace('/business-login');
        } else {
          router.replace('/business-login');
        }
        return;
      }

      // 2. Check owner role: does this user own any business?
      const bizRes = await fetch('/api/owner/businesses', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (bizRes.ok) {
        const bizData = await bizRes.json();
        if ((bizData.businesses ?? []).length > 0) {
          router.replace('/admin/owner');
          return;
        }
      }

      // 3. Check operator session (logged in as operator)
      const opRes = await fetch('/api/operator/session', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (opRes.ok) {
        router.replace('/admin/operator');
        return;
      }

      // 4. Authenticated user but no admin role
      setState('no-access');
    }

    detectRole().catch(() => router.replace('/business-login'));
  }, [router]);

  if (state === 'checking') {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--muted)] text-sm">Se verifică accesul...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="glass rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-[var(--border)] flex items-center justify-center mx-auto">
          <svg viewBox="0 0 24 24" className="w-7 h-7 text-[var(--muted)]" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
          </svg>
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-[var(--text)]">Admin Panel</h1>
          <p className="text-[var(--muted)] text-sm mt-2">
            Nu ai acces la panoul de administrare.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-block text-[var(--gold-dim)] text-sm hover:text-[var(--gold)] transition-colors"
        >
          ← Înapoi la Dashboard
        </Link>
      </div>
    </main>
  );
}
