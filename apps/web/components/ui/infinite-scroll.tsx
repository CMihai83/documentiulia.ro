'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface InfiniteScrollProps<T> {
  items: T[];
  hasMore: boolean;
  loadMore: () => void | Promise<void>;
  isLoading?: boolean;
  threshold?: number;
  className?: string;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  LoadingComponent?: React.ReactNode;
  EndComponent?: React.ReactNode;
  EmptyComponent?: React.ReactNode;
  ErrorComponent?: React.ReactNode;
  error?: Error | null;
  onRetry?: () => void;
  scrollableTarget?: string;
  inverse?: boolean;
}

// ============================================================================
// Default Components
// ============================================================================

function DefaultLoadingComponent() {
  return (
    <div className="flex items-center justify-center py-4">
      <svg className="w-6 h-6 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      <span className="ml-2 text-sm text-muted-foreground">Se incarca...</span>
    </div>
  );
}

function DefaultEndComponent() {
  return (
    <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      Toate elementele au fost incarcate
    </div>
  );
}

function DefaultEmptyComponent() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <svg className="w-12 h-12 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <p>Nu exista elemente de afisat</p>
    </div>
  );
}

interface DefaultErrorComponentProps {
  error: Error;
  onRetry?: () => void;
}

function DefaultErrorComponent({ error, onRetry }: DefaultErrorComponentProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-destructive">
      <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <p className="text-sm mb-3">{error.message || 'A aparut o eroare'}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 text-sm bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
        >
          Incearca din nou
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Infinite Scroll Component
// ============================================================================

export function InfiniteScroll<T>({
  items,
  hasMore,
  loadMore,
  isLoading = false,
  threshold = 200,
  className,
  renderItem,
  keyExtractor,
  LoadingComponent = <DefaultLoadingComponent />,
  EndComponent = <DefaultEndComponent />,
  EmptyComponent = <DefaultEmptyComponent />,
  ErrorComponent,
  error,
  onRetry,
  scrollableTarget,
  inverse = false,
}: InfiniteScrollProps<T>) {
  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const loadMoreRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Setup intersection observer for infinite scroll
  React.useEffect(() => {
    if (isLoading || !hasMore || error) return;

    const options: IntersectionObserverInit = {
      root: scrollableTarget ? document.getElementById(scrollableTarget) : null,
      rootMargin: `${threshold}px`,
      threshold: 0,
    };

    observerRef.current = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !isLoading) {
        loadMore();
      }
    }, options);

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoading, loadMore, threshold, scrollableTarget, error]);

  // Handle empty state
  if (items.length === 0 && !isLoading && !error) {
    return <>{EmptyComponent}</>;
  }

  // Handle error state
  if (error) {
    return (
      <>
        {ErrorComponent || <DefaultErrorComponent error={error} onRetry={onRetry} />}
      </>
    );
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Items */}
      <div className={cn(inverse && 'flex flex-col-reverse')}>
        {items.map((item, index) => (
          <motion.div
            key={keyExtractor(item, index)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: Math.min(index * 0.05, 0.5) }}
          >
            {renderItem(item, index)}
          </motion.div>
        ))}
      </div>

      {/* Load More Trigger */}
      <div ref={loadMoreRef} className="h-1" />

      {/* Loading State */}
      {isLoading && LoadingComponent}

      {/* End State */}
      {!hasMore && !isLoading && items.length > 0 && EndComponent}
    </div>
  );
}

// ============================================================================
// Virtualized Infinite Scroll (for large lists)
// ============================================================================

interface VirtualizedInfiniteScrollProps<T> extends InfiniteScrollProps<T> {
  itemHeight: number;
  overscan?: number;
}

export function VirtualizedInfiniteScroll<T>({
  items,
  hasMore,
  loadMore,
  isLoading = false,
  itemHeight,
  overscan = 5,
  className,
  renderItem,
  keyExtractor,
  LoadingComponent = <DefaultLoadingComponent />,
  EndComponent = <DefaultEndComponent />,
  EmptyComponent = <DefaultEmptyComponent />,
}: VirtualizedInfiniteScrollProps<T>) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = React.useState(0);
  const [containerHeight, setContainerHeight] = React.useState(0);

  // Calculate visible items
  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetTop = startIndex * itemHeight;

  // Handle scroll
  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);

    // Check if we need to load more
    const scrolledToBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 200;
    if (scrolledToBottom && hasMore && !isLoading) {
      loadMore();
    }
  }, [hasMore, isLoading, loadMore]);

  // Measure container
  React.useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerHeight(entry.contentRect.height);
        }
      });

      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  if (items.length === 0 && !isLoading) {
    return <>{EmptyComponent}</>;
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn('overflow-auto', className)}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetTop}px)` }}>
          {visibleItems.map((item, index) => (
            <div
              key={keyExtractor(item, startIndex + index)}
              style={{ height: itemHeight }}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>

      {isLoading && LoadingComponent}
      {!hasMore && !isLoading && items.length > 0 && EndComponent}
    </div>
  );
}

// ============================================================================
// Load More Button (alternative to infinite scroll)
// ============================================================================

interface LoadMoreButtonProps {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  loadedCount: number;
  totalCount?: number;
  className?: string;
}

export function LoadMoreButton({
  hasMore,
  isLoading,
  onLoadMore,
  loadedCount,
  totalCount,
  className,
}: LoadMoreButtonProps) {
  if (!hasMore) return null;

  return (
    <div className={cn('flex flex-col items-center gap-2 py-4', className)}>
      {totalCount && (
        <span className="text-sm text-muted-foreground">
          Afisate {loadedCount} din {totalCount}
        </span>
      )}
      <motion.button
        type="button"
        onClick={onLoadMore}
        disabled={isLoading}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'px-6 py-2 rounded-md bg-primary text-primary-foreground font-medium transition-colors',
          'hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          isLoading && 'opacity-50 cursor-not-allowed'
        )}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Se incarca...
          </span>
        ) : (
          'Incarca mai multe'
        )}
      </motion.button>
    </div>
  );
}

// ============================================================================
// Infinite Scroll Hook
// ============================================================================

interface UseInfiniteScrollOptions<T> {
  fetchPage: (page: number) => Promise<{ data: T[]; hasMore: boolean }>;
  initialData?: T[];
  pageSize?: number;
}

interface UseInfiniteScrollReturn<T> {
  items: T[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  reset: () => void;
  refresh: () => Promise<void>;
}

export function useInfiniteScroll<T>({
  fetchPage,
  initialData = [],
  pageSize = 20,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollReturn<T> {
  const [items, setItems] = React.useState<T[]>(initialData);
  const [page, setPage] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [hasMore, setHasMore] = React.useState(true);

  const loadMore = React.useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchPage(page);
      setItems((prev) => [...prev, ...result.data]);
      setHasMore(result.hasMore);
      setPage((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load'));
    } finally {
      setIsLoading(false);
    }
  }, [fetchPage, page, isLoading, hasMore]);

  const reset = React.useCallback(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    setError(null);
  }, []);

  const refresh = React.useCallback(async () => {
    reset();
    setIsLoading(true);

    try {
      const result = await fetchPage(1);
      setItems(result.data);
      setHasMore(result.hasMore);
      setPage(2);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load'));
    } finally {
      setIsLoading(false);
    }
  }, [fetchPage, reset]);

  return { items, isLoading, error, hasMore, loadMore, reset, refresh };
}

// ============================================================================
// Accounting-Specific Components
// ============================================================================

// Invoice List with Infinite Scroll
interface Invoice {
  id: string;
  number: string;
  client: string;
  amount: number;
  date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
}

interface InvoiceListProps {
  invoices: Invoice[];
  hasMore: boolean;
  loadMore: () => void;
  isLoading?: boolean;
  onInvoiceClick?: (invoice: Invoice) => void;
}

export function InvoiceList({
  invoices,
  hasMore,
  loadMore,
  isLoading = false,
  onInvoiceClick,
}: InvoiceListProps) {
  const statusColors: Record<Invoice['status'], string> = {
    draft: 'bg-gray-100 text-gray-700',
    sent: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700',
  };

  const statusLabels: Record<Invoice['status'], string> = {
    draft: 'Ciorna',
    sent: 'Trimisa',
    paid: 'Platita',
    overdue: 'Restanta',
  };

  return (
    <InfiniteScroll
      items={invoices}
      hasMore={hasMore}
      loadMore={loadMore}
      isLoading={isLoading}
      keyExtractor={(invoice) => invoice.id}
      renderItem={(invoice) => (
        <button
          type="button"
          onClick={() => onInvoiceClick?.(invoice)}
          className="w-full p-4 border-b border-border hover:bg-muted/50 transition-colors text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{invoice.number}</div>
              <div className="text-sm text-muted-foreground">{invoice.client}</div>
            </div>
            <div className="text-right">
              <div className="font-medium">{invoice.amount.toFixed(2)} RON</div>
              <span className={cn('text-xs px-2 py-0.5 rounded-full', statusColors[invoice.status])}>
                {statusLabels[invoice.status]}
              </span>
            </div>
          </div>
        </button>
      )}
      EmptyComponent={
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <svg className="w-12 h-12 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>Nu exista facturi</p>
        </div>
      }
    />
  );
}

// Transaction List with Infinite Scroll
interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  category?: string;
}

interface TransactionListProps {
  transactions: Transaction[];
  hasMore: boolean;
  loadMore: () => void;
  isLoading?: boolean;
  onTransactionClick?: (transaction: Transaction) => void;
}

export function TransactionList({
  transactions,
  hasMore,
  loadMore,
  isLoading = false,
  onTransactionClick,
}: TransactionListProps) {
  return (
    <InfiniteScroll
      items={transactions}
      hasMore={hasMore}
      loadMore={loadMore}
      isLoading={isLoading}
      keyExtractor={(tx) => tx.id}
      renderItem={(transaction) => (
        <button
          type="button"
          onClick={() => onTransactionClick?.(transaction)}
          className="w-full p-3 border-b border-border hover:bg-muted/50 transition-colors text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center',
                transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'
              )}>
                <svg
                  className={cn('w-4 h-4', transaction.type === 'income' ? 'text-green-600' : 'text-red-600')}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {transaction.type === 'income' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  )}
                </svg>
              </div>
              <div>
                <div className="font-medium">{transaction.description}</div>
                <div className="text-sm text-muted-foreground">
                  {transaction.category && <span>{transaction.category} • </span>}
                  {transaction.date}
                </div>
              </div>
            </div>
            <div className={cn(
              'font-medium',
              transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
            )}>
              {transaction.type === 'income' ? '+' : '-'}{transaction.amount.toFixed(2)} RON
            </div>
          </div>
        </button>
      )}
    />
  );
}
