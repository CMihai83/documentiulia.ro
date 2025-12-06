'use client';

import React, { forwardRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Home, MoreHorizontal, FolderOpen, File, Settings, Users, FileText, BarChart3, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  current?: boolean;
}

type BreadcrumbSeparator = 'chevron' | 'slash' | 'dot' | 'arrow';

// ============================================================================
// Breadcrumb Root
// ============================================================================

interface BreadcrumbProps {
  children: React.ReactNode;
  className?: string;
  separator?: BreadcrumbSeparator | React.ReactNode;
  'aria-label'?: string;
}

export function Breadcrumb({
  children,
  className,
  separator = 'chevron',
  'aria-label': ariaLabel = 'Navigare',
}: BreadcrumbProps) {
  const separatorElement = getSeparatorElement(separator);
  const items = React.Children.toArray(children);

  return (
    <nav aria-label={ariaLabel} className={cn('flex items-center', className)}>
      <ol className="flex items-center flex-wrap gap-1.5">
        {items.map((child, index) => (
          <React.Fragment key={index}>
            <li className="flex items-center">
              {child}
            </li>
            {index < items.length - 1 && (
              <li className="flex items-center text-gray-400 dark:text-gray-500" aria-hidden="true">
                {separatorElement}
              </li>
            )}
          </React.Fragment>
        ))}
      </ol>
    </nav>
  );
}

function getSeparatorElement(separator: BreadcrumbSeparator | React.ReactNode): React.ReactNode {
  if (React.isValidElement(separator)) {
    return separator;
  }

  switch (separator) {
    case 'chevron':
      return <ChevronRight className="h-4 w-4" />;
    case 'slash':
      return <span className="text-gray-400 dark:text-gray-500">/</span>;
    case 'dot':
      return <span className="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500" />;
    case 'arrow':
      return <span className="text-gray-400 dark:text-gray-500">&rarr;</span>;
    default:
      return <ChevronRight className="h-4 w-4" />;
  }
}

// ============================================================================
// Breadcrumb Item
// ============================================================================

interface BreadcrumbItemProps {
  href?: string;
  children: React.ReactNode;
  className?: string;
  current?: boolean;
  icon?: React.ReactNode;
}

export const BreadcrumbItem = forwardRef<HTMLAnchorElement | HTMLSpanElement, BreadcrumbItemProps>(
  ({ href, children, className, current = false, icon }, ref) => {
    const content = (
      <>
        {icon && <span className="mr-1.5">{icon}</span>}
        {children}
      </>
    );

    if (current || !href) {
      return (
        <span
          ref={ref as React.Ref<HTMLSpanElement>}
          className={cn(
            'flex items-center text-sm font-medium',
            current
              ? 'text-gray-900 dark:text-gray-100'
              : 'text-gray-500 dark:text-gray-400',
            className
          )}
          aria-current={current ? 'page' : undefined}
        >
          {content}
        </span>
      );
    }

    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={cn(
          'flex items-center text-sm font-medium',
          'text-gray-500 dark:text-gray-400',
          'hover:text-gray-700 dark:hover:text-gray-200',
          'transition-colors duration-200',
          className
        )}
      >
        {content}
      </Link>
    );
  }
);

BreadcrumbItem.displayName = 'BreadcrumbItem';

// ============================================================================
// Breadcrumb Ellipsis
// ============================================================================

interface BreadcrumbEllipsisProps {
  className?: string;
  items?: BreadcrumbItem[];
  onSelect?: (item: BreadcrumbItem) => void;
}

export function BreadcrumbEllipsis({
  className,
  items = [],
  onSelect,
}: BreadcrumbEllipsisProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-center w-8 h-8 rounded-md',
          'text-gray-500 dark:text-gray-400',
          'hover:bg-gray-100 dark:hover:bg-gray-800',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
          'transition-colors duration-200',
          className
        )}
        aria-label="Mai multe pagini"
        aria-expanded={isOpen}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      <AnimatePresence>
        {isOpen && items.length > 0 && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute left-0 top-full mt-1 z-50',
                'min-w-[160px] py-1',
                'bg-white dark:bg-gray-800',
                'border border-gray-200 dark:border-gray-700',
                'rounded-lg shadow-lg'
              )}
            >
              {items.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    onSelect?.(item);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'flex items-center w-full px-3 py-2 text-sm',
                    'text-gray-700 dark:text-gray-200',
                    'hover:bg-gray-100 dark:hover:bg-gray-700',
                    'transition-colors duration-150'
                  )}
                >
                  {item.icon && <span className="mr-2">{item.icon}</span>}
                  {item.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Simple Breadcrumbs
// ============================================================================

interface SimpleBreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  separator?: BreadcrumbSeparator;
  maxItems?: number;
  showHome?: boolean;
  homeHref?: string;
  homeLabel?: string;
}

export function SimpleBreadcrumbs({
  items,
  className,
  separator = 'chevron',
  maxItems = 5,
  showHome = true,
  homeHref = '/',
  homeLabel = 'Acasa',
}: SimpleBreadcrumbsProps) {
  const allItems = showHome
    ? [{ label: homeLabel, href: homeHref, icon: <Home className="h-4 w-4" /> }, ...items]
    : items;

  const shouldCollapse = allItems.length > maxItems;
  
  let visibleItems: BreadcrumbItem[];
  let hiddenItems: BreadcrumbItem[] = [];
  
  if (shouldCollapse) {
    visibleItems = [allItems[0], ...allItems.slice(-2)];
    hiddenItems = allItems.slice(1, -2);
  } else {
    visibleItems = allItems;
  }

  return (
    <Breadcrumb separator={separator} className={className}>
      {visibleItems.map((item, index) => (
        <React.Fragment key={index}>
          {shouldCollapse && index === 1 && (
            <BreadcrumbEllipsis items={hiddenItems} />
          )}
          <BreadcrumbItem
            href={item.href}
            current={index === visibleItems.length - 1}
            icon={item.icon}
          >
            {item.label}
          </BreadcrumbItem>
        </React.Fragment>
      ))}
    </Breadcrumb>
  );
}

// ============================================================================
// Page Breadcrumbs (with page context)
// ============================================================================

interface PageBreadcrumbsProps {
  pageName: string;
  parentPages?: Array<{ name: string; href: string }>;
  className?: string;
}

const pageIcons: Record<string, React.ReactNode> = {
  dashboard: <BarChart3 className="h-4 w-4" />,
  facturi: <FileText className="h-4 w-4" />,
  invoices: <FileText className="h-4 w-4" />,
  contacte: <Users className="h-4 w-4" />,
  contacts: <Users className="h-4 w-4" />,
  produse: <FolderOpen className="h-4 w-4" />,
  products: <FolderOpen className="h-4 w-4" />,
  setari: <Settings className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
  plati: <CreditCard className="h-4 w-4" />,
  payments: <CreditCard className="h-4 w-4" />,
  rapoarte: <BarChart3 className="h-4 w-4" />,
  reports: <BarChart3 className="h-4 w-4" />,
};

export function PageBreadcrumbs({
  pageName,
  parentPages = [],
  className,
}: PageBreadcrumbsProps) {
  const pageKey = pageName.toLowerCase();
  const icon = pageIcons[pageKey] || <File className="h-4 w-4" />;

  const items: BreadcrumbItem[] = [
    ...parentPages.map(page => ({
      label: page.name,
      href: page.href,
      icon: pageIcons[page.name.toLowerCase()],
    })),
    {
      label: pageName,
      current: true,
      icon,
    },
  ];

  return <SimpleBreadcrumbs items={items} className={className} />;
}

// ============================================================================
// Breadcrumb with Dropdown
// ============================================================================

interface BreadcrumbDropdownItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  description?: string;
}

interface BreadcrumbWithDropdownProps {
  trigger: React.ReactNode;
  items: BreadcrumbDropdownItem[];
  className?: string;
}

export function BreadcrumbWithDropdown({
  trigger,
  items,
  className,
}: BreadcrumbWithDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1 text-sm font-medium',
          'text-gray-500 dark:text-gray-400',
          'hover:text-gray-700 dark:hover:text-gray-200',
          'transition-colors duration-200'
        )}
        aria-expanded={isOpen}
      >
        {trigger}
        <ChevronRight className={cn(
          'h-4 w-4 transition-transform duration-200',
          isOpen && 'rotate-90'
        )} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute left-0 top-full mt-1 z-50',
                'min-w-[200px] py-1',
                'bg-white dark:bg-gray-800',
                'border border-gray-200 dark:border-gray-700',
                'rounded-lg shadow-lg'
              )}
            >
              {items.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-start w-full px-3 py-2',
                    'hover:bg-gray-100 dark:hover:bg-gray-700',
                    'transition-colors duration-150'
                  )}
                >
                  {item.icon && (
                    <span className="mt-0.5 mr-2 text-gray-500 dark:text-gray-400">
                      {item.icon}
                    </span>
                  )}
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {item.label}
                    </div>
                    {item.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {item.description}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Responsive Breadcrumbs
// ============================================================================

interface ResponsiveBreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function ResponsiveBreadcrumbs({
  items,
  className,
}: ResponsiveBreadcrumbsProps) {
  const allItems = [
    { label: 'Acasa', href: '/', icon: <Home className="h-4 w-4" /> },
    ...items,
  ];

  // Mobile: show only last item with back
  // Desktop: show all items
  return (
    <div className={className}>
      {/* Mobile */}
      <div className="flex items-center gap-2 md:hidden">
        {allItems.length > 1 && (
          <Link
            href={allItems[allItems.length - 2].href || '/'}
            className={cn(
              'flex items-center gap-1 text-sm',
              'text-gray-500 dark:text-gray-400',
              'hover:text-gray-700 dark:hover:text-gray-200'
            )}
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            Inapoi
          </Link>
        )}
        <span className="text-gray-300 dark:text-gray-600">|</span>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {allItems[allItems.length - 1].label}
        </span>
      </div>

      {/* Desktop */}
      <div className="hidden md:block">
        <SimpleBreadcrumbs items={items} showHome />
      </div>
    </div>
  );
}

// ============================================================================
// Styled Breadcrumbs
// ============================================================================

interface StyledBreadcrumbsProps {
  items: BreadcrumbItem[];
  variant?: 'default' | 'pills' | 'contained' | 'minimal';
  className?: string;
}

export function StyledBreadcrumbs({
  items,
  variant = 'default',
  className,
}: StyledBreadcrumbsProps) {
  const allItems = [
    { label: 'Acasa', href: '/', icon: <Home className="h-4 w-4" /> },
    ...items,
  ];

  const variantStyles = {
    default: {
      container: '',
      item: '',
      current: '',
    },
    pills: {
      container: 'bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-1',
      item: 'px-2 py-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700',
      current: 'bg-white dark:bg-gray-900 shadow-sm',
    },
    contained: {
      container: 'bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 border border-gray-200 dark:border-gray-700',
      item: 'px-2 py-1 rounded',
      current: 'bg-white dark:bg-gray-800 shadow-sm',
    },
    minimal: {
      container: '',
      item: 'text-xs uppercase tracking-wide',
      current: 'font-bold',
    },
  };

  const styles = variantStyles[variant];

  return (
    <nav aria-label="Navigare" className={cn('flex items-center', styles.container, className)}>
      <ol className="flex items-center gap-1">
        {allItems.map((item, index) => {
          const isCurrent = index === allItems.length - 1;
          return (
            <React.Fragment key={index}>
              <li>
                {isCurrent || !item.href ? (
                  <span
                    className={cn(
                      'flex items-center text-sm font-medium',
                      'text-gray-900 dark:text-gray-100',
                      styles.item,
                      styles.current
                    )}
                    aria-current="page"
                  >
                    {item.icon && <span className="mr-1.5">{item.icon}</span>}
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center text-sm font-medium',
                      'text-gray-500 dark:text-gray-400',
                      'hover:text-gray-700 dark:hover:text-gray-200',
                      'transition-colors duration-200',
                      styles.item
                    )}
                  >
                    {item.icon && <span className="mr-1.5">{item.icon}</span>}
                    {item.label}
                  </Link>
                )}
              </li>
              {index < allItems.length - 1 && (
                <li className="text-gray-400 dark:text-gray-500" aria-hidden="true">
                  <ChevronRight className="h-4 w-4" />
                </li>
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumb;
