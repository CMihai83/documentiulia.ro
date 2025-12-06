'use client';

import { ReactNode, useState, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronRight,
  ChevronDown,
  Home,
  Menu,
  X,
  LucideIcon,
} from 'lucide-react';

// Breadcrumb Components
interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: ReactNode;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: ReactNode;
  maxItems?: number;
  className?: string;
}

export function Breadcrumb({
  items,
  separator = <ChevronRight className="w-4 h-4 text-gray-400" />,
  maxItems,
  className = '',
}: BreadcrumbProps) {
  let displayItems = items;

  if (maxItems && items.length > maxItems) {
    const firstItems = items.slice(0, 1);
    const lastItems = items.slice(-Math.max(1, maxItems - 2));
    displayItems = [
      ...firstItems,
      { label: '...', href: undefined },
      ...lastItems,
    ];
  }

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center gap-2 flex-wrap">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;

          return (
            <li key={index} className="flex items-center gap-2">
              {index > 0 && separator}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  {item.icon}
                  {item.label}
                </Link>
              ) : (
                <span
                  className={`flex items-center gap-1.5 text-sm ${
                    isLast
                      ? 'text-gray-900 dark:text-white font-medium'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Simple Breadcrumb with Home icon
interface SimpleBreadcrumbProps {
  items: Array<{ label: string; href?: string }>;
  className?: string;
}

export function SimpleBreadcrumb({ items, className = '' }: SimpleBreadcrumbProps) {
  return (
    <Breadcrumb
      items={[{ label: 'Acasă', href: '/', icon: <Home className="w-4 h-4" /> }, ...items]}
      className={className}
    />
  );
}

// Sidebar Context
interface SidebarContextType {
  isOpen: boolean;
  isCollapsed: boolean;
  toggle: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('Sidebar components must be used within a Sidebar');
  }
  return context;
}

// Sidebar Provider
interface SidebarProviderProps {
  children: ReactNode;
  defaultOpen?: boolean;
  defaultCollapsed?: boolean;
}

export function SidebarProvider({
  children,
  defaultOpen = true,
  defaultCollapsed = false,
}: SidebarProviderProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        isCollapsed,
        toggle: () => setIsOpen(!isOpen),
        setCollapsed: setIsCollapsed,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

// Sidebar
interface SidebarProps {
  children: ReactNode;
  className?: string;
}

export function Sidebar({ children, className = '' }: SidebarProps) {
  const { isOpen, isCollapsed } = useSidebar();

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => {}}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 h-screen
          bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-16' : 'w-64'}
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${className}
        `}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {children}
        </div>
      </aside>
    </>
  );
}

// Sidebar Header
interface SidebarHeaderProps {
  children: ReactNode;
  className?: string;
}

export function SidebarHeader({ children, className = '' }: SidebarHeaderProps) {
  return (
    <div className={`flex-shrink-0 px-4 py-4 border-b border-gray-200 dark:border-gray-800 ${className}`}>
      {children}
    </div>
  );
}

// Sidebar Content
interface SidebarContentProps {
  children: ReactNode;
  className?: string;
}

export function SidebarContent({ children, className = '' }: SidebarContentProps) {
  return (
    <div className={`flex-1 overflow-y-auto py-4 ${className}`}>
      {children}
    </div>
  );
}

// Sidebar Footer
interface SidebarFooterProps {
  children: ReactNode;
  className?: string;
}

export function SidebarFooter({ children, className = '' }: SidebarFooterProps) {
  return (
    <div className={`flex-shrink-0 px-4 py-4 border-t border-gray-200 dark:border-gray-800 ${className}`}>
      {children}
    </div>
  );
}

// Sidebar Group
interface SidebarGroupProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function SidebarGroup({ title, children, className = '' }: SidebarGroupProps) {
  const { isCollapsed } = useSidebar();

  return (
    <div className={`px-3 mb-4 ${className}`}>
      {title && !isCollapsed && (
        <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {title}
        </h3>
      )}
      <nav className="space-y-1">{children}</nav>
    </div>
  );
}

// Sidebar Item
interface SidebarItemProps {
  href: string;
  icon?: LucideIcon;
  label: string;
  badge?: ReactNode;
  active?: boolean;
  className?: string;
}

export function SidebarItem({
  href,
  icon: Icon,
  label,
  badge,
  active: activeProp,
  className = '',
}: SidebarItemProps) {
  const { isCollapsed } = useSidebar();
  const pathname = usePathname();
  const isActive = activeProp ?? pathname === href;

  return (
    <Link
      href={href}
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-lg
        transition-colors group
        ${isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }
        ${isCollapsed ? 'justify-center' : ''}
        ${className}
      `}
      title={isCollapsed ? label : undefined}
    >
      {Icon && (
        <Icon
          className={`w-5 h-5 flex-shrink-0 ${
            isActive ? 'text-primary' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
          }`}
        />
      )}
      {!isCollapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>
          {badge}
        </>
      )}
    </Link>
  );
}

// Sidebar Collapsible Item (with submenu)
interface SidebarCollapsibleProps {
  icon?: LucideIcon;
  label: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function SidebarCollapsible({
  icon: Icon,
  label,
  children,
  defaultOpen = false,
  className = '',
}: SidebarCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { isCollapsed } = useSidebar();

  if (isCollapsed) {
    return <>{children}</>;
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        {Icon && <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />}
        <span className="flex-1 text-left truncate">{label}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pl-8 mt-1 space-y-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Sidebar Toggle Button
interface SidebarToggleProps {
  className?: string;
}

export function SidebarToggle({ className = '' }: SidebarToggleProps) {
  const { isOpen, toggle } = useSidebar();

  return (
    <button
      type="button"
      onClick={toggle}
      className={`p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden ${className}`}
      aria-label={isOpen ? 'Închide meniul' : 'Deschide meniul'}
    >
      {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
    </button>
  );
}

// Sidebar Collapse Toggle
interface SidebarCollapseToggleProps {
  className?: string;
}

export function SidebarCollapseToggle({ className = '' }: SidebarCollapseToggleProps) {
  const { isCollapsed, setCollapsed } = useSidebar();

  return (
    <button
      type="button"
      onClick={() => setCollapsed(!isCollapsed)}
      className={`hidden lg:flex items-center justify-center w-full py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 ${className}`}
      aria-label={isCollapsed ? 'Extinde sidebar' : 'Restrânge sidebar'}
    >
      <ChevronRight
        className={`w-5 h-5 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
      />
    </button>
  );
}

// Vertical Navigation (for settings pages, etc.)
interface VerticalNavItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  href?: string;
  onClick?: () => void;
  badge?: ReactNode;
  disabled?: boolean;
}

interface VerticalNavProps {
  items: VerticalNavItem[];
  activeId?: string;
  onItemClick?: (id: string) => void;
  className?: string;
}

export function VerticalNav({
  items,
  activeId,
  onItemClick,
  className = '',
}: VerticalNavProps) {
  return (
    <nav className={`space-y-1 ${className}`}>
      {items.map((item) => {
        const isActive = activeId === item.id;
        const Component = item.href ? Link : 'button';

        return (
          <Component
            key={item.id}
            href={item.href as string}
            onClick={() => {
              if (!item.disabled) {
                item.onClick?.();
                onItemClick?.(item.id);
              }
            }}
            disabled={item.disabled}
            className={`
              flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-left
              transition-colors
              ${isActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }
              ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {item.icon && (
              <item.icon
                className={`w-5 h-5 ${
                  isActive ? 'text-primary' : 'text-gray-500 dark:text-gray-400'
                }`}
              />
            )}
            <span className="flex-1">{item.label}</span>
            {item.badge}
          </Component>
        );
      })}
    </nav>
  );
}

// Step Navigation (wizard-style)
interface StepNavItem {
  id: string;
  label: string;
  description?: string;
  completed?: boolean;
  current?: boolean;
}

interface StepNavProps {
  steps: StepNavItem[];
  currentStep: string;
  onStepClick?: (id: string) => void;
  allowNavigation?: boolean;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function StepNav({
  steps,
  currentStep,
  onStepClick,
  allowNavigation = false,
  orientation = 'horizontal',
  className = '',
}: StepNavProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  if (orientation === 'vertical') {
    return (
      <nav className={`space-y-0 ${className}`}>
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex || step.completed;
          const isCurrent = step.id === currentStep;
          const isClickable = allowNavigation && (isCompleted || isCurrent);

          return (
            <div key={step.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick?.(step.id)}
                  disabled={!isClickable}
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm
                    ${isCompleted
                      ? 'bg-green-500 text-white'
                      : isCurrent
                        ? 'bg-primary text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                    }
                    ${isClickable ? 'cursor-pointer' : 'cursor-default'}
                  `}
                >
                  {isCompleted ? '✓' : index + 1}
                </button>
                {index < steps.length - 1 && (
                  <div className={`w-0.5 h-12 ${isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                )}
              </div>
              <div className="pb-12">
                <p className={`font-medium ${isCurrent ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{step.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className={`flex items-center ${className}`}>
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex || step.completed;
        const isCurrent = step.id === currentStep;
        const isClickable = allowNavigation && (isCompleted || isCurrent);

        return (
          <div key={step.id} className="flex-1 flex items-center">
            <div className="flex flex-col items-center flex-shrink-0">
              <button
                type="button"
                onClick={() => isClickable && onStepClick?.(step.id)}
                disabled={!isClickable}
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-medium
                  ${isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                  }
                  ${isClickable ? 'cursor-pointer hover:scale-105' : 'cursor-default'}
                  transition-transform
                `}
              >
                {isCompleted ? '✓' : index + 1}
              </button>
              <p className={`mt-2 text-sm text-center ${isCurrent ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500'}`}>
                {step.label}
              </p>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-4 ${isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}
          </div>
        );
      })}
    </nav>
  );
}
