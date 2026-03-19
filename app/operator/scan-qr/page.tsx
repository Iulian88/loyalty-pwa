'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getClientById } from '@/lib/auth';
import { Client } from '@/lib/supabase';
import ClientCard from '@/components/ClientCard';
import NavBar from '@/components/NavBar';

export default function ScanQRPage() {
  const router = useRouter();
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrRef = useRef<unknown>(null);
  const [scanning, setScanning] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [scannerReady, setScannerReady] = useState(false);
  const [operatorId, setOperatorId] = useState<string>('');
  const [processingScan, setProcessingScan] = useState(false);

  useEffect(() => {
    fetch('/api/operator/session')
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          router.replace('/operator/login');
        } else {
          setOperatorId(data.data.operatorId);
        }
      })
      .catch(() => router.replace('/operator/login'));
  }, [router]);

  const startScanner = async () => {
    setError('');
    setClient(null);
    setCameraError('');
    setScanning(true);

    try {
      // Dynamic import to avoid SSR issues
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader');
      html5QrRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        async (decodedText: string) => {
          if (processingScan) return;
          setProcessingScan(true);

          // Stop scanning after successful read
          await scanner.stop();
          setScanning(false);
          await handleScanResult(decodedText);
          setProcessingScan(false);
        },
        () => {
          // Scan failure - normal, keep trying
        }
      );
      setScannerReady(true);
    } catch (err: unknown) {
      setScanning(false);
      setScannerReady(false);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('permission') || msg.includes('NotAllowed')) {
        setCameraError('Camera permission denied. Please allow camera access and try again.');
      } else {
        setCameraError('Could not start camera. ' + msg);
      }
    }
  };

  const stopScanner = async () => {
    if (html5QrRef.current) {
      try {
        const scanner = html5QrRef.current as { stop: () => Promise<void>; clear: () => Promise<void>; isScanning: boolean };
        if (scanner.isScanning) {
          await scanner.stop();
        }
        await scanner.clear();
        html5QrRef.current = null;
      } catch (e) {
        // Ignore stop errors
      }
    }
    setScanning(false);
    setScannerReady(false);
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const handleScanResult = async (text: string) => {
    setError('');
    try {
      // Parse client ID from QR: loyaltyapp.com/client/{id}
      let clientId = text;
      const match = text.match(/\/client\/([a-f0-9-]+)/i);
      if (match) clientId = match[1];

      const found = await getClientById(clientId);
      setClient(found);
    } catch {
      setError('Invalid QR code or client not found. Please try again.');
    }
  };

  return (
    <main className="min-h-screen flex flex-col pb-24">
      <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-[var(--gold-dim)]/4 blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="p-6 pt-8 fade-up">
        <p className="text-xs uppercase tracking-widest text-[var(--muted)] mb-1">Operator</p>
        <h1 className="font-display text-3xl font-bold text-[var(--text)]">Scan QR Code</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Point camera at client's QR code</p>
      </header>

      <div className="px-6 space-y-5">
        {/* Scanner Area */}
        {!client && (
          <div className="fade-up delay-100">
            <div className="glass-card rounded-3xl overflow-hidden">
              {/* Camera view */}
              <div className="relative">
                <div
                  id="qr-reader"
                  ref={scannerRef}
                  className="w-full"
                  style={{ minHeight: scanning ? '300px' : '0' }}
                />

                {!scanning && (
                  <div className="aspect-square flex flex-col items-center justify-center p-8 gap-4">
                    <div className="w-20 h-20 rounded-3xl bg-[var(--gold-dim)]/10 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-10 h-10 text-[var(--gold-dim)]" fill="currentColor">
                        <path d="M9.5 6.5v3h-3v-3h3M11 5H5v6h6V5zm-1.5 9.5v3h-3v-3h3M11 13H5v6h6v-6zm6.5-6.5v3h-3v-3h3M19 5h-6v6h6V5zm-6 8h1.5v1.5H13V13zm1.5 1.5H16V16h-1.5v-1.5zM16 13h1.5v1.5H16V13zm-3 3h1.5v1.5H13V16zm1.5 1.5H16V19h-1.5v-1.5zM16 16h1.5v1.5H16V16zm1.5-1.5H19V16h-1.5v-1.5zm0 3H19V19h-1.5v-1.5z"/>
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-[var(--text-dim)] font-medium">Camera not active</p>
                      <p className="text-sm text-[var(--muted)] mt-1">Tap the button below to start scanning</p>
                    </div>
                  </div>
                )}

                {/* Scanning overlay */}
                {scanning && scannerReady && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="relative w-48 h-48">
                      {/* Corner brackets */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-l-3 border-t-3 border-[var(--gold)] rounded-tl-lg" style={{ borderWidth: '3px 0 0 3px' }} />
                      <div className="absolute top-0 right-0 w-8 h-8 border-r-3 border-t-3 border-[var(--gold)] rounded-tr-lg" style={{ borderWidth: '3px 3px 0 0' }} />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-l-3 border-b-3 border-[var(--gold)] rounded-bl-lg" style={{ borderWidth: '0 0 3px 3px' }} />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-r-3 border-b-3 border-[var(--gold)] rounded-br-lg" style={{ borderWidth: '0 3px 3px 0' }} />
                      {/* Scanning line */}
                      <div className="absolute left-0 right-0 h-0.5 bg-[var(--gold)] opacity-80 animate-bounce" style={{ top: '50%' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Camera error */}
              {cameraError && (
                <div className="p-4 bg-red-900/20 border-t border-red-900/40">
                  <p className="text-sm text-red-400">{cameraError}</p>
                </div>
              )}

              {/* Controls */}
              <div className="p-4">
                {!scanning ? (
                  <button
                    onClick={startScanner}
                    className="btn-gold w-full py-4 rounded-2xl text-base font-semibold flex items-center justify-center gap-2"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                      <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm-7 7H3v4h4v-2H5v-2zm14 0v2h-2v2h4v-4h-2zM3 9h2V7h2V5H3v4zm16-4v2h2v2h2V5h-4z"/>
                    </svg>
                    Start Camera
                  </button>
                ) : (
                  <button
                    onClick={stopScanner}
                    className="btn-ghost w-full py-4 rounded-2xl text-base font-semibold flex items-center justify-center gap-2"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                      <path d="M6 6h12v12H6z"/>
                    </svg>
                    Stop Scanning
                  </button>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-900/40 rounded-xl p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Client result */}
        {client && (
          <div className="fade-up">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-widest text-[var(--gold-dim)]">✓ Client Found</p>
              <button
                onClick={() => {
                  setClient(null);
                  setError('');
                  void startScanner();
                }}
                className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                Scan another
              </button>
            </div>
            <ClientCard
              client={client}
              onUpdate={updated => setClient(updated)}
              operatorId={operatorId}
            />
          </div>
        )}
      </div>

      <NavBar role="operator" />
    </main>
  );
}
