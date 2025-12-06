'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types & Constants
// ============================================================================

export type ToolbarSize = 'sm' | 'md' | 'lg';
export type ToolbarVariant = 'default' | 'ghost' | 'outline' | 'solid';

const sizeClasses: Record<ToolbarSize, string> = {
  sm: 'h-8 gap-1',
  md: 'h-10 gap-2',
  lg: 'h-12 gap-3',
};

const variantClasses: Record<ToolbarVariant, string> = {
  default: 'bg-background border',
  ghost: 'bg-transparent',
  outline: 'bg-transparent border',
  solid: 'bg-muted',
};

// ============================================================================
// Main Toolbar Component
// ============================================================================

interface ToolbarProps {
  children: React.ReactNode;
  size?: ToolbarSize;
  variant?: ToolbarVariant;
  sticky?: boolean;
  className?: string;
}

export function Toolbar({
  children,
  size = 'md',
  variant = 'default',
  sticky = false,
  className,
}: ToolbarProps) {
  return (
    <div
      role="toolbar"
      className={cn(
        'flex items-center px-2 rounded-lg',
        sizeClasses[size],
        variantClasses[variant],
        sticky && 'sticky top-0 z-10',
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Toolbar Group
// ============================================================================

interface ToolbarGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function ToolbarGroup({ children, className }: ToolbarGroupProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {children}
    </div>
  );
}

// ============================================================================
// Toolbar Separator
// ============================================================================

interface ToolbarSeparatorProps {
  orientation?: 'vertical' | 'horizontal';
  className?: string;
}

export function ToolbarSeparator({
  orientation = 'vertical',
  className,
}: ToolbarSeparatorProps) {
  return (
    <div
      className={cn(
        'bg-border',
        orientation === 'vertical' ? 'w-px h-6 mx-2' : 'h-px w-6 my-2',
        className
      )}
    />
  );
}

// ============================================================================
// Toolbar Button
// ============================================================================

interface ToolbarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'destructive';
  tooltip?: string;
}

const buttonSizeClasses = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base',
};

const buttonVariantClasses = {
  default: 'hover:bg-accent hover:text-accent-foreground',
  ghost: 'hover:bg-accent/50 hover:text-accent-foreground',
  destructive: 'hover:bg-destructive/10 hover:text-destructive',
};

export const ToolbarButton = React.forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ className, isActive, size = 'md', variant = 'default', tooltip, children, ...props }, ref) => {
    const button = (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
          'disabled:opacity-50 disabled:pointer-events-none',
          buttonSizeClasses[size],
          buttonVariantClasses[variant],
          isActive && 'bg-accent text-accent-foreground',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );

    if (tooltip) {
      return (
        <div className="relative group">
          {button}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
            {tooltip}
          </div>
        </div>
      );
    }

    return button;
  }
);
ToolbarButton.displayName = 'ToolbarButton';

// ============================================================================
// Toolbar Toggle Button
// ============================================================================

interface ToolbarToggleButtonProps extends Omit<ToolbarButtonProps, 'isActive'> {
  pressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
}

export const ToolbarToggleButton = React.forwardRef<HTMLButtonElement, ToolbarToggleButtonProps>(
  ({ pressed = false, onPressedChange, onClick, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onPressedChange?.(!pressed);
      onClick?.(e);
    };

    return (
      <ToolbarButton
        ref={ref}
        isActive={pressed}
        aria-pressed={pressed}
        onClick={handleClick}
        {...props}
      />
    );
  }
);
ToolbarToggleButton.displayName = 'ToolbarToggleButton';

// ============================================================================
// Toolbar Toggle Group
// ============================================================================

interface ToolbarToggleGroupProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

const ToggleGroupContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
} | null>(null);

export function ToolbarToggleGroup({
  value,
  onValueChange,
  children,
  className,
}: ToolbarToggleGroupProps) {
  return (
    <ToggleGroupContext.Provider value={{ value, onValueChange }}>
      <div role="group" className={cn('flex items-center', className)}>
        {children}
      </div>
    </ToggleGroupContext.Provider>
  );
}

interface ToolbarToggleGroupItemProps extends Omit<ToolbarButtonProps, 'isActive'> {
  value: string;
}

export const ToolbarToggleGroupItem = React.forwardRef<HTMLButtonElement, ToolbarToggleGroupItemProps>(
  ({ value, onClick, ...props }, ref) => {
    const context = React.useContext(ToggleGroupContext);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      context?.onValueChange?.(value);
      onClick?.(e);
    };

    return (
      <ToolbarButton
        ref={ref}
        isActive={context?.value === value}
        onClick={handleClick}
        {...props}
      />
    );
  }
);
ToolbarToggleGroupItem.displayName = 'ToolbarToggleGroupItem';

// ============================================================================
// Toolbar Dropdown
// ============================================================================

interface ToolbarDropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  className?: string;
}

export function ToolbarDropdown({
  trigger,
  children,
  align = 'start',
  className,
}: ToolbarDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const alignClasses = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  };

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={cn(
            'absolute top-full mt-1 min-w-[150px] rounded-md border bg-popover p-1 shadow-lg z-50',
            alignClasses[align]
          )}
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}

// ============================================================================
// Toolbar Dropdown Item
// ============================================================================

interface ToolbarDropdownItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  shortcut?: string;
}

export const ToolbarDropdownItem = React.forwardRef<HTMLButtonElement, ToolbarDropdownItemProps>(
  ({ className, icon, shortcut, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'flex items-center w-full gap-2 px-2 py-1.5 text-sm rounded-sm',
          'hover:bg-accent hover:text-accent-foreground',
          'focus:outline-none focus:bg-accent',
          'disabled:opacity-50 disabled:pointer-events-none',
          className
        )}
        {...props}
      >
        {icon && <span className="w-4 h-4">{icon}</span>}
        <span className="flex-1 text-left">{children}</span>
        {shortcut && (
          <span className="text-xs text-muted-foreground ml-auto">{shortcut}</span>
        )}
      </button>
    );
  }
);
ToolbarDropdownItem.displayName = 'ToolbarDropdownItem';

// ============================================================================
// Toolbar Input
// ============================================================================

interface ToolbarInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  width?: 'auto' | 'sm' | 'md' | 'lg';
}

const inputWidthClasses = {
  auto: 'w-auto',
  sm: 'w-20',
  md: 'w-32',
  lg: 'w-48',
};

export const ToolbarInput = React.forwardRef<HTMLInputElement, ToolbarInputProps>(
  ({ className, width = 'md', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'h-7 px-2 text-sm rounded-md border bg-background',
          'focus:outline-none focus:ring-2 focus:ring-ring',
          'placeholder:text-muted-foreground',
          inputWidthClasses[width],
          className
        )}
        {...props}
      />
    );
  }
);
ToolbarInput.displayName = 'ToolbarInput';

// ============================================================================
// Toolbar Select
// ============================================================================

interface ToolbarSelectOption {
  value: string;
  label: string;
}

interface ToolbarSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  options: ToolbarSelectOption[];
  placeholder?: string;
  width?: 'auto' | 'sm' | 'md' | 'lg';
  className?: string;
}

export function ToolbarSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Selectați...',
  width = 'md',
  className,
}: ToolbarSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
      className={cn(
        'h-7 px-2 text-sm rounded-md border bg-background',
        'focus:outline-none focus:ring-2 focus:ring-ring',
        inputWidthClasses[width],
        className
      )}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

// ============================================================================
// Toolbar Label
// ============================================================================

interface ToolbarLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function ToolbarLabel({ children, className }: ToolbarLabelProps) {
  return (
    <span className={cn('text-sm text-muted-foreground px-2', className)}>
      {children}
    </span>
  );
}

// ============================================================================
// Toolbar Spacer
// ============================================================================

export function ToolbarSpacer() {
  return <div className="flex-1" />;
}

// ============================================================================
// Accounting-Specific: Document Toolbar
// ============================================================================

interface DocumentToolbarProps {
  onSave?: () => void;
  onPrint?: () => void;
  onExport?: (format: 'pdf' | 'excel' | 'csv') => void;
  onEmail?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  isSaving?: boolean;
  className?: string;
}

export function DocumentToolbar({
  onSave,
  onPrint,
  onExport,
  onEmail,
  onDuplicate,
  onDelete,
  isSaving = false,
  className,
}: DocumentToolbarProps) {
  return (
    <Toolbar className={className}>
      <ToolbarGroup>
        {onSave && (
          <ToolbarButton
            onClick={onSave}
            disabled={isSaving}
            tooltip="Salvează (Ctrl+S)"
          >
            {isSaving ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            )}
          </ToolbarButton>
        )}

        {onPrint && (
          <ToolbarButton onClick={onPrint} tooltip="Printează (Ctrl+P)">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </ToolbarButton>
        )}
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        {onExport && (
          <ToolbarDropdown
            trigger={
              <ToolbarButton tooltip="Exportă">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </ToolbarButton>
            }
          >
            <ToolbarDropdownItem onClick={() => onExport('pdf')}>
              Export PDF
            </ToolbarDropdownItem>
            <ToolbarDropdownItem onClick={() => onExport('excel')}>
              Export Excel
            </ToolbarDropdownItem>
            <ToolbarDropdownItem onClick={() => onExport('csv')}>
              Export CSV
            </ToolbarDropdownItem>
          </ToolbarDropdown>
        )}

        {onEmail && (
          <ToolbarButton onClick={onEmail} tooltip="Trimite pe email">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </ToolbarButton>
        )}
      </ToolbarGroup>

      <ToolbarSpacer />

      <ToolbarGroup>
        {onDuplicate && (
          <ToolbarButton onClick={onDuplicate} tooltip="Duplică">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </ToolbarButton>
        )}

        {onDelete && (
          <ToolbarButton onClick={onDelete} variant="destructive" tooltip="Șterge">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </ToolbarButton>
        )}
      </ToolbarGroup>
    </Toolbar>
  );
}

// ============================================================================
// Accounting-Specific: Text Editor Toolbar
// ============================================================================

interface TextEditorToolbarProps {
  onBold?: () => void;
  onItalic?: () => void;
  onUnderline?: () => void;
  onStrikethrough?: () => void;
  onAlignLeft?: () => void;
  onAlignCenter?: () => void;
  onAlignRight?: () => void;
  onBulletList?: () => void;
  onNumberedList?: () => void;
  onLink?: () => void;
  activeFormats?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    alignLeft?: boolean;
    alignCenter?: boolean;
    alignRight?: boolean;
  };
  className?: string;
}

export function TextEditorToolbar({
  onBold,
  onItalic,
  onUnderline,
  onStrikethrough,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onBulletList,
  onNumberedList,
  onLink,
  activeFormats = {},
  className,
}: TextEditorToolbarProps) {
  return (
    <Toolbar size="sm" className={className}>
      <ToolbarGroup>
        <ToolbarToggleButton
          pressed={activeFormats.bold}
          onPressedChange={() => onBold?.()}
          tooltip="Bold (Ctrl+B)"
        >
          <span className="font-bold text-sm">B</span>
        </ToolbarToggleButton>
        <ToolbarToggleButton
          pressed={activeFormats.italic}
          onPressedChange={() => onItalic?.()}
          tooltip="Italic (Ctrl+I)"
        >
          <span className="italic text-sm">I</span>
        </ToolbarToggleButton>
        <ToolbarToggleButton
          pressed={activeFormats.underline}
          onPressedChange={() => onUnderline?.()}
          tooltip="Subliniat (Ctrl+U)"
        >
          <span className="underline text-sm">U</span>
        </ToolbarToggleButton>
        <ToolbarToggleButton
          pressed={activeFormats.strikethrough}
          onPressedChange={() => onStrikethrough?.()}
          tooltip="Tăiat"
        >
          <span className="line-through text-sm">S</span>
        </ToolbarToggleButton>
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarToggleGroup
        value={
          activeFormats.alignLeft
            ? 'left'
            : activeFormats.alignCenter
            ? 'center'
            : activeFormats.alignRight
            ? 'right'
            : 'left'
        }
      >
        <ToolbarToggleGroupItem value="left" onClick={onAlignLeft} tooltip="Aliniere stânga">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h16" />
          </svg>
        </ToolbarToggleGroupItem>
        <ToolbarToggleGroupItem value="center" onClick={onAlignCenter} tooltip="Aliniere centru">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M4 18h16" />
          </svg>
        </ToolbarToggleGroupItem>
        <ToolbarToggleGroupItem value="right" onClick={onAlignRight} tooltip="Aliniere dreapta">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M4 18h16" />
          </svg>
        </ToolbarToggleGroupItem>
      </ToolbarToggleGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <ToolbarButton onClick={onBulletList} tooltip="Listă cu puncte">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </ToolbarButton>
        <ToolbarButton onClick={onNumberedList} tooltip="Listă numerotată">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
        </ToolbarButton>
        <ToolbarButton onClick={onLink} tooltip="Inserează link">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </ToolbarButton>
      </ToolbarGroup>
    </Toolbar>
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  type ToolbarProps,
  type ToolbarGroupProps,
  type ToolbarSeparatorProps,
  type ToolbarButtonProps,
  type ToolbarToggleButtonProps,
  type ToolbarToggleGroupProps,
  type ToolbarToggleGroupItemProps,
  type ToolbarDropdownProps,
  type ToolbarDropdownItemProps,
  type ToolbarInputProps,
  type ToolbarSelectOption,
  type ToolbarSelectProps,
  type ToolbarLabelProps,
  type DocumentToolbarProps,
  type TextEditorToolbarProps,
};
