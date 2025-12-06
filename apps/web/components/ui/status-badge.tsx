'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types & Constants
// ============================================================================

export type StatusBadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'pending'
  | 'draft'
  | 'active'
  | 'inactive';

export type StatusBadgeSize = 'xs' | 'sm' | 'md' | 'lg';

const variantClasses: Record<StatusBadgeVariant, { bg: string; text: string; dot: string }> = {
  default: { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground' },
  success: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500' },
  warning: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', dot: 'bg-yellow-500' },
  error: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
  info: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
  pending: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
  draft: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400' },
  active: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  inactive: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-400' },
};

const sizeClasses: Record<StatusBadgeSize, { badge: string; dot: string; icon: string }> = {
  xs: { badge: 'text-[10px] px-1.5 py-0.5', dot: 'w-1.5 h-1.5', icon: 'w-2.5 h-2.5' },
  sm: { badge: 'text-xs px-2 py-0.5', dot: 'w-2 h-2', icon: 'w-3 h-3' },
  md: { badge: 'text-sm px-2.5 py-1', dot: 'w-2 h-2', icon: 'w-4 h-4' },
  lg: { badge: 'text-base px-3 py-1.5', dot: 'w-2.5 h-2.5', icon: 'w-5 h-5' },
};

// ============================================================================
// Status Badge Component
// ============================================================================

interface StatusBadgeProps {
  variant?: StatusBadgeVariant;
  size?: StatusBadgeSize;
  children: React.ReactNode;
  icon?: React.ReactNode;
  showDot?: boolean;
  pulseDot?: boolean;
  className?: string;
}

export function StatusBadge({
  variant = 'default',
  size = 'sm',
  children,
  icon,
  showDot = false,
  pulseDot = false,
  className,
}: StatusBadgeProps) {
  const colors = variantClasses[variant];
  const sizes = sizeClasses[size];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        colors.bg,
        colors.text,
        sizes.badge,
        className
      )}
    >
      {showDot && (
        <span className="relative flex">
          <span className={cn('rounded-full', colors.dot, sizes.dot)} />
          {pulseDot && (
            <span
              className={cn(
                'absolute inset-0 rounded-full animate-ping opacity-75',
                colors.dot
              )}
            />
          )}
        </span>
      )}
      {icon && <span className={sizes.icon}>{icon}</span>}
      {children}
    </span>
  );
}

// ============================================================================
// Status Dot Component (minimal)
// ============================================================================

interface StatusDotProps {
  status: StatusBadgeVariant;
  size?: StatusBadgeSize;
  pulse?: boolean;
  label?: string;
  className?: string;
}

export function StatusDot({
  status,
  size = 'sm',
  pulse = false,
  label,
  className,
}: StatusDotProps) {
  const colors = variantClasses[status];
  const sizes = sizeClasses[size];

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="relative flex">
        <span className={cn('rounded-full', colors.dot, sizes.dot)} />
        {pulse && (
          <span
            className={cn(
              'absolute inset-0 rounded-full animate-ping opacity-75',
              colors.dot
            )}
          />
        )}
      </span>
      {label && <span className={cn('text-sm', colors.text)}>{label}</span>}
    </span>
  );
}

// ============================================================================
// Invoice Status Badge
// ============================================================================

type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'partial' | 'overdue' | 'cancelled';

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  size?: StatusBadgeSize;
  showIcon?: boolean;
}

export function InvoiceStatusBadge({
  status,
  size = 'sm',
  showIcon = true,
}: InvoiceStatusBadgeProps) {
  const config: Record<InvoiceStatus, { variant: StatusBadgeVariant; label: string; icon: React.ReactNode }> = {
    draft: {
      variant: 'draft',
      label: 'Ciorna',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
    sent: {
      variant: 'info',
      label: 'Trimisa',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      ),
    },
    viewed: {
      variant: 'info',
      label: 'Vizualizata',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
    },
    paid: {
      variant: 'success',
      label: 'Platita',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    partial: {
      variant: 'warning',
      label: 'Partial platita',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    overdue: {
      variant: 'error',
      label: 'Restanta',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    cancelled: {
      variant: 'inactive',
      label: 'Anulata',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
  };

  const { variant, label, icon } = config[status];

  return (
    <StatusBadge variant={variant} size={size} icon={showIcon ? icon : undefined}>
      {label}
    </StatusBadge>
  );
}

// ============================================================================
// Payment Status Badge
// ============================================================================

type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  size?: StatusBadgeSize;
}

export function PaymentStatusBadge({ status, size = 'sm' }: PaymentStatusBadgeProps) {
  const config: Record<PaymentStatus, { variant: StatusBadgeVariant; label: string }> = {
    pending: { variant: 'pending', label: 'In asteptare' },
    processing: { variant: 'info', label: 'Se proceseaza' },
    completed: { variant: 'success', label: 'Finalizata' },
    failed: { variant: 'error', label: 'Esuata' },
    refunded: { variant: 'warning', label: 'Rambursata' },
  };

  const { variant, label } = config[status];

  return (
    <StatusBadge variant={variant} size={size} showDot pulseDot={status === 'processing'}>
      {label}
    </StatusBadge>
  );
}

// ============================================================================
// Order Status Badge
// ============================================================================

type OrderStatus = 'new' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  size?: StatusBadgeSize;
}

export function OrderStatusBadge({ status, size = 'sm' }: OrderStatusBadgeProps) {
  const config: Record<OrderStatus, { variant: StatusBadgeVariant; label: string }> = {
    new: { variant: 'info', label: 'Noua' },
    confirmed: { variant: 'success', label: 'Confirmata' },
    processing: { variant: 'pending', label: 'In procesare' },
    shipped: { variant: 'info', label: 'Expediata' },
    delivered: { variant: 'success', label: 'Livrata' },
    cancelled: { variant: 'error', label: 'Anulata' },
    returned: { variant: 'warning', label: 'Returnata' },
  };

  const { variant, label } = config[status];

  return (
    <StatusBadge variant={variant} size={size} showDot>
      {label}
    </StatusBadge>
  );
}

// ============================================================================
// User Status Badge
// ============================================================================

type UserStatus = 'online' | 'away' | 'busy' | 'offline';

interface UserStatusBadgeProps {
  status: UserStatus;
  showLabel?: boolean;
  size?: StatusBadgeSize;
}

export function UserStatusBadge({ status, showLabel = true, size = 'sm' }: UserStatusBadgeProps) {
  const config: Record<UserStatus, { variant: StatusBadgeVariant; label: string }> = {
    online: { variant: 'success', label: 'Online' },
    away: { variant: 'warning', label: 'Plecat' },
    busy: { variant: 'error', label: 'Ocupat' },
    offline: { variant: 'inactive', label: 'Offline' },
  };

  const { variant, label } = config[status];

  if (!showLabel) {
    return <StatusDot status={variant} size={size} />;
  }

  return (
    <StatusBadge variant={variant} size={size} showDot pulseDot={status === 'online'}>
      {label}
    </StatusBadge>
  );
}

// ============================================================================
// Task Status Badge
// ============================================================================

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';

interface TaskStatusBadgeProps {
  status: TaskStatus;
  size?: StatusBadgeSize;
}

export function TaskStatusBadge({ status, size = 'sm' }: TaskStatusBadgeProps) {
  const config: Record<TaskStatus, { variant: StatusBadgeVariant; label: string }> = {
    todo: { variant: 'default', label: 'De facut' },
    in_progress: { variant: 'info', label: 'In lucru' },
    review: { variant: 'warning', label: 'In revizie' },
    done: { variant: 'success', label: 'Finalizat' },
    blocked: { variant: 'error', label: 'Blocat' },
  };

  const { variant, label } = config[status];

  return (
    <StatusBadge variant={variant} size={size} showDot>
      {label}
    </StatusBadge>
  );
}

// ============================================================================
// Subscription Status Badge
// ============================================================================

type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired';

interface SubscriptionStatusBadgeProps {
  status: SubscriptionStatus;
  daysLeft?: number;
  size?: StatusBadgeSize;
}

export function SubscriptionStatusBadge({
  status,
  daysLeft,
  size = 'sm',
}: SubscriptionStatusBadgeProps) {
  const config: Record<SubscriptionStatus, { variant: StatusBadgeVariant; label: string }> = {
    trial: { variant: 'info', label: 'Trial' },
    active: { variant: 'success', label: 'Activ' },
    past_due: { variant: 'warning', label: 'Plata intarziata' },
    cancelled: { variant: 'inactive', label: 'Anulat' },
    expired: { variant: 'error', label: 'Expirat' },
  };

  const { variant, label } = config[status];

  return (
    <StatusBadge variant={variant} size={size} showDot>
      {label}
      {status === 'trial' && daysLeft !== undefined && (
        <span className="opacity-75">({daysLeft} zile)</span>
      )}
    </StatusBadge>
  );
}

// ============================================================================
// Document Status Badge
// ============================================================================

type DocumentStatus = 'uploading' | 'processing' | 'ready' | 'error' | 'archived';

interface DocumentStatusBadgeProps {
  status: DocumentStatus;
  size?: StatusBadgeSize;
}

export function DocumentStatusBadge({ status, size = 'sm' }: DocumentStatusBadgeProps) {
  const config: Record<DocumentStatus, { variant: StatusBadgeVariant; label: string }> = {
    uploading: { variant: 'info', label: 'Se incarca' },
    processing: { variant: 'pending', label: 'Se proceseaza' },
    ready: { variant: 'success', label: 'Gata' },
    error: { variant: 'error', label: 'Eroare' },
    archived: { variant: 'inactive', label: 'Arhivat' },
  };

  const { variant, label } = config[status];

  return (
    <StatusBadge
      variant={variant}
      size={size}
      showDot
      pulseDot={status === 'uploading' || status === 'processing'}
    >
      {label}
    </StatusBadge>
  );
}

// ============================================================================
// E-Factura Status Badge
// ============================================================================

type EFacturaStatus = 'draft' | 'validating' | 'sent' | 'accepted' | 'rejected' | 'error';

interface EFacturaStatusBadgeProps {
  status: EFacturaStatus;
  size?: StatusBadgeSize;
  errorMessage?: string;
}

export function EFacturaStatusBadge({
  status,
  size = 'sm',
  errorMessage,
}: EFacturaStatusBadgeProps) {
  const config: Record<EFacturaStatus, { variant: StatusBadgeVariant; label: string }> = {
    draft: { variant: 'draft', label: 'Ciorna' },
    validating: { variant: 'pending', label: 'Se valideaza' },
    sent: { variant: 'info', label: 'Trimisa SPV' },
    accepted: { variant: 'success', label: 'Acceptata ANAF' },
    rejected: { variant: 'error', label: 'Respinsa' },
    error: { variant: 'error', label: 'Eroare' },
  };

  const { variant, label } = config[status];

  return (
    <div className="inline-flex flex-col gap-0.5">
      <StatusBadge
        variant={variant}
        size={size}
        showDot
        pulseDot={status === 'validating'}
      >
        {label}
      </StatusBadge>
      {errorMessage && status === 'rejected' && (
        <span className="text-xs text-destructive">{errorMessage}</span>
      )}
    </div>
  );
}

// ============================================================================
// Animated Status Badge
// ============================================================================

interface AnimatedStatusBadgeProps extends StatusBadgeProps {
  animate?: boolean;
}

export function AnimatedStatusBadge({
  animate = true,
  children,
  ...props
}: AnimatedStatusBadgeProps) {
  if (!animate) {
    return <StatusBadge {...props}>{children}</StatusBadge>;
  }

  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <StatusBadge {...props}>{children}</StatusBadge>
    </motion.span>
  );
}
