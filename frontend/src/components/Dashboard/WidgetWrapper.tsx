import React from 'react';
import { useI18n } from '../../i18n/I18nContext';
import type { DashboardWidget } from '../../hooks/useDashboard';

interface WidgetWrapperProps {
  widget: DashboardWidget;
  onRemove?: () => void;
  onSettings?: () => void;
  isEditMode?: boolean;
  children: React.ReactNode;
}

/**
 * Base wrapper component for all dashboard widgets
 * Provides header, loading state, error handling, and refresh functionality
 */
const WidgetWrapper: React.FC<WidgetWrapperProps> = ({
  widget,
  onRemove,
  onSettings,
  isEditMode = false,
  children
}) => {
  const { language } = useI18n();
  const isRo = language === 'ro';

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          {isEditMode && (
            <div className="cursor-move text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </div>
          )}
          <h3 className="font-medium text-gray-900 text-sm">{widget.name}</h3>
        </div>

        <div className="flex items-center gap-1">
          {onSettings && (
            <button
              onClick={onSettings}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title={isRo ? 'Setări' : 'Settings'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}

          {isEditMode && widget.is_removable && onRemove && (
            <button
              onClick={onRemove}
              className="p-1 text-gray-400 hover:text-red-500 rounded"
              title={isRo ? 'Elimină' : 'Remove'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {children}
      </div>
    </div>
  );
};

/**
 * Loading state for widgets
 */
export const WidgetLoading: React.FC = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
  </div>
);

/**
 * Error state for widgets
 */
export const WidgetError: React.FC<{ message: string; onRetry?: () => void }> = ({
  message,
  onRetry
}) => {
  const { language } = useI18n();
  const isRo = language === 'ro';

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
        <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <p className="text-sm text-gray-600 mb-3">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
        >
          {isRo ? 'Încearcă din nou' : 'Try again'}
        </button>
      )}
    </div>
  );
};

/**
 * Empty state for widgets
 */
export const WidgetEmpty: React.FC<{ message?: string }> = ({ message }) => {
  const { language } = useI18n();
  const isRo = language === 'ro';

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <p className="text-sm text-gray-500">
        {message || (isRo ? 'Nu există date' : 'No data available')}
      </p>
    </div>
  );
};

export default WidgetWrapper;
