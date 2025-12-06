'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types & Context
// ============================================================================

interface SidebarContextValue {
  isOpen: boolean;
  isCollapsed: boolean;
  toggle: () => void;
  collapse: () => void;
  expand: () => void;
  setOpen: (open: boolean) => void;
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

// ============================================================================
// Sidebar Provider
// ============================================================================

interface SidebarProviderProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  defaultCollapsed?: boolean;
}

export function SidebarProvider({
  children,
  defaultOpen = true,
  defaultCollapsed = false,
}: SidebarProviderProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  const toggle = React.useCallback(() => setIsOpen((prev) => !prev), []);
  const collapse = React.useCallback(() => setIsCollapsed(true), []);
  const expand = React.useCallback(() => setIsCollapsed(false), []);
  const setOpen = React.useCallback((open: boolean) => setIsOpen(open), []);

  return (
    <SidebarContext.Provider
      value={{ isOpen, isCollapsed, toggle, collapse, expand, setOpen }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

// ============================================================================
// Main Sidebar Component
// ============================================================================

interface SidebarProps {
  children: React.ReactNode;
  className?: string;
  side?: 'left' | 'right';
  variant?: 'default' | 'floating' | 'inset';
  collapsible?: 'none' | 'icon' | 'offcanvas';
}

export function Sidebar({
  children,
  className,
  side = 'left',
  variant = 'default',
  collapsible = 'icon',
}: SidebarProps) {
  const { isOpen, isCollapsed } = useSidebar();

  const width = isCollapsed ? 'w-16' : 'w-64';

  return (
    <AnimatePresence mode="wait">
      {(collapsible === 'none' || isOpen) && (
        <motion.aside
          initial={{ x: side === 'left' ? -280 : 280, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: side === 'left' ? -280 : 280, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={cn(
            'h-full flex flex-col bg-background border-r transition-all duration-300',
            side === 'right' && 'border-l border-r-0',
            variant === 'floating' && 'm-2 rounded-lg border shadow-lg',
            variant === 'inset' && 'bg-muted/50',
            width,
            className
          )}
        >
          {children}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Sidebar Header
// ============================================================================

interface SidebarHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarHeader({ children, className }: SidebarHeaderProps) {
  return (
    <div className={cn('flex items-center h-16 px-4 border-b shrink-0', className)}>
      {children}
    </div>
  );
}

// ============================================================================
// Sidebar Content
// ============================================================================

interface SidebarContentProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarContent({ children, className }: SidebarContentProps) {
  return (
    <div className={cn('flex-1 overflow-y-auto py-4', className)}>
      {children}
    </div>
  );
}

// ============================================================================
// Sidebar Footer
// ============================================================================

interface SidebarFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarFooter({ children, className }: SidebarFooterProps) {
  return (
    <div className={cn('mt-auto border-t p-4 shrink-0', className)}>
      {children}
    </div>
  );
}

// ============================================================================
// Sidebar Group
// ============================================================================

interface SidebarGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarGroup({ children, className }: SidebarGroupProps) {
  return (
    <div className={cn('px-3 py-2', className)}>
      {children}
    </div>
  );
}

// ============================================================================
// Sidebar Group Label
// ============================================================================

interface SidebarGroupLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarGroupLabel({ children, className }: SidebarGroupLabelProps) {
  const { isCollapsed } = useSidebar();

  if (isCollapsed) return null;

  return (
    <h4 className={cn('mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider', className)}>
      {children}
    </h4>
  );
}

// ============================================================================
// Sidebar Group Content
// ============================================================================

interface SidebarGroupContentProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarGroupContent({ children, className }: SidebarGroupContentProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {children}
    </div>
  );
}

// ============================================================================
// Sidebar Menu
// ============================================================================

interface SidebarMenuProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarMenu({ children, className }: SidebarMenuProps) {
  return (
    <nav className={cn('space-y-1', className)}>
      {children}
    </nav>
  );
}

// ============================================================================
// Sidebar Menu Item
// ============================================================================

interface SidebarMenuItemProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarMenuItem({ children, className }: SidebarMenuItemProps) {
  return (
    <div className={cn('', className)}>
      {children}
    </div>
  );
}

// ============================================================================
// Sidebar Menu Button
// ============================================================================

interface SidebarMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
  tooltip?: string;
  asChild?: boolean;
}

export const SidebarMenuButton = React.forwardRef<HTMLButtonElement, SidebarMenuButtonProps>(
  ({ className, isActive, tooltip, children, asChild, ...props }, ref) => {
    const { isCollapsed } = useSidebar();

    const button = (
      <button
        ref={ref}
        className={cn(
          'flex items-center w-full gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          isActive && 'bg-accent text-accent-foreground',
          isCollapsed && 'justify-center px-2',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );

    if (isCollapsed && tooltip) {
      return (
        <div className="relative group">
          {button}
          <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
            {tooltip}
          </div>
        </div>
      );
    }

    return button;
  }
);
SidebarMenuButton.displayName = 'SidebarMenuButton';

// ============================================================================
// Sidebar Menu Sub
// ============================================================================

interface SidebarMenuSubProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarMenuSub({ children, className }: SidebarMenuSubProps) {
  const { isCollapsed } = useSidebar();

  if (isCollapsed) return null;

  return (
    <div className={cn('ml-6 mt-1 space-y-1 border-l pl-3', className)}>
      {children}
    </div>
  );
}

// ============================================================================
// Sidebar Menu Sub Item
// ============================================================================

interface SidebarMenuSubItemProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarMenuSubItem({ children, className }: SidebarMenuSubItemProps) {
  return (
    <div className={cn('', className)}>
      {children}
    </div>
  );
}

// ============================================================================
// Sidebar Menu Sub Button
// ============================================================================

interface SidebarMenuSubButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
}

export const SidebarMenuSubButton = React.forwardRef<HTMLButtonElement, SidebarMenuSubButtonProps>(
  ({ className, isActive, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'flex items-center w-full gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring',
          isActive && 'bg-accent/50 text-accent-foreground font-medium',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
SidebarMenuSubButton.displayName = 'SidebarMenuSubButton';

// ============================================================================
// Sidebar Menu Badge
// ============================================================================

interface SidebarMenuBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
  className?: string;
}

export function SidebarMenuBadge({
  children,
  variant = 'default',
  className,
}: SidebarMenuBadgeProps) {
  const { isCollapsed } = useSidebar();

  if (isCollapsed) return null;

  const variantClasses = {
    default: 'bg-muted text-muted-foreground',
    success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <span
      className={cn(
        'ml-auto px-2 py-0.5 text-xs font-medium rounded-full',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// ============================================================================
// Sidebar Trigger
// ============================================================================

interface SidebarTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

export const SidebarTrigger = React.forwardRef<HTMLButtonElement, SidebarTriggerProps>(
  ({ className, ...props }, ref) => {
    const { toggle } = useSidebar();

    return (
      <button
        ref={ref}
        onClick={toggle}
        className={cn(
          'inline-flex items-center justify-center rounded-md p-2',
          'hover:bg-accent hover:text-accent-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring',
          className
        )}
        {...props}
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
        <span className="sr-only">Toggle sidebar</span>
      </button>
    );
  }
);
SidebarTrigger.displayName = 'SidebarTrigger';

// ============================================================================
// Sidebar Collapse Button
// ============================================================================

interface SidebarCollapseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

export const SidebarCollapseButton = React.forwardRef<HTMLButtonElement, SidebarCollapseButtonProps>(
  ({ className, ...props }, ref) => {
    const { isCollapsed, collapse, expand } = useSidebar();

    return (
      <button
        ref={ref}
        onClick={isCollapsed ? expand : collapse}
        className={cn(
          'inline-flex items-center justify-center rounded-md p-2',
          'hover:bg-accent hover:text-accent-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring',
          className
        )}
        {...props}
      >
        <motion.svg
          animate={{ rotate: isCollapsed ? 180 : 0 }}
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
          />
        </motion.svg>
        <span className="sr-only">{isCollapsed ? 'Expandare' : 'Restrângere'}</span>
      </button>
    );
  }
);
SidebarCollapseButton.displayName = 'SidebarCollapseButton';

// ============================================================================
// Sidebar Separator
// ============================================================================

interface SidebarSeparatorProps {
  className?: string;
}

export function SidebarSeparator({ className }: SidebarSeparatorProps) {
  return <hr className={cn('my-2 border-t', className)} />;
}

// ============================================================================
// Mobile Sidebar Overlay
// ============================================================================

interface SidebarOverlayProps {
  className?: string;
}

export function SidebarOverlay({ className }: SidebarOverlayProps) {
  const { isOpen, setOpen } = useSidebar();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
          className={cn(
            'fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden',
            className
          )}
        />
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Accounting-Specific: App Sidebar
// ============================================================================

interface NavItem {
  title: string;
  href: string;
  icon?: React.ReactNode;
  badge?: string | number;
  badgeVariant?: 'default' | 'success' | 'warning' | 'error';
  children?: NavItem[];
}

interface AppSidebarProps {
  navigation: NavItem[];
  currentPath?: string;
  logo?: React.ReactNode;
  userInfo?: {
    name: string;
    email: string;
    avatar?: string;
  };
  onNavigate?: (href: string) => void;
  className?: string;
}

export function AppSidebar({
  navigation,
  currentPath = '',
  logo,
  userInfo,
  onNavigate,
  className,
}: AppSidebarProps) {
  return (
    <Sidebar className={className}>
      <SidebarHeader>
        {logo || (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">D</span>
            </div>
            <span className="font-semibold">DocumentIulia</span>
          </div>
        )}
        <SidebarCollapseButton className="ml-auto" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={currentPath === item.href || currentPath.startsWith(item.href + '/')}
                    tooltip={item.title}
                    onClick={() => onNavigate?.(item.href)}
                  >
                    {item.icon}
                    <span className="flex-1">{item.title}</span>
                    {item.badge && (
                      <SidebarMenuBadge variant={item.badgeVariant}>
                        {item.badge}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuButton>
                  {item.children && (
                    <SidebarMenuSub>
                      {item.children.map((child) => (
                        <SidebarMenuSubItem key={child.href}>
                          <SidebarMenuSubButton
                            isActive={currentPath === child.href}
                            onClick={() => onNavigate?.(child.href)}
                          >
                            {child.icon}
                            <span>{child.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {userInfo && (
        <SidebarFooter>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              {userInfo.avatar ? (
                <img src={userInfo.avatar} alt={userInfo.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-medium">
                  {userInfo.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userInfo.name}</p>
              <p className="text-xs text-muted-foreground truncate">{userInfo.email}</p>
            </div>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}

// ============================================================================
// Accounting-Specific: Accounting Sidebar
// ============================================================================

const defaultAccountingNavigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    title: 'Facturi',
    href: '/invoices',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    title: 'Cheltuieli',
    href: '/expenses',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    title: 'Clienți',
    href: '/contacts',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    title: 'Produse',
    href: '/products',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    title: 'Rapoarte',
    href: '/reports',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

interface AccountingSidebarProps {
  currentPath?: string;
  onNavigate?: (href: string) => void;
  className?: string;
}

export function AccountingSidebar({
  currentPath,
  onNavigate,
  className,
}: AccountingSidebarProps) {
  return (
    <AppSidebar
      navigation={defaultAccountingNavigation}
      currentPath={currentPath}
      onNavigate={onNavigate}
      className={className}
    />
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  type SidebarContextValue,
  type SidebarProps,
  type SidebarHeaderProps,
  type SidebarContentProps,
  type SidebarFooterProps,
  type SidebarGroupProps,
  type SidebarGroupLabelProps,
  type SidebarGroupContentProps,
  type SidebarMenuProps,
  type SidebarMenuItemProps,
  type SidebarMenuButtonProps,
  type SidebarMenuSubProps,
  type SidebarMenuSubItemProps,
  type SidebarMenuSubButtonProps,
  type SidebarMenuBadgeProps,
  type SidebarTriggerProps,
  type SidebarCollapseButtonProps,
  type SidebarSeparatorProps,
  type SidebarOverlayProps,
  type NavItem,
  type AppSidebarProps,
  type AccountingSidebarProps,
};
