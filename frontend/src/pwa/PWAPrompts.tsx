import React from 'react';
import { Download, RefreshCw, WifiOff, X } from 'lucide-react';
import { usePWA } from './usePWA';

export function InstallPrompt() {
  const { isInstallable, isInstalled, installApp } = usePWA();
  const [isDismissed, setIsDismissed] = React.useState(false);

  if (!isInstallable || isInstalled || isDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
          <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Instalează DocumentIulia
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Adaugă aplicația pe ecranul principal pentru acces rapid și funcționare offline.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={installApp}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Instalează
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Mai târziu
            </button>
          </div>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export function UpdatePrompt() {
  const { isUpdateAvailable, updateApp, dismissUpdate } = usePWA();

  if (!isUpdateAvailable) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-blue-200 dark:border-blue-700 p-4 z-50 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
          <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Actualizare disponibilă
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            O nouă versiune a aplicației este disponibilă. Actualizează acum pentru cele mai noi funcționalități.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={updateApp}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Actualizează
            </button>
            <button
              onClick={dismissUpdate}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Mai târziu
            </button>
          </div>
        </div>
        <button
          onClick={dismissUpdate}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export function OfflineBanner() {
  const { isOffline } = usePWA();

  if (!isOffline) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-yellow-900 px-4 py-2 flex items-center justify-center gap-2 z-50 text-sm font-medium">
      <WifiOff className="w-4 h-4" />
      <span>Ești offline. Unele funcționalități pot fi limitate.</span>
    </div>
  );
}

export function PWAProviderUI() {
  return (
    <>
      <OfflineBanner />
      <InstallPrompt />
      <UpdatePrompt />
    </>
  );
}

export default PWAProviderUI;
