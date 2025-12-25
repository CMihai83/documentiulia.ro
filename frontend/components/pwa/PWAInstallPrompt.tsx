'use client';

import { useState, useEffect } from 'react';
import { X, Download, Smartphone, Monitor, Apple } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkStandalone = () => {
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://')
      );
    };

    setIsStandalone(checkStandalone());

    // Check if iOS
    const checkIOS = () => {
      const ua = window.navigator.userAgent;
      return /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    };

    setIsIOS(checkIOS());

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Show prompt after a delay if not dismissed before
      const dismissedAt = localStorage.getItem('pwa-prompt-dismissed');
      if (dismissedAt) {
        const dismissedDate = new Date(dismissedAt);
        const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceDismissed < 7) {
          return; // Don't show if dismissed within last 7 days
        }
      }

      setTimeout(() => {
        setShowPrompt(true);
      }, 5000); // Show after 5 seconds
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Check if should show iOS instructions
    if (checkIOS() && !checkStandalone()) {
      const iosPromptDismissed = localStorage.getItem('ios-prompt-dismissed');
      if (!iosPromptDismissed) {
        setTimeout(() => {
          setShowIOSInstructions(true);
        }, 10000); // Show after 10 seconds for iOS
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA installed');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', new Date().toISOString());
  };

  const handleIOSDismiss = () => {
    setShowIOSInstructions(false);
    localStorage.setItem('ios-prompt-dismissed', 'true');
  };

  // Don't show if already installed
  if (isStandalone) {
    return null;
  }

  // iOS install instructions
  if (showIOSInstructions && isIOS) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 safe-area-bottom">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 max-w-sm mx-auto">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Apple className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Instaleaza aplicatia</h3>
            </div>
            <button onClick={handleIOSDismiss} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-3">
            Adauga DocumentIulia pe ecranul principal pentru acces rapid:
          </p>

          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-medium">1</span>
              <span>Apasa pe <strong>Share</strong> (patrat cu sageata sus)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-medium">2</span>
              <span>Selecteaza <strong>&quot;Add to Home Screen&quot;</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-medium">3</span>
              <span>Apasa <strong>&quot;Add&quot;</strong></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Standard install prompt
  if (!showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 safe-area-bottom">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 max-w-sm mx-auto">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Download className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Instaleaza aplicatia</h3>
          </div>
          <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Instaleaza DocumentIulia pentru acces rapid, notificari si functionare offline.
        </p>

        <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
          <div className="flex items-center gap-1">
            <Smartphone className="h-4 w-4" />
            <span>Mobil</span>
          </div>
          <div className="flex items-center gap-1">
            <Monitor className="h-4 w-4" />
            <span>Desktop</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            Mai tarziu
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" />
            Instaleaza
          </button>
        </div>
      </div>
    </div>
  );
}
