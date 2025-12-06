'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  X,
  Loader2,
} from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  updateToast: (id: string, updates: Partial<Omit<Toast, 'id'>>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Convenience hooks
export function useToastActions() {
  const { addToast, removeToast, updateToast } = useToast();

  const success = useCallback(
    (title: string, message?: string) =>
      addToast({ type: 'success', title, message, duration: 4000 }),
    [addToast]
  );

  const error = useCallback(
    (title: string, message?: string) =>
      addToast({ type: 'error', title, message, duration: 6000 }),
    [addToast]
  );

  const warning = useCallback(
    (title: string, message?: string) =>
      addToast({ type: 'warning', title, message, duration: 5000 }),
    [addToast]
  );

  const info = useCallback(
    (title: string, message?: string) =>
      addToast({ type: 'info', title, message, duration: 4000 }),
    [addToast]
  );

  const loading = useCallback(
    (title: string, message?: string) =>
      addToast({ type: 'loading', title, message, duration: 0 }),
    [addToast]
  );

  const dismiss = useCallback((id: string) => removeToast(id), [removeToast]);

  const update = useCallback(
    (id: string, updates: Partial<Omit<Toast, 'id'>>) => updateToast(id, updates),
    [updateToast]
  );

  return { success, error, warning, info, loading, dismiss, update };
}

const toastIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  loading: Loader2,
};

const toastStyles = {
  success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
  info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  loading: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
};

const toastIconStyles = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500',
  loading: 'text-gray-500 animate-spin',
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const Icon = toastIcons[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg max-w-md ${toastStyles[toast.type]}`}
    >
      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${toastIconStyles[toast.type]}`} />

      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-white">
          {toast.title}
        </p>
        {toast.message && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            {toast.message}
          </p>
        )}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="text-sm font-medium text-primary hover:underline mt-2"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      {toast.type !== 'loading' && (
        <button
          onClick={onRemove}
          className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          aria-label="Închide"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      )}
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };

    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after duration (if not 0)
    if (toast.duration !== 0) {
      const duration = toast.duration || 4000;
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<Omit<Toast, 'id'>>) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );

    // If type changed from loading, auto-remove
    if (updates.type && updates.type !== 'loading') {
      const duration = updates.duration || 4000;
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, updateToast }}>
      {children}

      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onRemove={() => removeToast(toast.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// Standalone toast functions for use outside of React components
let toastFunctions: ToastContextValue | null = null;

export function setToastFunctions(fns: ToastContextValue) {
  toastFunctions = fns;
}

export const toast = {
  success: (title: string, message?: string) =>
    toastFunctions?.addToast({ type: 'success', title, message, duration: 4000 }),
  error: (title: string, message?: string) =>
    toastFunctions?.addToast({ type: 'error', title, message, duration: 6000 }),
  warning: (title: string, message?: string) =>
    toastFunctions?.addToast({ type: 'warning', title, message, duration: 5000 }),
  info: (title: string, message?: string) =>
    toastFunctions?.addToast({ type: 'info', title, message, duration: 4000 }),
  loading: (title: string, message?: string) =>
    toastFunctions?.addToast({ type: 'loading', title, message, duration: 0 }),
  dismiss: (id: string) => toastFunctions?.removeToast(id),
};
