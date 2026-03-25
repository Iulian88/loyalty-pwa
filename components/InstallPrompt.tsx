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
            <img src="/icons/logo-mark.png" alt="" className="w-5 h-5 object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text)]">Instalează aplicația</p>
            {isIOS ? (
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Apasă <strong className="text-[var(--text-dim)]">Share</strong> apoi{' '}
                <strong className="text-[var(--text-dim)]">Add to Home Screen</strong>
              </p>
            ) : (
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Acces rapid, fără App Store
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
