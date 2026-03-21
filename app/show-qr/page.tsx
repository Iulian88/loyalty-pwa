'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Client } from '@/lib/supabase';
import NavBar from '@/components/NavBar';

export default function ShowQRPage() {
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevVisitsRef = useRef<number | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          router.replace('/login');
        } else {
          setClient(data.client);
          prevVisitsRef.current = data.client.visits;
        }
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  useEffect(() => {
    if (!client) return;

    const qrUrl = `loyaltyapp/client/${client.id}`;

    // Dynamically import qrcode to avoid SSR issues
    import('qrcode').then(QRCode => {
      QRCode.toDataURL(qrUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#c9a84c',
          light: '#141414',
        },
        errorCorrectionLevel: 'H',
      }).then(url => {
        setQrDataUrl(url);
        setLoading(false);
      });
    });
  }, [client]);

  useEffect(() => {
    if (!client) return;
    intervalRef.current = setInterval(() => {
      fetch('/api/auth/session')
        .then(res => res.json())
        .then(data => {
          if (data.error) return;
          const newVisits = data.client.visits;
          if (prevVisitsRef.current !== null && newVisits > prevVisitsRef.current) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
            setToast('+1 vizită adăugată ✔️');
            toastTimerRef.current = setTimeout(() => router.push('/dashboard'), 1500);
          }
          prevVisitsRef.current = newVisits;
          setClient(data.client);
        })
        .catch(() => {});
    }, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [client?.id, router]);

  if (!client) return null;

  return (
    <main className="min-h-screen flex flex-col pb-24">
      <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#1a1a1a] border border-[var(--gold-dim)]/40 rounded-2xl px-5 py-3 shadow-2xl pointer-events-none transition-all duration-300 ${toast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        <p className="text-sm font-semibold text-[var(--gold)] whitespace-nowrap">{toast}</p>
      </div>
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-[var(--gold-dim)]/6 blur-3xl" />
      </div>

      {/* Header */}
      <header className="p-6 pt-8 fade-up">
        <p className="text-xs uppercase tracking-widest text-[var(--muted)] mb-1">Your</p>
        <h1 className="font-display text-3xl font-bold text-[var(--text)]">Loyalty QR</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Show this to your stylist to record your visit</p>
      </header>

      {/* QR Code Card */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="glass-card rounded-3xl p-8 w-full max-w-xs text-center fade-up delay-100">
          {/* Name */}
          <p className="font-display text-xl font-semibold text-[var(--text)] mb-1">{client.name}</p>
          <p className="text-sm text-[var(--muted)] mb-6">{client.phone}</p>

          {/* QR Code */}
          <div className="relative inline-block">
            {loading ? (
              <div className="w-64 h-64 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[var(--gold-dim)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="relative">
                {/* Corner decorations */}
                <div className="absolute -top-2 -left-2 w-6 h-6 border-l-2 border-t-2 border-[var(--gold-dim)] rounded-tl-lg" />
                <div className="absolute -top-2 -right-2 w-6 h-6 border-r-2 border-t-2 border-[var(--gold-dim)] rounded-tr-lg" />
                <div className="absolute -bottom-2 -left-2 w-6 h-6 border-l-2 border-b-2 border-[var(--gold-dim)] rounded-bl-lg" />
                <div className="absolute -bottom-2 -right-2 w-6 h-6 border-r-2 border-b-2 border-[var(--gold-dim)] rounded-br-lg" />

                <img
                  src={qrDataUrl}
                  alt="Loyalty QR Code"
                  className="w-56 h-56 rounded-xl"
                />
              </div>
            )}
          </div>

          {/* Client ID snippet */}
          <div className="mt-6 bg-[#111] rounded-xl px-4 py-2 border border-[var(--border)]">
            <p className="text-xs text-[var(--muted)] font-mono break-all">
              ID: {client.id.slice(0, 8)}…
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 max-w-xs w-full fade-up delay-200">
          <div className="flex items-start gap-3 glass-card rounded-2xl p-4">
            <div className="w-8 h-8 rounded-xl bg-[var(--gold-dim)]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-[var(--gold-dim)]" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
            </div>
            <p className="text-sm text-[var(--muted)] leading-relaxed">
              Ask your stylist to scan this QR code <strong className="text-[var(--text-dim)]">after your visit</strong> to add a stamp to your loyalty card.
            </p>
          </div>
        </div>
      </div>

      <NavBar role="client" />
    </main>
  );
}
