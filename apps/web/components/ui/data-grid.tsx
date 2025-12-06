'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface DataGridColumn<T> {
  id: string;
  header: string | React.ReactNode;
  accessor: keyof T | ((row: T) => React.ReactNode);
  width?: number | string;
  minWidth?: number;
  maxWidth?: number;
  sortable?: boolean;
  filterable?: boolean;
  align?: 'left' | 'center' | 'right';
  sticky?: 'left' | 'right';
  hidden?: boolean;
  cellClassName?: string | ((row: T) => string);
  headerClassName?: string;
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
}

export type SortDirection = 'asc' | 'desc' | null;

export interface SortState {
  column: string | null;
  direction: SortDirection;
}

export interface DataGridProps<T> {
  data: T[];
  columns: DataGridColumn<T>[];
  keyField: keyof T;
  loading?: boolean;
  error?: string;
  emptyMessage?: string;
  selectable?: boolean;
  selectedRows?: Set<string | number>;
  onSelectionChange?: (selectedRows: Set<string | number>) => void;
  sortable?: boolean;
  sortState?: SortState;
  onSort?: (column: string, direction: SortDirection) => void;
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  stickyHeader?: boolean;
  maxHeight?: string | number;
  onRowClick?: (row: T, index: number) => void;
  rowClassName?: string | ((row: T, index: number) => string);
  className?: string;
}

// ============================================================================
// Main Data Grid Component
// ============================================================================

export function DataGrid<T extends Record<string, unknown>>({
  data,
  columns,
  keyField,
  loading = false,
  error,
  emptyMessage = 'Nu există date',
  selectable = false,
  selectedRows = new Set(),
  onSelectionChange,
  sortable = false,
  sortState = { column: null, direction: null },
  onSort,
  striped = false,
  hoverable = true,
  compact = false,
  stickyHeader = true,
  maxHeight,
  onRowClick,
  rowClassName,
  className,
}: DataGridProps<T>) {
  const visibleColumns = columns.filter((col) => !col.hidden);

  const allSelected = data.length > 0 && data.every((row) =>
    selectedRows.has(String(row[keyField]))
  );
  const someSelected = data.some((row) =>
    selectedRows.has(String(row[keyField]))
  ) && !allSelected;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange?.(new Set());
    } else {
      const newSelected = new Set(data.map((row) => String(row[keyField])));
      onSelectionChange?.(newSelected);
    }
  };

  const handleSelectRow = (row: T) => {
    const key = String(row[keyField]);
    const newSelected = new Set(selectedRows);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    onSelectionChange?.(newSelected);
  };

  const handleSort = (column: DataGridColumn<T>) => {
    if (!sortable || !column.sortable) return;

    let newDirection: SortDirection = 'asc';
    if (sortState.column === column.id) {
      if (sortState.direction === 'asc') newDirection = 'desc';
      else if (sortState.direction === 'desc') newDirection = null;
    }
    onSort?.(column.id, newDirection);
  };

  const getCellValue = (row: T, column: DataGridColumn<T>): React.ReactNode => {
    const rawValue = typeof column.accessor === 'function'
      ? column.accessor(row)
      : row[column.accessor];

    if (column.render) {
      return column.render(rawValue, row, data.indexOf(row));
    }

    return rawValue as React.ReactNode;
  };

  const getRowClassName = (row: T, index: number): string => {
    if (typeof rowClassName === 'function') {
      return rowClassName(row, index);
    }
    return rowClassName || '';
  };

  const getCellClassName = (row: T, column: DataGridColumn<T>): string => {
    if (typeof column.cellClassName === 'function') {
      return column.cellClassName(row);
    }
    return column.cellClassName || '';
  };

  return (
    <div
      className={cn(
        'relative w-full overflow-auto rounded-lg border',
        className
      )}
      style={{ maxHeight }}
    >
      <table className="w-full border-collapse">
        <thead
          className={cn(
            'bg-muted/50',
            stickyHeader && 'sticky top-0 z-10'
          )}
        >
          <tr>
            {selectable && (
              <th className="w-12 px-3 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={handleSelectAll}
                  className="h-4 w-4 rounded border-gray-300"
                />
              </th>
            )}
            {visibleColumns.map((column) => (
              <th
                key={column.id}
                className={cn(
                  'px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider',
                  compact ? 'py-2' : 'py-3',
                  column.align === 'center' && 'text-center',
                  column.align === 'right' && 'text-right',
                  column.sortable && sortable && 'cursor-pointer select-none hover:bg-muted',
                  column.sticky === 'left' && 'sticky left-0 bg-muted/50',
                  column.sticky === 'right' && 'sticky right-0 bg-muted/50',
                  column.headerClassName
                )}
                style={{
                  width: column.width,
                  minWidth: column.minWidth,
                  maxWidth: column.maxWidth,
                }}
                onClick={() => handleSort(column)}
              >
                <div className="flex items-center gap-2">
                  <span>{column.header}</span>
                  {sortable && column.sortable && (
                    <SortIndicator
                      active={sortState.column === column.id}
                      direction={sortState.column === column.id ? sortState.direction : null}
                    />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y">
          <AnimatePresence>
            {loading ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + (selectable ? 1 : 0)}
                  className="px-4 py-8 text-center"
                >
                  <LoadingRows count={5} columns={visibleColumns.length} />
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + (selectable ? 1 : 0)}
                  className="px-4 py-8 text-center text-destructive"
                >
                  {error}
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + (selectable ? 1 : 0)}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <motion.tr
                  key={String(row[keyField])}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    'transition-colors',
                    striped && index % 2 === 1 && 'bg-muted/30',
                    hoverable && 'hover:bg-muted/50',
                    selectedRows.has(String(row[keyField])) && 'bg-primary/5',
                    onRowClick && 'cursor-pointer',
                    getRowClassName(row, index)
                  )}
                  onClick={() => onRowClick?.(row, index)}
                >
                  {selectable && (
                    <td className="w-12 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(String(row[keyField]))}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectRow(row);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </td>
                  )}
                  {visibleColumns.map((column) => (
                    <td
                      key={column.id}
                      className={cn(
                        'px-4 text-sm',
                        compact ? 'py-2' : 'py-3',
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right',
                        column.sticky === 'left' && 'sticky left-0 bg-background',
                        column.sticky === 'right' && 'sticky right-0 bg-background',
                        getCellClassName(row, column)
                      )}
                      style={{
                        width: column.width,
                        minWidth: column.minWidth,
                        maxWidth: column.maxWidth,
                      }}
                    >
                      {getCellValue(row, column)}
                    </td>
                  ))}
                </motion.tr>
              ))
            )}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Sort Indicator
// ============================================================================

interface SortIndicatorProps {
  active: boolean;
  direction: SortDirection;
}

function SortIndicator({ active, direction }: SortIndicatorProps) {
  return (
    <div className="flex flex-col">
      <svg
        className={cn(
          'w-3 h-3 -mb-1',
          active && direction === 'asc' ? 'text-foreground' : 'text-muted-foreground/40'
        )}
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 8l-6 6h12z" />
      </svg>
      <svg
        className={cn(
          'w-3 h-3',
          active && direction === 'desc' ? 'text-foreground' : 'text-muted-foreground/40'
        )}
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 16l-6-6h12z" />
      </svg>
    </div>
  );
}

// ============================================================================
// Loading Rows
// ============================================================================

interface LoadingRowsProps {
  count: number;
  columns: number;
}

function LoadingRows({ count, columns }: LoadingRowsProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <div
              key={j}
              className="h-4 bg-muted rounded animate-pulse"
              style={{ width: `${Math.random() * 40 + 60}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Data Grid Header
// ============================================================================

interface DataGridHeaderProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function DataGridHeader({
  title,
  description,
  actions,
  className,
}: DataGridHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      <div>
        {title && <h2 className="text-lg font-semibold">{title}</h2>}
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ============================================================================
// Data Grid Footer
// ============================================================================

interface DataGridFooterProps {
  totalRows: number;
  selectedCount?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export function DataGridFooter({
  totalRows,
  selectedCount = 0,
  page = 1,
  pageSize = 10,
  totalPages = 1,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className,
}: DataGridFooterProps) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalRows);

  return (
    <div className={cn('flex items-center justify-between py-4', className)}>
      <div className="text-sm text-muted-foreground">
        {selectedCount > 0 && (
          <span className="mr-4">{selectedCount} selectate</span>
        )}
        <span>
          Afișare {start}-{end} din {totalRows}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Pe pagină:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 px-2 rounded border bg-background text-sm"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )}

        {onPageChange && totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(1)}
              disabled={page === 1}
              className="p-1 rounded hover:bg-muted disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="p-1 rounded hover:bg-muted disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="px-2 text-sm">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="p-1 rounded hover:bg-muted disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={page === totalPages}
              className="p-1 rounded hover:bg-muted disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Accounting-Specific: Invoice Data Grid
// ============================================================================

interface Invoice {
  id: string;
  number: string;
  client: string;
  date: string;
  dueDate: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  [key: string]: unknown;
}

interface InvoiceDataGridProps {
  invoices: Invoice[];
  loading?: boolean;
  selectedRows?: Set<string>;
  onSelectionChange?: (selected: Set<string | number>) => void;
  onRowClick?: (invoice: Invoice) => void;
  className?: string;
}

export function InvoiceDataGrid({
  invoices,
  loading,
  selectedRows,
  onSelectionChange,
  onRowClick,
  className,
}: InvoiceDataGridProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
    }).format(amount);
  };

  const statusColors: Record<Invoice['status'], string> = {
    draft: 'bg-gray-100 text-gray-700',
    sent: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500',
  };

  const statusLabels: Record<Invoice['status'], string> = {
    draft: 'Ciornă',
    sent: 'Trimisă',
    paid: 'Plătită',
    overdue: 'Restantă',
    cancelled: 'Anulată',
  };

  const columns: DataGridColumn<Invoice>[] = [
    {
      id: 'number',
      header: 'Număr',
      accessor: 'number',
      sortable: true,
      width: 120,
    },
    {
      id: 'client',
      header: 'Client',
      accessor: 'client',
      sortable: true,
    },
    {
      id: 'date',
      header: 'Data',
      accessor: 'date',
      sortable: true,
      width: 100,
      render: (value) => new Date(value as string).toLocaleDateString('ro-RO'),
    },
    {
      id: 'dueDate',
      header: 'Scadență',
      accessor: 'dueDate',
      sortable: true,
      width: 100,
      render: (value) => new Date(value as string).toLocaleDateString('ro-RO'),
    },
    {
      id: 'amount',
      header: 'Sumă',
      accessor: 'amount',
      sortable: true,
      align: 'right',
      width: 120,
      render: (value) => formatCurrency(value as number),
    },
    {
      id: 'status',
      header: 'Status',
      accessor: 'status',
      sortable: true,
      width: 100,
      render: (value) => (
        <span
          className={cn(
            'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
            statusColors[value as Invoice['status']]
          )}
        >
          {statusLabels[value as Invoice['status']]}
        </span>
      ),
    },
  ];

  return (
    <DataGrid
      data={invoices}
      columns={columns}
      keyField="id"
      loading={loading}
      selectable
      selectedRows={selectedRows}
      onSelectionChange={onSelectionChange}
      sortable
      hoverable
      onRowClick={onRowClick}
      emptyMessage="Nu aveți facturi"
      className={className}
    />
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  type Invoice,
  type InvoiceDataGridProps,
};
