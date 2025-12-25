'use client';

import { useState, useEffect } from 'react';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  AlertTriangle,
  FileText,
  Calendar,
  Users,
  TrendingUp,
  Clock,
  Settings,
  Trash2,
  Filter,
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'compliance';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  category: 'system' | 'invoice' | 'compliance' | 'hr' | 'crm' | 'finance';
  actionUrl?: string;
  actionLabel?: string;
}

interface NotificationsCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

// Mock notifications for demo
const getMockNotifications = (): Notification[] => {
  const now = new Date();
  return [
    {
      id: '1',
      type: 'compliance',
      title: 'Termen SAF-T D406',
      message: 'Termenul pentru depunerea declarației D406 pentru noiembrie 2025 este pe 25 decembrie.',
      timestamp: new Date(now.getTime() - 1000 * 60 * 30), // 30 mins ago
      read: false,
      category: 'compliance',
      actionUrl: '/dashboard/saft',
      actionLabel: 'Generează D406',
    },
    {
      id: '2',
      type: 'success',
      title: 'e-Factura acceptată',
      message: 'Factura FV-2025-0156 a fost acceptată de ANAF SPV.',
      timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 2), // 2 hours ago
      read: false,
      category: 'invoice',
      actionUrl: '/dashboard/efactura',
      actionLabel: 'Vezi detalii',
    },
    {
      id: '3',
      type: 'warning',
      title: 'Stoc redus',
      message: 'Produsul "Laptop Premium" are stoc sub limita minimă (3 unități).',
      timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 4), // 4 hours ago
      read: true,
      category: 'system',
      actionUrl: '/dashboard/inventory',
      actionLabel: 'Gestionează stoc',
    },
    {
      id: '4',
      type: 'info',
      title: 'Contract expiră curând',
      message: 'Contractul angajatului Ion Popescu expiră în 30 de zile.',
      timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 24), // 1 day ago
      read: true,
      category: 'hr',
      actionUrl: '/dashboard/hr/contracts',
      actionLabel: 'Vezi contract',
    },
    {
      id: '5',
      type: 'success',
      title: 'Deal câștigat',
      message: 'Dealul "Proiect ERP Enterprise" a fost marcat ca Won (€45,000).',
      timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 48), // 2 days ago
      read: true,
      category: 'crm',
      actionUrl: '/dashboard/crm/deals',
      actionLabel: 'Vezi deal',
    },
    {
      id: '6',
      type: 'info',
      title: 'Curs valutar actualizat',
      message: 'Cursul BNR a fost actualizat: EUR = 4.9760 RON, USD = 4.7125 RON.',
      timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 72), // 3 days ago
      read: true,
      category: 'finance',
      actionUrl: '/dashboard/finance',
      actionLabel: 'Vezi cursuri',
    },
  ];
};

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'success':
      return <Check className="w-4 h-4 text-green-500" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    case 'error':
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    case 'compliance':
      return <FileText className="w-4 h-4 text-purple-500" />;
    default:
      return <Bell className="w-4 h-4 text-blue-500" />;
  }
};

const getCategoryIcon = (category: Notification['category']) => {
  switch (category) {
    case 'invoice':
      return <FileText className="w-3 h-3" />;
    case 'compliance':
      return <FileText className="w-3 h-3" />;
    case 'hr':
      return <Users className="w-3 h-3" />;
    case 'crm':
      return <TrendingUp className="w-3 h-3" />;
    case 'finance':
      return <TrendingUp className="w-3 h-3" />;
    default:
      return <Settings className="w-3 h-3" />;
  }
};

const getTypeColor = (type: Notification['type']) => {
  switch (type) {
    case 'success':
      return 'bg-green-50 border-green-200';
    case 'warning':
      return 'bg-yellow-50 border-yellow-200';
    case 'error':
      return 'bg-red-50 border-red-200';
    case 'compliance':
      return 'bg-purple-50 border-purple-200';
    default:
      return 'bg-blue-50 border-blue-200';
  }
};

const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Acum';
  if (diffMins < 60) return `Acum ${diffMins} min`;
  if (diffHours < 24) return `Acum ${diffHours} ore`;
  if (diffDays === 1) return 'Ieri';
  if (diffDays < 7) return `Acum ${diffDays} zile`;
  return date.toLocaleDateString('ro-RO');
};

export function NotificationsCenter({ isOpen, onClose }: NotificationsCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/v1/notifications');
      // const data = await response.json();
      // setNotifications(data);

      // Mock data for demo
      setNotifications(getMockNotifications());
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications(getMockNotifications());
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-800 shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-500" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Notificări</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-600 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-sm rounded-full ${
                filter === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              Toate
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 text-sm rounded-full ${
                filter === 'unread'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              Necitite ({unreadCount})
            </button>
          </div>
          <div className="flex gap-1">
            <button
              onClick={markAllAsRead}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title="Marchează toate ca citite"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
            <button
              onClick={clearAll}
              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100"
              title="Șterge toate"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-gray-500 mt-2 text-sm">Se încarcă...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">
                {filter === 'unread' ? 'Nicio notificare necitită' : 'Nicio notificare'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`flex-shrink-0 p-2 rounded-lg border ${getTypeColor(notification.type)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={`text-sm font-medium ${
                          !notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {notification.title}
                        </h3>
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="p-1 text-gray-400 hover:text-red-500 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimeAgo(notification.timestamp)}
                          </span>
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                            {getCategoryIcon(notification.category)}
                            {notification.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Citit
                            </button>
                          )}
                          {notification.actionUrl && (
                            <a
                              href={notification.actionUrl}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                              onClick={onClose}
                            >
                              {notification.actionLabel || 'Vezi'}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <a
            href="/dashboard/notifications"
            className="block text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
            onClick={onClose}
          >
            Vezi toate notificările
          </a>
        </div>
      </div>
    </div>
  );
}

export default NotificationsCenter;
