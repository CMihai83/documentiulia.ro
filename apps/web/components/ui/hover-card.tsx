'use client';

import React, { createContext, useContext, useState, useRef, useEffect, forwardRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Hover Card Context
// ============================================================================

interface HoverCardContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  openDelay: number;
  closeDelay: number;
}

const HoverCardContext = createContext<HoverCardContextValue | undefined>(undefined);

function useHoverCard() {
  const context = useContext(HoverCardContext);
  if (!context) {
    throw new Error('HoverCard components must be used within a HoverCard');
  }
  return context;
}

// ============================================================================
// Hover Card
// ============================================================================

interface HoverCardProps {
  children: React.ReactNode;
  openDelay?: number;
  closeDelay?: number;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function HoverCard({
  children,
  openDelay = 300,
  closeDelay = 200,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
}: HoverCardProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = controlledOpen ?? internalOpen;

  const setIsOpen = useCallback((open: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(open);
    }
    onOpenChange?.(open);
  }, [controlledOpen, onOpenChange]);

  return (
    <HoverCardContext.Provider value={{ isOpen, setIsOpen, openDelay, closeDelay }}>
      <div className="relative inline-block">
        {children}
      </div>
    </HoverCardContext.Provider>
  );
}

// ============================================================================
// Hover Card Trigger
// ============================================================================

interface HoverCardTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
}

export const HoverCardTrigger = forwardRef<HTMLDivElement, HoverCardTriggerProps>(
  ({ children, asChild = false, className }, ref) => {
    const { setIsOpen, openDelay, closeDelay } = useHoverCard();
    const openTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      openTimeoutRef.current = setTimeout(() => {
        setIsOpen(true);
      }, openDelay);
    };

    const handleMouseLeave = () => {
      if (openTimeoutRef.current) {
        clearTimeout(openTimeoutRef.current);
        openTimeoutRef.current = null;
      }
      closeTimeoutRef.current = setTimeout(() => {
        setIsOpen(false);
      }, closeDelay);
    };

    useEffect(() => {
      return () => {
        if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      };
    }, []);

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
      } as React.HTMLAttributes<HTMLElement>);
    }

    return (
      <div
        ref={ref}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn('inline-block', className)}
      >
        {children}
      </div>
    );
  }
);

HoverCardTrigger.displayName = 'HoverCardTrigger';

// ============================================================================
// Hover Card Content
// ============================================================================

interface HoverCardContentProps {
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  className?: string;
}

export function HoverCardContent({
  children,
  side = 'bottom',
  align = 'center',
  sideOffset = 8,
  className,
}: HoverCardContentProps) {
  const { isOpen, setIsOpen, closeDelay } = useHoverCard();
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, closeDelay);
  };

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const positionStyles = {
    top: { bottom: '100%', marginBottom: sideOffset },
    right: { left: '100%', marginLeft: sideOffset },
    bottom: { top: '100%', marginTop: sideOffset },
    left: { right: '100%', marginRight: sideOffset },
  };

  const alignStyles = {
    start: side === 'top' || side === 'bottom' ? { left: 0 } : { top: 0 },
    center: side === 'top' || side === 'bottom'
      ? { left: '50%', transform: 'translateX(-50%)' }
      : { top: '50%', transform: 'translateY(-50%)' },
    end: side === 'top' || side === 'bottom' ? { right: 0 } : { bottom: 0 },
  };

  const animationVariants = {
    top: { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } },
    right: { initial: { opacity: 0, x: -10 }, animate: { opacity: 1, x: 0 } },
    bottom: { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 } },
    left: { initial: { opacity: 0, x: 10 }, animate: { opacity: 1, x: 0 } },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={animationVariants[side].initial}
          animate={animationVariants[side].animate}
          exit={animationVariants[side].initial}
          transition={{ duration: 0.2 }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{ ...positionStyles[side], ...alignStyles[align], position: 'absolute' }}
          className={cn(
            'z-50 w-64 rounded-lg border border-gray-200 dark:border-gray-700',
            'bg-white dark:bg-gray-900 p-4 shadow-lg',
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
// Hover Card Arrow
// ============================================================================

interface HoverCardArrowProps {
  className?: string;
}

export function HoverCardArrow({ className }: HoverCardArrowProps) {
  return (
    <div
      className={cn(
        'absolute w-3 h-3 bg-white dark:bg-gray-900 border-l border-t border-gray-200 dark:border-gray-700',
        'rotate-45 -translate-y-1/2',
        className
      )}
    />
  );
}

// ============================================================================
// Simple Hover Card
// ============================================================================

interface SimpleHoverCardProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  openDelay?: number;
  closeDelay?: number;
  className?: string;
  contentClassName?: string;
}

export function SimpleHoverCard({
  trigger,
  children,
  side = 'bottom',
  align = 'center',
  openDelay = 300,
  closeDelay = 200,
  className,
  contentClassName,
}: SimpleHoverCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const openTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    openTimeoutRef.current = setTimeout(() => setIsOpen(true), openDelay);
  };

  const handleMouseLeave = () => {
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => setIsOpen(false), closeDelay);
  };

  useEffect(() => {
    return () => {
      if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const positionStyles = {
    top: 'bottom-full mb-2',
    right: 'left-full ml-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
  };

  const alignStyles = {
    start: side === 'top' || side === 'bottom' ? 'left-0' : 'top-0',
    center: side === 'top' || side === 'bottom' ? 'left-1/2 -translate-x-1/2' : 'top-1/2 -translate-y-1/2',
    end: side === 'top' || side === 'bottom' ? 'right-0' : 'bottom-0',
  };

  return (
    <div
      className={cn('relative inline-block', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {trigger}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute z-50 w-64',
              positionStyles[side],
              alignStyles[align],
              contentClassName
            )}
          >
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-lg">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// User Hover Card
// ============================================================================

interface UserHoverCardProps {
  user: {
    name: string;
    username?: string;
    avatar?: string;
    bio?: string;
    followers?: number;
    following?: number;
    isFollowing?: boolean;
  };
  trigger: React.ReactNode;
  onFollow?: () => void;
  className?: string;
}

export function UserHoverCard({ user, trigger, onFollow, className }: UserHoverCardProps) {
  return (
    <SimpleHoverCard
      trigger={trigger}
      className={className}
      contentClassName="w-80"
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-lg font-semibold text-gray-600 dark:text-gray-400">
                  {user.name.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">{user.name}</h4>
              {user.username && (
                <p className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</p>
              )}
            </div>
          </div>
          {onFollow && (
            <button
              onClick={onFollow}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-full transition-colors',
                user.isFollowing
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              )}
            >
              {user.isFollowing ? 'Urmaresti' : 'Urmareste'}
            </button>
          )}
        </div>

        {/* Bio */}
        {user.bio && (
          <p className="text-sm text-gray-600 dark:text-gray-400">{user.bio}</p>
        )}

        {/* Stats */}
        {(user.followers !== undefined || user.following !== undefined) && (
          <div className="flex items-center gap-4 text-sm">
            {user.following !== undefined && (
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">{user.following}</span>
                <span className="text-gray-500 dark:text-gray-400 ml-1">Urmariri</span>
              </div>
            )}
            {user.followers !== undefined && (
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">{user.followers}</span>
                <span className="text-gray-500 dark:text-gray-400 ml-1">Urmaritori</span>
              </div>
            )}
          </div>
        )}
      </div>
    </SimpleHoverCard>
  );
}

// ============================================================================
// Link Preview Hover Card
// ============================================================================

interface LinkPreviewHoverCardProps {
  url: string;
  title: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
  trigger: React.ReactNode;
  className?: string;
}

export function LinkPreviewHoverCard({
  url,
  title,
  description,
  image,
  favicon,
  siteName,
  trigger,
  className,
}: LinkPreviewHoverCardProps) {
  return (
    <SimpleHoverCard
      trigger={trigger}
      className={className}
      contentClassName="w-80 p-0"
    >
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        {image && (
          <div className="aspect-video w-full overflow-hidden rounded-t-lg">
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            {favicon && (
              <img src={favicon} alt="" className="w-4 h-4" />
            )}
            {siteName && (
              <span className="text-xs text-gray-500 dark:text-gray-400">{siteName}</span>
            )}
          </div>
          <h4 className="font-semibold text-gray-900 dark:text-white line-clamp-2">{title}</h4>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{description}</p>
          )}
        </div>
      </a>
    </SimpleHoverCard>
  );
}

// ============================================================================
// Product Hover Card
// ============================================================================

interface ProductHoverCardProps {
  product: {
    name: string;
    image?: string;
    price: number;
    originalPrice?: number;
    currency?: string;
    rating?: number;
    reviewCount?: number;
    inStock?: boolean;
  };
  trigger: React.ReactNode;
  onAddToCart?: () => void;
  className?: string;
}

export function ProductHoverCard({
  product,
  trigger,
  onAddToCart,
  className,
}: ProductHoverCardProps) {
  const currency = product.currency || 'RON';
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  return (
    <SimpleHoverCard
      trigger={trigger}
      className={className}
      contentClassName="w-72 p-0"
    >
      <div>
        {product.image && (
          <div className="aspect-square w-full overflow-hidden rounded-t-lg bg-gray-100 dark:bg-gray-800">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="p-4 space-y-3">
          <h4 className="font-semibold text-gray-900 dark:text-white line-clamp-2">{product.name}</h4>

          {/* Rating */}
          {product.rating !== undefined && (
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={cn(
                    'w-4 h-4',
                    i < Math.floor(product.rating!) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
                  )}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              {product.reviewCount !== undefined && (
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                  ({product.reviewCount})
                </span>
              )}
            </div>
          )}

          {/* Price */}
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {product.price.toFixed(2)} {currency}
            </span>
            {product.originalPrice && (
              <>
                <span className="text-sm text-gray-500 line-through">
                  {product.originalPrice.toFixed(2)} {currency}
                </span>
                <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
                  -{discount}%
                </span>
              </>
            )}
          </div>

          {/* Stock & Add to Cart */}
          <div className="flex items-center justify-between">
            <span className={cn(
              'text-sm',
              product.inStock !== false
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            )}>
              {product.inStock !== false ? 'In stoc' : 'Stoc epuizat'}
            </span>
            {onAddToCart && product.inStock !== false && (
              <button
                onClick={onAddToCart}
                className="px-3 py-1.5 text-sm font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Adauga in cos
              </button>
            )}
          </div>
        </div>
      </div>
    </SimpleHoverCard>
  );
}

// ============================================================================
// Info Hover Card
// ============================================================================

interface InfoHoverCardProps {
  title?: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
  trigger?: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

export function InfoHoverCard({
  title,
  content,
  icon,
  trigger,
  side = 'top',
  className,
}: InfoHoverCardProps) {
  const defaultTrigger = (
    <button
      type="button"
      className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
    >
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </button>
  );

  return (
    <SimpleHoverCard
      trigger={trigger || defaultTrigger}
      side={side}
      className={className}
      openDelay={200}
      closeDelay={100}
    >
      <div className="space-y-2">
        {(title || icon) && (
          <div className="flex items-center gap-2">
            {icon && <span className="text-blue-500">{icon}</span>}
            {title && <h4 className="font-semibold text-gray-900 dark:text-white">{title}</h4>}
          </div>
        )}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {content}
        </div>
      </div>
    </SimpleHoverCard>
  );
}

// ============================================================================
// Color Swatch Hover Card
// ============================================================================

interface ColorSwatchHoverCardProps {
  color: string;
  name: string;
  hex?: string;
  rgb?: string;
  copyable?: boolean;
  className?: string;
}

export function ColorSwatchHoverCard({
  color,
  name,
  hex,
  rgb,
  copyable = true,
  className,
}: ColorSwatchHoverCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SimpleHoverCard
      trigger={
        <button
          type="button"
          className={cn('w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer', className)}
          style={{ backgroundColor: color }}
        />
      }
      contentClassName="w-48"
    >
      <div className="space-y-3">
        <div
          className="w-full h-20 rounded-lg"
          style={{ backgroundColor: color }}
        />
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white">{name}</h4>
          {hex && (
            <button
              onClick={() => copyable && handleCopy(hex)}
              className="flex items-center justify-between w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <span>HEX: {hex}</span>
              {copyable && (
                <span className="text-xs">{copied ? 'Copiat!' : 'Click pentru copiere'}</span>
              )}
            </button>
          )}
          {rgb && (
            <p className="text-sm text-gray-600 dark:text-gray-400">RGB: {rgb}</p>
          )}
        </div>
      </div>
    </SimpleHoverCard>
  );
}

export default HoverCard;
