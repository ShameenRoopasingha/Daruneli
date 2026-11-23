'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Download, X, Share } from 'lucide-react';
import { useMotherPortal } from '@/lib/motherPortalI18n';

export const InstallPwaBanner: React.FC = () => {
  const { t } = useMotherPortal();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if already in standalone PWA mode
    const isRunningStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isRunningStandalone) {
      setIsStandalone(true);
      return;
    }

    // Check if previously dismissed in this session
    const isDismissed = sessionStorage.getItem('daruneli_pwa_dismissed') === 'true';
    if (!isDismissed) {
      setDismissed(false);
    }

    // iOS detection
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(ua);
    setIsIos(isAppleDevice);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isDismissed) {
        setDismissed(false);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDismissed(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('daruneli_pwa_dismissed', 'true');
  };

  if (isStandalone || dismissed) {
    return null;
  }

  return (
    <div className="mx-4 mt-3 mb-2 p-3 bg-gradient-to-r from-teal-50 to-teal-100/70 dark:from-slate-800 dark:to-teal-950/60 rounded-2xl border border-teal-200/80 dark:border-teal-800/60 shadow-sm flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="relative w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-teal-300 bg-white shadow-xs">
          <Image
            src="/images/daruneli-emblem.png"
            alt="Daruneli Icon"
            fill
            sizes="36px"
            className="object-contain"
          />
        </div>
        <div className="min-w-0">
          <h4 className="text-xs font-black text-teal-950 dark:text-teal-100 truncate">
            {t.brand.name} • {t.nav.install}
          </h4>
          {isIos ? (
            <p className="text-[11px] text-teal-800 dark:text-teal-300 flex items-center gap-1 font-medium mt-0.5">
              <span>Tap</span>
              <Share className="w-3 h-3 inline text-teal-600" />
              <span>Share → Add to Home Screen</span>
            </p>
          ) : (
            <p className="text-[11px] text-teal-700 dark:text-teal-300 font-medium truncate">
              Fast 1-tap offline access for daily kick counting
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {!isIos && deferredPrompt && (
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs flex items-center gap-1 min-h-[36px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
        )}
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label="Close install prompt"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
