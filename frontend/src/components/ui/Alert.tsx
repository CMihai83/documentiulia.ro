import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

type AlertVariant = 'success' | 'warning' | 'error' | 'info';

interface AlertProps {
  variant: AlertVariant;
  title?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const variantConfig = {
  success: {
    icon: CheckCircle,
    className: 'alert-success',
    iconColor: 'text-green-600',
  },
  warning: {
    icon: AlertTriangle,
    className: 'alert-warning',
    iconColor: 'text-amber-600',
  },
  error: {
    icon: XCircle,
    className: 'alert-error',
    iconColor: 'text-red-600',
  },
  info: {
    icon: Info,
    className: 'alert-info',
    iconColor: 'text-blue-600',
  },
};

/**
 * Alert - A standardized alert/notification component
 * Supports success, warning, error, and info variants
 */
const Alert: React.FC<AlertProps> = ({
  variant,
  title,
  children,
  onDismiss,
  className = '',
}) => {
  const config = variantConfig[variant];
  const IconComponent = config.icon;

  return (
    <div
      className={`alert ${config.className} ${className}`}
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
    >
      <IconComponent className={`w-5 h-5 flex-shrink-0 ${config.iconColor}`} aria-hidden="true" />

      <div className="flex-1 min-w-0">
        {title && (
          <p className="font-semibold text-sm mb-1">{title}</p>
        )}
        <div className="text-sm">{children}</div>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors focus:outline-none focus:ring-2 focus:ring-current"
          aria-label="Închide notificarea"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default Alert;
