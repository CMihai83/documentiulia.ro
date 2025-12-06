'use client';

import React, { createContext, useContext, useState, useRef, useEffect, forwardRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Menubar Context
// ============================================================================

interface MenubarContextValue {
  activeMenu: string | null;
  setActiveMenu: (menu: string | null) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const MenubarContext = createContext<MenubarContextValue | undefined>(undefined);

function useMenubar() {
  const context = useContext(MenubarContext);
  if (!context) {
    throw new Error('Menubar components must be used within a Menubar');
  }
  return context;
}

// ============================================================================
// Menu Context (for individual menus)
// ============================================================================

interface MenuContextValue {
  menuId: string;
  isActive: boolean;
}

const MenuContext = createContext<MenuContextValue | undefined>(undefined);

function useMenu() {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error('Menu components must be used within a MenubarMenu');
  }
  return context;
}

// ============================================================================
// Menubar
// ============================================================================

interface MenubarProps {
  children: React.ReactNode;
  className?: string;
}

export const Menubar = forwardRef<HTMLDivElement, MenubarProps>(
  ({ children, className }, ref) => {
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const menubarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (menubarRef.current && !menubarRef.current.contains(event.target as Node)) {
          setActiveMenu(null);
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
      <MenubarContext.Provider value={{ activeMenu, setActiveMenu, isOpen, setIsOpen }}>
        <div
          ref={ref || menubarRef}
          className={cn(
            'flex items-center gap-1 p-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm',
            className
          )}
        >
          {children}
        </div>
      </MenubarContext.Provider>
    );
  }
);

Menubar.displayName = 'Menubar';

// ============================================================================
// Menubar Menu
// ============================================================================

interface MenubarMenuProps {
  children: React.ReactNode;
  value: string;
}

export function MenubarMenu({ children, value }: MenubarMenuProps) {
  const { activeMenu } = useMenubar();
  const isActive = activeMenu === value;

  return (
    <MenuContext.Provider value={{ menuId: value, isActive }}>
      <div className="relative">
        {children}
      </div>
    </MenuContext.Provider>
  );
}

// ============================================================================
// Menubar Trigger
// ============================================================================

interface MenubarTriggerProps {
  children: React.ReactNode;
  className?: string;
}

export const MenubarTrigger = forwardRef<HTMLButtonElement, MenubarTriggerProps>(
  ({ children, className }, ref) => {
    const { activeMenu, setActiveMenu, isOpen, setIsOpen } = useMenubar();
    const { menuId, isActive } = useMenu();

    const handleClick = () => {
      if (isActive) {
        setActiveMenu(null);
        setIsOpen(false);
      } else {
        setActiveMenu(menuId);
        setIsOpen(true);
      }
    };

    const handleMouseEnter = () => {
      if (isOpen && activeMenu !== menuId) {
        setActiveMenu(menuId);
      }
    };

    return (
      <button
        ref={ref}
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        className={cn(
          'px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-150',
          isActive
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
          className
        )}
      >
        {children}
      </button>
    );
  }
);

MenubarTrigger.displayName = 'MenubarTrigger';

// ============================================================================
// Menubar Content
// ============================================================================

interface MenubarContentProps {
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  className?: string;
}

export function MenubarContent({ children, align = 'start', className }: MenubarContentProps) {
  const { isActive } = useMenu();

  const alignStyles = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  };

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
          className={cn(
            'absolute top-full mt-1 z-50 min-w-[200px]',
            'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700',
            'rounded-lg shadow-lg p-1',
            alignStyles[align],
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
// Menubar Item
// ============================================================================

interface MenubarItemProps {
  children: React.ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  className?: string;
  shortcut?: string;
  icon?: React.ReactNode;
}

export const MenubarItem = forwardRef<HTMLButtonElement, MenubarItemProps>(
  ({ children, onSelect, disabled = false, className, shortcut, icon }, ref) => {
    const { setActiveMenu, setIsOpen } = useMenubar();

    const handleClick = () => {
      if (!disabled) {
        onSelect?.();
        setActiveMenu(null);
        setIsOpen(false);
      }
    };

    return (
      <button
        ref={ref}
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          'flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors duration-150',
          disabled
            ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
          className
        )}
      >
        <span className="flex items-center gap-2">
          {icon && <span className="w-4 h-4">{icon}</span>}
          {children}
        </span>
        {shortcut && (
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-4">
            {shortcut}
          </span>
        )}
      </button>
    );
  }
);

MenubarItem.displayName = 'MenubarItem';

// ============================================================================
// Menubar Separator
// ============================================================================

interface MenubarSeparatorProps {
  className?: string;
}

export function MenubarSeparator({ className }: MenubarSeparatorProps) {
  return (
    <div className={cn('h-px my-1 bg-gray-200 dark:bg-gray-700', className)} />
  );
}

// ============================================================================
// Menubar Label
// ============================================================================

interface MenubarLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function MenubarLabel({ children, className }: MenubarLabelProps) {
  return (
    <div
      className={cn(
        'px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider',
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Menubar Checkbox Item
// ============================================================================

interface MenubarCheckboxItemProps {
  children: React.ReactNode;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function MenubarCheckboxItem({
  children,
  checked = false,
  onCheckedChange,
  disabled = false,
  className,
}: MenubarCheckboxItemProps) {
  const { setActiveMenu, setIsOpen } = useMenubar();

  const handleClick = () => {
    if (!disabled) {
      onCheckedChange?.(!checked);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md transition-colors duration-150',
        disabled
          ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
        className
      )}
    >
      <span className={cn(
        'w-4 h-4 rounded border flex items-center justify-center',
        checked
          ? 'bg-blue-500 border-blue-500'
          : 'border-gray-300 dark:border-gray-600'
      )}>
        {checked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
      {children}
    </button>
  );
}

// ============================================================================
// Menubar Radio Group
// ============================================================================

interface MenubarRadioGroupProps {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
}

const RadioGroupContext = createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
} | undefined>(undefined);

export function MenubarRadioGroup({ children, value, onValueChange }: MenubarRadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      <div role="radiogroup">
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

// ============================================================================
// Menubar Radio Item
// ============================================================================

interface MenubarRadioItemProps {
  children: React.ReactNode;
  value: string;
  disabled?: boolean;
  className?: string;
}

export function MenubarRadioItem({
  children,
  value,
  disabled = false,
  className,
}: MenubarRadioItemProps) {
  const radioContext = useContext(RadioGroupContext);
  const isChecked = radioContext?.value === value;

  const handleClick = () => {
    if (!disabled) {
      radioContext?.onValueChange?.(value);
    }
  };

  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={isChecked}
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md transition-colors duration-150',
        disabled
          ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
        className
      )}
    >
      <span className={cn(
        'w-4 h-4 rounded-full border flex items-center justify-center',
        isChecked
          ? 'border-blue-500'
          : 'border-gray-300 dark:border-gray-600'
      )}>
        {isChecked && (
          <span className="w-2 h-2 rounded-full bg-blue-500" />
        )}
      </span>
      {children}
    </button>
  );
}

// ============================================================================
// Menubar Sub
// ============================================================================

interface MenubarSubProps {
  children: React.ReactNode;
}

const SubMenuContext = createContext<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
} | undefined>(undefined);

export function MenubarSub({ children }: MenubarSubProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <SubMenuContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="relative">
        {children}
      </div>
    </SubMenuContext.Provider>
  );
}

// ============================================================================
// Menubar Sub Trigger
// ============================================================================

interface MenubarSubTriggerProps {
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export function MenubarSubTrigger({ children, className, icon }: MenubarSubTriggerProps) {
  const subContext = useContext(SubMenuContext);

  return (
    <button
      type="button"
      onMouseEnter={() => subContext?.setIsOpen(true)}
      onMouseLeave={() => subContext?.setIsOpen(false)}
      className={cn(
        'flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors duration-150',
        'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
        className
      )}
    >
      <span className="flex items-center gap-2">
        {icon && <span className="w-4 h-4">{icon}</span>}
        {children}
      </span>
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

// ============================================================================
// Menubar Sub Content
// ============================================================================

interface MenubarSubContentProps {
  children: React.ReactNode;
  className?: string;
}

export function MenubarSubContent({ children, className }: MenubarSubContentProps) {
  const subContext = useContext(SubMenuContext);

  return (
    <AnimatePresence>
      {subContext?.isOpen && (
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.15 }}
          onMouseEnter={() => subContext?.setIsOpen(true)}
          onMouseLeave={() => subContext?.setIsOpen(false)}
          className={cn(
            'absolute left-full top-0 ml-1 z-50 min-w-[200px]',
            'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700',
            'rounded-lg shadow-lg p-1',
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
// Simple Menubar (All-in-one)
// ============================================================================

interface SimpleMenubarProps {
  menus: Array<{
    label: string;
    items: Array<{
      type?: 'item' | 'separator' | 'label' | 'checkbox' | 'submenu';
      label?: string;
      shortcut?: string;
      icon?: React.ReactNode;
      disabled?: boolean;
      checked?: boolean;
      onSelect?: () => void;
      onCheckedChange?: (checked: boolean) => void;
      items?: Array<{
        label: string;
        shortcut?: string;
        icon?: React.ReactNode;
        disabled?: boolean;
        onSelect?: () => void;
      }>;
    }>;
  }>;
  className?: string;
}

export function SimpleMenubar({ menus, className }: SimpleMenubarProps) {
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const menubarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menubarRef.current && !menubarRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (index: number) => {
    if (activeMenu === index) {
      setActiveMenu(null);
      setIsOpen(false);
    } else {
      setActiveMenu(index);
      setIsOpen(true);
    }
  };

  const handleMenuHover = (index: number) => {
    if (isOpen && activeMenu !== index) {
      setActiveMenu(index);
    }
  };

  const handleItemClick = (onSelect?: () => void) => {
    onSelect?.();
    setActiveMenu(null);
    setIsOpen(false);
  };

  return (
    <div
      ref={menubarRef}
      className={cn(
        'flex items-center gap-1 p-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm',
        className
      )}
    >
      {menus.map((menu, menuIndex) => (
        <div key={menuIndex} className="relative">
          <button
            type="button"
            onClick={() => handleMenuClick(menuIndex)}
            onMouseEnter={() => handleMenuHover(menuIndex)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-150',
              activeMenu === menuIndex
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
          >
            {menu.label}
          </button>

          <AnimatePresence>
            {activeMenu === menuIndex && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 mt-1 z-50 min-w-[200px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-1"
              >
                {menu.items.map((item, itemIndex) => {
                  if (item.type === 'separator') {
                    return <div key={itemIndex} className="h-px my-1 bg-gray-200 dark:bg-gray-700" />;
                  }

                  if (item.type === 'label') {
                    return (
                      <div
                        key={itemIndex}
                        className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        {item.label}
                      </div>
                    );
                  }

                  if (item.type === 'checkbox') {
                    return (
                      <button
                        key={itemIndex}
                        type="button"
                        onClick={() => item.onCheckedChange?.(!item.checked)}
                        disabled={item.disabled}
                        className={cn(
                          'flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md transition-colors duration-150',
                          item.disabled
                            ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        )}
                      >
                        <span className={cn(
                          'w-4 h-4 rounded border flex items-center justify-center',
                          item.checked
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-gray-300 dark:border-gray-600'
                        )}>
                          {item.checked && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        {item.label}
                      </button>
                    );
                  }

                  return (
                    <button
                      key={itemIndex}
                      type="button"
                      onClick={() => handleItemClick(item.onSelect)}
                      disabled={item.disabled}
                      className={cn(
                        'flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors duration-150',
                        item.disabled
                          ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                        {item.label}
                      </span>
                      {item.shortcut && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {item.shortcut}
                        </span>
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Application Menubar (Desktop-style)
// ============================================================================

interface ApplicationMenubarProps {
  appName: string;
  appIcon?: React.ReactNode;
  menus: Array<{
    label: string;
    items: Array<{
      type?: 'item' | 'separator' | 'label';
      label?: string;
      shortcut?: string;
      icon?: React.ReactNode;
      disabled?: boolean;
      onSelect?: () => void;
    }>;
  }>;
  className?: string;
}

export function ApplicationMenubar({ appName, appIcon, menus, className }: ApplicationMenubarProps) {
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const menubarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menubarRef.current && !menubarRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (index: number) => {
    if (activeMenu === index) {
      setActiveMenu(null);
      setIsOpen(false);
    } else {
      setActiveMenu(index);
      setIsOpen(true);
    }
  };

  const handleMenuHover = (index: number) => {
    if (isOpen && activeMenu !== index) {
      setActiveMenu(index);
    }
  };

  const handleItemClick = (onSelect?: () => void) => {
    onSelect?.();
    setActiveMenu(null);
    setIsOpen(false);
  };

  return (
    <div
      ref={menubarRef}
      className={cn(
        'flex items-center h-8 px-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {/* App Icon and Name */}
      <div className="flex items-center gap-2 mr-4">
        {appIcon && <span className="w-4 h-4">{appIcon}</span>}
        <span className="text-sm font-semibold text-gray-900 dark:text-white">{appName}</span>
      </div>

      {/* Menus */}
      {menus.map((menu, menuIndex) => (
        <div key={menuIndex} className="relative">
          <button
            type="button"
            onClick={() => handleMenuClick(menuIndex)}
            onMouseEnter={() => handleMenuHover(menuIndex)}
            className={cn(
              'px-2.5 py-1 text-sm rounded transition-colors duration-150',
              activeMenu === menuIndex
                ? 'bg-blue-500 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
          >
            {menu.label}
          </button>

          <AnimatePresence>
            {activeMenu === menuIndex && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.1 }}
                className="absolute top-full left-0 mt-0.5 z-50 min-w-[220px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded shadow-lg py-1"
              >
                {menu.items.map((item, itemIndex) => {
                  if (item.type === 'separator') {
                    return <div key={itemIndex} className="h-px my-1 bg-gray-200 dark:bg-gray-700" />;
                  }

                  if (item.type === 'label') {
                    return (
                      <div
                        key={itemIndex}
                        className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400"
                      >
                        {item.label}
                      </div>
                    );
                  }

                  return (
                    <button
                      key={itemIndex}
                      type="button"
                      onClick={() => handleItemClick(item.onSelect)}
                      disabled={item.disabled}
                      className={cn(
                        'flex items-center justify-between w-full px-3 py-1.5 text-sm transition-colors duration-100',
                        item.disabled
                          ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-blue-500 hover:text-white'
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                        {item.label}
                      </span>
                      {item.shortcut && (
                        <span className="text-xs opacity-60 ml-8">
                          {item.shortcut}
                        </span>
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

export default Menubar;
