'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  Receipt,
  Upload,
  Settings,
  X,
  Check,
  MoreHorizontal,
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'invoice' | 'deadline' | 'alert' | 'success' | 'receipt' | 'system';
  title: string;
  message: string;
  time: string;
  read: boolean;
  actionUrl?: string;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'deadline',
    title: 'Termen TVA Aproape',
    message: 'D300 trebuie depusă până pe 25 decembrie',
    time: 'Acum 5 min',
    read: false,
  },
  {
    id: '2',
    type: 'invoice',
    title: 'Factură Nouă Primită',
    message: 'SC Exemplu SRL - 2.450,00 RON',
    time: 'Acum 1 oră',
    read: false,
    actionUrl: '/invoices',
  },
  {
    id: '3',
    type: 'receipt',
    title: 'Bon Procesat cu Succes',
    message: 'OCR a extras 15 produse din bonul fiscal',
    time: 'Acum 2 ore',
    read: false,
    actionUrl: '/receipts',
  },
  {
    id: '4',
    type: 'alert',
    title: 'Atenție: Limită Cheltuieli',
    message: 'Ai atins 85% din bugetul lunar pentru Birouri',
    time: 'Acum 3 ore',
    read: true,
  },
  {
    id: '5',
    type: 'success',
    title: 'Raport SAF-T Generat',
    message: 'Raportul pentru Q3 2025 este gata',
    time: 'Ieri',
    read: true,
    actionUrl: '/saft',
  },
  {
    id: '6',
    type: 'system',
    title: 'Actualizare Sistem',
    message: 'Noi funcționalități disponibile pentru e-Factura',
    time: 'Ieri',
    read: true,
  },
];

const notificationIcons = {
  invoice: FileText,
  deadline: Calendar,
  alert: AlertTriangle,
  success: CheckCircle,
  receipt: Receipt,
  system: Settings,
};

const notificationColors = {
  invoice: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  deadline: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  alert: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  success: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  receipt: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  system: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
};

export function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredNotifications = filter === 'unread'
    ? notifications.filter((n) => !n.read)
    : notifications;

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Notificări"
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-red-500 rounded-full px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Notificări
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                    {unreadCount} noi
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-primary hover:underline"
                >
                  Marchează toate ca citite
                </button>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-800">
              <button
                onClick={() => setFilter('all')}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Toate
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  filter === 'unread'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Necitite
              </button>
            </div>

            {/* Notifications list */}
            <div className="max-h-[400px] overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Nu ai notificări {filter === 'unread' ? 'necitite' : ''}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredNotifications.map((notification) => {
                    const Icon = notificationIcons[notification.type];
                    const colorClass = notificationColors[notification.type];

                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group ${
                          !notification.read ? 'bg-primary/5' : ''
                        }`}
                        onClick={() => {
                          markAsRead(notification.id);
                          if (notification.actionUrl) {
                            setIsOpen(false);
                          }
                        }}
                      >
                        <div className="flex gap-3">
                          {/* Icon */}
                          <div className={`p-2 rounded-lg ${colorClass}`}>
                            <Icon className="w-4 h-4" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm ${!notification.read ? 'font-semibold' : 'font-medium'} text-gray-900 dark:text-white`}>
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {notification.time}
                              </span>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!notification.read && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsRead(notification.id);
                                    }}
                                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                                    title="Marchează ca citit"
                                  >
                                    <Check className="w-3.5 h-3.5 text-gray-500" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeNotification(notification.id);
                                  }}
                                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                                  title="Șterge"
                                >
                                  <X className="w-3.5 h-3.5 text-gray-500" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
              >
                Vezi toate notificările
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
