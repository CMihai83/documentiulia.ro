'use client';

import { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, Circle } from 'lucide-react';

// Context for Dropdown
interface DropdownContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  close: () => void;
}

const DropdownContext = createContext<DropdownContextType | null>(null);

function useDropdown() {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error('Dropdown components must be used within a DropdownMenu');
  }
  return context;
}

// Main Dropdown Menu
interface DropdownMenuProps {
  children: ReactNode;
  className?: string;
}

export function DropdownMenu({ children, className = '' }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const close = () => setIsOpen(false);

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen, close }}>
      <div ref={containerRef} className={`relative inline-block ${className}`}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

// Dropdown Trigger
interface DropdownTriggerProps {
  children: ReactNode;
  asChild?: boolean;
  className?: string;
}

export function DropdownTrigger({ children, asChild = false, className = '' }: DropdownTriggerProps) {
  const { isOpen, setIsOpen } = useDropdown();

  const handleClick = () => setIsOpen(!isOpen);

  if (asChild) {
    return (
      <div onClick={handleClick} className={className}>
        {children}
      </div>
    );
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {children}
    </button>
  );
}

// Dropdown Content
interface DropdownContentProps {
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
  className?: string;
}

const alignStyles = {
  start: 'left-0',
  center: 'left-1/2 -translate-x-1/2',
  end: 'right-0',
};

const sideStyles = {
  top: 'bottom-full mb-1',
  bottom: 'top-full mt-1',
  left: 'right-full mr-1 top-0',
  right: 'left-full ml-1 top-0',
};

export function DropdownContent({
  children,
  align = 'start',
  side = 'bottom',
  sideOffset = 4,
  className = '',
}: DropdownContentProps) {
  const { isOpen } = useDropdown();

  const offsetStyle = side === 'top' || side === 'bottom'
    ? { marginTop: side === 'bottom' ? sideOffset : undefined, marginBottom: side === 'top' ? sideOffset : undefined }
    : { marginLeft: side === 'right' ? sideOffset : undefined, marginRight: side === 'left' ? sideOffset : undefined };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.1 }}
          style={offsetStyle}
          className={`
            absolute z-50 min-w-[180px]
            ${alignStyles[align]}
            ${sideStyles[side]}
            ${className}
          `}
        >
          <div className="py-1.5 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Dropdown Item
interface DropdownItemProps {
  children: ReactNode;
  icon?: ReactNode;
  shortcut?: string;
  disabled?: boolean;
  destructive?: boolean;
  onSelect?: () => void;
  className?: string;
}

export function DropdownItem({
  children,
  icon,
  shortcut,
  disabled = false,
  destructive = false,
  onSelect,
  className = '',
}: DropdownItemProps) {
  const { close } = useDropdown();

  const handleClick = () => {
    if (disabled) return;
    onSelect?.();
    close();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`
        flex items-center gap-2 w-full px-3 py-2 text-sm text-left
        ${destructive
          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        transition-colors
        ${className}
      `}
    >
      {icon && <span className="w-4 h-4 flex-shrink-0">{icon}</span>}
      <span className="flex-1">{children}</span>
      {shortcut && (
        <span className="text-xs text-gray-400 dark:text-gray-500">{shortcut}</span>
      )}
    </button>
  );
}

// Dropdown Checkbox Item
interface DropdownCheckboxItemProps {
  children: ReactNode;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function DropdownCheckboxItem({
  children,
  checked = false,
  onCheckedChange,
  disabled = false,
  className = '',
}: DropdownCheckboxItemProps) {
  const handleClick = () => {
    if (disabled) return;
    onCheckedChange?.(!checked);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`
        flex items-center gap-2 w-full px-3 py-2 text-sm text-left
        text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        transition-colors
        ${className}
      `}
    >
      <span className={`w-4 h-4 flex-shrink-0 border rounded ${checked ? 'bg-primary border-primary' : 'border-gray-300 dark:border-gray-600'}`}>
        {checked && <Check className="w-full h-full text-white p-0.5" />}
      </span>
      <span className="flex-1">{children}</span>
    </button>
  );
}

// Dropdown Radio Group
interface DropdownRadioGroupProps {
  children: ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
}

const RadioGroupContext = createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
} | null>(null);

export function DropdownRadioGroup({ children, value, onValueChange }: DropdownRadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      {children}
    </RadioGroupContext.Provider>
  );
}

// Dropdown Radio Item
interface DropdownRadioItemProps {
  children: ReactNode;
  value: string;
  disabled?: boolean;
  className?: string;
}

export function DropdownRadioItem({
  children,
  value,
  disabled = false,
  className = '',
}: DropdownRadioItemProps) {
  const radioContext = useContext(RadioGroupContext);
  const isSelected = radioContext?.value === value;

  const handleClick = () => {
    if (disabled) return;
    radioContext?.onValueChange?.(value);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`
        flex items-center gap-2 w-full px-3 py-2 text-sm text-left
        text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        transition-colors
        ${className}
      `}
    >
      <span className={`w-4 h-4 flex-shrink-0 rounded-full border flex items-center justify-center ${isSelected ? 'border-primary' : 'border-gray-300 dark:border-gray-600'}`}>
        {isSelected && <Circle className="w-2 h-2 fill-primary text-primary" />}
      </span>
      <span className="flex-1">{children}</span>
    </button>
  );
}

// Dropdown Label
interface DropdownLabelProps {
  children: ReactNode;
  className?: string;
}

export function DropdownLabel({ children, className = '' }: DropdownLabelProps) {
  return (
    <div className={`px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${className}`}>
      {children}
    </div>
  );
}

// Dropdown Separator
interface DropdownSeparatorProps {
  className?: string;
}

export function DropdownSeparator({ className = '' }: DropdownSeparatorProps) {
  return <div className={`my-1.5 h-px bg-gray-200 dark:bg-gray-800 ${className}`} />;
}

// Dropdown Sub Menu
interface DropdownSubMenuProps {
  children: ReactNode;
  className?: string;
}

export function DropdownSubMenu({ children, className = '' }: DropdownSubMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {children}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.1 }}
            className="absolute left-full top-0 ml-1"
          >
            {/* Submenu content is handled by DropdownSubContent */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Dropdown Sub Trigger
interface DropdownSubTriggerProps {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function DropdownSubTrigger({ children, icon, className = '' }: DropdownSubTriggerProps) {
  return (
    <div
      className={`
        flex items-center gap-2 w-full px-3 py-2 text-sm
        text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800
        cursor-pointer transition-colors
        ${className}
      `}
    >
      {icon && <span className="w-4 h-4 flex-shrink-0">{icon}</span>}
      <span className="flex-1">{children}</span>
      <ChevronRight className="w-4 h-4 text-gray-400" />
    </div>
  );
}

// Dropdown Sub Content
interface DropdownSubContentProps {
  children: ReactNode;
  className?: string;
}

export function DropdownSubContent({ children, className = '' }: DropdownSubContentProps) {
  return (
    <div className={`py-1.5 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 min-w-[160px] ${className}`}>
      {children}
    </div>
  );
}

// Simple Dropdown (all-in-one convenience component)
interface SimpleDropdownItem {
  label: string;
  value: string;
  icon?: ReactNode;
  disabled?: boolean;
  destructive?: boolean;
}

interface SimpleDropdownProps {
  trigger: ReactNode;
  items: SimpleDropdownItem[];
  onSelect?: (value: string) => void;
  align?: 'start' | 'center' | 'end';
  className?: string;
}

export function SimpleDropdown({
  trigger,
  items,
  onSelect,
  align = 'start',
  className = '',
}: SimpleDropdownProps) {
  return (
    <DropdownMenu className={className}>
      <DropdownTrigger asChild>{trigger}</DropdownTrigger>
      <DropdownContent align={align}>
        {items.map((item) => (
          <DropdownItem
            key={item.value}
            icon={item.icon}
            disabled={item.disabled}
            destructive={item.destructive}
            onSelect={() => onSelect?.(item.value)}
          >
            {item.label}
          </DropdownItem>
        ))}
      </DropdownContent>
    </DropdownMenu>
  );
}

// Context Menu (right-click menu)
interface ContextMenuProps {
  children: ReactNode;
  items: Array<{
    label: string;
    icon?: ReactNode;
    shortcut?: string;
    disabled?: boolean;
    destructive?: boolean;
    onClick?: () => void;
    separator?: boolean;
  }>;
  className?: string;
}

export function ContextMenu({ children, items, className = '' }: ContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = () => setIsOpen(false);
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('contextmenu', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('contextmenu', handleClickOutside);
    };
  }, [isOpen]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setPosition({ x: e.clientX, y: e.clientY });
    setIsOpen(true);
  };

  return (
    <div ref={containerRef} onContextMenu={handleContextMenu} className={className}>
      {children}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            style={{ position: 'fixed', top: position.y, left: position.x }}
            className="z-50 py-1.5 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 min-w-[180px]"
          >
            {items.map((item, index) => (
              item.separator ? (
                <div key={index} className="my-1.5 h-px bg-gray-200 dark:bg-gray-800" />
              ) : (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    if (!item.disabled) {
                      item.onClick?.();
                      setIsOpen(false);
                    }
                  }}
                  disabled={item.disabled}
                  className={`
                    flex items-center gap-2 w-full px-3 py-2 text-sm text-left
                    ${item.destructive
                      ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }
                    ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    transition-colors
                  `}
                >
                  {item.icon && <span className="w-4 h-4 flex-shrink-0">{item.icon}</span>}
                  <span className="flex-1">{item.label}</span>
                  {item.shortcut && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">{item.shortcut}</span>
                  )}
                </button>
              )
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
