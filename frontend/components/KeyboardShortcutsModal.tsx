'use client';

import { X, Keyboard, Navigation, Zap, Settings } from 'lucide-react';
import { DEFAULT_SHORTCUTS, formatShortcutKey } from '@/hooks/useKeyboardShortcuts';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  const navigationShortcuts = DEFAULT_SHORTCUTS.filter((s) => s.category === 'navigation');
  const actionShortcuts = DEFAULT_SHORTCUTS.filter((s) => s.category === 'actions');
  const generalShortcuts = DEFAULT_SHORTCUTS.filter((s) => s.category === 'general');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg">
              <Keyboard className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Scurtături Tastatură
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Navigare rapidă în aplicație
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            data-modal-close
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(85vh-140px)]">
          <div className="space-y-6">
            {/* Navigation */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Navigation className="w-4 h-4 text-blue-500" />
                <h3 className="font-medium text-gray-900 dark:text-white">Navigare</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {navigationShortcuts.map((shortcut, index) => (
                  <ShortcutItem key={index} shortcut={shortcut} />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-yellow-500" />
                <h3 className="font-medium text-gray-900 dark:text-white">Acțiuni</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {actionShortcuts.map((shortcut, index) => (
                  <ShortcutItem key={index} shortcut={shortcut} />
                ))}
              </div>
            </div>

            {/* General */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-4 h-4 text-gray-500" />
                <h3 className="font-medium text-gray-900 dark:text-white">General</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {generalShortcuts.map((shortcut, index) => (
                  <ShortcutItem key={index} shortcut={shortcut} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Apăsați <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">Shift + ?</kbd> oricând pentru a vedea această fereastră
          </p>
        </div>
      </div>
    </div>
  );
}

function ShortcutItem({ shortcut }: { shortcut: typeof DEFAULT_SHORTCUTS[0] }) {
  return (
    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <span className="text-sm text-gray-700 dark:text-gray-300">
        {shortcut.description}
      </span>
      <kbd className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-xs font-mono text-gray-600 dark:text-gray-400 shadow-sm">
        {formatShortcutKey(shortcut)}
      </kbd>
    </div>
  );
}

export default KeyboardShortcutsModal;
