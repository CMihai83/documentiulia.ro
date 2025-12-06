'use client';

import { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  X,
  Bell,
  BellRing,
  MessageSquare,
} from 'lucide-react';

// Alert Component
type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

const alertStyles: Record<AlertVariant, { bg: string; border: string; icon: string; title: string }> = {
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-500',
    title: 'text-blue-800 dark:text-blue-300',
  },
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    icon: 'text-green-500',
    title: 'text-green-800 dark:text-green-300',
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-800',
    icon: 'text-yellow-500',
    title: 'text-yellow-800 dark:text-yellow-300',
  },
  danger: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-500',
    title: 'text-red-800 dark:text-red-300',
  },
};

const defaultIcons: Record<AlertVariant, ReactNode> = {
  info: <Info className="w-5 h-5" />,
  success: <CheckCircle className="w-5 h-5" />,
  warning: <AlertTriangle className="w-5 h-5" />,
  danger: <AlertCircle className="w-5 h-5" />,
};

export function Alert({
  variant = 'info',
  title,
  children,
  dismissible = false,
  onDismiss,
  icon,
  action,
  className = '',
}: AlertProps) {
  const [isVisible, setIsVisible] = useState(true);
  const styles = alertStyles[variant];

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`rounded-lg border p-4 ${styles.bg} ${styles.border} ${className}`}
    >
      <div className="flex gap-3">
        <div className={`flex-shrink-0 ${styles.icon}`}>{icon || defaultIcons[variant]}</div>
        <div className="flex-1 min-w-0">
          {title && <h4 className={`font-medium mb-1 ${styles.title}`}>{title}</h4>}
          <div className="text-sm text-gray-600 dark:text-gray-400">{children}</div>
          {action && <div className="mt-3">{action}</div>}
        </div>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// Inline Alert (simpler, no borders)
interface InlineAlertProps {
  variant?: AlertVariant;
  children: ReactNode;
  className?: string;
}

export function InlineAlert({ variant = 'info', children, className = '' }: InlineAlertProps) {
  const styles = alertStyles[variant];

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <span className={styles.icon}>{defaultIcons[variant]}</span>
      <span className="text-gray-600 dark:text-gray-400">{children}</span>
    </div>
  );
}

// Banner Alert (full-width, top of page)
interface BannerAlertProps {
  variant?: AlertVariant;
  children: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function BannerAlert({
  variant = 'info',
  children,
  dismissible = false,
  onDismiss,
  action,
  className = '',
}: BannerAlertProps) {
  const [isVisible, setIsVisible] = useState(true);

  const bannerColors: Record<AlertVariant, string> = {
    info: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`${bannerColors[variant]} text-white ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {defaultIcons[variant]}
            <p className="text-sm font-medium">{children}</p>
          </div>
          <div className="flex items-center gap-3">
            {action && (
              <button
                onClick={action.onClick}
                className="text-sm font-medium underline hover:no-underline"
              >
                {action.label}
              </button>
            )}
            {dismissible && (
              <button onClick={handleDismiss} className="hover:bg-white/20 rounded p-1">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Notification Item (for notification lists)
interface NotificationItemProps {
  title: string;
  description?: string;
  time?: string;
  read?: boolean;
  icon?: ReactNode;
  variant?: 'default' | 'info' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const notificationIconColors: Record<NotificationItemProps['variant'] & string, string> = {
  default: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
  success: 'bg-green-100 dark:bg-green-900/30 text-green-600',
  warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600',
  danger: 'bg-red-100 dark:bg-red-900/30 text-red-600',
};

export function NotificationItem({
  title,
  description,
  time,
  read = false,
  icon,
  variant = 'default',
  onClick,
  onDismiss,
  className = '',
}: NotificationItemProps) {
  return (
    <div
      onClick={onClick}
      className={`
        flex items-start gap-3 p-4
        ${onClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800' : ''}
        ${!read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}
        ${className}
      `}
    >
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${notificationIconColors[variant]}`}>
        {icon || <Bell className="w-5 h-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm ${!read ? 'font-semibold' : 'font-medium'} text-gray-900 dark:text-white`}>
            {title}
          </p>
          {!read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
        </div>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{description}</p>
        )}
        {time && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{time}</p>}
      </div>
      {onDismiss && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// Notification Center (floating panel)
interface NotificationCenterProps {
  notifications: Array<{
    id: string;
    title: string;
    description?: string;
    time?: string;
    read?: boolean;
    variant?: NotificationItemProps['variant'];
  }>;
  onNotificationClick?: (id: string) => void;
  onNotificationDismiss?: (id: string) => void;
  onMarkAllRead?: () => void;
  onClearAll?: () => void;
  className?: string;
}

export function NotificationCenter({
  notifications,
  onNotificationClick,
  onNotificationDismiss,
  onMarkAllRead,
  onClearAll,
  className = '',
}: NotificationCenterProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className={`w-80 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <BellRing className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Notificări</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-primary text-white rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && onMarkAllRead && (
          <button
            onClick={onMarkAllRead}
            className="text-xs text-primary hover:text-primary/80 font-medium"
          >
            Marchează toate citite
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
        {notifications.length === 0 ? (
          <div className="py-8 text-center">
            <Bell className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Nicio notificare</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              {...notification}
              onClick={() => onNotificationClick?.(notification.id)}
              onDismiss={() => onNotificationDismiss?.(notification.id)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && onClearAll && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 text-center">
          <button
            onClick={onClearAll}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Șterge toate notificările
          </button>
        </div>
      )}
    </div>
  );
}

// Callout (highlighted info box)
interface CalloutProps {
  variant?: 'note' | 'tip' | 'important' | 'warning' | 'caution';
  title?: string;
  children: ReactNode;
  className?: string;
}

const calloutStyles: Record<CalloutProps['variant'] & string, { bg: string; border: string; icon: ReactNode; title: string }> = {
  note: {
    bg: 'bg-gray-50 dark:bg-gray-800/50',
    border: 'border-l-gray-400',
    icon: <MessageSquare className="w-5 h-5 text-gray-500" />,
    title: 'text-gray-700 dark:text-gray-300',
  },
  tip: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-l-green-500',
    icon: <CheckCircle className="w-5 h-5 text-green-500" />,
    title: 'text-green-700 dark:text-green-300',
  },
  important: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-l-blue-500',
    icon: <Info className="w-5 h-5 text-blue-500" />,
    title: 'text-blue-700 dark:text-blue-300',
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-l-yellow-500',
    icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
    title: 'text-yellow-700 dark:text-yellow-300',
  },
  caution: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-l-red-500',
    icon: <AlertCircle className="w-5 h-5 text-red-500" />,
    title: 'text-red-700 dark:text-red-300',
  },
};

export function Callout({ variant = 'note', title, children, className = '' }: CalloutProps) {
  const styles = calloutStyles[variant];

  return (
    <div className={`border-l-4 ${styles.border} ${styles.bg} rounded-r-lg p-4 ${className}`}>
      <div className="flex gap-3">
        <div className="flex-shrink-0">{styles.icon}</div>
        <div>
          {title && <h4 className={`font-medium mb-1 ${styles.title}`}>{title}</h4>}
          <div className="text-sm text-gray-600 dark:text-gray-400">{children}</div>
        </div>
      </div>
    </div>
  );
}

// Floating Notification (toast-like but positioned)
interface FloatingNotificationProps {
  show: boolean;
  variant?: AlertVariant;
  title: string;
  description?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  duration?: number;
  onClose?: () => void;
  className?: string;
}

const positionClasses = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
};

export function FloatingNotification({
  show,
  variant = 'info',
  title,
  description,
  position = 'top-right',
  duration = 5000,
  onClose,
  className = '',
}: FloatingNotificationProps) {
  const [isVisible, setIsVisible] = useState(show);

  useState(() => {
    if (show && duration) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  });

  const styles = alertStyles[variant];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: position.includes('right') ? 100 : -100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: position.includes('right') ? 100 : -100 }}
          className={`fixed ${positionClasses[position]} z-50 ${className}`}
        >
          <div className={`w-80 rounded-lg border shadow-lg p-4 ${styles.bg} ${styles.border}`}>
            <div className="flex gap-3">
              <div className={`flex-shrink-0 ${styles.icon}`}>{defaultIcons[variant]}</div>
              <div className="flex-1">
                <h4 className={`font-medium ${styles.title}`}>{title}</h4>
                {description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
                )}
              </div>
              <button
                onClick={() => {
                  setIsVisible(false);
                  onClose?.();
                }}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
