'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Real-time ANAF Status Hook - DocumentIulia.ro
 * Uses Server-Sent Events (SSE) for real-time ANAF e-Factura status updates
 * Fallback to polling for browsers without SSE support
 */

export interface AnafStatusUpdate {
  type: 'efactura' | 'saft' | 'vat' | 'general';
  status: 'pending' | 'processing' | 'accepted' | 'rejected' | 'error';
  message: string;
  messageRo: string;
  documentId?: string;
  uploadIndex?: string;
  timestamp: string;
  details?: Record<string, any>;
}

interface UseAnafStatusOptions {
  onStatusUpdate?: (status: AnafStatusUpdate) => void;
  onError?: (error: Error) => void;
  onConnectionChange?: (connected: boolean) => void;
  pollingInterval?: number;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
}

export function useAnafStatus(options: UseAnafStatusOptions = {}) {
  const {
    onStatusUpdate,
    onError,
    onConnectionChange,
    pollingInterval = 30000,
    autoReconnect = true,
    maxReconnectAttempts = 5,
  } = options;

  const { token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastStatus, setLastStatus] = useState<AnafStatusUpdate | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;

    const poll = async () => {
      try {
        const response = await fetch('/api/v1/anaf/status', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.latestUpdate) {
            setLastStatus(data.latestUpdate);
            onStatusUpdate?.(data.latestUpdate);
          }
          setIsConnected(true);
          setError(null);
        }
      } catch (e) {
        setIsConnected(false);
        setError(e as Error);
        onError?.(e as Error);
      }
    };

    poll();
    pollingIntervalRef.current = setInterval(poll, pollingInterval);
  }, [token, pollingInterval, onStatusUpdate, onError]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const connectSSE = useCallback(() => {
    if (!token || typeof window === 'undefined') return;

    if (!('EventSource' in window)) {
      console.warn('SSE not supported, falling back to polling');
      startPolling();
      return;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const encodedToken = encodeURIComponent(token);
    const url = `/api/v1/anaf/status/stream?token=${encodedToken}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
      reconnectAttemptsRef.current = 0;
      onConnectionChange?.(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data: AnafStatusUpdate = JSON.parse(event.data);
        setLastStatus(data);
        onStatusUpdate?.(data);
      } catch (e) {
        console.error('Failed to parse SSE message:', e);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      onConnectionChange?.(false);

      const err = new Error('SSE connection error');
      setError(err);
      onError?.(err);

      eventSource.close();

      if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        setTimeout(connectSSE, delay);
      } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        startPolling();
      }
    };

    eventSource.addEventListener('efactura', (event: MessageEvent) => {
      try {
        const data: AnafStatusUpdate = JSON.parse(event.data);
        data.type = 'efactura';
        setLastStatus(data);
        onStatusUpdate?.(data);
      } catch (e) {
        console.error('Failed to parse e-Factura event:', e);
      }
    });

    eventSource.addEventListener('saft', (event: MessageEvent) => {
      try {
        const data: AnafStatusUpdate = JSON.parse(event.data);
        data.type = 'saft';
        setLastStatus(data);
        onStatusUpdate?.(data);
      } catch (e) {
        console.error('Failed to parse SAF-T event:', e);
      }
    });
  }, [token, onStatusUpdate, onError, onConnectionChange, autoReconnect, maxReconnectAttempts, startPolling]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    stopPolling();
    setIsConnected(false);
  }, [stopPolling]);

  useEffect(() => {
    connectSSE();
    return () => disconnect();
  }, [connectSSE, disconnect]);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/anaf/status', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.latestUpdate) {
          setLastStatus(data.latestUpdate);
          onStatusUpdate?.(data.latestUpdate);
        }
      }
    } catch (e) {
      console.error('Manual refresh failed:', e);
    }
  }, [token, onStatusUpdate]);

  return {
    isConnected,
    lastStatus,
    error,
    refresh,
    disconnect,
    reconnect: connectSSE,
  };
}

export function useDocumentAnafStatus(documentId: string) {
  const [status, setStatus] = useState<AnafStatusUpdate | null>(null);

  const { lastStatus, isConnected, error } = useAnafStatus({
    onStatusUpdate: (update) => {
      if (update.documentId === documentId) {
        setStatus(update);
      }
    },
  });

  return { status, isConnected, error, lastStatus };
}
