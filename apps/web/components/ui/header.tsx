'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types & Constants
// ============================================================================

export type HeaderVariant = 'default' | 'transparent' | 'blur' | 'bordered';
export type HeaderSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<HeaderSize, string> = {
  sm: 'h-12',
  md: 'h-14',
  lg: 'h-16',
};

const variantClasses: Record<HeaderVariant, string> = {
  default: 'bg-background border-b',
  transparent: 'bg-transparent',
  blur: 'bg-background/80 backdrop-blur-md border-b',
  bordered: 'bg-background border-b-2 border-primary',
};

// ============================================================================
// Main Header Component
// ============================================================================

interface HeaderProps {
  children: React.ReactNode;
  className?: string;
  variant?: HeaderVariant;
  size?: HeaderSize;
  sticky?: boolean;
}

export function Header({
  children,
  className,
  variant = 'default',
  size = 'md',
  sticky = true,
}: HeaderProps) {
  return (
    <header
      className={cn(
        'w-full z-50 transition-all duration-200',
        sizeClasses[size],
        variantClasses[variant],
        sticky && 'sticky top-0',
        className
      )}
    >
      <div className="flex items-center h-full px-4 lg:px-6">
        {children}
      </div>
    </header>
  );
}

// ============================================================================
// Header Logo
// ============================================================================

interface HeaderLogoProps {
  children?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function HeaderLogo({
  children,
  href,
  onClick,
  className,
}: HeaderLogoProps) {
  const content = children || (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
        <span className="text-primary-foreground font-bold text-sm">D</span>
      </div>
      <span className="font-semibold text-lg">DocumentIulia</span>
    </div>
  );

  if (href || onClick) {
    return (
      <a
        href={href}
        onClick={onClick}
        className={cn('flex items-center shrink-0 cursor-pointer', className)}
      >
        {content}
      </a>
    );
  }

  return (
    <div className={cn('flex items-center shrink-0', className)}>
      {content}
    </div>
  );
}

// ============================================================================
// Header Nav
// ============================================================================

interface HeaderNavProps {
  children: React.ReactNode;
  className?: string;
}

export function HeaderNav({ children, className }: HeaderNavProps) {
  return (
    <nav className={cn('hidden md:flex items-center gap-1 mx-6', className)}>
      {children}
    </nav>
  );
}

// ============================================================================
// Header Nav Item
// ============================================================================

interface HeaderNavItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
  href?: string;
}

export const HeaderNavItem = React.forwardRef<HTMLButtonElement, HeaderNavItemProps>(
  ({ className, isActive, href, children, onClick, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (href && typeof window !== 'undefined') {
        window.location.href = href;
      }
      onClick?.(e);
    };

    return (
      <button
        ref={ref}
        onClick={handleClick}
        className={cn(
          'px-3 py-2 text-sm font-medium rounded-md transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          isActive && 'bg-accent text-accent-foreground',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
HeaderNavItem.displayName = 'HeaderNavItem';

// ============================================================================
// Header Search
// ============================================================================

interface HeaderSearchProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (query: string) => void;
  className?: string;
}

export function HeaderSearch({
  placeholder = 'Căutare...',
  value,
  onChange,
  onSearch,
  className,
}: HeaderSearchProps) {
  const [localValue, setLocalValue] = React.useState(value || '');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch?.(localValue);
    }
    // Ctrl/Cmd + K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      inputRef.current?.focus();
    }
  };

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className={cn('relative flex-1 max-w-md mx-4', className)}>
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        ref={inputRef}
        type="search"
        placeholder={placeholder}
        value={value ?? localValue}
        onChange={(e) => {
          setLocalValue(e.target.value);
          onChange?.(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full h-9 pl-9 pr-4 rounded-lg border bg-muted/50',
          'text-sm placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background',
          'transition-colors'
        )}
      />
      <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
        <span className="text-xs">⌘</span>K
      </kbd>
    </div>
  );
}

// ============================================================================
// Header Actions
// ============================================================================

interface HeaderActionsProps {
  children: React.ReactNode;
  className?: string;
}

export function HeaderActions({ children, className }: HeaderActionsProps) {
  return (
    <div className={cn('flex items-center gap-2 ml-auto', className)}>
      {children}
    </div>
  );
}

// ============================================================================
// Header Icon Button
// ============================================================================

interface HeaderIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  badge?: number | string;
  badgeVariant?: 'default' | 'destructive';
}

export const HeaderIconButton = React.forwardRef<HTMLButtonElement, HeaderIconButtonProps>(
  ({ className, badge, badgeVariant = 'default', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center w-9 h-9 rounded-lg',
          'text-muted-foreground hover:text-foreground',
          'hover:bg-accent transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          className
        )}
        {...props}
      >
        {children}
        {badge !== undefined && (
          <span
            className={cn(
              'absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1',
              'flex items-center justify-center rounded-full text-[10px] font-medium',
              badgeVariant === 'default' && 'bg-primary text-primary-foreground',
              badgeVariant === 'destructive' && 'bg-destructive text-destructive-foreground'
            )}
          >
            {typeof badge === 'number' && badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>
    );
  }
);
HeaderIconButton.displayName = 'HeaderIconButton';

// ============================================================================
// Header User Menu
// ============================================================================

interface HeaderUserMenuProps {
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
  menuItems?: Array<{
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: React.ReactNode;
    destructive?: boolean;
  }>;
  onLogout?: () => void;
  className?: string;
}

export function HeaderUserMenu({
  user,
  menuItems = [],
  onLogout,
  className,
}: HeaderUserMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={menuRef} className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 p-1.5 rounded-lg',
          'hover:bg-accent transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
        )}
      >
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-medium">
              {user.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium leading-none">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <svg
          className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-56 rounded-lg border bg-popover shadow-lg z-50"
          >
            <div className="p-2 border-b">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <div className="p-1">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (item.href && typeof window !== 'undefined') {
                      window.location.href = item.href;
                    }
                    item.onClick?.();
                    setIsOpen(false);
                  }}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md transition-colors',
                    'hover:bg-accent',
                    item.destructive && 'text-destructive hover:bg-destructive/10'
                  )}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
              {onLogout && (
                <>
                  <hr className="my-1" />
                  <button
                    onClick={() => {
                      onLogout();
                      setIsOpen(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Deconectare
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Header Mobile Menu Button
// ============================================================================

interface HeaderMobileMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isOpen?: boolean;
}

export const HeaderMobileMenuButton = React.forwardRef<HTMLButtonElement, HeaderMobileMenuButtonProps>(
  ({ className, isOpen, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex md:hidden items-center justify-center w-9 h-9 rounded-lg',
          'hover:bg-accent transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring',
          className
        )}
        {...props}
      >
        <motion.svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <motion.path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            animate={isOpen ? { d: 'M6 18L18 6M6 6l12 12' } : { d: 'M4 6h16M4 12h16M4 18h16' }}
          />
        </motion.svg>
        <span className="sr-only">Meniu</span>
      </button>
    );
  }
);
HeaderMobileMenuButton.displayName = 'HeaderMobileMenuButton';

// ============================================================================
// Accounting-Specific: App Header
// ============================================================================

interface AppHeaderProps {
  logo?: React.ReactNode;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  notifications?: number;
  onSearch?: (query: string) => void;
  onNotificationsClick?: () => void;
  onSettingsClick?: () => void;
  onLogout?: () => void;
  onMenuToggle?: () => void;
  className?: string;
}

export function AppHeader({
  logo,
  user,
  notifications = 0,
  onSearch,
  onNotificationsClick,
  onSettingsClick,
  onLogout,
  onMenuToggle,
  className,
}: AppHeaderProps) {
  return (
    <Header variant="blur" className={className}>
      {onMenuToggle && (
        <HeaderMobileMenuButton onClick={onMenuToggle} className="mr-2" />
      )}

      <HeaderLogo>{logo}</HeaderLogo>

      {onSearch && <HeaderSearch onSearch={onSearch} />}

      <HeaderActions>
        {onNotificationsClick && (
          <HeaderIconButton
            onClick={onNotificationsClick}
            badge={notifications > 0 ? notifications : undefined}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </HeaderIconButton>
        )}

        {onSettingsClick && (
          <HeaderIconButton onClick={onSettingsClick}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </HeaderIconButton>
        )}

        {user && (
          <HeaderUserMenu
            user={user}
            menuItems={[
              {
                label: 'Profil',
                href: '/settings/profile',
                icon: (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                ),
              },
              {
                label: 'Setări',
                href: '/settings',
                icon: (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
              },
              {
                label: 'Ajutor',
                href: '/help',
                icon: (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
            ]}
            onLogout={onLogout}
          />
        )}
      </HeaderActions>
    </Header>
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  type HeaderProps,
  type HeaderLogoProps,
  type HeaderNavProps,
  type HeaderNavItemProps,
  type HeaderSearchProps,
  type HeaderActionsProps,
  type HeaderIconButtonProps,
  type HeaderUserMenuProps,
  type HeaderMobileMenuButtonProps,
  type AppHeaderProps,
};
