'use client';

import { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal } from 'lucide-react';

// Basic Pagination
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  showFirstLast?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'rounded' | 'simple';
  className?: string;
}

const sizeStyles = {
  sm: 'h-8 min-w-[2rem] text-sm',
  md: 'h-10 min-w-[2.5rem] text-sm',
  lg: 'h-12 min-w-[3rem] text-base',
};

function generatePageNumbers(
  currentPage: number,
  totalPages: number,
  siblingCount: number
): (number | 'ellipsis')[] {
  const totalNumbers = siblingCount * 2 + 3;
  const totalBlocks = totalNumbers + 2;

  if (totalPages <= totalBlocks) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const showLeftEllipsis = leftSiblingIndex > 2;
  const showRightEllipsis = rightSiblingIndex < totalPages - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftItemCount = 3 + 2 * siblingCount;
    const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
    return [...leftRange, 'ellipsis', totalPages];
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const rightItemCount = 3 + 2 * siblingCount;
    const rightRange = Array.from(
      { length: rightItemCount },
      (_, i) => totalPages - rightItemCount + i + 1
    );
    return [1, 'ellipsis', ...rightRange];
  }

  const middleRange = Array.from(
    { length: rightSiblingIndex - leftSiblingIndex + 1 },
    (_, i) => leftSiblingIndex + i
  );
  return [1, 'ellipsis', ...middleRange, 'ellipsis', totalPages];
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  showFirstLast = true,
  size = 'md',
  variant = 'default',
  className = '',
}: PaginationProps) {
  const pages = generatePageNumbers(currentPage, totalPages, siblingCount);
  const sizes = sizeStyles[size];

  const buttonStyles = {
    default: 'rounded-lg',
    rounded: 'rounded-full',
    simple: 'rounded-md',
  };

  const baseButton = `
    inline-flex items-center justify-center font-medium transition-all
    ${sizes}
    ${buttonStyles[variant]}
  `;

  const activeButton = 'bg-primary text-white';
  const inactiveButton = 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700';
  const disabledButton = 'opacity-50 cursor-not-allowed';

  return (
    <nav className={`flex items-center gap-1 ${className}`}>
      {showFirstLast && (
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className={`${baseButton} ${inactiveButton} ${currentPage === 1 ? disabledButton : ''}`}
          aria-label="Prima pagină"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
      )}

      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`${baseButton} ${inactiveButton} ${currentPage === 1 ? disabledButton : ''}`}
        aria-label="Pagina anterioară"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {pages.map((page, index) =>
        page === 'ellipsis' ? (
          <span key={`ellipsis-${index}`} className={`${baseButton} text-gray-400`}>
            <MoreHorizontal className="w-4 h-4" />
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`${baseButton} ${page === currentPage ? activeButton : inactiveButton}`}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`${baseButton} ${inactiveButton} ${currentPage === totalPages ? disabledButton : ''}`}
        aria-label="Pagina următoare"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {showFirstLast && (
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={`${baseButton} ${inactiveButton} ${currentPage === totalPages ? disabledButton : ''}`}
          aria-label="Ultima pagină"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      )}
    </nav>
  );
}

// Simple Pagination (prev/next only)
interface SimplePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showPageInfo?: boolean;
  className?: string;
}

export function SimplePagination({
  currentPage,
  totalPages,
  onPageChange,
  showPageInfo = true,
  className = '',
}: SimplePaginationProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-4 h-4" />
        Anterior
      </button>

      {showPageInfo && (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Pagina {currentPage} din {totalPages}
        </span>
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Următor
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// Table Pagination (with items per page selector)
interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  itemsPerPageOptions?: number[];
  className?: string;
}

export function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 25, 50, 100],
  className = '',
}: TablePaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-4">
        {onItemsPerPageChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Afișează</span>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="h-9 px-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              {itemsPerPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-500 dark:text-gray-400">pe pagină</span>
          </div>
        )}

        <span className="text-sm text-gray-500 dark:text-gray-400">
          {startItem}-{endItem} din {totalItems} rezultate
        </span>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        size="sm"
        showFirstLast={false}
      />
    </div>
  );
}

// Compact Pagination (mobile-friendly)
interface CompactPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function CompactPagination({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
}: CompactPaginationProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>

      <div className="flex items-center gap-1">
        <input
          type="number"
          value={currentPage}
          onChange={(e) => {
            const page = parseInt(e.target.value, 10);
            if (page >= 1 && page <= totalPages) {
              onPageChange(page);
            }
          }}
          min={1}
          max={totalPages}
          className="w-12 h-10 text-center text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
        <span className="text-sm text-gray-500 dark:text-gray-400">/ {totalPages}</span>
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>
    </div>
  );
}

// Load More Button
interface LoadMoreButtonProps {
  onClick: () => void;
  loading?: boolean;
  hasMore?: boolean;
  loadedCount?: number;
  totalCount?: number;
  className?: string;
}

export function LoadMoreButton({
  onClick,
  loading = false,
  hasMore = true,
  loadedCount,
  totalCount,
  className = '',
}: LoadMoreButtonProps) {
  if (!hasMore) {
    return (
      <p className={`text-center text-sm text-gray-500 dark:text-gray-400 ${className}`}>
        Ai ajuns la sfârșitul listei
      </p>
    );
  }

  return (
    <div className={`text-center ${className}`}>
      {loadedCount !== undefined && totalCount !== undefined && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Afișate {loadedCount} din {totalCount}
        </p>
      )}
      <button
        onClick={onClick}
        disabled={loading}
        className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 disabled:opacity-50 transition-colors"
      >
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Se încarcă...
          </>
        ) : (
          'Încarcă mai multe'
        )}
      </button>
    </div>
  );
}

// Infinite Scroll Trigger (renders a sentinel element)
interface InfiniteScrollTriggerProps {
  onTrigger: () => void;
  loading?: boolean;
  hasMore?: boolean;
  threshold?: number;
  className?: string;
}

export function InfiniteScrollTrigger({
  onTrigger,
  loading = false,
  hasMore = true,
  threshold = 100,
  className = '',
}: InfiniteScrollTriggerProps) {
  if (!hasMore) return null;

  return (
    <div
      className={`flex justify-center py-4 ${className}`}
      ref={(el) => {
        if (!el) return;
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting && !loading && hasMore) {
              onTrigger();
            }
          },
          { rootMargin: `${threshold}px` }
        );
        observer.observe(el);
        return () => observer.disconnect();
      }}
    >
      {loading && (
        <svg className="animate-spin w-6 h-6 text-primary" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
    </div>
  );
}

// Cursor Pagination (for APIs with cursor-based pagination)
interface CursorPaginationProps {
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  loading?: boolean;
  className?: string;
}

export function CursorPagination({
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  loading = false,
  className = '',
}: CursorPaginationProps) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      <button
        onClick={onPrevious}
        disabled={!hasPrevious || loading}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-4 h-4" />
        Anterior
      </button>

      <button
        onClick={onNext}
        disabled={!hasNext || loading}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Următor
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
