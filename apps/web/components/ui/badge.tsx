'use client';

import { ReactNode } from 'react';
import { LucideIcon, X } from 'lucide-react';

type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: LucideIcon;
  removable?: boolean;
  onRemove?: () => void;
  dot?: boolean;
  outline?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, { solid: string; outline: string }> = {
  default: {
    solid: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
    outline: 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300',
  },
  primary: {
    solid: 'bg-primary/10 text-primary',
    outline: 'border-primary text-primary',
  },
  secondary: {
    solid: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    outline: 'border-purple-400 text-purple-600 dark:text-purple-400',
  },
  success: {
    solid: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    outline: 'border-green-400 text-green-600 dark:text-green-400',
  },
  warning: {
    solid: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    outline: 'border-yellow-400 text-yellow-600 dark:text-yellow-400',
  },
  danger: {
    solid: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    outline: 'border-red-400 text-red-600 dark:text-red-400',
  },
  info: {
    solid: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    outline: 'border-blue-400 text-blue-600 dark:text-blue-400',
  },
};

const sizeStyles: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0.5 text-xs',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-sm',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-gray-500',
  primary: 'bg-primary',
  secondary: 'bg-purple-500',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
};

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  icon: Icon,
  removable = false,
  onRemove,
  dot = false,
  outline = false,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full
        ${sizeStyles[size]}
        ${outline ? `border ${variantStyles[variant].outline}` : variantStyles[variant].solid}
        ${className}
      `}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />
      )}
      {Icon && <Icon className="w-3 h-3" />}
      {children}
      {removable && (
        <button
          onClick={onRemove}
          className="ml-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

// Status Badge with predefined styles
interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'completed' | 'cancelled' | 'draft' | 'paid' | 'unpaid' | 'overdue';
  size?: BadgeSize;
  className?: string;
}

const statusConfig: Record<StatusBadgeProps['status'], { label: string; variant: BadgeVariant; dot?: boolean }> = {
  active: { label: 'Activ', variant: 'success', dot: true },
  inactive: { label: 'Inactiv', variant: 'default', dot: true },
  pending: { label: 'In asteptare', variant: 'warning', dot: true },
  completed: { label: 'Finalizat', variant: 'success' },
  cancelled: { label: 'Anulat', variant: 'danger' },
  draft: { label: 'Ciorna', variant: 'default' },
  paid: { label: 'Platit', variant: 'success' },
  unpaid: { label: 'Neplatit', variant: 'warning' },
  overdue: { label: 'Intarziat', variant: 'danger' },
};

export function StatusBadge({ status, size = 'sm', className = '' }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} size={size} dot={config.dot} className={className}>
      {config.label}
    </Badge>
  );
}

// Counter Badge (for notifications, etc.)
interface CounterBadgeProps {
  count: number;
  max?: number;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
}

export function CounterBadge({ count, max = 99, variant = 'danger', size = 'sm', className = '' }: CounterBadgeProps) {
  const displayCount = count > max ? `${max}+` : count;

  const sizeClasses = {
    sm: 'min-w-[18px] h-[18px] text-xs',
    md: 'min-w-[22px] h-[22px] text-sm',
  };

  const variantClasses: Record<BadgeVariant, string> = {
    default: 'bg-gray-500 text-white',
    primary: 'bg-primary text-white',
    secondary: 'bg-purple-500 text-white',
    success: 'bg-green-500 text-white',
    warning: 'bg-yellow-500 text-white',
    danger: 'bg-red-500 text-white',
    info: 'bg-blue-500 text-white',
  };

  return (
    <span
      className={`
        inline-flex items-center justify-center font-medium rounded-full px-1
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {displayCount}
    </span>
  );
}

// Tag component (similar to badge but for categories/labels)
interface TagProps {
  children: ReactNode;
  color?: string;
  removable?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
}

export function Tag({ children, color, removable = false, onRemove, onClick, className = '' }: TagProps) {
  const style = color ? { backgroundColor: `${color}20`, color: color, borderColor: `${color}40` } : {};

  return (
    <span
      onClick={onClick}
      style={style}
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded-lg
        ${color ? 'border' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}
        ${onClick ? 'cursor-pointer hover:opacity-80' : ''}
        ${className}
      `}
    >
      {children}
      {removable && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
          className="hover:bg-black/10 dark:hover:bg-white/10 rounded p-0.5"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

// Priority Badge
interface PriorityBadgeProps {
  priority: 'low' | 'medium' | 'high' | 'urgent';
  size?: BadgeSize;
  className?: string;
}

const priorityConfig: Record<PriorityBadgeProps['priority'], { label: string; variant: BadgeVariant }> = {
  low: { label: 'Scazut', variant: 'default' },
  medium: { label: 'Mediu', variant: 'info' },
  high: { label: 'Ridicat', variant: 'warning' },
  urgent: { label: 'Urgent', variant: 'danger' },
};

export function PriorityBadge({ priority, size = 'sm', className = '' }: PriorityBadgeProps) {
  const config = priorityConfig[priority];
  return (
    <Badge variant={config.variant} size={size} className={className}>
      {config.label}
    </Badge>
  );
}
