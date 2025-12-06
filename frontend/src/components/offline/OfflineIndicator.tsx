import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { useOffline } from '../../hooks/useOffline';

interface OfflineIndicatorProps {
  position?: 'top' | 'bottom';
  showSyncStatus?: boolean;
}

export function OfflineIndicator({
  position = 'bottom',
  showSyncStatus = true,
}: OfflineIndicatorProps) {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    syncError,
    manualSync,
  } = useOffline();

  const [showBanner, setShowBanner] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  // Show banner when coming back online after being offline
  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowBanner(true);
    } else if (wasOffline && pendingCount === 0) {
      // Just came online and synced
      setTimeout(() => {
        setShowBanner(false);
        setWasOffline(false);
      }, 3000);
    }
  }, [isOnline, wasOffline, pendingCount]);

  // Always show if offline or has pending changes
  const shouldShow = !isOnline || (showBanner && pendingCount > 0) || syncError;

  if (!shouldShow) return null;

  const positionClasses = position === 'top'
    ? 'top-0 safe-area-top'
    : 'bottom-16 sm:bottom-0 safe-area-bottom';

  return (
    <div
      className={`fixed left-0 right-0 z-50 ${positionClasses} transition-transform duration-300`}
    >
      <div
        className={`mx-4 mb-4 rounded-xl shadow-lg p-4 ${
          !isOnline
            ? 'bg-amber-500 text-white'
            : syncError
            ? 'bg-red-500 text-white'
            : 'bg-green-500 text-white'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!isOnline ? (
              <>
                <WifiOff className="w-5 h-5" />
                <div>
                  <p className="font-medium">Mod offline</p>
                  <p className="text-sm opacity-90">
                    Modificările vor fi salvate local
                  </p>
                </div>
              </>
            ) : syncError ? (
              <>
                <AlertCircle className="w-5 h-5" />
                <div>
                  <p className="font-medium">Eroare sincronizare</p>
                  <p className="text-sm opacity-90">{syncError}</p>
                </div>
              </>
            ) : isSyncing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <div>
                  <p className="font-medium">Se sincronizează...</p>
                  <p className="text-sm opacity-90">
                    {pendingCount} elemente în așteptare
                  </p>
                </div>
              </>
            ) : pendingCount > 0 ? (
              <>
                <Cloud className="w-5 h-5" />
                <div>
                  <p className="font-medium">Conectat</p>
                  <p className="text-sm opacity-90">
                    {pendingCount} modificări nesincronizate
                  </p>
                </div>
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                <div>
                  <p className="font-medium">Sincronizat</p>
                  <p className="text-sm opacity-90">
                    Toate datele sunt actualizate
                  </p>
                </div>
              </>
            )}
          </div>

          {showSyncStatus && isOnline && pendingCount > 0 && !isSyncing && (
            <button
              onClick={manualSync}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
            >
              Sincronizează
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function OfflineBadge() {
  const { isOnline, pendingCount, isSyncing } = useOffline();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
      {isSyncing ? (
        <>
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span>Sincronizare...</span>
        </>
      ) : !isOnline ? (
        <>
          <CloudOff className="w-3 h-3" />
          <span>Offline</span>
        </>
      ) : (
        <>
          <Cloud className="w-3 h-3" />
          <span>{pendingCount} nesincronizate</span>
        </>
      )}
    </div>
  );
}

export function SyncStatusIcon() {
  const { isOnline, isSyncing, pendingCount } = useOffline();

  if (!isOnline) {
    return <WifiOff className="w-5 h-5 text-amber-500" />;
  }

  if (isSyncing) {
    return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
  }

  if (pendingCount > 0) {
    return (
      <div className="relative">
        <Cloud className="w-5 h-5 text-amber-500" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 text-white text-[10px] rounded-full flex items-center justify-center">
          {pendingCount > 9 ? '9+' : pendingCount}
        </span>
      </div>
    );
  }

  return <Wifi className="w-5 h-5 text-green-500" />;
}

export default OfflineIndicator;
