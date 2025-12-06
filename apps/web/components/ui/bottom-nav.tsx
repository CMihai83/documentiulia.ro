'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types & Constants
// ============================================================================

export type BottomNavVariant = 'default' | 'floating' | 'bordered' | 'blur';

const variantClasses: Record<BottomNavVariant, string> = {
  default: 'bg-background border-t',
  floating: 'mx-4 mb-4 rounded-2xl border shadow-lg bg-background',
  bordered: 'bg-background border-t-2 border-primary',
  blur: 'bg-background/80 backdrop-blur-lg border-t',
};

// ============================================================================
// Main Bottom Nav Component
// ============================================================================

interface BottomNavProps {
  children: React.ReactNode;
  variant?: BottomNavVariant;
  className?: string;
}

export function BottomNav({
  children,
  variant = 'default',
  className,
}: BottomNavProps) {
  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 md:hidden',
        'safe-area-inset-bottom',
        variantClasses[variant],
        className
      )}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {children}
      </div>
    </nav>
  );
}

// ============================================================================
// Bottom Nav Item
// ============================================================================

interface BottomNavItemProps {
  icon: React.ReactNode;
  label: string;
  href?: string;
  isActive?: boolean;
  badge?: number | string;
  badgeVariant?: 'default' | 'destructive';
  onClick?: () => void;
  className?: string;
}

export function BottomNavItem({
  icon,
  label,
  href,
  isActive = false,
  badge,
  badgeVariant = 'destructive',
  onClick,
  className,
}: BottomNavItemProps) {
  const handleClick = () => {
    if (href && typeof window !== 'undefined') {
      window.location.href = href;
    }
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'relative flex flex-col items-center justify-center flex-1 h-full',
        'text-muted-foreground transition-colors',
        'hover:text-foreground focus:outline-none',
        isActive && 'text-primary',
        className
      )}
    >
      <div className="relative">
        <motion.div
          animate={{ scale: isActive ? 1.1 : 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="w-6 h-6"
        >
          {icon}
        </motion.div>

        {/* Badge */}
        {badge !== undefined && (
          <span
            className={cn(
              'absolute -top-1 -right-1 min-w-[16px] h-4 px-1',
              'flex items-center justify-center rounded-full text-[10px] font-medium',
              badgeVariant === 'default' && 'bg-primary text-primary-foreground',
              badgeVariant === 'destructive' && 'bg-destructive text-destructive-foreground'
            )}
          >
            {typeof badge === 'number' && badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>

      <span className={cn(
        'text-[10px] mt-1 transition-all',
        isActive ? 'font-medium' : 'font-normal'
      )}>
        {label}
      </span>

      {/* Active indicator */}
      {isActive && (
        <motion.div
          layoutId="bottomNavIndicator"
          className="absolute -top-0.5 w-8 h-1 rounded-full bg-primary"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </button>
  );
}

// ============================================================================
// Bottom Nav Center Button
// ============================================================================

interface BottomNavCenterButtonProps {
  icon: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'gradient';
  className?: string;
}

const centerButtonVariantClasses = {
  default: 'bg-background border-2 border-border text-foreground',
  primary: 'bg-primary text-primary-foreground shadow-lg',
  gradient: 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg',
};

export function BottomNavCenterButton({
  icon,
  onClick,
  variant = 'primary',
  className,
}: BottomNavCenterButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'relative -mt-6 w-14 h-14 rounded-full',
        'flex items-center justify-center',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        centerButtonVariantClasses[variant],
        className
      )}
    >
      <span className="w-6 h-6">{icon}</span>
    </motion.button>
  );
}

// ============================================================================
// Bottom Nav Spacer
// ============================================================================

export function BottomNavSpacer() {
  return <div className="flex-1" />;
}

// ============================================================================
// Accounting-Specific: App Bottom Nav
// ============================================================================

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  badge?: number;
}

interface AppBottomNavProps {
  currentPath?: string;
  onNavigate?: (href: string) => void;
  onAddClick?: () => void;
  notifications?: number;
  variant?: BottomNavVariant;
  className?: string;
}

const defaultNavItems: NavItem[] = [
  {
    icon: (
      <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    label: 'Acasă',
    href: '/dashboard',
  },
  {
    icon: (
      <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    label: 'Facturi',
    href: '/invoices',
  },
  {
    icon: (
      <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    label: 'Cheltuieli',
    href: '/expenses',
  },
  {
    icon: (
      <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    label: 'Rapoarte',
    href: '/reports',
  },
];

export function AppBottomNav({
  currentPath = '',
  onNavigate,
  onAddClick,
  notifications = 0,
  variant = 'blur',
  className,
}: AppBottomNavProps) {
  const handleNavigate = (href: string) => {
    if (onNavigate) {
      onNavigate(href);
    } else if (typeof window !== 'undefined') {
      window.location.href = href;
    }
  };

  return (
    <BottomNav variant={variant} className={className}>
      {defaultNavItems.slice(0, 2).map((item) => (
        <BottomNavItem
          key={item.href}
          icon={item.icon}
          label={item.label}
          href={item.href}
          isActive={currentPath === item.href || currentPath.startsWith(item.href + '/')}
          badge={item.badge}
          onClick={() => handleNavigate(item.href)}
        />
      ))}

      {onAddClick && (
        <BottomNavCenterButton
          icon={
            <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }
          onClick={onAddClick}
        />
      )}

      {defaultNavItems.slice(2).map((item, index) => (
        <BottomNavItem
          key={item.href}
          icon={item.icon}
          label={item.label}
          href={item.href}
          isActive={currentPath === item.href || currentPath.startsWith(item.href + '/')}
          badge={index === 0 && notifications > 0 ? notifications : undefined}
          onClick={() => handleNavigate(item.href)}
        />
      ))}
    </BottomNav>
  );
}

// ============================================================================
// Accounting-Specific: Scan Bottom Nav
// ============================================================================

interface ScanBottomNavProps {
  currentPath?: string;
  onNavigate?: (href: string) => void;
  onScanClick?: () => void;
  variant?: BottomNavVariant;
  className?: string;
}

export function ScanBottomNav({
  currentPath = '',
  onNavigate,
  onScanClick,
  variant = 'floating',
  className,
}: ScanBottomNavProps) {
  const handleNavigate = (href: string) => {
    if (onNavigate) {
      onNavigate(href);
    } else if (typeof window !== 'undefined') {
      window.location.href = href;
    }
  };

  return (
    <BottomNav variant={variant} className={className}>
      <BottomNavItem
        icon={
          <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        }
        label="Acasă"
        href="/dashboard"
        isActive={currentPath === '/dashboard'}
        onClick={() => handleNavigate('/dashboard')}
      />

      <BottomNavItem
        icon={
          <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
        label="Documente"
        href="/receipts"
        isActive={currentPath.startsWith('/receipts')}
        onClick={() => handleNavigate('/receipts')}
      />

      <BottomNavCenterButton
        icon={
          <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        }
        onClick={onScanClick}
        variant="gradient"
      />

      <BottomNavItem
        icon={
          <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        }
        label="Cheltuieli"
        href="/expenses"
        isActive={currentPath.startsWith('/expenses')}
        onClick={() => handleNavigate('/expenses')}
      />

      <BottomNavItem
        icon={
          <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        }
        label="Profil"
        href="/settings"
        isActive={currentPath.startsWith('/settings')}
        onClick={() => handleNavigate('/settings')}
      />
    </BottomNav>
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  type BottomNavProps,
  type BottomNavItemProps,
  type BottomNavCenterButtonProps,
  type NavItem,
  type AppBottomNavProps,
  type ScanBottomNavProps,
};
