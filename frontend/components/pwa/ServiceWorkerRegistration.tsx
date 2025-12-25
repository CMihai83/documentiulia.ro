'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, X, Wifi, WifiOff } from 'lucide-react';

export function ServiceWorkerRegistration() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      registerServiceWorker();
    }

    // Monitor online/offline status
    const handleOnline = () => {
      setIsOffline(false);
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    setIsOffline(!navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const registerServiceWorker = async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      setRegistration(reg);
      console.log('[App] Service Worker registered');

      // Check for updates
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New update available
            setShowUpdatePrompt(true);
          }
        });
      });

      // Periodic update check (every hour)
      setInterval(() => {
        reg.update();
      }, 60 * 60 * 1000);

    } catch (error) {
      console.error('[App] Service Worker registration failed:', error);
    }
  };

  const handleUpdate = () => {
    if (registration?.waiting) {
      // Tell the waiting service worker to take over
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    // Reload the page to use the new version
    window.location.reload();
  };

  const handleDismissUpdate = () => {
    setShowUpdatePrompt(false);
  };

  return (
    <>
      {/* Offline indicator */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-yellow-900 px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 safe-area-top">
          <WifiOff className="h-4 w-4" />
          <span>Esti offline. Unele functionalitati nu sunt disponibile.</span>
        </div>
      )}

      {/* Update prompt */}
      {showUpdatePrompt && (
        <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
          <div className="bg-blue-600 text-white rounded-xl shadow-2xl p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                <h3 className="font-semibold">Update disponibil</h3>
              </div>
              <button onClick={handleDismissUpdate} className="text-blue-200 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-blue-100 mb-4">
              O versiune noua a aplicatiei este disponibila. Actualizeaza pentru cele mai noi functionalitati.
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleDismissUpdate}
                className="flex-1 px-4 py-2 text-sm font-medium text-blue-100 bg-blue-700 rounded-lg hover:bg-blue-800 transition"
              >
                Mai tarziu
              </button>
              <button
                onClick={handleUpdate}
                className="flex-1 px-4 py-2 text-sm font-medium text-blue-600 bg-white rounded-lg hover:bg-blue-50 transition flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Actualizeaza
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
