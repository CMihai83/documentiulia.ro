'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type KbdSize = 'xs' | 'sm' | 'md' | 'lg';
export type KbdVariant = 'default' | 'outline' | 'ghost';

// ============================================================================
// Size & Variant Classes
// ============================================================================

const sizeClasses: Record<KbdSize, string> = {
  xs: 'px-1 py-0.5 text-[10px] min-w-[16px]',
  sm: 'px-1.5 py-0.5 text-xs min-w-[20px]',
  md: 'px-2 py-1 text-xs min-w-[24px]',
  lg: 'px-2.5 py-1.5 text-sm min-w-[28px]',
};

const variantClasses: Record<KbdVariant, string> = {
  default:
    'bg-muted border border-border shadow-sm text-muted-foreground',
  outline:
    'border border-border text-muted-foreground',
  ghost:
    'text-muted-foreground',
};

// ============================================================================
// Kbd Component
// ============================================================================

interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  size?: KbdSize;
  variant?: KbdVariant;
}

export const Kbd = React.forwardRef<HTMLElement, KbdProps>(
  ({ className, size = 'sm', variant = 'default', children, ...props }, ref) => {
    return (
      <kbd
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-mono font-medium rounded',
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {children}
      </kbd>
    );
  }
);
Kbd.displayName = 'Kbd';

// ============================================================================
// Key Symbols
// ============================================================================

const keySymbols: Record<string, string> = {
  // Modifiers
  cmd: '⌘',
  command: '⌘',
  ctrl: 'Ctrl',
  control: 'Ctrl',
  alt: '⌥',
  option: '⌥',
  shift: '⇧',
  meta: '⌘',
  mod: typeof navigator !== 'undefined' && navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl',

  // Navigation
  enter: '↵',
  return: '↵',
  tab: '⇥',
  space: '␣',
  backspace: '⌫',
  delete: '⌦',
  escape: 'Esc',
  esc: 'Esc',

  // Arrows
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',

  // Other
  capslock: '⇪',
  home: 'Home',
  end: 'End',
  pageup: 'PgUp',
  pagedown: 'PgDn',
};

// ============================================================================
// Get Key Display
// ============================================================================

function getKeyDisplay(key: string): string {
  const lowerKey = key.toLowerCase();
  return keySymbols[lowerKey] || key.toUpperCase();
}

// ============================================================================
// Keyboard Shortcut
// ============================================================================

interface KeyboardShortcutProps extends React.HTMLAttributes<HTMLDivElement> {
  keys: string[];
  separator?: string | React.ReactNode;
  size?: KbdSize;
  variant?: KbdVariant;
}

export const KeyboardShortcut = React.forwardRef<HTMLDivElement, KeyboardShortcutProps>(
  (
    {
      className,
      keys,
      separator = '+',
      size = 'sm',
      variant = 'default',
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn('inline-flex items-center gap-1', className)}
        {...props}
      >
        {keys.map((key, index) => (
          <React.Fragment key={index}>
            <Kbd size={size} variant={variant}>
              {getKeyDisplay(key)}
            </Kbd>
            {index < keys.length - 1 && (
              <span className="text-muted-foreground text-xs">{separator}</span>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }
);
KeyboardShortcut.displayName = 'KeyboardShortcut';

// ============================================================================
// Shortcut Label (Key + Description)
// ============================================================================

interface ShortcutLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  keys: string[];
  label: string;
  size?: KbdSize;
  variant?: KbdVariant;
  align?: 'left' | 'right' | 'between';
}

export const ShortcutLabel = React.forwardRef<HTMLDivElement, ShortcutLabelProps>(
  (
    {
      className,
      keys,
      label,
      size = 'sm',
      variant = 'default',
      align = 'between',
      ...props
    },
    ref
  ) => {
    const alignClasses = {
      left: 'justify-start gap-2',
      right: 'flex-row-reverse justify-start gap-2',
      between: 'justify-between',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center w-full',
          alignClasses[align],
          className
        )}
        {...props}
      >
        <span className="text-sm">{label}</span>
        <KeyboardShortcut keys={keys} size={size} variant={variant} />
      </div>
    );
  }
);
ShortcutLabel.displayName = 'ShortcutLabel';

// ============================================================================
// Shortcuts List
// ============================================================================

interface Shortcut {
  keys: string[];
  label: string;
  category?: string;
}

interface ShortcutsListProps extends React.HTMLAttributes<HTMLDivElement> {
  shortcuts: Shortcut[];
  grouped?: boolean;
  size?: KbdSize;
  variant?: KbdVariant;
}

export const ShortcutsList = React.forwardRef<HTMLDivElement, ShortcutsListProps>(
  ({ className, shortcuts, grouped = false, size = 'sm', variant = 'default', ...props }, ref) => {
    if (grouped) {
      const groups = shortcuts.reduce((acc, shortcut) => {
        const category = shortcut.category || 'General';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(shortcut);
        return acc;
      }, {} as Record<string, Shortcut[]>);

      return (
        <div ref={ref} className={cn('space-y-4', className)} {...props}>
          {Object.entries(groups).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                {category}
              </h4>
              <div className="space-y-1">
                {items.map((shortcut, index) => (
                  <ShortcutLabel
                    key={index}
                    keys={shortcut.keys}
                    label={shortcut.label}
                    size={size}
                    variant={variant}
                    className="py-1 px-2 rounded hover:bg-muted/50"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div ref={ref} className={cn('space-y-1', className)} {...props}>
        {shortcuts.map((shortcut, index) => (
          <ShortcutLabel
            key={index}
            keys={shortcut.keys}
            label={shortcut.label}
            size={size}
            variant={variant}
            className="py-1 px-2 rounded hover:bg-muted/50"
          />
        ))}
      </div>
    );
  }
);
ShortcutsList.displayName = 'ShortcutsList';

// ============================================================================
// Hotkey Hook
// ============================================================================

interface HotkeyOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  target?: EventTarget | null;
}

export function useHotkey(
  keys: string | string[],
  callback: (event: KeyboardEvent) => void,
  options: HotkeyOptions = {}
) {
  const {
    enabled = true,
    preventDefault = true,
    stopPropagation = false,
    target = typeof window !== 'undefined' ? window : null,
  } = options;

  const callbackRef = React.useRef(callback);
  callbackRef.current = callback;

  React.useEffect(() => {
    if (!enabled || !target) return;

    const keyList = Array.isArray(keys)
      ? keys.map((k) => k.toLowerCase())
      : [keys.toLowerCase()];

    const handleKeyDown = (event: Event) => {
      const e = event as KeyboardEvent;
      const pressedKeys: string[] = [];

      if (e.metaKey || e.ctrlKey) pressedKeys.push('mod');
      if (e.metaKey) pressedKeys.push('cmd');
      if (e.ctrlKey) pressedKeys.push('ctrl');
      if (e.altKey) pressedKeys.push('alt');
      if (e.shiftKey) pressedKeys.push('shift');
      pressedKeys.push(e.key.toLowerCase());

      const matches = keyList.some((combo) => {
        const comboParts = combo.split('+').map((k) => k.trim().toLowerCase());
        return comboParts.every((part) => pressedKeys.includes(part));
      });

      if (matches) {
        if (preventDefault) e.preventDefault();
        if (stopPropagation) e.stopPropagation();
        callbackRef.current(e);
      }
    };

    target.addEventListener('keydown', handleKeyDown);
    return () => target.removeEventListener('keydown', handleKeyDown);
  }, [keys, enabled, preventDefault, stopPropagation, target]);
}

// ============================================================================
// Keyboard Key (Visual keyboard key)
// ============================================================================

interface KeyboardKeyProps extends React.HTMLAttributes<HTMLDivElement> {
  keyName: string;
  pressed?: boolean;
  width?: number;
  height?: number;
}

export const KeyboardKey = React.forwardRef<HTMLDivElement, KeyboardKeyProps>(
  ({ className, keyName, pressed = false, width = 40, height = 40, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center',
          'rounded-lg border-2 border-border',
          'font-mono text-sm font-medium',
          'transition-all duration-100',
          pressed
            ? 'bg-primary text-primary-foreground border-primary translate-y-0.5 shadow-none'
            : 'bg-background shadow-md hover:shadow-lg',
          className
        )}
        style={{ width, height }}
        {...props}
      >
        {getKeyDisplay(keyName)}
      </div>
    );
  }
);
KeyboardKey.displayName = 'KeyboardKey';

// ============================================================================
// Simple Kbd (Pre-built)
// ============================================================================

interface SimpleKbdProps {
  shortcut: string;
  className?: string;
}

export function SimpleKbd({ shortcut, className }: SimpleKbdProps) {
  const keys = shortcut.split('+').map((k) => k.trim());
  return <KeyboardShortcut keys={keys} className={className} />;
}

// ============================================================================
// Command Shortcut (For menu items)
// ============================================================================

interface CommandShortcutProps {
  shortcut: string;
  className?: string;
}

export function CommandShortcut({ shortcut, className }: CommandShortcutProps) {
  const keys = shortcut.split('+').map((k) => k.trim());
  return (
    <span className={cn('ml-auto text-xs tracking-widest text-muted-foreground', className)}>
      {keys.map((key, i) => (
        <React.Fragment key={i}>
          {getKeyDisplay(key)}
          {i < keys.length - 1 && ''}
        </React.Fragment>
      ))}
    </span>
  );
}

// ============================================================================
// Shortcuts Dialog
// ============================================================================

interface ShortcutsDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  shortcuts: Shortcut[];
  title?: string;
}

export function ShortcutsDialog({
  open = false,
  onOpenChange,
  shortcuts,
  title = 'Scurtaturi de tastatura',
}: ShortcutsDialogProps) {
  // Close on Escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange?.(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={() => onOpenChange?.(false)}
    >
      <div className="fixed inset-0 bg-black/50" />
      <div
        className="relative bg-background border border-border rounded-lg shadow-lg p-6 max-w-md w-full max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={() => onOpenChange?.(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <ShortcutsList shortcuts={shortcuts} grouped />
      </div>
    </div>
  );
}

// ============================================================================
// Common Shortcuts
// ============================================================================

export const commonShortcuts: Shortcut[] = [
  // General
  { keys: ['mod', 's'], label: 'Salveaza', category: 'General' },
  { keys: ['mod', 'z'], label: 'Anuleaza', category: 'General' },
  { keys: ['mod', 'shift', 'z'], label: 'Refaceti', category: 'General' },
  { keys: ['mod', 'c'], label: 'Copiaza', category: 'General' },
  { keys: ['mod', 'v'], label: 'Lipeste', category: 'General' },
  { keys: ['mod', 'x'], label: 'Taie', category: 'General' },
  { keys: ['mod', 'a'], label: 'Selecteaza tot', category: 'General' },

  // Navigation
  { keys: ['mod', 'k'], label: 'Cautare rapida', category: 'Navigare' },
  { keys: ['mod', 'p'], label: 'Paleta de comenzi', category: 'Navigare' },
  { keys: ['mod', '/'], label: 'Ajutor', category: 'Navigare' },
  { keys: ['escape'], label: 'Inchide', category: 'Navigare' },

  // Editing
  { keys: ['mod', 'b'], label: 'Bold', category: 'Editare' },
  { keys: ['mod', 'i'], label: 'Italic', category: 'Editare' },
  { keys: ['mod', 'u'], label: 'Subliniat', category: 'Editare' },
];

export { getKeyDisplay };
