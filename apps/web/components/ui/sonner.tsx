'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Toast Types
// ============================================================================

type ToastType = 'default' | 'success' | 'error' | 'warning' | 'info' | 'loading';

interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  cancel?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
  dismissible?: boolean;
  icon?: React.ReactNode;
  promise?: {
    loading: string;
    success: string | ((data: unknown) => string);
    error: string | ((error: unknown) => string);
  };
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    }
  ) => Promise<T>;
}

// ============================================================================
// Toast Context
// ============================================================================

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// ============================================================================
// Toast Provider
// ============================================================================

interface ToastProviderProps {
  children: React.ReactNode;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  expand?: boolean;
  richColors?: boolean;
  closeButton?: boolean;
  duration?: number;
  className?: string;
}

export function ToastProvider({
  children,
  position = 'bottom-right',
  expand = false,
  richColors = true,
  closeButton = true,
  duration = 4000,
  className,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { ...toast, id, duration: toast.duration ?? duration }]);
    return id;
  }, [duration]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const promiseToast = useCallback(async <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    }
  ) => {
    const id = addToast({
      type: 'loading',
      title: messages.loading,
      duration: Infinity,
      dismissible: false,
    });

    try {
      const data = await promise;
      setToasts(prev => prev.map(t => {
        if (t.id === id) {
          return {
            ...t,
            type: 'success' as ToastType,
            title: typeof messages.success === 'function' ? messages.success(data) : messages.success,
            duration: duration,
            dismissible: true,
          };
        }
        return t;
      }));
      return data;
    } catch (error) {
      setToasts(prev => prev.map(t => {
        if (t.id === id) {
          return {
            ...t,
            type: 'error' as ToastType,
            title: typeof messages.error === 'function' ? messages.error(error) : messages.error,
            duration: duration,
            dismissible: true,
          };
        }
        return t;
      }));
      throw error;
    }
  }, [addToast, duration]);

  const positionStyles = {
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, promise: promiseToast }}>
      {children}
      <div
        className={cn(
          'fixed z-[100] flex flex-col gap-2',
          positionStyles[position],
          position.includes('top') ? 'flex-col' : 'flex-col-reverse',
          className
        )}
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast, index) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              index={index}
              expand={expand}
              richColors={richColors}
              closeButton={closeButton}
              onRemove={() => removeToast(toast.id)}
              position={position}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// ============================================================================
// Toast Item
// ============================================================================

interface ToastItemProps {
  toast: Toast;
  index: number;
  expand: boolean;
  richColors: boolean;
  closeButton: boolean;
  onRemove: () => void;
  position: string;
}

function ToastItem({
  toast,
  index,
  expand,
  richColors,
  closeButton,
  onRemove,
  position,
}: ToastItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (toast.duration === Infinity || isHovered) return;

    const timer = setTimeout(() => {
      onRemove();
    }, toast.duration);

    return () => clearTimeout(timer);
  }, [toast.duration, isHovered, onRemove]);

  const icons = {
    default: null,
    success: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    loading: (
      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    ),
  };

  const colorStyles = richColors ? {
    default: 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700',
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
    loading: 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700',
  } : {
    default: 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700',
    success: 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700',
    error: 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700',
    warning: 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700',
    info: 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700',
    loading: 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700',
  };

  const iconColors = {
    default: 'text-gray-500',
    success: richColors ? 'text-green-600 dark:text-green-400' : 'text-green-500',
    error: richColors ? 'text-red-600 dark:text-red-400' : 'text-red-500',
    warning: richColors ? 'text-yellow-600 dark:text-yellow-400' : 'text-yellow-500',
    info: richColors ? 'text-blue-600 dark:text-blue-400' : 'text-blue-500',
    loading: 'text-gray-500',
  };

  const isFromTop = position.includes('top');
  const slideDirection = position.includes('left') ? -100 : position.includes('right') ? 100 : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: isFromTop ? -50 : 50, x: slideDirection, scale: 0.9 }}
      animate={{
        opacity: 1,
        y: 0,
        x: 0,
        scale: expand ? 1 : 1 - index * 0.05,
      }}
      exit={{ opacity: 0, x: slideDirection, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'w-[356px] rounded-lg border shadow-lg',
        colorStyles[toast.type]
      )}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        {(toast.icon || icons[toast.type]) && (
          <div className={cn('flex-shrink-0 mt-0.5', iconColors[toast.type])}>
            {toast.icon || icons[toast.type]}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {toast.title && (
            <div className="font-medium text-sm">{toast.title}</div>
          )}
          {toast.description && (
            <div className="text-sm opacity-90 mt-0.5">{toast.description}</div>
          )}

          {/* Actions */}
          {(toast.action || toast.cancel) && (
            <div className="flex items-center gap-2 mt-3">
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action!.onClick();
                    onRemove();
                  }}
                  className="px-3 py-1.5 text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-md hover:opacity-90 transition-opacity"
                >
                  {toast.action.label}
                </button>
              )}
              {toast.cancel && (
                <button
                  onClick={() => {
                    toast.cancel!.onClick();
                    onRemove();
                  }}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  {toast.cancel.label}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Close button */}
        {closeButton && toast.dismissible !== false && (
          <button
            onClick={onRemove}
            className="flex-shrink-0 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Progress bar */}
      {toast.duration !== Infinity && !isHovered && (
        <motion.div
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: (toast.duration || 4000) / 1000, ease: 'linear' }}
          className={cn(
            'h-1 origin-left',
            toast.type === 'success' && 'bg-green-500',
            toast.type === 'error' && 'bg-red-500',
            toast.type === 'warning' && 'bg-yellow-500',
            toast.type === 'info' && 'bg-blue-500',
            (toast.type === 'default' || toast.type === 'loading') && 'bg-gray-400'
          )}
        />
      )}
    </motion.div>
  );
}

// ============================================================================
// Toast Functions (for direct use)
// ============================================================================

let toastFn: ((toast: Omit<Toast, 'id'>) => string) | null = null;
let promiseFn: (<T>(promise: Promise<T>, messages: { loading: string; success: string | ((data: T) => string); error: string | ((error: unknown) => string) }) => Promise<T>) | null = null;

export function setToastFunctions(
  addToast: (toast: Omit<Toast, 'id'>) => string,
  promise: <T>(promise: Promise<T>, messages: { loading: string; success: string | ((data: T) => string); error: string | ((error: unknown) => string) }) => Promise<T>
) {
  toastFn = addToast;
  promiseFn = promise;
}

export const toast = {
  default: (title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) =>
    toastFn?.({ type: 'default', title, ...options }),

  success: (title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) =>
    toastFn?.({ type: 'success', title, ...options }),

  error: (title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) =>
    toastFn?.({ type: 'error', title, ...options }),

  warning: (title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) =>
    toastFn?.({ type: 'warning', title, ...options }),

  info: (title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) =>
    toastFn?.({ type: 'info', title, ...options }),

  loading: (title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) =>
    toastFn?.({ type: 'loading', title, duration: Infinity, ...options }),

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    }
  ) => promiseFn?.(promise, messages),
};

// ============================================================================
// Sonner Component (Compatibility with sonner library API)
// ============================================================================

interface SonnerProps {
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  expand?: boolean;
  richColors?: boolean;
  closeButton?: boolean;
  duration?: number;
  className?: string;
}

export function Sonner({
  position = 'bottom-right',
  expand = false,
  richColors = true,
  closeButton = true,
  duration = 4000,
  className,
}: SonnerProps) {
  const { toasts, removeToast } = useToast();

  const positionStyles = {
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
  };

  return (
    <div
      className={cn(
        'fixed z-[100] flex flex-col gap-2',
        positionStyles[position],
        position.includes('top') ? 'flex-col' : 'flex-col-reverse',
        className
      )}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast, index) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            index={index}
            expand={expand}
            richColors={richColors}
            closeButton={closeButton}
            onRemove={() => removeToast(toast.id)}
            position={position}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Simple Toaster (Standalone)
// ============================================================================

interface SimpleToasterProps {
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}

export function SimpleToaster({ position = 'bottom-right' }: SimpleToasterProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { ...toast, id, duration: toast.duration ?? 4000 }]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Expose globally
  useEffect(() => {
    (window as unknown as Record<string, unknown>).showToast = addToast;
    return () => {
      delete (window as unknown as Record<string, unknown>).showToast;
    };
  }, [addToast]);

  const positionStyles = {
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
  };

  return (
    <div
      className={cn(
        'fixed z-[100] flex flex-col gap-2',
        positionStyles[position],
        position.includes('top') ? 'flex-col' : 'flex-col-reverse'
      )}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast, index) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            index={index}
            expand={false}
            richColors={true}
            closeButton={true}
            onRemove={() => removeToast(toast.id)}
            position={position}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export default Sonner;
