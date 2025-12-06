'use client';

import React, { createContext, useContext, useState, useCallback, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Collapsible Context
// ============================================================================

interface CollapsibleContextValue {
  isOpen: boolean;
  toggle: () => void;
  disabled: boolean;
}

const CollapsibleContext = createContext<CollapsibleContextValue | null>(null);

function useCollapsible() {
  const context = useContext(CollapsibleContext);
  if (!context) {
    throw new Error('Collapsible components must be used within a Collapsible');
  }
  return context;
}

// ============================================================================
// Collapsible Root
// ============================================================================

interface CollapsibleProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Collapsible({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
  className,
}: CollapsibleProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const toggle = useCallback(() => {
    if (disabled) return;

    if (isControlled) {
      onOpenChange?.(!controlledOpen);
    } else {
      setUncontrolledOpen(prev => {
        const newValue = !prev;
        onOpenChange?.(newValue);
        return newValue;
      });
    }
  }, [disabled, isControlled, controlledOpen, onOpenChange]);

  return (
    <CollapsibleContext.Provider value={{ isOpen, toggle, disabled }}>
      <div className={cn('collapsible', className)} data-state={isOpen ? 'open' : 'closed'}>
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
}

// ============================================================================
// Collapsible Trigger
// ============================================================================

interface CollapsibleTriggerProps {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
}

export const CollapsibleTrigger = forwardRef<HTMLButtonElement, CollapsibleTriggerProps>(
  ({ children, className, asChild = false }, ref) => {
    const { isOpen, toggle, disabled } = useCollapsible();

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
          toggle();
          const childProps = children.props as React.ButtonHTMLAttributes<HTMLButtonElement>;
          childProps.onClick?.(e);
        },
        'aria-expanded': isOpen,
        'data-state': isOpen ? 'open' : 'closed',
        disabled,
      } as React.HTMLAttributes<HTMLElement>);
    }

    return (
      <button
        ref={ref}
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-expanded={isOpen}
        data-state={isOpen ? 'open' : 'closed'}
        className={cn(
          'flex items-center justify-between w-full',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        {children}
      </button>
    );
  }
);

CollapsibleTrigger.displayName = 'CollapsibleTrigger';

// ============================================================================
// Collapsible Content
// ============================================================================

interface CollapsibleContentProps {
  children: React.ReactNode;
  className?: string;
  forceMount?: boolean;
}

export const CollapsibleContent = forwardRef<HTMLDivElement, CollapsibleContentProps>(
  ({ children, className, forceMount = false }, ref) => {
    const { isOpen } = useCollapsible();

    if (!forceMount && !isOpen) {
      return null;
    }

    return (
      <AnimatePresence initial={false}>
        {(forceMount || isOpen) && (
          <motion.div
            ref={ref}
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: isOpen ? 'auto' : 0,
              opacity: isOpen ? 1 : 0
            }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
            data-state={isOpen ? 'open' : 'closed'}
          >
            <div className={className}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);

CollapsibleContent.displayName = 'CollapsibleContent';

// ============================================================================
// Simple Collapsible (All-in-one)
// ============================================================================

interface SimpleCollapsibleProps {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  icon?: 'chevron' | 'plus' | 'arrow' | 'none';
  iconPosition?: 'left' | 'right';
  variant?: 'default' | 'bordered' | 'ghost' | 'filled';
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
}

export function SimpleCollapsible({
  title,
  children,
  defaultOpen = false,
  icon = 'chevron',
  iconPosition = 'right',
  variant = 'default',
  className,
  triggerClassName,
  contentClassName,
}: SimpleCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const variantStyles = {
    default: '',
    bordered: 'border border-gray-200 dark:border-gray-700 rounded-lg',
    ghost: '',
    filled: 'bg-gray-50 dark:bg-gray-800/50 rounded-lg',
  };

  const triggerVariantStyles = {
    default: 'py-3',
    bordered: 'p-4',
    ghost: 'py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg px-3',
    filled: 'p-4',
  };

  const contentVariantStyles = {
    default: 'pb-3',
    bordered: 'px-4 pb-4',
    ghost: 'px-3 pb-2',
    filled: 'px-4 pb-4',
  };

  const IconComponent = icon === 'chevron'
    ? ChevronDown
    : icon === 'plus'
      ? (isOpen ? Minus : Plus)
      : icon === 'arrow'
        ? ChevronRight
        : null;

  return (
    <div className={cn(variantStyles[variant], className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-between w-full text-left',
          'font-medium text-gray-900 dark:text-gray-100',
          'transition-colors duration-200',
          triggerVariantStyles[variant],
          triggerClassName
        )}
        aria-expanded={isOpen}
      >
        {iconPosition === 'left' && IconComponent && (
          <motion.span
            animate={{ rotate: icon === 'chevron' ? (isOpen ? 180 : 0) : icon === 'arrow' ? (isOpen ? 90 : 0) : 0 }}
            transition={{ duration: 0.2 }}
            className="mr-2 text-gray-500 dark:text-gray-400"
          >
            <IconComponent className="h-5 w-5" />
          </motion.span>
        )}
        <span className="flex-1">{title}</span>
        {iconPosition === 'right' && IconComponent && (
          <motion.span
            animate={{ rotate: icon === 'chevron' ? (isOpen ? 180 : 0) : icon === 'arrow' ? (isOpen ? 90 : 0) : 0 }}
            transition={{ duration: 0.2 }}
            className="ml-2 text-gray-500 dark:text-gray-400"
          >
            <IconComponent className="h-5 w-5" />
          </motion.span>
        )}
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className={cn(
              'text-gray-600 dark:text-gray-300',
              contentVariantStyles[variant],
              contentClassName
            )}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Collapsible Card
// ============================================================================

interface CollapsibleCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  headerAction?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function CollapsibleCard({
  title,
  subtitle,
  children,
  defaultOpen = false,
  headerAction,
  icon,
  className,
}: CollapsibleCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn(
      'bg-white dark:bg-gray-900 rounded-xl',
      'border border-gray-200 dark:border-gray-800',
      'shadow-sm overflow-hidden',
      className
    )}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-between w-full p-4 text-left',
          'hover:bg-gray-50 dark:hover:bg-gray-800/50',
          'transition-colors duration-200'
        )}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400">
              {icon}
            </div>
          )}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">{title}</h3>
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {headerAction && (
            <div onClick={e => e.stopPropagation()}>
              {headerAction}
            </div>
          )}
          <motion.span
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-gray-400"
          >
            <ChevronDown className="h-5 w-5" />
          </motion.span>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-800 pt-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Collapsible Section
// ============================================================================

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  className?: string;
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  badge,
  className,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn('collapsible-section', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 w-full py-2',
          'text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider',
          'hover:text-gray-700 dark:hover:text-gray-200',
          'transition-colors duration-200'
        )}
        aria-expanded={isOpen}
      >
        <motion.span
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronRight className="h-4 w-4" />
        </motion.span>
        <span>{title}</span>
        {badge}
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="py-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Collapsible List
// ============================================================================

interface CollapsibleListItem {
  id: string;
  title: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
}

interface CollapsibleListProps {
  items: CollapsibleListItem[];
  allowMultiple?: boolean;
  defaultOpenIds?: string[];
  variant?: 'default' | 'bordered' | 'separated';
  className?: string;
}

export function CollapsibleList({
  items,
  allowMultiple = false,
  defaultOpenIds = [],
  variant = 'default',
  className,
}: CollapsibleListProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set(defaultOpenIds));

  const toggleItem = (id: string) => {
    setOpenIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        if (!allowMultiple) {
          newSet.clear();
        }
        newSet.add(id);
      }
      return newSet;
    });
  };

  const variantStyles = {
    default: 'divide-y divide-gray-200 dark:divide-gray-700',
    bordered: 'border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden',
    separated: 'space-y-2',
  };

  const itemVariantStyles = {
    default: '',
    bordered: '',
    separated: 'border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden',
  };

  return (
    <div className={cn(variantStyles[variant], className)}>
      {items.map(item => {
        const isOpen = openIds.has(item.id);
        return (
          <div key={item.id} className={itemVariantStyles[variant]}>
            <button
              type="button"
              onClick={() => toggleItem(item.id)}
              className={cn(
                'flex items-center justify-between w-full py-4 px-4 text-left',
                'font-medium text-gray-900 dark:text-gray-100',
                'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                'transition-colors duration-200'
              )}
              aria-expanded={isOpen}
            >
              <span className="flex items-center gap-3">
                {item.icon}
                {item.title}
              </span>
              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-gray-500 dark:text-gray-400"
              >
                <ChevronDown className="h-5 w-5" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 text-gray-600 dark:text-gray-300">
                    {item.content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Details Summary (Native HTML enhanced)
// ============================================================================

interface DetailsSummaryProps {
  summary: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  summaryClassName?: string;
  contentClassName?: string;
}

export function DetailsSummary({
  summary,
  children,
  defaultOpen = false,
  className,
  summaryClassName,
  contentClassName,
}: DetailsSummaryProps) {
  return (
    <details
      open={defaultOpen}
      className={cn('group', className)}
    >
      <summary
        className={cn(
          'flex items-center justify-between cursor-pointer',
          'py-3 px-4 rounded-lg',
          'font-medium text-gray-900 dark:text-gray-100',
          'hover:bg-gray-100 dark:hover:bg-gray-800',
          'list-none [&::-webkit-details-marker]:hidden',
          'transition-colors duration-200',
          summaryClassName
        )}
      >
        {summary}
        <ChevronDown className="h-5 w-5 text-gray-500 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className={cn('px-4 pb-4 text-gray-600 dark:text-gray-300', contentClassName)}>
        {children}
      </div>
    </details>
  );
}

export default Collapsible;
