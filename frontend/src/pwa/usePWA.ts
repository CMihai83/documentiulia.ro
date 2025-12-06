import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  isUpdateAvailable: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
}

interface PWAActions {
  installApp: () => Promise<boolean>;
  updateApp: () => void;
  dismissUpdate: () => void;
}

export function usePWA(): PWAState & PWAActions {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOffline: !navigator.onLine,
    isUpdateAvailable: false,
    installPrompt: null,
  });

  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check if app is installed
  useEffect(() => {
    const isInstalled =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    setState(prev => ({ ...prev, isInstalled }));
  }, []);

  // Listen for install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setState(prev => ({
        ...prev,
        isInstallable: true,
        installPrompt: e as BeforeInstallPromptEvent,
      }));
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Listen for app installed
  useEffect(() => {
    const handler = () => {
      setState(prev => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        installPrompt: null,
      }));
    };

    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, []);

  // Listen for online/offline status
  useEffect(() => {
    const handleOnline = () => setState(prev => ({ ...prev, isOffline: false }));
    const handleOffline = () => setState(prev => ({ ...prev, isOffline: true }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Register service worker and listen for updates
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        setRegistration(reg);

        // Check for updates periodically
        const checkInterval = setInterval(() => {
          reg.update().catch(console.error);
        }, 60 * 60 * 1000); // Every hour

        return () => clearInterval(checkInterval);
      });

      // Listen for new service worker
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // New service worker activated, reload might be needed
        console.log('New service worker activated');
      });
    }
  }, []);

  // Listen for waiting service worker (update available)
  useEffect(() => {
    if (!registration) return;

    const handleUpdate = () => {
      if (registration.waiting) {
        setState(prev => ({ ...prev, isUpdateAvailable: true }));
      }
    };

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            handleUpdate();
          }
        });
      }
    });

    // Check if there's already a waiting worker
    handleUpdate();
  }, [registration]);

  const installApp = useCallback(async (): Promise<boolean> => {
    if (!state.installPrompt) {
      console.warn('Install prompt not available');
      return false;
    }

    try {
      await state.installPrompt.prompt();
      const { outcome } = await state.installPrompt.userChoice;

      if (outcome === 'accepted') {
        setState(prev => ({
          ...prev,
          isInstallable: false,
          installPrompt: null,
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error installing app:', error);
      return false;
    }
  }, [state.installPrompt]);

  const updateApp = useCallback(() => {
    if (registration?.waiting) {
      // Tell the waiting service worker to skip waiting and activate
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      // Reload the page to use the new service worker
      window.location.reload();
    }
  }, [registration]);

  const dismissUpdate = useCallback(() => {
    setState(prev => ({ ...prev, isUpdateAvailable: false }));
  }, []);

  return {
    ...state,
    installApp,
    updateApp,
    dismissUpdate,
  };
}

export default usePWA;
