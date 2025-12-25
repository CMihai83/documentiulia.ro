'use client';

import { X, Keyboard, Navigation, Zap, Settings, Command } from 'lucide-react';
import { useKeyboardShortcutsContext } from './KeyboardShortcutsProvider';
import { formatShortcutKey } from './useKeyboardShortcut';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsHelpModal({ isOpen, onClose }: ShortcutsHelpModalProps) {
  const { shortcuts, isSequenceMode, sequenceKeys } = useKeyboardShortcutsContext();
  const t = useTranslations('shortcuts');

  // Group shortcuts by category
  const navigationShortcuts = shortcuts.filter((s) => s.category === 'navigation' && s.enabled !== false);
  const actionShortcuts = shortcuts.filter((s) => s.category === 'actions' && s.enabled !== false);
  const generalShortcuts = shortcuts.filter((s) => s.category === 'general' && s.enabled !== false);

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg">
              <Keyboard className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('title', { defaultValue: 'Keyboard Shortcuts' })}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('subtitle', { defaultValue: 'Quick navigation and actions' })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            data-modal-close
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sequence Mode Indicator */}
        {isSequenceMode && (
          <div className="px-6 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Command className="w-4 h-4" />
              <span className="text-sm font-medium">
                Sequence mode: {sequenceKeys.join(' then ')} then...
              </span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)]">
          <div className="space-y-8">
            {/* Navigation Shortcuts */}
            {navigationShortcuts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Navigation className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {t('navigation', { defaultValue: 'Navigation' })}
                  </h3>
                  <span className="ml-auto text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    Press G then key
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {navigationShortcuts.map((shortcut) => (
                    <ShortcutItem
                      key={shortcut.id}
                      shortcut={shortcut}
                      prefix="G"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Action Shortcuts */}
            {actionShortcuts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {t('actions', { defaultValue: 'Actions' })}
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {actionShortcuts.map((shortcut) => (
                    <ShortcutItem key={shortcut.id} shortcut={shortcut} />
                  ))}
                </div>
              </div>
            )}

            {/* General Shortcuts */}
            {generalShortcuts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="w-5 h-5 text-gray-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {t('general', { defaultValue: 'General' })}
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {generalShortcuts.map((shortcut) => (
                    <ShortcutItem key={shortcut.id} shortcut={shortcut} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {t('hint', {
              defaultValue: 'Press Shift + ? anytime to see these shortcuts'
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

interface ShortcutItemProps {
  shortcut: {
    key: string;
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
    description: string;
  };
  prefix?: string;
}

function ShortcutItem({ shortcut, prefix }: ShortcutItemProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
      <span className="text-sm text-gray-700 dark:text-gray-300">
        {shortcut.description}
      </span>
      <div className="flex items-center gap-1">
        {prefix && (
          <>
            <kbd className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono text-gray-600 dark:text-gray-400 shadow-sm">
              {prefix}
            </kbd>
            <span className="text-gray-400 dark:text-gray-500 text-xs">then</span>
          </>
        )}
        <kbd className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono text-gray-600 dark:text-gray-400 shadow-sm">
          {formatShortcutKey(shortcut)}
        </kbd>
      </div>
    </div>
  );
}

export default ShortcutsHelpModal;
