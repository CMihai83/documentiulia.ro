import React from 'react';
import { useDeviceDetection } from './useDeviceDetection';
import { MobileBottomNav, MobileHeader } from './MobileNavigation';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  title?: string;
  showMobileNav?: boolean;
  className?: string;
}

export function ResponsiveLayout({
  children,
  title,
  showMobileNav = true,
  className = '',
}: ResponsiveLayoutProps) {
  const { isMobile, isTablet } = useDeviceDetection();
  const showMobileUI = isMobile || isTablet;

  if (showMobileUI) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MobileHeader title={title} />
        <main className={`pb-20 ${className}`}>
          {children}
        </main>
        {showMobileNav && <MobileBottomNav />}
      </div>
    );
  }

  // Desktop layout - children handle their own layout
  return <>{children}</>;
}

interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ResponsiveGrid({
  children,
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'md',
  className = '',
}: ResponsiveGridProps) {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  const colClasses = `grid-cols-${cols.mobile} md:grid-cols-${cols.tablet} lg:grid-cols-${cols.desktop}`;

  return (
    <div className={`grid ${colClasses} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
}

interface ResponsiveCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
}

export function ResponsiveCard({
  children,
  className = '',
  onClick,
  href,
}: ResponsiveCardProps) {
  const { isTouch } = useDeviceDetection();

  const baseClasses = `bg-white rounded-xl border border-gray-200 p-4 transition-all ${
    isTouch ? 'active:bg-gray-50' : 'hover:shadow-md'
  }`;

  if (href) {
    return (
      <a href={href} className={`${baseClasses} block ${className}`}>
        {children}
      </a>
    );
  }

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`${baseClasses} w-full text-left ${className}`}
      >
        {children}
      </button>
    );
  }

  return <div className={`${baseClasses} ${className}`}>{children}</div>;
}

interface MobileOnlyProps {
  children: React.ReactNode;
}

export function MobileOnly({ children }: MobileOnlyProps) {
  const { isMobile } = useDeviceDetection();
  return isMobile ? <>{children}</> : null;
}

export function TabletOnly({ children }: MobileOnlyProps) {
  const { isTablet } = useDeviceDetection();
  return isTablet ? <>{children}</> : null;
}

export function DesktopOnly({ children }: MobileOnlyProps) {
  const { isDesktop } = useDeviceDetection();
  return isDesktop ? <>{children}</> : null;
}

export function MobileAndTablet({ children }: MobileOnlyProps) {
  const { isMobile, isTablet } = useDeviceDetection();
  return isMobile || isTablet ? <>{children}</> : null;
}

interface BreakpointProps {
  children: React.ReactNode;
  min?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  max?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const BREAKPOINT_ORDER = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];

export function Breakpoint({ children, min, max }: BreakpointProps) {
  const { breakpoint } = useDeviceDetection();
  const currentIndex = BREAKPOINT_ORDER.indexOf(breakpoint);
  const minIndex = min ? BREAKPOINT_ORDER.indexOf(min) : 0;
  const maxIndex = max ? BREAKPOINT_ORDER.indexOf(max) : BREAKPOINT_ORDER.length - 1;

  if (currentIndex >= minIndex && currentIndex <= maxIndex) {
    return <>{children}</>;
  }

  return null;
}

export default ResponsiveLayout;
