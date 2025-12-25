'use client';

import { memo } from 'react';
import { FixedSizeList as List } from 'react-window';
import type { ListChildComponentProps } from 'react-window';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  width?: number | string;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscanCount?: number;
}

interface RowData<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
}

function Row<T>({ index, style, data }: ListChildComponentProps<RowData<T>>) {
  const { items, renderItem } = data;
  const item = items[index];

  return (
    <div style={style} role="listitem">
      {renderItem(item, index)}
    </div>
  );
}

const MemoizedRow = memo(Row);

export function VirtualizedList<T>({
  items,
  itemHeight,
  height,
  width = '100%',
  renderItem,
  className = '',
  overscanCount = 5,
}: VirtualizedListProps<T>) {
  const itemData: RowData<T> = {
    items,
    renderItem,
  };

  return (
    <List
      height={height}
      width={typeof width === 'number' ? width : 300}
      itemCount={items.length}
      itemSize={itemHeight}
      itemData={itemData}
      overscanCount={overscanCount}
      className={className}
    >
      {MemoizedRow as React.ComponentType<ListChildComponentProps<RowData<T>>>}
    </List>
  );
}

// Memoized version for better performance
export const MemoizedVirtualizedList = memo(VirtualizedList) as typeof VirtualizedList;

export default VirtualizedList;
