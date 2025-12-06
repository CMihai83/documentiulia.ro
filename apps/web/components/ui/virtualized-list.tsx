'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string | number;
  overscan?: number;
  className?: string;
  itemClassName?: string;
  onEndReached?: () => void;
  endReachedThreshold?: number;
  loading?: boolean;
  loadingIndicator?: React.ReactNode;
  emptyMessage?: string;
  gap?: number;
}

interface VirtualizedListState {
  scrollTop: number;
  containerHeight: number;
}

// ============================================================================
// Main Virtualized List Component
// ============================================================================

export function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  keyExtractor,
  overscan = 3,
  className,
  itemClassName,
  onEndReached,
  endReachedThreshold = 0.8,
  loading = false,
  loadingIndicator,
  emptyMessage = 'Nu există elemente',
  gap = 0,
}: VirtualizedListProps<T>) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [state, setState] = React.useState<VirtualizedListState>({
    scrollTop: 0,
    containerHeight,
  });
  const endReachedCalled = React.useRef(false);

  const totalHeight = items.length * (itemHeight + gap) - gap;

  const startIndex = Math.max(
    0,
    Math.floor(state.scrollTop / (itemHeight + gap)) - overscan
  );
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((state.scrollTop + state.containerHeight) / (itemHeight + gap)) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * (itemHeight + gap);

  const handleScroll = React.useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      setState((prev) => ({ ...prev, scrollTop }));

      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
      if (
        scrollPercentage >= endReachedThreshold &&
        onEndReached &&
        !endReachedCalled.current &&
        !loading
      ) {
        endReachedCalled.current = true;
        onEndReached();
      } else if (scrollPercentage < endReachedThreshold) {
        endReachedCalled.current = false;
      }
    },
    [endReachedThreshold, onEndReached, loading]
  );

  React.useEffect(() => {
    const container = containerRef.current;
    if (container) {
      setState((prev) => ({ ...prev, containerHeight: container.clientHeight }));
    }
  }, [containerHeight]);

  if (items.length === 0 && !loading) {
    return (
      <div
        className={cn(
          'flex items-center justify-center text-muted-foreground',
          className
        )}
        style={{ height: containerHeight }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn('overflow-auto relative', className)}
      style={{ height: containerHeight }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: offsetY,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = startIndex + index;
            return (
              <div
                key={keyExtractor(item, actualIndex)}
                className={itemClassName}
                style={{
                  height: itemHeight,
                  marginBottom: actualIndex < items.length - 1 ? gap : 0,
                }}
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-4">
          {loadingIndicator || (
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Virtualized Grid Component
// ============================================================================

export interface VirtualizedGridProps<T> {
  items: T[];
  itemWidth: number;
  itemHeight: number;
  containerHeight: number;
  columns?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string | number;
  overscan?: number;
  className?: string;
  itemClassName?: string;
  gap?: number;
  onEndReached?: () => void;
  endReachedThreshold?: number;
  loading?: boolean;
  emptyMessage?: string;
}

export function VirtualizedGrid<T>({
  items,
  itemWidth,
  itemHeight,
  containerHeight,
  columns: fixedColumns,
  renderItem,
  keyExtractor,
  overscan = 2,
  className,
  itemClassName,
  gap = 8,
  onEndReached,
  endReachedThreshold = 0.8,
  loading = false,
  emptyMessage = 'Nu există elemente',
}: VirtualizedGridProps<T>) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = React.useState(0);
  const [containerWidth, setContainerWidth] = React.useState(0);
  const endReachedCalled = React.useRef(false);

  const columns = fixedColumns || Math.floor((containerWidth + gap) / (itemWidth + gap)) || 1;
  const rows = Math.ceil(items.length / columns);
  const totalHeight = rows * (itemHeight + gap) - gap;

  const startRow = Math.max(0, Math.floor(scrollTop / (itemHeight + gap)) - overscan);
  const endRow = Math.min(
    rows - 1,
    Math.ceil((scrollTop + containerHeight) / (itemHeight + gap)) + overscan
  );

  const startIndex = startRow * columns;
  const endIndex = Math.min(items.length - 1, (endRow + 1) * columns - 1);
  const visibleItems = items.slice(startIndex, endIndex + 1);

  const handleScroll = React.useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      setScrollTop(scrollTop);

      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
      if (
        scrollPercentage >= endReachedThreshold &&
        onEndReached &&
        !endReachedCalled.current &&
        !loading
      ) {
        endReachedCalled.current = true;
        onEndReached();
      } else if (scrollPercentage < endReachedThreshold) {
        endReachedCalled.current = false;
      }
    },
    [endReachedThreshold, onEndReached, loading]
  );

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  if (items.length === 0 && !loading) {
    return (
      <div
        className={cn(
          'flex items-center justify-center text-muted-foreground',
          className
        )}
        style={{ height: containerHeight }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn('overflow-auto relative', className)}
      style={{ height: containerHeight }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: startRow * (itemHeight + gap),
            left: 0,
            right: 0,
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, ${itemWidth}px)`,
            gap,
            justifyContent: 'center',
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = startIndex + index;
            return (
              <div
                key={keyExtractor(item, actualIndex)}
                className={itemClassName}
                style={{ height: itemHeight, width: itemWidth }}
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Infinite Scroll Wrapper
// ============================================================================

export interface InfiniteScrollProps {
  children: React.ReactNode;
  hasMore: boolean;
  loadMore: () => void;
  loading?: boolean;
  threshold?: number;
  loadingIndicator?: React.ReactNode;
  endMessage?: React.ReactNode;
  className?: string;
}

export function InfiniteScroll({
  children,
  hasMore,
  loadMore,
  loading = false,
  threshold = 200,
  loadingIndicator,
  endMessage,
  className,
}: InfiniteScrollProps) {
  const loadMoreRef = React.useRef<HTMLDivElement>(null);
  const loadingRef = React.useRef(false);

  React.useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingRef.current) {
          loadingRef.current = true;
          loadMore();
          setTimeout(() => {
            loadingRef.current = false;
          }, 100);
        }
      },
      {
        rootMargin: `${threshold}px`,
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore, threshold]);

  return (
    <div className={className}>
      {children}

      <div ref={loadMoreRef} className="h-1" />

      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center py-4"
        >
          {loadingIndicator || (
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}
        </motion.div>
      )}

      {!hasMore && !loading && endMessage && (
        <div className="text-center py-4 text-muted-foreground">{endMessage}</div>
      )}
    </div>
  );
}

// ============================================================================
// Accounting-Specific: Invoice List
// ============================================================================

interface InvoiceItem {
  id: string;
  number: string;
  client: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  date: string;
  [key: string]: unknown;
}

interface InvoiceVirtualizedListProps {
  invoices: InvoiceItem[];
  onInvoiceClick?: (invoice: InvoiceItem) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  className?: string;
}

const statusColors: Record<InvoiceItem['status'], string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  paid: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

const statusLabels: Record<InvoiceItem['status'], string> = {
  draft: 'Ciornă',
  sent: 'Trimisă',
  paid: 'Plătită',
  overdue: 'Restantă',
};

export function InvoiceVirtualizedList({
  invoices,
  onInvoiceClick,
  onLoadMore,
  hasMore = false,
  loading = false,
  className,
}: InvoiceVirtualizedListProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
    }).format(amount);
  };

  const renderInvoice = (invoice: InvoiceItem) => (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onInvoiceClick?.(invoice)}
      className={cn(
        'flex items-center justify-between p-4 h-full',
        'bg-card border rounded-lg cursor-pointer',
        'hover:shadow-md transition-shadow'
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{invoice.number}</span>
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-xs font-medium',
              statusColors[invoice.status]
            )}
          >
            {statusLabels[invoice.status]}
          </span>
        </div>
        <p className="text-sm text-muted-foreground truncate">{invoice.client}</p>
      </div>
      <div className="text-right ml-4">
        <p className="font-semibold">{formatCurrency(invoice.amount)}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(invoice.date).toLocaleDateString('ro-RO')}
        </p>
      </div>
    </motion.div>
  );

  return (
    <VirtualizedList
      items={invoices}
      itemHeight={80}
      containerHeight={600}
      renderItem={renderInvoice}
      keyExtractor={(item) => item.id}
      gap={8}
      onEndReached={onLoadMore}
      loading={loading}
      emptyMessage="Nu aveți facturi"
      className={className}
    />
  );
}

// ============================================================================
// Accounting-Specific: Transaction List
// ============================================================================

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  [key: string]: unknown;
}

interface TransactionVirtualizedListProps {
  transactions: Transaction[];
  onTransactionClick?: (transaction: Transaction) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  className?: string;
}

export function TransactionVirtualizedList({
  transactions,
  onTransactionClick,
  onLoadMore,
  hasMore = false,
  loading = false,
  className,
}: TransactionVirtualizedListProps) {
  const formatCurrency = (amount: number, type: Transaction['type']) => {
    const formatted = new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
    }).format(Math.abs(amount));
    return type === 'income' ? `+${formatted}` : `-${formatted}`;
  };

  const renderTransaction = (transaction: Transaction) => (
    <motion.div
      whileHover={{ backgroundColor: 'var(--accent)' }}
      onClick={() => onTransactionClick?.(transaction)}
      className={cn(
        'flex items-center justify-between p-3 h-full',
        'border-b cursor-pointer'
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center',
            transaction.type === 'income'
              ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
              : 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
          )}
        >
          {transaction.type === 'income' ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
            </svg>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-medium truncate">{transaction.description}</p>
          <p className="text-xs text-muted-foreground">{transaction.category}</p>
        </div>
      </div>
      <div className="text-right ml-4">
        <p
          className={cn(
            'font-semibold',
            transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
          )}
        >
          {formatCurrency(transaction.amount, transaction.type)}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(transaction.date).toLocaleDateString('ro-RO')}
        </p>
      </div>
    </motion.div>
  );

  return (
    <VirtualizedList
      items={transactions}
      itemHeight={72}
      containerHeight={500}
      renderItem={renderTransaction}
      keyExtractor={(item) => item.id}
      onEndReached={onLoadMore}
      loading={loading}
      emptyMessage="Nu există tranzacții"
      className={className}
    />
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  type VirtualizedListState,
  type InvoiceItem,
  type InvoiceVirtualizedListProps,
  type Transaction,
  type TransactionVirtualizedListProps,
};
