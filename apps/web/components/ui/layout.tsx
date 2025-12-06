'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types & Context
// ============================================================================

interface LayoutContextValue {
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
  isMobile: boolean;
  toggleSidebar: () => void;
  collapseSidebar: () => void;
  expandSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

const LayoutContext = React.createContext<LayoutContextValue | null>(null);

export function useLayout() {
  const context = React.useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
}

// ============================================================================
// Layout Provider
// ============================================================================

interface LayoutProviderProps {
  children: React.ReactNode;
  defaultSidebarOpen?: boolean;
  defaultSidebarCollapsed?: boolean;
}

export function LayoutProvider({
  children,
  defaultSidebarOpen = true,
  defaultSidebarCollapsed = false,
}: LayoutProviderProps) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(defaultSidebarOpen);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(defaultSidebarCollapsed);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = React.useCallback(() => setIsSidebarOpen((prev) => !prev), []);
  const collapseSidebar = React.useCallback(() => setIsSidebarCollapsed(true), []);
  const expandSidebar = React.useCallback(() => setIsSidebarCollapsed(false), []);
  const setSidebarOpen = React.useCallback((open: boolean) => setIsSidebarOpen(open), []);

  return (
    <LayoutContext.Provider
      value={{
        isSidebarOpen,
        isSidebarCollapsed,
        isMobile,
        toggleSidebar,
        collapseSidebar,
        expandSidebar,
        setSidebarOpen,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

// ============================================================================
// Root Layout
// ============================================================================

interface RootLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function RootLayout({ children, className }: RootLayoutProps) {
  return (
    <div className={cn('min-h-screen bg-background text-foreground', className)}>
      {children}
    </div>
  );
}

// ============================================================================
// App Layout (with sidebar)
// ============================================================================

interface AppLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function AppLayout({
  children,
  sidebar,
  header,
  footer,
  className,
}: AppLayoutProps) {
  const { isSidebarOpen, isSidebarCollapsed, isMobile, setSidebarOpen } = useLayout();

  return (
    <div className={cn('flex min-h-screen', className)}>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      {sidebar && (
        <AnimatePresence mode="wait">
          {(!isMobile || isSidebarOpen) && (
            <motion.aside
              initial={isMobile ? { x: -280 } : false}
              animate={{ x: 0 }}
              exit={isMobile ? { x: -280 } : undefined}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={cn(
                'fixed lg:sticky top-0 left-0 z-50 lg:z-auto h-screen',
                'flex flex-col bg-background border-r',
                'transition-all duration-300',
                isSidebarCollapsed ? 'w-16' : 'w-64'
              )}
            >
              {sidebar}
            </motion.aside>
          )}
        </AnimatePresence>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {header}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
        {footer}
      </div>
    </div>
  );
}

// ============================================================================
// Dashboard Layout
// ============================================================================

interface DashboardLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
}

export function DashboardLayout({
  children,
  sidebar,
  header,
  className,
}: DashboardLayoutProps) {
  return (
    <AppLayout sidebar={sidebar} header={header} className={className}>
      <div className="p-4 lg:p-6">
        {children}
      </div>
    </AppLayout>
  );
}

// ============================================================================
// Page Layout
// ============================================================================

interface PageLayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  className?: string;
}

const maxWidthClasses = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  full: 'max-w-full',
};

export function PageLayout({
  children,
  header,
  footer,
  maxWidth = 'xl',
  className,
}: PageLayoutProps) {
  return (
    <div className={cn('min-h-screen flex flex-col', className)}>
      {header}
      <main className={cn('flex-1 mx-auto w-full px-4 py-8', maxWidthClasses[maxWidth])}>
        {children}
      </main>
      {footer}
    </div>
  );
}

// ============================================================================
// Auth Layout
// ============================================================================

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  logo?: React.ReactNode;
  backgroundImage?: string;
  className?: string;
}

export function AuthLayout({
  children,
  title,
  description,
  logo,
  backgroundImage,
  className,
}: AuthLayoutProps) {
  return (
    <div className={cn('min-h-screen flex', className)}>
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {logo && <div className="mb-8">{logo}</div>}
          {(title || description) && (
            <div className="mb-8">
              {title && <h1 className="text-2xl font-bold tracking-tight">{title}</h1>}
              {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
            </div>
          )}
          {children}
        </div>
      </div>

      {/* Right side - Image */}
      <div className="hidden lg:block relative flex-1">
        {backgroundImage ? (
          <img
            src={backgroundImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Split Layout
// ============================================================================

interface SplitLayoutProps {
  left: React.ReactNode;
  right: React.ReactNode;
  ratio?: '1:1' | '1:2' | '2:1' | '1:3' | '3:1';
  gap?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

const ratioClasses = {
  '1:1': 'lg:grid-cols-2',
  '1:2': 'lg:grid-cols-3',
  '2:1': 'lg:grid-cols-3',
  '1:3': 'lg:grid-cols-4',
  '3:1': 'lg:grid-cols-4',
};

const gapClasses = {
  none: 'gap-0',
  sm: 'gap-4',
  md: 'gap-6',
  lg: 'gap-8',
};

export function SplitLayout({
  left,
  right,
  ratio = '1:1',
  gap = 'md',
  className,
}: SplitLayoutProps) {
  const leftSpan = ratio === '2:1' || ratio === '3:1' ? 'lg:col-span-2' : ratio === '1:3' ? '' : '';
  const rightSpan = ratio === '1:2' || ratio === '1:3' ? 'lg:col-span-2' : ratio === '3:1' ? '' : '';

  return (
    <div className={cn('grid grid-cols-1', ratioClasses[ratio], gapClasses[gap], className)}>
      <div className={leftSpan}>{left}</div>
      <div className={rightSpan}>{right}</div>
    </div>
  );
}

// ============================================================================
// Stack Layout
// ============================================================================

interface StackLayoutProps {
  children: React.ReactNode;
  direction?: 'vertical' | 'horizontal';
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  wrap?: boolean;
  className?: string;
}

const stackGapClasses = {
  none: 'gap-0',
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

const alignClasses = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
};

const justifyClasses = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
};

export function StackLayout({
  children,
  direction = 'vertical',
  gap = 'md',
  align = 'stretch',
  justify = 'start',
  wrap = false,
  className,
}: StackLayoutProps) {
  return (
    <div
      className={cn(
        'flex',
        direction === 'vertical' ? 'flex-col' : 'flex-row',
        stackGapClasses[gap],
        alignClasses[align],
        justifyClasses[justify],
        wrap && 'flex-wrap',
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Grid Layout
// ============================================================================

interface GridLayoutProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  gap?: 'none' | 'sm' | 'md' | 'lg';
  responsive?: boolean;
  className?: string;
}

const gridColumnsClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
  6: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
  12: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12',
};

export function GridLayout({
  children,
  columns = 3,
  gap = 'md',
  className,
}: GridLayoutProps) {
  return (
    <div className={cn('grid', gridColumnsClasses[columns], gapClasses[gap], className)}>
      {children}
    </div>
  );
}

// ============================================================================
// Container
// ============================================================================

interface ContainerProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: boolean;
  className?: string;
}

const containerSizeClasses = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  full: 'max-w-full',
};

export function Container({
  children,
  size = 'xl',
  padding = true,
  className,
}: ContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full',
        containerSizeClasses[size],
        padding && 'px-4 sm:px-6 lg:px-8',
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Section
// ============================================================================

interface SectionProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function Section({
  children,
  title,
  description,
  actions,
  className,
}: SectionProps) {
  return (
    <section className={cn('py-6', className)}>
      {(title || description || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            {title && <h2 className="text-xl font-semibold">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

// ============================================================================
// Centered Layout
// ============================================================================

interface CenteredLayoutProps {
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const centeredMaxWidthClasses = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function CenteredLayout({
  children,
  maxWidth = 'md',
  className,
}: CenteredLayoutProps) {
  return (
    <div className={cn('min-h-screen flex items-center justify-center p-4', className)}>
      <div className={cn('w-full', centeredMaxWidthClasses[maxWidth])}>
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// Accounting-Specific: Invoice Layout
// ============================================================================

interface InvoiceLayoutProps {
  children: React.ReactNode;
  preview?: React.ReactNode;
  showPreview?: boolean;
  className?: string;
}

export function InvoiceLayout({
  children,
  preview,
  showPreview = true,
  className,
}: InvoiceLayoutProps) {
  return (
    <div className={cn('flex gap-6', className)}>
      <div className="flex-1 min-w-0">
        {children}
      </div>
      {showPreview && preview && (
        <div className="hidden xl:block w-[400px] shrink-0">
          <div className="sticky top-6">
            {preview}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  type LayoutContextValue,
  type LayoutProviderProps,
  type RootLayoutProps,
  type AppLayoutProps,
  type DashboardLayoutProps,
  type PageLayoutProps,
  type AuthLayoutProps,
  type SplitLayoutProps,
  type StackLayoutProps,
  type GridLayoutProps,
  type ContainerProps,
  type SectionProps,
  type CenteredLayoutProps,
  type InvoiceLayoutProps,
};
