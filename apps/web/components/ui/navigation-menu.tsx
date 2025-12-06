'use client';

import React, { createContext, useContext, useState, useRef, useEffect, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Navigation Menu Context
// ============================================================================

interface NavigationMenuContextValue {
  activeItem: string | null;
  setActiveItem: (item: string | null) => void;
  delayDuration: number;
}

const NavigationMenuContext = createContext<NavigationMenuContextValue | undefined>(undefined);

function useNavigationMenu() {
  const context = useContext(NavigationMenuContext);
  if (!context) {
    throw new Error('NavigationMenu components must be used within a NavigationMenu');
  }
  return context;
}

// ============================================================================
// Navigation Menu
// ============================================================================

interface NavigationMenuProps {
  children: React.ReactNode;
  className?: string;
  delayDuration?: number;
}

export const NavigationMenu = forwardRef<HTMLDivElement, NavigationMenuProps>(
  ({ children, className, delayDuration = 200 }, ref) => {
    const [activeItem, setActiveItem] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
          setActiveItem(null);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
      <NavigationMenuContext.Provider value={{ activeItem, setActiveItem, delayDuration }}>
        <nav
          ref={ref || menuRef}
          className={cn('relative', className)}
        >
          {children}
        </nav>
      </NavigationMenuContext.Provider>
    );
  }
);

NavigationMenu.displayName = 'NavigationMenu';

// ============================================================================
// Navigation Menu List
// ============================================================================

interface NavigationMenuListProps {
  children: React.ReactNode;
  className?: string;
}

export const NavigationMenuList = forwardRef<HTMLUListElement, NavigationMenuListProps>(
  ({ children, className }, ref) => {
    return (
      <ul
        ref={ref}
        className={cn('flex items-center gap-1', className)}
      >
        {children}
      </ul>
    );
  }
);

NavigationMenuList.displayName = 'NavigationMenuList';

// ============================================================================
// Navigation Menu Item
// ============================================================================

interface NavigationMenuItemProps {
  children: React.ReactNode;
  value?: string;
  className?: string;
}

const ItemContext = createContext<{ value: string } | undefined>(undefined);

export const NavigationMenuItem = forwardRef<HTMLLIElement, NavigationMenuItemProps>(
  ({ children, value = '', className }, ref) => {
    return (
      <ItemContext.Provider value={{ value }}>
        <li ref={ref} className={cn('relative', className)}>
          {children}
        </li>
      </ItemContext.Provider>
    );
  }
);

NavigationMenuItem.displayName = 'NavigationMenuItem';

// ============================================================================
// Navigation Menu Trigger
// ============================================================================

interface NavigationMenuTriggerProps {
  children: React.ReactNode;
  className?: string;
}

export const NavigationMenuTrigger = forwardRef<HTMLButtonElement, NavigationMenuTriggerProps>(
  ({ children, className }, ref) => {
    const { activeItem, setActiveItem, delayDuration } = useNavigationMenu();
    const itemContext = useContext(ItemContext);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isActive = activeItem === itemContext?.value;

    const handleMouseEnter = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setActiveItem(itemContext?.value || null);
      }, delayDuration);
    };

    const handleMouseLeave = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };

    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    return (
      <button
        ref={ref}
        type="button"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => setActiveItem(isActive ? null : itemContext?.value || null)}
        data-state={isActive ? 'open' : 'closed'}
        className={cn(
          'group inline-flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200',
          isActive
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
          className
        )}
      >
        {children}
        <svg
          className={cn(
            'w-4 h-4 transition-transform duration-200',
            isActive && 'rotate-180'
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    );
  }
);

NavigationMenuTrigger.displayName = 'NavigationMenuTrigger';

// ============================================================================
// Navigation Menu Content
// ============================================================================

interface NavigationMenuContentProps {
  children: React.ReactNode;
  className?: string;
}

export function NavigationMenuContent({ children, className }: NavigationMenuContentProps) {
  const { activeItem, setActiveItem, delayDuration } = useNavigationMenu();
  const itemContext = useContext(ItemContext);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isActive = activeItem === itemContext?.value;

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveItem(null);
    }, delayDuration);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={cn(
            'absolute top-full left-0 mt-2 z-50',
            'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700',
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
// Navigation Menu Link
// ============================================================================

interface NavigationMenuLinkProps {
  children: React.ReactNode;
  href?: string;
  active?: boolean;
  className?: string;
  onClick?: () => void;
}

export const NavigationMenuLink = forwardRef<HTMLAnchorElement, NavigationMenuLinkProps>(
  ({ children, href = '#', active = false, className, onClick }, ref) => {
    return (
      <a
        ref={ref}
        href={href}
        onClick={onClick}
        className={cn(
          'block px-4 py-2 text-sm rounded-md transition-colors duration-200',
          active
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
          className
        )}
      >
        {children}
      </a>
    );
  }
);

NavigationMenuLink.displayName = 'NavigationMenuLink';

// ============================================================================
// Navigation Menu Indicator
// ============================================================================

interface NavigationMenuIndicatorProps {
  className?: string;
}

export function NavigationMenuIndicator({ className }: NavigationMenuIndicatorProps) {
  const { activeItem } = useNavigationMenu();

  return (
    <AnimatePresence>
      {activeItem && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            'absolute bottom-0 left-0 right-0 flex justify-center',
            className
          )}
        >
          <div className="w-2 h-2 bg-gray-900 dark:bg-white rotate-45 -mb-1" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Navigation Menu Viewport
// ============================================================================

interface NavigationMenuViewportProps {
  className?: string;
}

export function NavigationMenuViewport({ className }: NavigationMenuViewportProps) {
  return (
    <div
      className={cn(
        'absolute top-full left-0 flex justify-center w-full',
        className
      )}
    />
  );
}

// ============================================================================
// Simple Navigation Menu (All-in-one)
// ============================================================================

interface SimpleNavigationMenuProps {
  items: Array<{
    label: string;
    href?: string;
    content?: React.ReactNode;
    children?: Array<{
      label: string;
      description?: string;
      href: string;
      icon?: React.ReactNode;
    }>;
  }>;
  className?: string;
}

export function SimpleNavigationMenu({ items, className }: SimpleNavigationMenuProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveIndex(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = (index: number) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setActiveIndex(index);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveIndex(null);
    }, 150);
  };

  return (
    <nav ref={menuRef} className={cn('relative', className)}>
      <ul className="flex items-center gap-1">
        {items.map((item, index) => (
          <li
            key={index}
            className="relative"
            onMouseEnter={() => item.children && handleMouseEnter(index)}
            onMouseLeave={handleMouseLeave}
          >
            {item.children ? (
              <>
                <button
                  type="button"
                  className={cn(
                    'inline-flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200',
                    activeIndex === index
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  {item.label}
                  <svg
                    className={cn(
                      'w-4 h-4 transition-transform duration-200',
                      activeIndex === index && 'rotate-180'
                    )}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <AnimatePresence>
                  {activeIndex === index && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-0 mt-2 z-50 min-w-[400px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4"
                    >
                      {item.content || (
                        <div className="grid grid-cols-2 gap-2">
                          {item.children.map((child, childIndex) => (
                            <a
                              key={childIndex}
                              href={child.href}
                              className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
                            >
                              {child.icon && (
                                <span className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400">
                                  {child.icon}
                                </span>
                              )}
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {child.label}
                                </div>
                                {child.description && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    {child.description}
                                  </div>
                                )}
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <a
                href={item.href}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors duration-200"
              >
                {item.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ============================================================================
// Mega Menu
// ============================================================================

interface MegaMenuProps {
  items: Array<{
    label: string;
    sections: Array<{
      title?: string;
      items: Array<{
        label: string;
        description?: string;
        href: string;
        icon?: React.ReactNode;
        badge?: string;
      }>;
    }>;
    footer?: React.ReactNode;
  }>;
  className?: string;
}

export function MegaMenu({ items, className }: MegaMenuProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveIndex(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = (index: number) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setActiveIndex(index);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveIndex(null);
    }, 200);
  };

  return (
    <nav ref={menuRef} className={cn('relative', className)}>
      <ul className="flex items-center gap-1">
        {items.map((item, index) => (
          <li
            key={index}
            className="relative"
            onMouseEnter={() => handleMouseEnter(index)}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              className={cn(
                'inline-flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200',
                activeIndex === index
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              {item.label}
              <svg
                className={cn(
                  'w-4 h-4 transition-transform duration-200',
                  activeIndex === index && 'rotate-180'
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <AnimatePresence>
              {activeIndex === index && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 w-screen max-w-4xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden"
                >
                  <div className="p-6">
                    <div className={cn(
                      'grid gap-6',
                      item.sections.length === 1 && 'grid-cols-1',
                      item.sections.length === 2 && 'grid-cols-2',
                      item.sections.length >= 3 && 'grid-cols-3'
                    )}>
                      {item.sections.map((section, sectionIndex) => (
                        <div key={sectionIndex}>
                          {section.title && (
                            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                              {section.title}
                            </h3>
                          )}
                          <div className="space-y-1">
                            {section.items.map((sectionItem, itemIndex) => (
                              <a
                                key={itemIndex}
                                href={sectionItem.href}
                                className="flex items-start gap-3 p-2 -mx-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
                              >
                                {sectionItem.icon && (
                                  <span className="w-8 h-8 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 flex-shrink-0">
                                    {sectionItem.icon}
                                  </span>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                      {sectionItem.label}
                                    </span>
                                    {sectionItem.badge && (
                                      <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                                        {sectionItem.badge}
                                      </span>
                                    )}
                                  </div>
                                  {sectionItem.description && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                                      {sectionItem.description}
                                    </p>
                                  )}
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {item.footer && (
                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                      {item.footer}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ============================================================================
// Sidebar Navigation
// ============================================================================

interface SidebarNavigationProps {
  items: Array<{
    label: string;
    icon?: React.ReactNode;
    href?: string;
    active?: boolean;
    badge?: string | number;
    children?: Array<{
      label: string;
      href: string;
      active?: boolean;
    }>;
  }>;
  collapsed?: boolean;
  className?: string;
}

export function SidebarNavigation({ items, collapsed = false, className }: SidebarNavigationProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (label: string) => {
    setExpandedItems(prev =>
      prev.includes(label)
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  return (
    <nav className={cn('space-y-1', className)}>
      {items.map((item, index) => {
        const isExpanded = expandedItems.includes(item.label);
        const hasChildren = item.children && item.children.length > 0;

        return (
          <div key={index}>
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpanded(item.label)}
                className={cn(
                  'flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
                  item.active
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                <span className="flex items-center gap-3">
                  {item.icon && <span className="w-5 h-5">{item.icon}</span>}
                  {!collapsed && item.label}
                </span>
                {!collapsed && (
                  <svg
                    className={cn(
                      'w-4 h-4 transition-transform duration-200',
                      isExpanded && 'rotate-180'
                    )}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
            ) : (
              <a
                href={item.href}
                className={cn(
                  'flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
                  item.active
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                <span className="flex items-center gap-3">
                  {item.icon && <span className="w-5 h-5">{item.icon}</span>}
                  {!collapsed && item.label}
                </span>
                {!collapsed && item.badge !== undefined && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                    {item.badge}
                  </span>
                )}
              </a>
            )}

            {hasChildren && !collapsed && (
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pl-11 py-1 space-y-1">
                      {item.children!.map((child, childIndex) => (
                        <a
                          key={childIndex}
                          href={child.href}
                          className={cn(
                            'block px-3 py-1.5 text-sm rounded-md transition-colors duration-200',
                            child.active
                              ? 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                          )}
                        >
                          {child.label}
                        </a>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export default NavigationMenu;
