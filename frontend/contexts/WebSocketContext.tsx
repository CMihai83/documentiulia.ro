'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useWebSocket, WebSocketMessage, WebSocketEventType, WebSocketStatus } from '@/hooks/useWebSocket';
import { useToast } from '@/components/ui/Toast';

interface WebSocketContextValue {
  status: WebSocketStatus;
  isConnected: boolean;
  isConnecting: boolean;
  lastMessage: WebSocketMessage | null;
  reconnectAttempts: number;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  send: <T>(type: WebSocketEventType, payload: T, correlationId?: string) => boolean;
  subscribe: <T = unknown>(eventType: WebSocketEventType, callback: (message: WebSocketMessage<T>) => void) => () => void;
  subscribeMany: <T = unknown>(eventTypes: WebSocketEventType[], callback: (message: WebSocketMessage<T>) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
  enableNotifications?: boolean;
}

export function WebSocketProvider({ children, enableNotifications = true }: WebSocketProviderProps) {
  const toast = useToast();
  const [hasShownConnectionToast, setHasShownConnectionToast] = useState(false);

  const handleConnect = useCallback(() => {
    if (!hasShownConnectionToast) {
      setHasShownConnectionToast(true);
    }
  }, [hasShownConnectionToast]);

  const handleDisconnect = useCallback(() => {
    // Only show disconnect toast if we were previously connected
    if (hasShownConnectionToast) {
      toast.warning('Conexiune pierdută', 'Se încearcă reconectarea automată...');
    }
  }, [toast, hasShownConnectionToast]);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    if (!enableNotifications) return;

    // Handle system notifications
    if (message.type === 'NOTIFICATION' || message.type === 'SYSTEM_ALERT') {
      const payload = message.payload as { title?: string; message?: string; type?: string };
      const notifType = payload.type || 'info';
      if (notifType === 'error') {
        toast.error(payload.title || 'Notificare', payload.message);
      } else if (notifType === 'warning') {
        toast.warning(payload.title || 'Notificare', payload.message);
      } else if (notifType === 'success') {
        toast.success(payload.title || 'Notificare', payload.message);
      } else {
        toast.info(payload.title || 'Notificare', payload.message);
      }
    }

    // Handle ANAF responses
    if (message.type === 'ANAF_EFACTURA_RESPONSE' || message.type === 'ANAF_SUBMISSION_STATUS') {
      const payload = message.payload as { status?: string; message?: string; invoiceNumber?: string };
      const isSuccess = payload.status === 'ACCEPTED' || payload.status === 'SUCCESS';
      if (isSuccess) {
        toast.compliance('ANAF: Acceptat', payload.message || `Factura ${payload.invoiceNumber || ''} procesată`);
      } else {
        toast.warning('ANAF: Răspuns primit', payload.message || `Factura ${payload.invoiceNumber || ''} procesată`);
      }
    }

    // Handle inventory alerts
    if (message.type === 'INVENTORY_ALERT') {
      const payload = message.payload as { productName?: string; currentStock?: number; minStock?: number };
      toast.warning('Alertă stoc', `${payload.productName || 'Produs'}: stoc scăzut (${payload.currentStock || 0}/${payload.minStock || 0})`);
    }

    // Handle payment received
    if (message.type === 'PAYMENT_RECEIVED') {
      const payload = message.payload as { amount?: number; currency?: string; invoiceNumber?: string };
      toast.success('Plată primită', `${payload.amount || 0} ${payload.currency || 'RON'} pentru factura ${payload.invoiceNumber || ''}`);
    }

    // Handle shipment updates
    if (message.type === 'SHIPMENT_STATUS_CHANGED') {
      const payload = message.payload as { trackingNumber?: string; status?: string };
      toast.info('Expediere actualizată', `${payload.trackingNumber || ''}: ${payload.status || 'Status actualizat'}`);
    }

    // Handle quality NCR created
    if (message.type === 'QUALITY_NCR_CREATED') {
      const payload = message.payload as { ncrNumber?: string; severity?: string };
      if (payload.severity === 'CRITICAL') {
        toast.error('NCR nou creat', `${payload.ncrNumber || ''} - Severitate: ${payload.severity || 'N/A'}`);
      } else {
        toast.warning('NCR nou creat', `${payload.ncrNumber || ''} - Severitate: ${payload.severity || 'N/A'}`);
      }
    }
  }, [toast, enableNotifications]);

  const ws = useWebSocket({
    autoConnect: true,
    reconnect: true,
    maxReconnectAttempts: 10,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
    onMessage: handleMessage,
  });

  return (
    <WebSocketContext.Provider value={ws}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}

// Connection status indicator component
export function WebSocketStatusIndicator() {
  const { status, reconnectAttempts } = useWebSocketContext();

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
      case 'reconnecting':
        return 'bg-yellow-500 animate-pulse';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Conectat';
      case 'connecting':
        return 'Se conectează...';
      case 'reconnecting':
        return `Reconectare (${reconnectAttempts})...`;
      case 'error':
        return 'Eroare conexiune';
      default:
        return 'Deconectat';
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
      <span className="text-muted-foreground">{getStatusText()}</span>
    </div>
  );
}

export default WebSocketProvider;
