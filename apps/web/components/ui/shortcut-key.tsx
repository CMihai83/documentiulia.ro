'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type ModifierKey = 'ctrl' | 'alt' | 'shift' | 'meta' | 'cmd';

export interface Shortcut {
  key: string;
  modifiers?: ModifierKey[];
  description: string;
  action: () => void;
  category?: string;
  disabled?: boolean;
}

export interface ShortcutKeyProps {
  shortcut: string;
  size?: 'xs' | 'sm' | 'md';
  variant?: 'default' | 'ghost' | 'outline';
  className?: string;
}

export interface ShortcutListProps {
  shortcuts: Shortcut[];
  category?: string;
  showCategories?: boolean;
  className?: string;
}

// ============================================================================
// Key Display Mapping
// ============================================================================

const keyDisplayMap: Record<string, string> = {
  ctrl: '⌃',
  alt: '⌥',
  shift: '⇧',
  meta: '⌘',
  cmd: '⌘',
  enter: '↵',
  return: '↵',
  escape: 'Esc',
  esc: 'Esc',
  backspace: '⌫',
  delete: '⌦',
  tab: '⇥',
  space: '␣',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
  home: '⇱',
  end: '⇲',
  pageup: 'PgUp',
  pagedown: 'PgDn',
};

const sizeConfig = {
  xs: 'px-1 py-0.5 text-[10px] min-w-[16px]',
  sm: 'px-1.5 py-0.5 text-xs min-w-[20px]',
  md: 'px-2 py-1 text-sm min-w-[24px]',
};

const variantConfig = {
  default: 'bg-muted border border-border',
  ghost: 'bg-transparent',
  outline: 'bg-transparent border border-border',
};

// ============================================================================
// Utility Functions
// ============================================================================

function parseShortcut(shortcut: string): { modifiers: string[]; key: string } {
  const parts = shortcut.toLowerCase().split('+').map((p) => p.trim());
  const modifiers: string[] = [];
  let key = '';

  parts.forEach((part) => {
    if (['ctrl', 'alt', 'shift', 'meta', 'cmd'].includes(part)) {
      modifiers.push(part);
    } else {
      key = part;
    }
  });

  return { modifiers, key };
}

function getKeyDisplay(key: string): string {
  const lowerKey = key.toLowerCase();
  return keyDisplayMap[lowerKey] || key.toUpperCase();
}

// ============================================================================
// Shortcut Key Component
// ============================================================================

export function ShortcutKey({
  shortcut,
  size = 'sm',
  variant = 'default',
  className,
}: ShortcutKeyProps) {
  const { modifiers, key } = parseShortcut(shortcut);

  const keys = [...modifiers.map(getKeyDisplay), getKeyDisplay(key)];

  return (
    <kbd
      className={cn(
        'inline-flex items-center gap-0.5 font-mono rounded',
        sizeConfig[size],
        variantConfig[variant],
        className
      )}
    >
      {keys.map((k, i) => (
        <span key={i} className="inline-flex items-center justify-center">
          {k}
          {i < keys.length - 1 && <span className="mx-0.5 text-muted-foreground">+</span>}
        </span>
      ))}
    </kbd>
  );
}

// ============================================================================
// Shortcut Keys Group Component
// ============================================================================

export interface ShortcutKeysProps {
  shortcuts: string[];
  separator?: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export function ShortcutKeys({
  shortcuts,
  separator = 'sau',
  size = 'sm',
  className,
}: ShortcutKeysProps) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {shortcuts.map((shortcut, i) => (
        <React.Fragment key={shortcut}>
          <ShortcutKey shortcut={shortcut} size={size} />
          {i < shortcuts.length - 1 && (
            <span className="text-xs text-muted-foreground">{separator}</span>
          )}
        </React.Fragment>
      ))}
    </span>
  );
}

// ============================================================================
// Shortcut List Component
// ============================================================================

export function ShortcutList({
  shortcuts,
  category,
  showCategories = true,
  className,
}: ShortcutListProps) {
  const filteredShortcuts = category
    ? shortcuts.filter((s) => s.category === category)
    : shortcuts;

  const groupedShortcuts = React.useMemo(() => {
    if (!showCategories) {
      return { '': filteredShortcuts };
    }

    return filteredShortcuts.reduce((acc, shortcut) => {
      const cat = shortcut.category || 'General';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(shortcut);
      return acc;
    }, {} as Record<string, Shortcut[]>);
  }, [filteredShortcuts, showCategories]);

  return (
    <div className={cn('space-y-6', className)}>
      {Object.entries(groupedShortcuts).map(([categoryName, categoryShortcuts]) => (
        <div key={categoryName}>
          {showCategories && categoryName && (
            <h4 className="text-sm font-semibold mb-3">{categoryName}</h4>
          )}
          <div className="space-y-2">
            {categoryShortcuts.map((shortcut) => {
              const shortcutStr = [
                ...(shortcut.modifiers || []),
                shortcut.key,
              ].join('+');

              return (
                <div
                  key={shortcutStr}
                  className={cn(
                    'flex items-center justify-between py-2 px-3 rounded-md',
                    'hover:bg-muted/50 transition-colors',
                    shortcut.disabled && 'opacity-50'
                  )}
                >
                  <span className="text-sm">{shortcut.description}</span>
                  <ShortcutKey shortcut={shortcutStr} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Shortcut Help Dialog Component
// ============================================================================

export interface ShortcutHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcuts: Shortcut[];
  title?: string;
  className?: string;
}

export function ShortcutHelpDialog({
  open,
  onOpenChange,
  shortcuts,
  title = 'Comenzi rapide',
  className,
}: ShortcutHelpDialogProps) {
  // Handle keyboard shortcut to open (Shift+?)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === '?') {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (open && e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog */}
      <div
        className={cn(
          'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
          'w-full max-w-2xl max-h-[80vh] bg-background rounded-lg shadow-xl overflow-hidden',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">{title}</h2>
            <ShortcutKey shortcut="shift+?" size="xs" />
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-muted rounded-md transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          <ShortcutList shortcuts={shortcuts} />
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Use Keyboard Shortcuts Hook
// ============================================================================

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        if (shortcut.disabled) continue;

        const modifiers = shortcut.modifiers || [];
        const ctrlMatch = modifiers.includes('ctrl') === (e.ctrlKey || e.metaKey);
        const altMatch = modifiers.includes('alt') === e.altKey;
        const shiftMatch = modifiers.includes('shift') === e.shiftKey;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && altMatch && shiftMatch && keyMatch) {
          e.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

// ============================================================================
// Accounting-Specific: Default Accounting Shortcuts
// ============================================================================

export const accountingShortcuts: Omit<Shortcut, 'action'>[] = [
  // Navigation
  { key: 'g', modifiers: ['ctrl'], description: 'Mergi la...', category: 'Navigare' },
  { key: 'd', modifiers: ['ctrl'], description: 'Dashboard', category: 'Navigare' },
  { key: 'f', modifiers: ['ctrl'], description: 'Facturi', category: 'Navigare' },
  { key: 'e', modifiers: ['ctrl'], description: 'Cheltuieli', category: 'Navigare' },
  { key: 'c', modifiers: ['ctrl'], description: 'Contacte', category: 'Navigare' },

  // Actions
  { key: 'n', modifiers: ['ctrl'], description: 'Creează element nou', category: 'Acțiuni' },
  { key: 's', modifiers: ['ctrl'], description: 'Salvează', category: 'Acțiuni' },
  { key: 'p', modifiers: ['ctrl'], description: 'Imprimă', category: 'Acțiuni' },
  { key: 'k', modifiers: ['ctrl'], description: 'Caută comenzi', category: 'Acțiuni' },

  // Editing
  { key: 'z', modifiers: ['ctrl'], description: 'Anulează', category: 'Editare' },
  { key: 'y', modifiers: ['ctrl'], description: 'Refă', category: 'Editare' },
  { key: 'a', modifiers: ['ctrl'], description: 'Selectează tot', category: 'Editare' },

  // Other
  { key: '?', modifiers: ['shift'], description: 'Afișează comenzi rapide', category: 'Altele' },
  { key: 'escape', description: 'Închide dialog / Anulează', category: 'Altele' },
];

// ============================================================================
// Shortcut Hint Component
// ============================================================================

export interface ShortcutHintProps {
  shortcut: string;
  className?: string;
}

export function ShortcutHint({ shortcut, className }: ShortcutHintProps) {
  return (
    <span className={cn('text-xs text-muted-foreground', className)}>
      (<ShortcutKey shortcut={shortcut} size="xs" variant="ghost" />)
    </span>
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  keyDisplayMap,
  parseShortcut,
  getKeyDisplay,
  type Shortcut as KeyboardShortcut,
  type ShortcutListProps as ShortcutListDisplayProps,
  type ShortcutHelpDialogProps as ShortcutDialogProps,
  type ShortcutKeysProps as ShortcutGroupProps,
};
