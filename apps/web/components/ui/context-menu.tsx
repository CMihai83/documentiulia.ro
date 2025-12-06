'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Context Menu Context
// ============================================================================

interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
}

interface ContextMenuContextValue {
  state: ContextMenuState;
  open: (e: React.MouseEvent) => void;
  close: () => void;
}

const ContextMenuContext = createContext<ContextMenuContextValue | null>(null);

function useContextMenu() {
  const context = useContext(ContextMenuContext);
  if (!context) {
    throw new Error('ContextMenu components must be used within a ContextMenu');
  }
  return context;
}

// ============================================================================
// Context Menu Root
// ============================================================================

interface ContextMenuProps {
  children: React.ReactNode;
}

export function ContextMenu({ children }: ContextMenuProps) {
  const [state, setState] = useState<ContextMenuState>({
    isOpen: false,
    position: { x: 0, y: 0 },
  });

  const open = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setState({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
    });
  }, []);

  const close = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }));
  }, []);

  useEffect(() => {
    const handleClick = () => close();
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };

    if (state.isOpen) {
      document.addEventListener('click', handleClick);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [state.isOpen, close]);

  return (
    <ContextMenuContext.Provider value={{ state, open, close }}>
      {children}
    </ContextMenuContext.Provider>
  );
}

// ============================================================================
// Context Menu Trigger
// ============================================================================

interface ContextMenuTriggerProps {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
}

export function ContextMenuTrigger({
  children,
  className,
  asChild = false,
}: ContextMenuTriggerProps) {
  const { open } = useContextMenu();

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<React.HTMLAttributes<HTMLElement>>, {
      onContextMenu: open,
      className: cn(
        (children.props as { className?: string }).className,
        className
      ),
    });
  }

  return (
    <div onContextMenu={open} className={className}>
      {children}
    </div>
  );
}

// ============================================================================
// Context Menu Content
// ============================================================================

interface ContextMenuContentProps {
  children: React.ReactNode;
  className?: string;
}

export function ContextMenuContent({
  children,
  className,
}: ContextMenuContentProps) {
  const { state } = useContextMenu();
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(state.position);

  useEffect(() => {
    if (!state.isOpen || !menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let newX = state.position.x;
    let newY = state.position.y;

    if (state.position.x + rect.width > viewportWidth) {
      newX = state.position.x - rect.width;
    }
    if (state.position.y + rect.height > viewportHeight) {
      newY = state.position.y - rect.height;
    }

    setAdjustedPosition({ x: newX, y: newY });
  }, [state.isOpen, state.position]);

  return (
    <AnimatePresence>
      {state.isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.1 }}
          style={{
            position: 'fixed',
            left: adjustedPosition.x,
            top: adjustedPosition.y,
            zIndex: 50,
          }}
          className={cn(
            'min-w-[180px] py-1',
            'bg-white dark:bg-gray-800',
            'border border-gray-200 dark:border-gray-700',
            'rounded-lg shadow-lg',
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Context Menu Item
// ============================================================================

interface ContextMenuItemProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  destructive?: boolean;
  icon?: React.ReactNode;
  shortcut?: string;
  onSelect?: () => void;
}

export function ContextMenuItem({
  children,
  className,
  disabled = false,
  destructive = false,
  icon,
  shortcut,
  onSelect,
}: ContextMenuItemProps) {
  const { close } = useContextMenu();

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
      className={cn(
        'flex items-center w-full px-3 py-2 text-sm text-left',
        'transition-colors duration-150',
        disabled
          ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
          : destructive
            ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700',
        className
      )}
    >
      {icon && <span className="mr-2 w-4 h-4 flex items-center justify-center">{icon}</span>}
      <span className="flex-1">{children}</span>
      {shortcut && (
        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
          {shortcut}
        </span>
      )}
    </button>
  );
}

// ============================================================================
// Context Menu Separator
// ============================================================================

interface ContextMenuSeparatorProps {
  className?: string;
}

export function ContextMenuSeparator({ className }: ContextMenuSeparatorProps) {
  return (
    <div className={cn('my-1 h-px bg-gray-200 dark:bg-gray-700', className)} />
  );
}

// ============================================================================
// Context Menu Label
// ============================================================================

interface ContextMenuLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function ContextMenuLabel({ children, className }: ContextMenuLabelProps) {
  return (
    <div className={cn(
      'px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider',
      className
    )}>
      {children}
    </div>
  );
}

// ============================================================================
// Context Menu Checkbox Item
// ============================================================================

interface ContextMenuCheckboxItemProps {
  children: React.ReactNode;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function ContextMenuCheckboxItem({
  children,
  checked = false,
  onCheckedChange,
  disabled = false,
  className,
}: ContextMenuCheckboxItemProps) {
  const { close } = useContextMenu();

  const handleClick = () => {
    if (disabled) return;
    onCheckedChange?.(!checked);
    close();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'flex items-center w-full px-3 py-2 text-sm text-left',
        'transition-colors duration-150',
        disabled
          ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700',
        className
      )}
    >
      <span className={cn(
        'mr-2 w-4 h-4 flex items-center justify-center',
        'border rounded',
        checked
          ? 'bg-blue-500 border-blue-500 text-white'
          : 'border-gray-300 dark:border-gray-600'
      )}>
        {checked && <Check className="w-3 h-3" />}
      </span>
      <span className="flex-1">{children}</span>
    </button>
  );
}

// ============================================================================
// Context Menu Radio Group
// ============================================================================

interface ContextMenuRadioGroupProps {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
}

const RadioGroupContext = createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
} | null>(null);

export function ContextMenuRadioGroup({
  children,
  value,
  onValueChange,
}: ContextMenuRadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      {children}
    </RadioGroupContext.Provider>
  );
}

// ============================================================================
// Context Menu Radio Item
// ============================================================================

interface ContextMenuRadioItemProps {
  children: React.ReactNode;
  value: string;
  disabled?: boolean;
  className?: string;
}

export function ContextMenuRadioItem({
  children,
  value,
  disabled = false,
  className,
}: ContextMenuRadioItemProps) {
  const { close } = useContextMenu();
  const radioContext = useContext(RadioGroupContext);
  const isChecked = radioContext?.value === value;

  const handleClick = () => {
    if (disabled) return;
    radioContext?.onValueChange?.(value);
    close();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'flex items-center w-full px-3 py-2 text-sm text-left',
        'transition-colors duration-150',
        disabled
          ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700',
        className
      )}
    >
      <span className={cn(
        'mr-2 w-4 h-4 flex items-center justify-center',
        'border rounded-full',
        isChecked
          ? 'border-blue-500'
          : 'border-gray-300 dark:border-gray-600'
      )}>
        {isChecked && <Circle className="w-2 h-2 fill-blue-500 text-blue-500" />}
      </span>
      <span className="flex-1">{children}</span>
    </button>
  );
}

// ============================================================================
// Context Menu Sub
// ============================================================================

interface ContextMenuSubProps {
  children: React.ReactNode;
}

interface SubMenuContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const SubMenuContext = createContext<SubMenuContextValue | null>(null);

export function ContextMenuSub({ children }: ContextMenuSubProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <SubMenuContext.Provider value={{ isOpen, setIsOpen }}>
      <div
        className="relative"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        {children}
      </div>
    </SubMenuContext.Provider>
  );
}

// ============================================================================
// Context Menu Sub Trigger
// ============================================================================

interface ContextMenuSubTriggerProps {
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export function ContextMenuSubTrigger({
  children,
  className,
  icon,
}: ContextMenuSubTriggerProps) {
  return (
    <div className={cn(
      'flex items-center w-full px-3 py-2 text-sm',
      'text-gray-700 dark:text-gray-200',
      'hover:bg-gray-100 dark:hover:bg-gray-700',
      'transition-colors duration-150 cursor-default',
      className
    )}>
      {icon && <span className="mr-2 w-4 h-4 flex items-center justify-center">{icon}</span>}
      <span className="flex-1">{children}</span>
      <ChevronRight className="w-4 h-4 text-gray-400" />
    </div>
  );
}

// ============================================================================
// Context Menu Sub Content
// ============================================================================

interface ContextMenuSubContentProps {
  children: React.ReactNode;
  className?: string;
}

export function ContextMenuSubContent({
  children,
  className,
}: ContextMenuSubContentProps) {
  const subMenuContext = useContext(SubMenuContext);

  if (!subMenuContext) return null;

  return (
    <AnimatePresence>
      {subMenuContext.isOpen && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.1 }}
          className={cn(
            'absolute left-full top-0 ml-1',
            'min-w-[180px] py-1',
            'bg-white dark:bg-gray-800',
            'border border-gray-200 dark:border-gray-700',
            'rounded-lg shadow-lg',
            className
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Simple Context Menu (All-in-one)
// ============================================================================

interface SimpleContextMenuItem {
  type?: 'item' | 'separator' | 'label' | 'checkbox' | 'submenu';
  label?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  destructive?: boolean;
  checked?: boolean;
  onSelect?: () => void;
  onCheckedChange?: (checked: boolean) => void;
  items?: SimpleContextMenuItem[];
}

interface SimpleContextMenuProps {
  children: React.ReactNode;
  items: SimpleContextMenuItem[];
  className?: string;
}

export function SimpleContextMenu({
  children,
  items,
  className,
}: SimpleContextMenuProps) {
  const renderItem = (item: SimpleContextMenuItem, idx: number) => {
    switch (item.type) {
      case 'separator':
        return <ContextMenuSeparator key={idx} />;
      case 'label':
        return <ContextMenuLabel key={idx}>{item.label}</ContextMenuLabel>;
      case 'checkbox':
        return (
          <ContextMenuCheckboxItem
            key={idx}
            checked={item.checked}
            onCheckedChange={item.onCheckedChange}
            disabled={item.disabled}
          >
            {item.label}
          </ContextMenuCheckboxItem>
        );
      case 'submenu':
        return (
          <ContextMenuSub key={idx}>
            <ContextMenuSubTrigger icon={item.icon}>
              {item.label}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {item.items?.map((subItem, subIdx) => renderItem(subItem, subIdx))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        );
      default:
        return (
          <ContextMenuItem
            key={idx}
            icon={item.icon}
            shortcut={item.shortcut}
            disabled={item.disabled}
            destructive={item.destructive}
            onSelect={item.onSelect}
          >
            {item.label}
          </ContextMenuItem>
        );
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className={className}>
        {items.map((item, idx) => renderItem(item, idx))}
      </ContextMenuContent>
    </ContextMenu>
  );
}

export default ContextMenu;
