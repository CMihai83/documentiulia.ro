'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/lib/state/uiStore';

/**
 * Keyboard Shortcuts - DocumentIulia.ro
 * Power user shortcuts for common actions
 */

export interface ShortcutDefinition {
  key: string;
  description: string;
  descriptionRo: string;
  action: () => void;
  scope?: string;
  enabled?: boolean;
}

// Default shortcuts for the application
export function useGlobalShortcuts() {
  const router = useRouter();
  const { setCommandPaletteOpen, toggleSidebar } = useUIStore();

  // Navigation shortcuts
  useHotkeys('ctrl+shift+d, cmd+shift+d', () => router.push('/ro/dashboard'), {
    description: 'Go to Dashboard',
    preventDefault: true,
  });

  useHotkeys('ctrl+shift+f, cmd+shift+f', () => router.push('/ro/dashboard/invoices'), {
    description: 'Go to Invoices',
    preventDefault: true,
  });

  useHotkeys('ctrl+shift+h, cmd+shift+h', () => router.push('/ro/dashboard/hr'), {
    description: 'Go to HR',
    preventDefault: true,
  });

  useHotkeys('ctrl+shift+e, cmd+shift+e', () => router.push('/ro/dashboard/efactura'), {
    description: 'Go to e-Factura',
    preventDefault: true,
  });

  // Action shortcuts
  useHotkeys('ctrl+shift+n, cmd+shift+n', () => router.push('/ro/dashboard/invoices/new'), {
    description: 'New Invoice',
    preventDefault: true,
  });

  useHotkeys('ctrl+k, cmd+k', () => setCommandPaletteOpen(true), {
    description: 'Open Command Palette',
    preventDefault: true,
  });

  useHotkeys('ctrl+b, cmd+b', () => toggleSidebar(), {
    description: 'Toggle Sidebar',
    preventDefault: true,
  });

  // Escape to close modals/palettes
  useHotkeys('escape', () => setCommandPaletteOpen(false), {
    description: 'Close Command Palette',
    enableOnFormTags: true,
  });
}

// Dashboard-specific shortcuts
export function useDashboardShortcuts() {
  const router = useRouter();

  useHotkeys('1', () => router.push('/ro/dashboard'), {
    description: 'Dashboard Overview',
  });

  useHotkeys('2', () => router.push('/ro/dashboard/invoices'), {
    description: 'Invoices',
  });

  useHotkeys('3', () => router.push('/ro/dashboard/finance'), {
    description: 'Finance',
  });

  useHotkeys('4', () => router.push('/ro/dashboard/hr'), {
    description: 'HR',
  });

  useHotkeys('5', () => router.push('/ro/dashboard/efactura'), {
    description: 'e-Factura',
  });

  // Quick actions
  useHotkeys('n', () => router.push('/ro/dashboard/invoices/new'), {
    description: 'New Invoice',
  });

  useHotkeys('r', () => window.location.reload(), {
    description: 'Refresh',
  });
}

// Invoice list shortcuts
export function useInvoiceListShortcuts(options: {
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  onSearch?: () => void;
}) {
  const { onSelectAll, onDeselectAll, onDelete, onExport, onSearch } = options;

  useHotkeys('ctrl+a, cmd+a', (e) => {
    e.preventDefault();
    onSelectAll?.();
  }, {
    description: 'Select All',
    enableOnFormTags: false,
  });

  useHotkeys('escape', () => onDeselectAll?.(), {
    description: 'Deselect All',
  });

  useHotkeys('delete, backspace', () => onDelete?.(), {
    description: 'Delete Selected',
    enableOnFormTags: false,
  });

  useHotkeys('ctrl+e, cmd+e', (e) => {
    e.preventDefault();
    onExport?.();
  }, {
    description: 'Export Selected',
  });

  useHotkeys('ctrl+f, cmd+f', (e) => {
    e.preventDefault();
    onSearch?.();
  }, {
    description: 'Focus Search',
  });
}

// Form shortcuts
export function useFormShortcuts(options: {
  onSave?: () => void;
  onCancel?: () => void;
  onSaveAndNew?: () => void;
}) {
  const { onSave, onCancel, onSaveAndNew } = options;

  useHotkeys('ctrl+s, cmd+s', (e) => {
    e.preventDefault();
    onSave?.();
  }, {
    description: 'Save',
    enableOnFormTags: true,
  });

  useHotkeys('ctrl+shift+s, cmd+shift+s', (e) => {
    e.preventDefault();
    onSaveAndNew?.();
  }, {
    description: 'Save and New',
    enableOnFormTags: true,
  });

  useHotkeys('escape', () => onCancel?.(), {
    description: 'Cancel',
    enableOnFormTags: true,
  });
}

// Get all shortcuts for help display
export function getAllShortcuts(): ShortcutDefinition[] {
  return [
    // Navigation
    { key: 'Ctrl+Shift+D', description: 'Go to Dashboard', descriptionRo: 'Mergi la Dashboard', action: () => {}, scope: 'global' },
    { key: 'Ctrl+Shift+F', description: 'Go to Invoices', descriptionRo: 'Mergi la Facturi', action: () => {}, scope: 'global' },
    { key: 'Ctrl+Shift+H', description: 'Go to HR', descriptionRo: 'Mergi la HR', action: () => {}, scope: 'global' },
    { key: 'Ctrl+Shift+E', description: 'Go to e-Factura', descriptionRo: 'Mergi la e-Factura', action: () => {}, scope: 'global' },

    // Actions
    { key: 'Ctrl+Shift+N', description: 'New Invoice', descriptionRo: 'Factură Nouă', action: () => {}, scope: 'global' },
    { key: 'Ctrl+K', description: 'Command Palette', descriptionRo: 'Paletă Comenzi', action: () => {}, scope: 'global' },
    { key: 'Ctrl+B', description: 'Toggle Sidebar', descriptionRo: 'Comută Bara Laterală', action: () => {}, scope: 'global' },

    // Dashboard
    { key: '1-5', description: 'Quick Navigation', descriptionRo: 'Navigare Rapidă', action: () => {}, scope: 'dashboard' },
    { key: 'N', description: 'New Invoice', descriptionRo: 'Factură Nouă', action: () => {}, scope: 'dashboard' },
    { key: 'R', description: 'Refresh', descriptionRo: 'Reîmprospătare', action: () => {}, scope: 'dashboard' },

    // List
    { key: 'Ctrl+A', description: 'Select All', descriptionRo: 'Selectează Tot', action: () => {}, scope: 'list' },
    { key: 'Escape', description: 'Deselect', descriptionRo: 'Deselectează', action: () => {}, scope: 'list' },
    { key: 'Delete', description: 'Delete Selected', descriptionRo: 'Șterge Selecția', action: () => {}, scope: 'list' },
    { key: 'Ctrl+E', description: 'Export', descriptionRo: 'Exportă', action: () => {}, scope: 'list' },

    // Form
    { key: 'Ctrl+S', description: 'Save', descriptionRo: 'Salvează', action: () => {}, scope: 'form' },
    { key: 'Ctrl+Shift+S', description: 'Save and New', descriptionRo: 'Salvează și Nou', action: () => {}, scope: 'form' },
  ];
}

// Keyboard shortcut help modal hook
export function useShortcutHelp() {
  const [isOpen, setIsOpen] = useState(false);

  useHotkeys('shift+?', () => setIsOpen(true), {
    description: 'Show Keyboard Shortcuts',
    preventDefault: true,
  });

  useHotkeys('escape', () => setIsOpen(false), {
    enabled: isOpen,
  });

  return { isOpen, setIsOpen, shortcuts: getAllShortcuts() };
}

import { useState } from 'react';
