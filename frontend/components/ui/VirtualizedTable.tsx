'use client';

import { memo, useCallback, useRef, useEffect, useState } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

// Column definition for the virtualized table
export interface VirtualizedColumn<T> {
  key: string;
  header: string;
  width: number | string; // number for fixed px, string for percentage
  render: (item: T, index: number) => React.ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

interface VirtualizedTableProps<T> {
  data: T[];
  columns: VirtualizedColumn<T>[];
  rowHeight?: number;
  headerHeight?: number;
  onRowClick?: (item: T, index: number) => void;
  selectedIds?: Set<string>;
  getItemId?: (item: T) => string;
  emptyMessage?: string;
  className?: string;
}

/**
 * VirtualizedTable - High-performance table for large datasets
 * Uses react-window for efficient rendering of 1000+ rows at 60fps
 */
function VirtualizedTableInner<T>({
  data,
  columns,
  rowHeight = 56,
  headerHeight = 48,
  onRowClick,
  selectedIds,
  getItemId,
  emptyMessage = 'Nu există date',
  className = '',
}: VirtualizedTableProps<T>) {
  const listRef = useRef<List>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Calculate column widths
  const getColumnWidth = useCallback((width: number | string): number => {
    if (typeof width === 'number') {
      return width;
    }
    // Percentage-based width
    const percentage = parseFloat(width) / 100;
    return Math.floor(containerWidth * percentage);
  }, [containerWidth]);

  // Row renderer
  const Row = useCallback(
    ({ index, style }: ListChildComponentProps) => {
      const item = data[index];
      const itemId = getItemId?.(item);
      const isSelected = itemId && selectedIds?.has(itemId);

      return (
        <div
          style={style}
          className={`flex items-center border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
            isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
          } ${onRowClick ? 'cursor-pointer' : ''}`}
          onClick={() => onRowClick?.(item, index)}
        >
          {columns.map((column) => (
            <div
              key={column.key}
              className={`px-4 py-2 truncate ${column.cellClassName || ''}`}
              style={{ width: getColumnWidth(column.width), minWidth: getColumnWidth(column.width) }}
            >
              {column.render(item, index)}
            </div>
          ))}
        </div>
      );
    },
    [data, columns, getColumnWidth, onRowClick, selectedIds, getItemId]
  );

  if (data.length === 0) {
    return (
      <div className={`flex flex-col ${className}`}>
        {/* Header */}
        <div
          className="flex items-center bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
          style={{ height: headerHeight }}
        >
          {columns.map((column) => (
            <div
              key={column.key}
              className={`px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                column.headerClassName || ''
              }`}
              style={{ width: column.width, minWidth: column.width }}
            >
              {column.header}
            </div>
          ))}
        </div>
        {/* Empty state */}
        <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Header */}
      <div
        className="flex items-center bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
        style={{ height: headerHeight }}
      >
        {columns.map((column) => (
          <div
            key={column.key}
            className={`px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
              column.headerClassName || ''
            }`}
            style={{ width: column.width, minWidth: column.width }}
          >
            {column.header}
          </div>
        ))}
      </div>

      {/* Virtualized rows */}
      <div className="flex-1" style={{ minHeight: Math.min(data.length * rowHeight, 500) }}>
        <AutoSizer>
          {({ height, width }) => {
            // Update container width for percentage-based columns
            if (width !== containerWidth) {
              setContainerWidth(width);
            }
            return (
              <List
                ref={listRef}
                height={height}
                width={width}
                itemCount={data.length}
                itemSize={rowHeight}
                overscanCount={5}
              >
                {Row}
              </List>
            );
          }}
        </AutoSizer>
      </div>
    </div>
  );
}

export const VirtualizedTable = memo(VirtualizedTableInner) as typeof VirtualizedTableInner;

/**
 * Simple virtualized list for non-tabular data
 */
interface VirtualizedListProps<T> {
  data: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  emptyMessage?: string;
}

function VirtualizedListInner<T>({
  data,
  itemHeight,
  renderItem,
  className = '',
  emptyMessage = 'Nu există date',
}: VirtualizedListProps<T>) {
  const Row = useCallback(
    ({ index, style }: ListChildComponentProps) => (
      <div style={style}>{renderItem(data[index], index)}</div>
    ),
    [data, renderItem]
  );

  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center py-12 text-gray-500 dark:text-gray-400 ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={className} style={{ height: Math.min(data.length * itemHeight, 500) }}>
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            width={width}
            itemCount={data.length}
            itemSize={itemHeight}
            overscanCount={5}
          >
            {Row}
          </List>
        )}
      </AutoSizer>
    </div>
  );
}

export const VirtualizedList = memo(VirtualizedListInner) as typeof VirtualizedListInner;

export default VirtualizedTable;
