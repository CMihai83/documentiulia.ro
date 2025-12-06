'use client';

import React, { forwardRef, useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Scroll Area
// ============================================================================

interface ScrollAreaProps {
  children: React.ReactNode;
  className?: string;
  orientation?: 'vertical' | 'horizontal' | 'both';
  scrollbarSize?: 'sm' | 'md' | 'lg';
  scrollbarStyle?: 'default' | 'minimal' | 'hidden';
  showScrollShadow?: boolean;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({
    children,
    className,
    orientation = 'vertical',
    scrollbarSize = 'md',
    scrollbarStyle = 'default',
    showScrollShadow = false,
    onScroll,
  }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [showTopShadow, setShowTopShadow] = useState(false);
    const [showBottomShadow, setShowBottomShadow] = useState(false);
    const [showLeftShadow, setShowLeftShadow] = useState(false);
    const [showRightShadow, setShowRightShadow] = useState(false);

    const checkScroll = useCallback(() => {
      if (!containerRef.current || !showScrollShadow) return;

      const { scrollTop, scrollLeft, scrollHeight, scrollWidth, clientHeight, clientWidth } = containerRef.current;

      if (orientation === 'vertical' || orientation === 'both') {
        setShowTopShadow(scrollTop > 0);
        setShowBottomShadow(scrollTop < scrollHeight - clientHeight - 1);
      }

      if (orientation === 'horizontal' || orientation === 'both') {
        setShowLeftShadow(scrollLeft > 0);
        setShowRightShadow(scrollLeft < scrollWidth - clientWidth - 1);
      }
    }, [orientation, showScrollShadow]);

    useEffect(() => {
      checkScroll();
      const container = containerRef.current;
      if (container) {
        container.addEventListener('scroll', checkScroll);
        window.addEventListener('resize', checkScroll);
      }
      return () => {
        if (container) {
          container.removeEventListener('scroll', checkScroll);
        }
        window.removeEventListener('resize', checkScroll);
      };
    }, [checkScroll]);

    const scrollbarSizeStyles = {
      sm: 'scrollbar-thin',
      md: '',
      lg: 'scrollbar-wide',
    };

    const scrollbarStyleClasses = {
      default: 'scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800',
      minimal: 'scrollbar-thumb-gray-300/50 dark:scrollbar-thumb-gray-600/50 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500',
      hidden: 'scrollbar-none',
    };

    const overflowStyles = {
      vertical: 'overflow-y-auto overflow-x-hidden',
      horizontal: 'overflow-x-auto overflow-y-hidden',
      both: 'overflow-auto',
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      checkScroll();
      onScroll?.(e);
    };

    return (
      <div className={cn('relative', className)} ref={ref}>
        {showScrollShadow && (
          <>
            <div className={cn(
              'absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-white dark:from-gray-900 to-transparent z-10 pointer-events-none transition-opacity duration-200',
              showTopShadow ? 'opacity-100' : 'opacity-0'
            )} />
            <div className={cn(
              'absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white dark:from-gray-900 to-transparent z-10 pointer-events-none transition-opacity duration-200',
              showBottomShadow ? 'opacity-100' : 'opacity-0'
            )} />
            <div className={cn(
              'absolute top-0 bottom-0 left-0 w-4 bg-gradient-to-r from-white dark:from-gray-900 to-transparent z-10 pointer-events-none transition-opacity duration-200',
              showLeftShadow ? 'opacity-100' : 'opacity-0'
            )} />
            <div className={cn(
              'absolute top-0 bottom-0 right-0 w-4 bg-gradient-to-l from-white dark:from-gray-900 to-transparent z-10 pointer-events-none transition-opacity duration-200',
              showRightShadow ? 'opacity-100' : 'opacity-0'
            )} />
          </>
        )}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className={cn(
            'h-full w-full',
            overflowStyles[orientation],
            scrollbarSizeStyles[scrollbarSize],
            scrollbarStyleClasses[scrollbarStyle]
          )}
        >
          {children}
        </div>
      </div>
    );
  }
);

ScrollArea.displayName = 'ScrollArea';

// ============================================================================
// Scroll Area Viewport
// ============================================================================

interface ScrollAreaViewportProps {
  children: React.ReactNode;
  className?: string;
}

export const ScrollAreaViewport = forwardRef<HTMLDivElement, ScrollAreaViewportProps>(
  ({ children, className }, ref) => {
    return (
      <div ref={ref} className={cn('h-full w-full', className)}>
        {children}
      </div>
    );
  }
);

ScrollAreaViewport.displayName = 'ScrollAreaViewport';

// ============================================================================
// Custom Scrollbar
// ============================================================================

interface CustomScrollbarProps {
  children: React.ReactNode;
  className?: string;
  thumbClassName?: string;
  trackClassName?: string;
  orientation?: 'vertical' | 'horizontal';
  autoHide?: boolean;
  autoHideDelay?: number;
}

export function CustomScrollbar({
  children,
  className,
  thumbClassName,
  trackClassName,
  orientation = 'vertical',
  autoHide = true,
  autoHideDelay = 1000,
}: CustomScrollbarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(!autoHide);
  const [thumbSize, setThumbSize] = useState(0);
  const [thumbPosition, setThumbPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showScrollbar = useCallback(() => {
    setIsVisible(true);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    if (autoHide && !isDragging) {
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, autoHideDelay);
    }
  }, [autoHide, autoHideDelay, isDragging]);

  const updateThumb = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const isVertical = orientation === 'vertical';

    const viewportSize = isVertical ? container.clientHeight : container.clientWidth;
    const contentSize = isVertical ? container.scrollHeight : container.scrollWidth;
    const scrollPosition = isVertical ? container.scrollTop : container.scrollLeft;

    const ratio = viewportSize / contentSize;
    const newThumbSize = Math.max(ratio * viewportSize, 40);
    const maxPosition = viewportSize - newThumbSize;
    const newPosition = (scrollPosition / (contentSize - viewportSize)) * maxPosition;

    setThumbSize(ratio >= 1 ? 0 : newThumbSize);
    setThumbPosition(newPosition);
  }, [orientation]);

  useEffect(() => {
    updateThumb();
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', () => {
        updateThumb();
        showScrollbar();
      });
      window.addEventListener('resize', updateThumb);
    }
    return () => {
      window.removeEventListener('resize', updateThumb);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [updateThumb, showScrollbar]);

  const handleThumbMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const startPosition = orientation === 'vertical' ? e.clientY : e.clientX;
    const startScrollPosition = orientation === 'vertical'
      ? containerRef.current?.scrollTop || 0
      : containerRef.current?.scrollLeft || 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!containerRef.current) return;

      const currentPosition = orientation === 'vertical' ? moveEvent.clientY : moveEvent.clientX;
      const delta = currentPosition - startPosition;

      const container = containerRef.current;
      const viewportSize = orientation === 'vertical' ? container.clientHeight : container.clientWidth;
      const contentSize = orientation === 'vertical' ? container.scrollHeight : container.scrollWidth;

      const scrollDelta = (delta / (viewportSize - thumbSize)) * (contentSize - viewportSize);

      if (orientation === 'vertical') {
        container.scrollTop = startScrollPosition + scrollDelta;
      } else {
        container.scrollLeft = startScrollPosition + scrollDelta;
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      showScrollbar();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const isVertical = orientation === 'vertical';

  return (
    <div className={cn('relative group', className)}>
      <div
        ref={containerRef}
        className={cn(
          'h-full w-full scrollbar-none',
          isVertical ? 'overflow-y-auto overflow-x-hidden' : 'overflow-x-auto overflow-y-hidden'
        )}
        onMouseEnter={showScrollbar}
      >
        {children}
      </div>

      {thumbSize > 0 && (
        <AnimatePresence>
          {isVisible && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                'absolute',
                isVertical
                  ? 'right-1 top-0 bottom-0 w-2'
                  : 'bottom-1 left-0 right-0 h-2',
                trackClassName
              )}
            >
              <div
                ref={thumbRef}
                onMouseDown={handleThumbMouseDown}
                className={cn(
                  'absolute rounded-full bg-gray-400 dark:bg-gray-600 hover:bg-gray-500 dark:hover:bg-gray-500 cursor-pointer transition-colors',
                  isVertical ? 'w-full' : 'h-full',
                  thumbClassName
                )}
                style={
                  isVertical
                    ? { height: thumbSize, top: thumbPosition }
                    : { width: thumbSize, left: thumbPosition }
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

// ============================================================================
// Infinite Scroll Area
// ============================================================================

interface InfiniteScrollAreaProps {
  children: React.ReactNode;
  className?: string;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading?: boolean;
  threshold?: number;
  loader?: React.ReactNode;
  endMessage?: React.ReactNode;
}

export function InfiniteScrollArea({
  children,
  className,
  onLoadMore,
  hasMore,
  isLoading = false,
  threshold = 100,
  loader,
  endMessage,
}: InfiniteScrollAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const handleScroll = useCallback(() => {
    if (!containerRef.current || loadingRef.current || !hasMore || isLoading) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    if (distanceFromBottom < threshold) {
      loadingRef.current = true;
      onLoadMore();
    }
  }, [hasMore, isLoading, onLoadMore, threshold]);

  useEffect(() => {
    loadingRef.current = isLoading;
  }, [isLoading]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn('overflow-y-auto h-full', className)}
    >
      {children}
      {isLoading && (
        loader || (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )
      )}
      {!hasMore && !isLoading && endMessage && (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
          {endMessage}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Virtual Scroll Area
// ============================================================================

interface VirtualScrollAreaProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number;
}

export function VirtualScrollArea<T>({
  items,
  itemHeight,
  renderItem,
  className,
  overscan = 3,
}: VirtualScrollAreaProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn('overflow-y-auto h-full', className)}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={startIndex + index} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Scroll to Top Button
// ============================================================================

interface ScrollToTopProps {
  containerRef?: React.RefObject<HTMLElement>;
  threshold?: number;
  className?: string;
}

export function ScrollToTop({
  containerRef,
  threshold = 300,
  className,
}: ScrollToTopProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const container = containerRef?.current || window;

    const handleScroll = () => {
      const scrollTop = containerRef?.current
        ? containerRef.current.scrollTop
        : window.scrollY;
      setIsVisible(scrollTop > threshold);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [containerRef, threshold]);

  const scrollToTop = () => {
    if (containerRef?.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={scrollToTop}
          className={cn(
            'fixed bottom-6 right-6 z-50',
            'w-12 h-12 rounded-full',
            'bg-blue-500 hover:bg-blue-600 text-white',
            'shadow-lg hover:shadow-xl',
            'flex items-center justify-center',
            'transition-all duration-200',
            className
          )}
          aria-label="Inapoi sus"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export default ScrollArea;
