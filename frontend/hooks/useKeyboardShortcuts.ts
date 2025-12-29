'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  description: string;
  category: 'navigation' | 'actions' | 'general';
  action: () => void;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  onShortcutTriggered?: (shortcut: KeyboardShortcut) => void;
}

// Default shortcuts configuration
export const DEFAULT_SHORTCUTS: Omit<KeyboardShortcut, 'action'>[] = [
  // Navigation
  { key: 'h', alt: true, description: 'Go to Dashboard Home', category: 'navigation' },
  { key: 'i', alt: true, description: 'Go to Invoices', category: 'navigation' },
  { key: 'f', alt: true, description: 'Go to Finance', category: 'navigation' },
  { key: 'r', alt: true, description: 'Go to Reports', category: 'navigation' },
  { key: 'a', alt: true, description: 'Go to Analytics', category: 'navigation' },
  { key: 's', alt: true, description: 'Go to Settings', category: 'navigation' },

  // Actions
  { key: 'n', ctrl: true, description: 'New Invoice', category: 'actions' },
  { key: 'u', ctrl: true, description: 'Upload Document', category: 'actions' },
  { key: 'k', ctrl: true, description: 'Open Command Palette', category: 'actions' },

  // General
  { key: '/', description: 'Focus Search', category: 'general' },
  { key: 'Escape', description: 'Close Modal/Cancel', category: 'general' },
  { key: '?', shift: true, description: 'Show Keyboard Shortcuts', category: 'general' },
];

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { enabled = true, onShortcutTriggered } = options;
  const router = useRouter();
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Build the shortcuts with actions
  const shortcuts: KeyboardShortcut[] = [
    // Navigation shortcuts
    {
      key: 'h',
      alt: true,
      description: 'Go to Dashboard Home',
      category: 'navigation',
      action: () => router.push('/dashboard'),
    },
    {
      key: 'i',
      alt: true,
      description: 'Go to Invoices',
      category: 'navigation',
      action: () => router.push('/dashboard/invoices'),
    },
    {
      key: 'f',
      alt: true,
      description: 'Go to Finance',
      category: 'navigation',
      action: () => router.push('/dashboard/finance'),
    },
    {
      key: 'r',
      alt: true,
      description: 'Go to Reports',
      category: 'navigation',
      action: () => router.push('/dashboard/reports'),
    },
    {
      key: 'a',
      alt: true,
      description: 'Go to Analytics',
      category: 'navigation',
      action: () => router.push('/dashboard/analytics'),
    },
    {
      key: 's',
      alt: true,
      description: 'Go to Settings',
      category: 'navigation',
      action: () => router.push('/settings'),
    },

    // Action shortcuts
    {
      key: 'n',
      ctrl: true,
      description: 'New Invoice',
      category: 'actions',
      action: () => router.push('/dashboard/invoices/new'),
    },
    {
      key: 'u',
      ctrl: true,
      description: 'Upload Document',
      category: 'actions',
      action: () => router.push('/dashboard/ocr'),
    },
    {
      key: 'k',
      ctrl: true,
      description: 'Open Command Palette',
      category: 'actions',
      action: () => setShowCommandPalette(true),
    },

    // General shortcuts
    {
      key: '/',
      description: 'Focus Search',
      category: 'general',
      action: () => {
        const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]');
        searchInput?.focus();
      },
    },
    {
      key: 'Escape',
      description: 'Close Modal/Cancel',
      category: 'general',
      action: () => {
        setShowShortcutsModal(false);
        setShowCommandPalette(false);
        // Also try to close any open modals
        const closeButton = document.querySelector<HTMLButtonElement>('[data-modal-close]');
        closeButton?.click();
      },
    },
    {
      key: '?',
      shift: true,
      description: 'Show Keyboard Shortcuts',
      category: 'general',
      action: () => setShowShortcutsModal(true),
    },
  ];

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        // Allow Escape to work in inputs
        if (event.key !== 'Escape') return;
      }

      // Find matching shortcut
      const matchingShortcut = shortcuts.find((shortcut) => {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const metaMatch = shortcut.meta ? event.metaKey : true;

        return keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch;
      });

      if (matchingShortcut) {
        event.preventDefault();
        event.stopPropagation();
        matchingShortcut.action();
        onShortcutTriggered?.(matchingShortcut);
      }
    },
    [enabled, shortcuts, onShortcutTriggered]
  );

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled, handleKeyDown]);

  return {
    shortcuts,
    showShortcutsModal,
    setShowShortcutsModal,
    showCommandPalette,
    setShowCommandPalette,
  };
}

// Format shortcut key for display
export function formatShortcutKey(shortcut: Omit<KeyboardShortcut, 'action'>): string {
  const parts: string[] = [];

  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.alt) parts.push('Alt');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.meta) parts.push('⌘');

  // Format the key nicely
  let key = shortcut.key;
  if (key === 'Escape') key = 'Esc';
  if (key === '/') key = '/';
  if (key === '?') key = '?';

  parts.push(key.toUpperCase());

  return parts.join(' + ');
}

export default useKeyboardShortcuts;
