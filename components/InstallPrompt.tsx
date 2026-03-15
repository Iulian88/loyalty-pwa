'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // iOS detection
    const ua = navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(ua);
    setIsIOS(iOS);

    // Show iOS tip after delay
    if (iOS) {
      const dismissed = localStorage.getItem('pwa_ios_dismissed');
      if (!dismissed) {
        setTimeout(() => setShowBanner(true), 2000);
      }
      return;
    }

    // Android / Chrome
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const dismissed = localStorage.getItem('pwa_dismissed');
      if (!dismissed) setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setShowBanner(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem(isIOS ? 'pwa_ios_dismissed' : 'pwa_dismissed', '1');
  };

  if (isInstalled || !showBanner) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 fade-up">
      <div className="glass-card rounded-2xl p-4 border border-[var(--gold-dim)]/30 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--gold-dim)] to-[var(--gold-light)] flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-[var(--dark)]" fill="currentColor">
              <path d="M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM19 3l-6 6 2 2 7-7V3z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text)]">Add to Home Screen</p>
            {isIOS ? (
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Tap <strong className="text-[var(--text-dim)]">Share</strong> then{' '}
                <strong className="text-[var(--text-dim)]">Add to Home Screen</strong>
              </p>
            ) : (
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Install for quick access, no App Store needed
              </p>
            )}
          </div>
          <button onClick={handleDismiss} className="text-[var(--muted)] hover:text-[var(--text)] transition-colors p-1">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        {!isIOS && deferredPrompt && (
          <button
            onClick={handleInstall}
            className="btn-gold w-full mt-3 py-2 px-4 rounded-xl text-sm font-semibold"
          >
            Install App
          </button>
        )}
      </div>
    </div>
  );
}
