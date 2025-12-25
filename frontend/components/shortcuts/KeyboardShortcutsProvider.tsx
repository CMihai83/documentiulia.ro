'use client';

import React, { createContext, useContext, useEffect, useCallback, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export interface KeyboardShortcut {
  id: string;
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  description: string;
  category: 'navigation' | 'actions' | 'general';
  action: () => void;
  enabled?: boolean;
}

interface KeyboardShortcutsContextType {
  shortcuts: KeyboardShortcut[];
  registerShortcut: (shortcut: KeyboardShortcut) => () => void;
  unregisterShortcut: (id: string) => void;
  showShortcutsModal: boolean;
  setShowShortcutsModal: (show: boolean) => void;
  showCommandPalette: boolean;
  setShowCommandPalette: (show: boolean) => void;
  isSequenceMode: boolean;
  sequenceKeys: string[];
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | undefined>(undefined);

interface KeyboardShortcutsProviderProps {
  children: ReactNode;
  enabled?: boolean;
}

export function KeyboardShortcutsProvider({ children, enabled = true }: KeyboardShortcutsProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [isSequenceMode, setIsSequenceMode] = useState(false);
  const [sequenceKeys, setSequenceKeys] = useState<string[]>([]);

  // Register a new shortcut
  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    setShortcuts((prev) => {
      // Remove existing shortcut with same id
      const filtered = prev.filter((s) => s.id !== shortcut.id);
      return [...filtered, shortcut];
    });

    // Return unregister function
    return () => {
      setShortcuts((prev) => prev.filter((s) => s.id !== shortcut.id));
    };
  }, []);

  // Unregister a shortcut
  const unregisterShortcut = useCallback((id: string) => {
    setShortcuts((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // Default global shortcuts
  useEffect(() => {
    const defaultShortcuts: KeyboardShortcut[] = [
      // Navigation shortcuts (G then X pattern)
      {
        id: 'nav-home',
        key: 'h',
        description: 'Go to Dashboard Home',
        category: 'navigation',
        action: () => router.push('/dashboard'),
      },
      {
        id: 'nav-invoices',
        key: 'i',
        description: 'Go to Invoices',
        category: 'navigation',
        action: () => router.push('/dashboard/invoices'),
      },
      {
        id: 'nav-partners',
        key: 'p',
        description: 'Go to Partners',
        category: 'navigation',
        action: () => router.push('/dashboard/partners'),
      },
      {
        id: 'nav-finance',
        key: 'f',
        description: 'Go to Finance',
        category: 'navigation',
        action: () => router.push('/dashboard/finance'),
      },
      {
        id: 'nav-settings',
        key: 's',
        description: 'Go to Settings',
        category: 'navigation',
        action: () => router.push('/settings'),
      },

      // Action shortcuts
      {
        id: 'action-command',
        key: 'k',
        ctrl: true,
        description: 'Open Command Palette',
        category: 'actions',
        action: () => setShowCommandPalette(true),
      },
      {
        id: 'action-new',
        key: 'n',
        description: 'Create New (context-aware)',
        category: 'actions',
        action: () => {
          // Context-aware navigation based on current page
          if (pathname?.includes('/invoices')) {
            router.push('/dashboard/invoices/new');
          } else if (pathname?.includes('/partners')) {
            router.push('/dashboard/partners/new');
          } else if (pathname?.includes('/ocr')) {
            // Trigger upload
            const uploadButton = document.querySelector<HTMLButtonElement>('[data-upload-trigger]');
            uploadButton?.click();
          } else {
            // Default to new invoice
            router.push('/dashboard/invoices/new');
          }
        },
      },

      // General shortcuts
      {
        id: 'general-escape',
        key: 'Escape',
        description: 'Close Modals/Palettes',
        category: 'general',
        action: () => {
          setShowShortcutsModal(false);
          setShowCommandPalette(false);
          setIsSequenceMode(false);
          setSequenceKeys([]);
          // Try to close any open modals
          const closeButton = document.querySelector<HTMLButtonElement>('[data-modal-close]');
          closeButton?.click();
        },
      },
      {
        id: 'general-help',
        key: '?',
        shift: true,
        description: 'Show Keyboard Shortcuts',
        category: 'general',
        action: () => setShowShortcutsModal(true),
      },
      {
        id: 'general-search',
        key: '/',
        description: 'Focus Search',
        category: 'general',
        action: () => {
          const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]');
          if (searchInput) {
            searchInput.focus();
          } else {
            // Fallback to command palette
            setShowCommandPalette(true);
          }
        },
      },
    ];

    defaultShortcuts.forEach((shortcut) => registerShortcut(shortcut));
  }, [registerShortcut, router, pathname]);

  // Keyboard event handler
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs (except Escape)
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true';

      if (isInput && event.key !== 'Escape') {
        return;
      }

      // Handle sequence mode (G then X)
      if (event.key.toLowerCase() === 'g' && !event.ctrlKey && !event.metaKey && !isInput) {
        event.preventDefault();
        setIsSequenceMode(true);
        setSequenceKeys(['g']);
        // Reset after 2 seconds
        setTimeout(() => {
          setIsSequenceMode(false);
          setSequenceKeys([]);
        }, 2000);
        return;
      }

      // If in sequence mode, handle the second key
      if (isSequenceMode && sequenceKeys[0] === 'g') {
        event.preventDefault();
        const secondKey = event.key.toLowerCase();
        setSequenceKeys([...sequenceKeys, secondKey]);

        // Find navigation shortcut matching the second key
        const navShortcut = shortcuts.find(
          (s) => s.category === 'navigation' && s.key.toLowerCase() === secondKey && s.enabled !== false
        );

        if (navShortcut) {
          navShortcut.action();
        }

        setIsSequenceMode(false);
        setSequenceKeys([]);
        return;
      }

      // Find matching shortcut (non-sequence)
      const matchingShortcut = shortcuts.find((shortcut) => {
        if (shortcut.enabled === false) return false;
        if (shortcut.category === 'navigation') return false; // Navigation only via G+X

        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;

        return keyMatch && ctrlMatch && altMatch && shiftMatch;
      });

      if (matchingShortcut) {
        event.preventDefault();
        event.stopPropagation();
        matchingShortcut.action();
      }
    },
    [enabled, shortcuts, isSequenceMode, sequenceKeys]
  );

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled, handleKeyDown]);

  const value: KeyboardShortcutsContextType = {
    shortcuts,
    registerShortcut,
    unregisterShortcut,
    showShortcutsModal,
    setShowShortcutsModal,
    showCommandPalette,
    setShowCommandPalette,
    isSequenceMode,
    sequenceKeys,
  };

  return (
    <KeyboardShortcutsContext.Provider value={value}>
      {children}
    </KeyboardShortcutsContext.Provider>
  );
}

export function useKeyboardShortcutsContext() {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error('useKeyboardShortcutsContext must be used within KeyboardShortcutsProvider');
  }
  return context;
}
