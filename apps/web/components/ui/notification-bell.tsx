'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: Date | string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  avatar?: string;
  icon?: React.ReactNode;
}

export type NotificationBellSize = 'sm' | 'md' | 'lg';
export type NotificationBellVariant = 'default' | 'ghost' | 'outline';

const sizeClasses: Record<NotificationBellSize, { button: string; icon: string }> = {
  sm: { button: 'w-8 h-8', icon: 'w-4 h-4' },
  md: { button: 'w-10 h-10', icon: 'w-5 h-5' },
  lg: { button: 'w-12 h-12', icon: 'w-6 h-6' },
};

const variantClasses: Record<NotificationBellVariant, string> = {
  default: 'bg-background hover:bg-accent',
  ghost: 'hover:bg-accent',
  outline: 'border border-input bg-background hover:bg-accent',
};

// ============================================================================
// Notification Bell Component
// ============================================================================

interface NotificationBellProps {
  notifications?: Notification[];
  unreadCount?: number;
  size?: NotificationBellSize;
  variant?: NotificationBellVariant;
  maxVisible?: number;
  onNotificationClick?: (notification: Notification) => void;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onClear?: () => void;
  onViewAll?: () => void;
  className?: string;
}

export function NotificationBell({
  notifications = [],
  unreadCount,
  size = 'md',
  variant = 'ghost',
  maxVisible = 5,
  onNotificationClick,
  onMarkAsRead,
  onMarkAllAsRead,
  onClear,
  onViewAll,
  className,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const count = unreadCount ?? notifications.filter((n) => !n.read).length;
  const visibleNotifications = notifications.slice(0, maxVisible);

  // Close on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={menuRef} className={cn('relative', className)}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          'relative inline-flex items-center justify-center rounded-lg transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          sizeClasses[size].button,
          variantClasses[variant]
        )}
      >
        <BellIcon className={sizeClasses[size].icon} />

        {/* Badge */}
        <AnimatePresence>
          {count > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className={cn(
                'absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1',
                'flex items-center justify-center rounded-full',
                'bg-destructive text-destructive-foreground text-[10px] font-medium'
              )}
            >
              {count > 99 ? '99+' : count}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 rounded-lg border bg-popover shadow-lg z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-sm">Notificări</h3>
              {count > 0 && onMarkAllAsRead && (
                <button
                  onClick={onMarkAllAsRead}
                  className="text-xs text-primary hover:underline"
                >
                  Marchează toate ca citite
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {visibleNotifications.length > 0 ? (
                visibleNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={() => {
                      onNotificationClick?.(notification);
                      if (!notification.read) {
                        onMarkAsRead?.(notification.id);
                      }
                    }}
                  />
                ))
              ) : (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  <BellOffIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Nu aveți notificări noi</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {(onViewAll || onClear) && notifications.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                {onViewAll && (
                  <button
                    onClick={() => {
                      onViewAll();
                      setIsOpen(false);
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Vezi toate notificările
                  </button>
                )}
                {onClear && (
                  <button
                    onClick={onClear}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Șterge toate
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Notification Item
// ============================================================================

interface NotificationItemProps {
  notification: Notification;
  onClick?: () => void;
}

function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const typeColors = {
    info: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  const formatTime = (timestamp: Date | string) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Acum';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}z`;
    return date.toLocaleDateString('ro-RO');
  };

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
      className={cn(
        'w-full px-4 py-3 text-left transition-colors',
        !notification.read && 'bg-accent/50'
      )}
    >
      <div className="flex gap-3">
        {/* Icon/Avatar */}
        <div className="shrink-0">
          {notification.avatar ? (
            <img
              src={notification.avatar}
              alt=""
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : notification.icon ? (
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              typeColors[notification.type],
              'text-white'
            )}>
              {notification.icon}
            </div>
          ) : (
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              typeColors[notification.type],
              'text-white'
            )}>
              <NotificationTypeIcon type={notification.type} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={cn(
              'text-sm line-clamp-1',
              !notification.read && 'font-medium'
            )}>
              {notification.title}
            </p>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatTime(notification.timestamp)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {notification.message}
          </p>
          {notification.action && (
            <span className="text-xs text-primary mt-1 inline-block">
              {notification.action.label}
            </span>
          )}
        </div>

        {/* Unread indicator */}
        {!notification.read && (
          <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
        )}
      </div>
    </motion.button>
  );
}

// ============================================================================
// Icons
// ============================================================================

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}

function BellOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11M6 10.5V11c0 .538-.214 1.055-.595 1.436L4 14h3m4 3v1a3 3 0 01-3 3c-.825 0-1.576-.334-2.121-.879M21 21l-18-18"
      />
    </svg>
  );
}

function NotificationTypeIcon({ type }: { type: Notification['type'] }) {
  const icons = {
    info: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    success: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return icons[type];
}

// ============================================================================
// Animated Notification Bell
// ============================================================================

interface AnimatedNotificationBellProps extends NotificationBellProps {
  animate?: boolean;
}

export function AnimatedNotificationBell({
  animate = true,
  ...props
}: AnimatedNotificationBellProps) {
  const count = props.unreadCount ?? props.notifications?.filter((n) => !n.read).length ?? 0;

  return (
    <motion.div
      animate={animate && count > 0 ? {
        rotate: [0, -10, 10, -10, 10, 0],
      } : {}}
      transition={{
        duration: 0.5,
        repeat: animate && count > 0 ? Infinity : 0,
        repeatDelay: 5,
      }}
    >
      <NotificationBell {...props} />
    </motion.div>
  );
}

// ============================================================================
// Notification Badge Only
// ============================================================================

interface NotificationBadgeProps {
  count: number;
  max?: number;
  variant?: 'default' | 'destructive' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const badgeVariantClasses = {
  default: 'bg-primary text-primary-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
  success: 'bg-green-500 text-white',
  warning: 'bg-yellow-500 text-white',
};

const badgeSizeClasses = {
  sm: 'min-w-[16px] h-[16px] text-[9px]',
  md: 'min-w-[20px] h-[20px] text-[10px]',
  lg: 'min-w-[24px] h-[24px] text-xs',
};

export function NotificationBadge({
  count,
  max = 99,
  variant = 'destructive',
  size = 'md',
  className,
}: NotificationBadgeProps) {
  if (count <= 0) return null;

  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      className={cn(
        'inline-flex items-center justify-center px-1 rounded-full font-medium',
        badgeVariantClasses[variant],
        badgeSizeClasses[size],
        className
      )}
    >
      {count > max ? `${max}+` : count}
    </motion.span>
  );
}

// ============================================================================
// Accounting-Specific: Invoice Notification Bell
// ============================================================================

interface InvoiceNotification extends Notification {
  invoiceNumber?: string;
  amount?: number;
  currency?: string;
  dueDate?: Date | string;
}

interface InvoiceNotificationBellProps {
  notifications: InvoiceNotification[];
  onNotificationClick?: (notification: InvoiceNotification) => void;
  onViewInvoice?: (invoiceNumber: string) => void;
  className?: string;
}

export function InvoiceNotificationBell({
  notifications,
  onNotificationClick,
  onViewInvoice,
  className,
}: InvoiceNotificationBellProps) {
  const formatCurrency = (amount: number, currency: string = 'RON') => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const enhancedNotifications = notifications.map((n) => ({
    ...n,
    message: n.amount
      ? `${n.message} - ${formatCurrency(n.amount, n.currency)}`
      : n.message,
    action: n.invoiceNumber
      ? {
          label: `Vezi factura ${n.invoiceNumber}`,
          onClick: () => onViewInvoice?.(n.invoiceNumber!),
        }
      : n.action,
  }));

  return (
    <NotificationBell
      notifications={enhancedNotifications}
      onNotificationClick={(n) => onNotificationClick?.(n as InvoiceNotification)}
      className={className}
    />
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  type NotificationBellProps,
  type NotificationItemProps,
  type AnimatedNotificationBellProps,
  type NotificationBadgeProps,
  type InvoiceNotification,
  type InvoiceNotificationBellProps,
};
