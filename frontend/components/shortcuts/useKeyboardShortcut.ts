'use client';

import { useEffect } from 'react';
import { useKeyboardShortcutsContext, KeyboardShortcut } from './KeyboardShortcutsProvider';

interface UseKeyboardShortcutOptions {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  description: string;
  category?: 'navigation' | 'actions' | 'general';
  enabled?: boolean;
  preventDefault?: boolean;
}

/**
 * Hook for registering a keyboard shortcut
 * Automatically unregisters when component unmounts
 *
 * @example
 * ```tsx
 * useKeyboardShortcut({
 *   key: 's',
 *   ctrl: true,
 *   description: 'Save document',
 *   category: 'actions',
 *   action: handleSave
 * });
 * ```
 */
export function useKeyboardShortcut(
  action: () => void,
  options: UseKeyboardShortcutOptions
) {
  const { registerShortcut } = useKeyboardShortcutsContext();

  useEffect(() => {
    const shortcut: KeyboardShortcut = {
      id: `custom-${options.key}-${Date.now()}`,
      key: options.key,
      ctrl: options.ctrl,
      alt: options.alt,
      shift: options.shift,
      meta: options.meta,
      description: options.description,
      category: options.category || 'general',
      action,
      enabled: options.enabled !== false,
    };

    const unregister = registerShortcut(shortcut);

    return () => {
      unregister();
    };
  }, [
    action,
    options.key,
    options.ctrl,
    options.alt,
    options.shift,
    options.meta,
    options.description,
    options.category,
    options.enabled,
    registerShortcut,
  ]);
}

/**
 * Format a keyboard shortcut for display
 * Handles Mac vs Windows key differences
 */
export function formatShortcutKey(options: {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
}): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const parts: string[] = [];

  if (options.ctrl) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (options.meta && !isMac) {
    parts.push('⊞'); // Windows key
  }
  if (options.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }
  if (options.shift) {
    parts.push(isMac ? '⇧' : 'Shift');
  }

  // Format the key nicely
  let key = options.key;
  if (key === 'Escape') key = 'Esc';
  if (key === 'ArrowUp') key = '↑';
  if (key === 'ArrowDown') key = '↓';
  if (key === 'ArrowLeft') key = '←';
  if (key === 'ArrowRight') key = '→';
  if (key === ' ') key = 'Space';

  parts.push(key.toUpperCase());

  return parts.join(isMac ? '' : ' + ');
}

/**
 * Check if keyboard shortcut matches event
 */
export function matchesShortcut(
  event: KeyboardEvent,
  options: {
    key: string;
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
  }
): boolean {
  const keyMatch = event.key.toLowerCase() === options.key.toLowerCase();
  const ctrlMatch = options.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
  const altMatch = options.alt ? event.altKey : !event.altKey;
  const shiftMatch = options.shift ? event.shiftKey : !event.shiftKey;
  const metaMatch = options.meta ? event.metaKey : true;

  return keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch;
}

export default useKeyboardShortcut;
