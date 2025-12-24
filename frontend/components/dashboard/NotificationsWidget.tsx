'use client';

import { useState, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Info,
  Clock,
  X,
  ChevronRight,
  Settings,
  RefreshCw
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'alert' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  category: 'compliance' | 'finance' | 'hr' | 'system' | 'deadline';
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'warning',
    title: 'Termen SAF-T D406',
    message: 'Declaratia D406 trebuie depusa pana pe 25 decembrie 2025',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    read: false,
    actionUrl: '/dashboard/saft',
    actionLabel: 'Genereaza D406',
    category: 'compliance',
  },
  {
    id: '2',
    type: 'alert',
    title: 'Facturi neplatite',
    message: '3 facturi depasesc termenul de scadenta cu peste 30 zile',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    read: false,
    actionUrl: '/dashboard/finance',
    actionLabel: 'Vezi facturile',
    category: 'finance',
  },
  {
    id: '3',
    type: 'success',
    title: 'e-Factura trimisa',
    message: 'Factura INV-2025-0089 a fost validata si inregistrata la ANAF',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
    read: true,
    category: 'compliance',
  },
  {
    id: '4',
    type: 'info',
    title: 'Actualizare TVA',
    message: 'Noile cote TVA (21%/11%) intra in vigoare din August 2025',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    read: true,
    actionUrl: '/dashboard/vat',
    actionLabel: 'Detalii',
    category: 'compliance',
  },
  {
    id: '5',
    type: 'warning',
    title: 'Contract expira',
    message: 'Contractul angajatului Ion Popescu expira in 7 zile',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
    read: false,
    actionUrl: '/dashboard/hr',
    actionLabel: 'Reinnoire',
    category: 'hr',
  },
];

export function NotificationsWidget() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const token = localStorage.getItem('auth_token');

      const response = await fetch(`${API_URL}/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Ensure API response is an array
        setNotifications(Array.isArray(data) ? data : MOCK_NOTIFICATIONS);
      } else {
        // Use mock data as fallback
        setNotifications(MOCK_NOTIFICATIONS);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setNotifications(MOCK_NOTIFICATIONS);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getBgColor = (type: string, read: boolean) => {
    if (read) return 'bg-gray-50';
    switch (type) {
      case 'alert':
        return 'bg-red-50';
      case 'warning':
        return 'bg-yellow-50';
      case 'success':
        return 'bg-green-50';
      default:
        return 'bg-blue-50';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}z`;
  };

  // Ensure notifications is always an array before filtering
  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const unreadCount = safeNotifications.filter(n => !n.read).length;
  const displayNotifications = showAll ? safeNotifications : safeNotifications.slice(0, 4);

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
          <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
          Notificari
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </h2>
        <button
          onClick={fetchNotifications}
          className="p-1.5 text-gray-400 hover:text-gray-600 transition"
          title="Reincarca"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-2">
        {displayNotifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nicio notificare noua</p>
          </div>
        ) : (
          displayNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-3 rounded-lg ${getBgColor(notification.type, notification.read)} transition-all hover:shadow-sm`}
              onClick={() => markAsRead(notification.id)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getIcon(notification.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={`text-sm font-medium ${notification.read ? 'text-gray-600' : 'text-gray-900'}`}>
                      {notification.title}
                    </h4>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(notification.timestamp)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissNotification(notification.id);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{notification.message}</p>
                  {notification.actionUrl && (
                    <a
                      href={notification.actionUrl}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 mt-2"
                    >
                      {notification.actionLabel || 'Vezi detalii'}
                      <ChevronRight className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {notifications.length > 4 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-3 py-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          {showAll ? 'Arata mai putin' : `Vezi toate (${notifications.length})`}
        </button>
      )}
    </div>
  );
}
