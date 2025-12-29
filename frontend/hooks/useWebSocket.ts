'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

// WebSocket connection states
export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

// Event types for real-time updates
export type WebSocketEventType =
  | 'INVOICE_CREATED'
  | 'INVOICE_UPDATED'
  | 'INVOICE_DELETED'
  | 'INVOICE_STATUS_CHANGED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_UPDATED'
  | 'CRM_CONTACT_CREATED'
  | 'CRM_CONTACT_UPDATED'
  | 'CRM_DEAL_UPDATED'
  | 'CRM_PIPELINE_CHANGED'
  | 'CRM_ACTIVITY_CREATED'
  | 'HR_EMPLOYEE_UPDATED'
  | 'HR_CONTRACT_UPDATED'
  | 'HR_TIMESHEET_SUBMITTED'
  | 'INVENTORY_STOCK_UPDATED'
  | 'INVENTORY_ALERT'
  | 'SHIPMENT_STATUS_CHANGED'
  | 'SHIPMENT_TRACKING_UPDATE'
  | 'FLEET_VEHICLE_STATUS'
  | 'FLEET_GPS_UPDATE'
  | 'QUALITY_INSPECTION_COMPLETED'
  | 'QUALITY_NCR_CREATED'
  | 'QUALITY_CAPA_UPDATED'
  | 'ANAF_SUBMISSION_STATUS'
  | 'ANAF_EFACTURA_RESPONSE'
  | 'NOTIFICATION'
  | 'SYSTEM_ALERT'
  | 'USER_ACTIVITY'
  | 'DASHBOARD_REFRESH';

// WebSocket message structure
export interface WebSocketMessage<T = unknown> {
  type: WebSocketEventType;
  payload: T;
  timestamp: string;
  correlationId?: string;
  userId?: string;
  tenantId?: string;
}

// Subscription callback type
type SubscriptionCallback<T = unknown> = (message: WebSocketMessage<T>) => void;

// Hook options
interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
}

// Default configuration
const DEFAULT_OPTIONS: Required<UseWebSocketOptions> = {
  autoConnect: true,
  reconnect: true,
  reconnectInterval: 3000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
  onConnect: () => {},
  onDisconnect: () => {},
  onError: () => {},
  onMessage: () => {},
};

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const socketRef = useRef<WebSocket | null>(null);
  const subscriptionsRef = useRef<Map<WebSocketEventType, Set<SubscriptionCallback>>>(new Map());
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Get WebSocket URL from environment or fallback
  const getWebSocketUrl = useCallback(() => {
    const wsProtocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = process.env.NEXT_PUBLIC_WS_URL ||
      (typeof window !== 'undefined' ? `${wsProtocol}//${window.location.host}` : 'ws://localhost:3001');
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    return `${wsHost}/ws${token ? `?token=${token}` : ''}`;
  }, []);

  // Start heartbeat to keep connection alive
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }
    heartbeatRef.current = setInterval(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'PING', timestamp: new Date().toISOString() }));
      }
    }, config.heartbeatInterval);
  }, [config.heartbeatInterval]);

  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  // Handle incoming messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      // Handle PONG responses
      if (message.type === 'PONG' as WebSocketEventType) {
        return;
      }

      if (!isMountedRef.current) return;

      setLastMessage(message);
      config.onMessage(message);

      // Dispatch to subscribers
      const callbacks = subscriptionsRef.current.get(message.type);
      if (callbacks) {
        callbacks.forEach((callback) => callback(message));
      }

      // Also dispatch to wildcard subscribers (NOTIFICATION type receives all)
      const wildcardCallbacks = subscriptionsRef.current.get('NOTIFICATION');
      if (wildcardCallbacks && message.type !== 'NOTIFICATION') {
        wildcardCallbacks.forEach((callback) => callback(message));
      }
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error);
    }
  }, [config]);

  // Connect to WebSocket server
  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    if (!isMountedRef.current) return;

    setStatus('connecting');

    try {
      const wsUrl = getWebSocketUrl();
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        if (!isMountedRef.current) return;
        setStatus('connected');
        setReconnectAttempts(0);
        startHeartbeat();
        config.onConnect();

        // Send authentication message
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        if (token && socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            type: 'AUTH',
            payload: { token },
            timestamp: new Date().toISOString(),
          }));
        }
      };

      socketRef.current.onmessage = handleMessage;

      socketRef.current.onclose = () => {
        if (!isMountedRef.current) return;
        setStatus('disconnected');
        stopHeartbeat();
        config.onDisconnect();

        // Attempt reconnection
        if (config.reconnect && reconnectAttempts < config.maxReconnectAttempts) {
          setStatus('reconnecting');
          const delay = config.reconnectInterval * Math.pow(2, reconnectAttempts); // Exponential backoff
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts((prev) => prev + 1);
            connect();
          }, Math.min(delay, 30000)); // Max 30 seconds
        }
      };

      socketRef.current.onerror = (error) => {
        if (!isMountedRef.current) return;
        setStatus('error');
        config.onError(error);
        console.error('[WebSocket] Connection error:', error);
      };
    } catch (error) {
      setStatus('error');
      console.error('[WebSocket] Failed to create connection:', error);
    }
  }, [getWebSocketUrl, handleMessage, startHeartbeat, stopHeartbeat, config, reconnectAttempts]);

  // Disconnect from WebSocket server
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    stopHeartbeat();

    if (socketRef.current) {
      socketRef.current.close(1000, 'Client disconnecting');
      socketRef.current = null;
    }
    setStatus('disconnected');
  }, [stopHeartbeat]);

  // Send a message through WebSocket
  const send = useCallback(<T>(type: WebSocketEventType, payload: T, correlationId?: string) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] Cannot send message: not connected');
      return false;
    }

    const message: WebSocketMessage<T> = {
      type,
      payload,
      timestamp: new Date().toISOString(),
      correlationId: correlationId || crypto.randomUUID(),
    };

    try {
      socketRef.current.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('[WebSocket] Failed to send message:', error);
      return false;
    }
  }, []);

  // Subscribe to a specific event type
  const subscribe = useCallback(<T = unknown>(
    eventType: WebSocketEventType,
    callback: SubscriptionCallback<T>
  ) => {
    if (!subscriptionsRef.current.has(eventType)) {
      subscriptionsRef.current.set(eventType, new Set());
    }
    subscriptionsRef.current.get(eventType)!.add(callback as SubscriptionCallback);

    // Return unsubscribe function
    return () => {
      const callbacks = subscriptionsRef.current.get(eventType);
      if (callbacks) {
        callbacks.delete(callback as SubscriptionCallback);
        if (callbacks.size === 0) {
          subscriptionsRef.current.delete(eventType);
        }
      }
    };
  }, []);

  // Subscribe to multiple event types
  const subscribeMany = useCallback(<T = unknown>(
    eventTypes: WebSocketEventType[],
    callback: SubscriptionCallback<T>
  ) => {
    const unsubscribers = eventTypes.map((type) => subscribe(type, callback));
    return () => unsubscribers.forEach((unsub) => unsub());
  }, [subscribe]);

  // Reconnect manually
  const reconnect = useCallback(() => {
    disconnect();
    setReconnectAttempts(0);
    connect();
  }, [disconnect, connect]);

  // Auto-connect on mount
  useEffect(() => {
    isMountedRef.current = true;

    if (config.autoConnect) {
      connect();
    }

    return () => {
      isMountedRef.current = false;
      disconnect();
    };
  }, []);

  return {
    status,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting' || status === 'reconnecting',
    lastMessage,
    reconnectAttempts,
    connect,
    disconnect,
    reconnect,
    send,
    subscribe,
    subscribeMany,
  };
}

// Specialized hook for dashboard real-time updates
export function useDashboardUpdates(onUpdate?: (message: WebSocketMessage) => void) {
  const { subscribe, subscribeMany, isConnected, status } = useWebSocket({
    autoConnect: true,
    reconnect: true,
  });

  useEffect(() => {
    if (!onUpdate) return;

    const unsubscribe = subscribeMany([
      'INVOICE_CREATED',
      'INVOICE_UPDATED',
      'PAYMENT_RECEIVED',
      'CRM_DEAL_UPDATED',
      'INVENTORY_ALERT',
      'DASHBOARD_REFRESH',
      'SYSTEM_ALERT',
    ], onUpdate);

    return unsubscribe;
  }, [subscribeMany, onUpdate]);

  return { isConnected, status };
}

// Specialized hook for CRM pipeline updates
export function useCRMUpdates(onPipelineChange?: (message: WebSocketMessage) => void) {
  const { subscribe, subscribeMany, isConnected, send } = useWebSocket({
    autoConnect: true,
    reconnect: true,
  });

  useEffect(() => {
    if (!onPipelineChange) return;

    const unsubscribe = subscribeMany([
      'CRM_CONTACT_CREATED',
      'CRM_CONTACT_UPDATED',
      'CRM_DEAL_UPDATED',
      'CRM_PIPELINE_CHANGED',
      'CRM_ACTIVITY_CREATED',
    ], onPipelineChange);

    return unsubscribe;
  }, [subscribeMany, onPipelineChange]);

  const notifyPipelineChange = useCallback((dealId: string, newStage: string) => {
    send('CRM_PIPELINE_CHANGED', { dealId, newStage });
  }, [send]);

  return { isConnected, notifyPipelineChange };
}

// Specialized hook for shipment tracking
export function useShipmentTracking(shipmentId: string, onTrackingUpdate?: (message: WebSocketMessage) => void) {
  const { subscribe, isConnected, send } = useWebSocket({
    autoConnect: true,
    reconnect: true,
  });

  useEffect(() => {
    if (!onTrackingUpdate || !shipmentId) return;

    // Subscribe and filter by shipment ID
    const unsubscribe = subscribe<{ shipmentId: string }>('SHIPMENT_TRACKING_UPDATE', (message) => {
      if (message.payload.shipmentId === shipmentId) {
        onTrackingUpdate(message);
      }
    });

    // Request tracking updates for this shipment
    send('SHIPMENT_TRACKING_UPDATE', { shipmentId, action: 'subscribe' });

    return () => {
      unsubscribe();
      send('SHIPMENT_TRACKING_UPDATE', { shipmentId, action: 'unsubscribe' });
    };
  }, [subscribe, send, shipmentId, onTrackingUpdate]);

  return { isConnected };
}

// Specialized hook for fleet GPS tracking
export function useFleetTracking(vehicleIds?: string[], onGPSUpdate?: (message: WebSocketMessage) => void) {
  const { subscribe, isConnected, send } = useWebSocket({
    autoConnect: true,
    reconnect: true,
  });

  useEffect(() => {
    if (!onGPSUpdate) return;

    const unsubscribe = subscribe<{ vehicleId: string }>('FLEET_GPS_UPDATE', (message) => {
      if (!vehicleIds || vehicleIds.includes(message.payload.vehicleId)) {
        onGPSUpdate(message);
      }
    });

    // Request GPS updates for vehicles
    if (vehicleIds) {
      send('FLEET_GPS_UPDATE', { vehicleIds, action: 'subscribe' });
    }

    return () => {
      unsubscribe();
      if (vehicleIds) {
        send('FLEET_GPS_UPDATE', { vehicleIds, action: 'unsubscribe' });
      }
    };
  }, [subscribe, send, vehicleIds, onGPSUpdate]);

  return { isConnected };
}

// Specialized hook for ANAF status updates
export function useANAFUpdates(onStatusChange?: (message: WebSocketMessage) => void) {
  const { subscribe, subscribeMany, isConnected } = useWebSocket({
    autoConnect: true,
    reconnect: true,
  });

  useEffect(() => {
    if (!onStatusChange) return;

    const unsubscribe = subscribeMany([
      'ANAF_SUBMISSION_STATUS',
      'ANAF_EFACTURA_RESPONSE',
    ], onStatusChange);

    return unsubscribe;
  }, [subscribeMany, onStatusChange]);

  return { isConnected };
}

// Specialized hook for inventory alerts
export function useInventoryAlerts(onAlert?: (message: WebSocketMessage) => void) {
  const { subscribe, subscribeMany, isConnected } = useWebSocket({
    autoConnect: true,
    reconnect: true,
  });

  useEffect(() => {
    if (!onAlert) return;

    const unsubscribe = subscribeMany([
      'INVENTORY_STOCK_UPDATED',
      'INVENTORY_ALERT',
    ], onAlert);

    return unsubscribe;
  }, [subscribeMany, onAlert]);

  return { isConnected };
}

// Specialized hook for quality module updates
export function useQualityUpdates(onUpdate?: (message: WebSocketMessage) => void) {
  const { subscribe, subscribeMany, isConnected } = useWebSocket({
    autoConnect: true,
    reconnect: true,
  });

  useEffect(() => {
    if (!onUpdate) return;

    const unsubscribe = subscribeMany([
      'QUALITY_INSPECTION_COMPLETED',
      'QUALITY_NCR_CREATED',
      'QUALITY_CAPA_UPDATED',
    ], onUpdate);

    return unsubscribe;
  }, [subscribeMany, onUpdate]);

  return { isConnected };
}

// Notification bell hook
export function useNotifications(onNotification?: (message: WebSocketMessage) => void) {
  const [unreadCount, setUnreadCount] = useState(0);
  const { subscribe, isConnected } = useWebSocket({
    autoConnect: true,
    reconnect: true,
  });

  useEffect(() => {
    const unsubscribe = subscribe('NOTIFICATION', (message) => {
      setUnreadCount((prev) => prev + 1);
      onNotification?.(message);
    });

    return unsubscribe;
  }, [subscribe, onNotification]);

  const clearUnread = useCallback(() => {
    setUnreadCount(0);
  }, []);

  return { isConnected, unreadCount, clearUnread };
}

export default useWebSocket;
