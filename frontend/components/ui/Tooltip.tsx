'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { HelpCircle, Info, AlertCircle } from 'lucide-react';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';
type TooltipVariant = 'default' | 'info' | 'help' | 'warning';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: TooltipPosition;
  variant?: TooltipVariant;
  delay?: number;
  maxWidth?: number;
  className?: string;
}

interface InlineHelpProps {
  content: ReactNode;
  title?: string;
  position?: TooltipPosition;
  variant?: TooltipVariant;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface FieldHelpProps {
  label: string;
  help: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

// Position calculations for tooltip placement
const getPositionStyles = (
  position: TooltipPosition,
  triggerRect: DOMRect | null,
  tooltipRect: DOMRect | null
): React.CSSProperties => {
  if (!triggerRect || !tooltipRect) return { opacity: 0 };

  const gap = 8;
  const styles: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
  };

  switch (position) {
    case 'top':
      styles.left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
      styles.top = triggerRect.top - tooltipRect.height - gap;
      break;
    case 'bottom':
      styles.left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
      styles.top = triggerRect.bottom + gap;
      break;
    case 'left':
      styles.left = triggerRect.left - tooltipRect.width - gap;
      styles.top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
      break;
    case 'right':
      styles.left = triggerRect.right + gap;
      styles.top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
      break;
  }

  // Boundary checks
  if (typeof window !== 'undefined') {
    const padding = 8;
    if (styles.left && styles.left < padding) styles.left = padding;
    if (styles.left && styles.left + tooltipRect.width > window.innerWidth - padding) {
      styles.left = window.innerWidth - tooltipRect.width - padding;
    }
    if (styles.top && styles.top < padding) styles.top = padding;
    if (styles.top && styles.top + tooltipRect.height > window.innerHeight - padding) {
      styles.top = window.innerHeight - tooltipRect.height - padding;
    }
  }

  return styles;
};

// Arrow styles based on position
const getArrowStyles = (position: TooltipPosition): string => {
  const base = 'absolute w-2 h-2 bg-inherit transform rotate-45';
  switch (position) {
    case 'top':
      return `${base} -bottom-1 left-1/2 -translate-x-1/2`;
    case 'bottom':
      return `${base} -top-1 left-1/2 -translate-x-1/2`;
    case 'left':
      return `${base} -right-1 top-1/2 -translate-y-1/2`;
    case 'right':
      return `${base} -left-1 top-1/2 -translate-y-1/2`;
  }
};

// Variant styles
const variantStyles: Record<TooltipVariant, string> = {
  default: 'bg-gray-900 text-white',
  info: 'bg-blue-600 text-white',
  help: 'bg-gray-800 text-white',
  warning: 'bg-amber-500 text-white',
};

/**
 * Tooltip Component
 * Shows additional information on hover
 */
export function Tooltip({
  content,
  children,
  position = 'top',
  variant = 'default',
  delay = 200,
  maxWidth = 280,
  className = '',
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipStyles, setTooltipStyles] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      setTooltipStyles(getPositionStyles(position, triggerRect, tooltipRect));
    }
  }, [isVisible, position]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className={`inline-flex ${className}`}
      >
        {children}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          style={{ ...tooltipStyles, maxWidth }}
          className={`
            px-3 py-2 text-sm rounded-lg shadow-lg
            animate-in fade-in-0 zoom-in-95 duration-150
            ${variantStyles[variant]}
          `}
        >
          <div className={getArrowStyles(position)} />
          {content}
        </div>
      )}
    </>
  );
}

/**
 * InlineHelp Component
 * A small help icon with tooltip for contextual assistance
 */
export function InlineHelp({
  content,
  title,
  position = 'top',
  variant = 'help',
  size = 'sm',
  className = '',
}: InlineHelpProps) {
  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const Icon = variant === 'warning' ? AlertCircle : variant === 'info' ? Info : HelpCircle;

  const tooltipContent = (
    <div>
      {title && <div className="font-semibold mb-1">{title}</div>}
      <div className="text-sm opacity-90">{content}</div>
    </div>
  );

  return (
    <Tooltip content={tooltipContent} position={position} variant={variant}>
      <button
        type="button"
        className={`
          inline-flex items-center justify-center
          text-gray-400 hover:text-gray-600 transition-colors
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded-full
          ${className}
        `}
        aria-label="Help"
      >
        <Icon className={sizeClasses[size]} />
      </button>
    </Tooltip>
  );
}

/**
 * FieldHelp Component
 * A form field wrapper with label and contextual help
 */
export function FieldHelp({
  label,
  help,
  required = false,
  children,
  className = '',
}: FieldHelpProps) {
  return (
    <div className={className}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <InlineHelp content={help} size="sm" />
      </div>
      {children}
    </div>
  );
}

/**
 * HelpCard Component
 * A larger help section for detailed guidance
 */
interface HelpCardProps {
  title: string;
  children: ReactNode;
  variant?: 'info' | 'tip' | 'warning';
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export function HelpCard({
  title,
  children,
  variant = 'info',
  dismissible = false,
  onDismiss,
  className = '',
}: HelpCardProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const variantClasses = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    tip: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
  };

  const iconClasses = {
    info: 'text-blue-500',
    tip: 'text-green-500',
    warning: 'text-amber-500',
  };

  const Icon = variant === 'warning' ? AlertCircle : variant === 'tip' ? HelpCircle : Info;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div className={`rounded-lg border p-4 ${variantClasses[variant]} ${className}`}>
      <div className="flex gap-3">
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconClasses[variant]}`} />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium mb-1">{title}</h4>
          <div className="text-sm opacity-90">{children}</div>
        </div>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="text-current opacity-50 hover:opacity-100 transition-opacity"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * KeyboardShortcut Component
 * Displays keyboard shortcuts in tooltips
 */
interface KeyboardShortcutProps {
  keys: string[];
  description: string;
  className?: string;
}

export function KeyboardShortcut({ keys, description, className = '' }: KeyboardShortcutProps) {
  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <span key={index}>
            <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-gray-100 border border-gray-300 rounded">
              {key}
            </kbd>
            {index < keys.length - 1 && <span className="mx-0.5 text-gray-400">+</span>}
          </span>
        ))}
      </div>
      <span className="text-gray-600">{description}</span>
    </div>
  );
}

export default Tooltip;
