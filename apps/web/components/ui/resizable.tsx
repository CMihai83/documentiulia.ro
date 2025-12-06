'use client';

import React, { useState, useRef, useCallback, useEffect, createContext, useContext } from 'react';
import { motion } from 'framer-motion';
import { GripVertical, GripHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

type Direction = 'horizontal' | 'vertical';

interface PanelSize {
  min?: number;
  max?: number;
  default?: number;
}

// ============================================================================
// Resizable Context
// ============================================================================

interface ResizableContextValue {
  direction: Direction;
  sizes: number[];
  setSizes: (sizes: number[]) => void;
  onResize?: (sizes: number[]) => void;
}

const ResizableContext = createContext<ResizableContextValue | null>(null);

function useResizable() {
  const context = useContext(ResizableContext);
  if (!context) {
    throw new Error('Resizable components must be used within a ResizablePanelGroup');
  }
  return context;
}

// ============================================================================
// Resizable Panel Group
// ============================================================================

interface ResizablePanelGroupProps {
  children: React.ReactNode;
  direction?: Direction;
  className?: string;
  onResize?: (sizes: number[]) => void;
  autoSaveId?: string;
}

export function ResizablePanelGroup({
  children,
  direction = 'horizontal',
  className,
  onResize,
  autoSaveId,
}: ResizablePanelGroupProps) {
  const childArray = React.Children.toArray(children);
  const panelCount = childArray.filter(child =>
    React.isValidElement(child) && (child.type as React.FC).displayName === 'ResizablePanel'
  ).length;

  const getInitialSizes = (): number[] => {
    if (autoSaveId && typeof window !== 'undefined') {
      const saved = localStorage.getItem(`resizable-${autoSaveId}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Invalid saved data
        }
      }
    }
    return Array(panelCount).fill(100 / panelCount);
  };

  const [sizes, setSizesState] = useState<number[]>(getInitialSizes);

  const setSizes = useCallback((newSizes: number[]) => {
    setSizesState(newSizes);
    onResize?.(newSizes);
    if (autoSaveId && typeof window !== 'undefined') {
      localStorage.setItem(`resizable-${autoSaveId}`, JSON.stringify(newSizes));
    }
  }, [autoSaveId, onResize]);

  return (
    <ResizableContext.Provider value={{ direction, sizes, setSizes, onResize }}>
      <div
        className={cn(
          'flex h-full w-full',
          direction === 'horizontal' ? 'flex-row' : 'flex-col',
          className
        )}
      >
        {children}
      </div>
    </ResizableContext.Provider>
  );
}

// ============================================================================
// Resizable Panel
// ============================================================================

interface ResizablePanelProps {
  children: React.ReactNode;
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  className?: string;
  collapsible?: boolean;
  collapsedSize?: number;
  onCollapse?: () => void;
  onExpand?: () => void;
}

export function ResizablePanel({
  children,
  defaultSize,
  minSize = 10,
  maxSize = 90,
  className,
  collapsible = false,
  collapsedSize = 0,
  onCollapse,
  onExpand,
}: ResizablePanelProps) {
  const { direction, sizes } = useResizable();
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelIndex, setPanelIndex] = useState(-1);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (panelRef.current) {
      const parent = panelRef.current.parentElement;
      if (parent) {
        const panels = Array.from(parent.children).filter(
          child => child.getAttribute('data-panel') === 'true'
        );
        const index = panels.indexOf(panelRef.current);
        setPanelIndex(index);
      }
    }
  }, []);

  const size = panelIndex >= 0 && sizes[panelIndex] !== undefined
    ? sizes[panelIndex]
    : defaultSize || 100 / sizes.length;

  const actualSize = isCollapsed ? collapsedSize : size;

  const style = direction === 'horizontal'
    ? { width: `${actualSize}%`, minWidth: isCollapsed ? `${collapsedSize}%` : `${minSize}%`, maxWidth: `${maxSize}%` }
    : { height: `${actualSize}%`, minHeight: isCollapsed ? `${collapsedSize}%` : `${minSize}%`, maxHeight: `${maxSize}%` };

  const toggleCollapse = () => {
    if (!collapsible) return;
    if (isCollapsed) {
      setIsCollapsed(false);
      onExpand?.();
    } else {
      setIsCollapsed(true);
      onCollapse?.();
    }
  };

  return (
    <div
      ref={panelRef}
      data-panel="true"
      data-collapsed={isCollapsed}
      style={style}
      className={cn(
        'relative overflow-hidden transition-all duration-200',
        className
      )}
    >
      {collapsible && isCollapsed ? (
        <button
          type="button"
          onClick={toggleCollapse}
          className={cn(
            'absolute inset-0 flex items-center justify-center',
            'bg-gray-100 dark:bg-gray-800',
            'hover:bg-gray-200 dark:hover:bg-gray-700',
            'transition-colors duration-200'
          )}
          aria-label="Extinde panoul"
        >
          {direction === 'horizontal' ? (
            <GripVertical className="h-5 w-5 text-gray-400" />
          ) : (
            <GripHorizontal className="h-5 w-5 text-gray-400" />
          )}
        </button>
      ) : (
        children
      )}
    </div>
  );
}

ResizablePanel.displayName = 'ResizablePanel';

// ============================================================================
// Resizable Handle
// ============================================================================

interface ResizableHandleProps {
  className?: string;
  withHandle?: boolean;
  disabled?: boolean;
  onDoubleClick?: () => void;
}

export function ResizableHandle({
  className,
  withHandle = true,
  disabled = false,
  onDoubleClick,
}: ResizableHandleProps) {
  const { direction, sizes, setSizes } = useResizable();
  const handleRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [handleIndex, setHandleIndex] = useState(-1);

  useEffect(() => {
    if (handleRef.current) {
      const parent = handleRef.current.parentElement;
      if (parent) {
        const handles = Array.from(parent.children).filter(
          child => child.getAttribute('data-handle') === 'true'
        );
        const index = handles.indexOf(handleRef.current);
        setHandleIndex(index);
      }
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);

    const startPos = direction === 'horizontal' ? e.clientX : e.clientY;
    const parent = handleRef.current?.parentElement;
    if (!parent) return;

    const parentSize = direction === 'horizontal' ? parent.offsetWidth : parent.offsetHeight;
    const startSizes = [...sizes];

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentPos = direction === 'horizontal' ? moveEvent.clientX : moveEvent.clientY;
      const delta = ((currentPos - startPos) / parentSize) * 100;

      const newSizes = [...startSizes];
      const leftIndex = handleIndex;
      const rightIndex = handleIndex + 1;

      if (leftIndex >= 0 && rightIndex < newSizes.length) {
        const newLeftSize = Math.max(10, Math.min(90, startSizes[leftIndex] + delta));
        const newRightSize = Math.max(10, Math.min(90, startSizes[rightIndex] - delta));

        if (newLeftSize >= 10 && newRightSize >= 10) {
          newSizes[leftIndex] = newLeftSize;
          newSizes[rightIndex] = newRightSize;
          setSizes(newSizes);
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [direction, disabled, handleIndex, setSizes, sizes]);

  return (
    <div
      ref={handleRef}
      data-handle="true"
      onMouseDown={handleMouseDown}
      onDoubleClick={onDoubleClick}
      className={cn(
        'relative flex items-center justify-center',
        'bg-gray-200 dark:bg-gray-700',
        'hover:bg-gray-300 dark:hover:bg-gray-600',
        'transition-colors duration-150',
        direction === 'horizontal'
          ? 'w-1 cursor-col-resize'
          : 'h-1 cursor-row-resize',
        isDragging && 'bg-blue-500 dark:bg-blue-500',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      {withHandle && (
        <div className={cn(
          'absolute rounded-md bg-gray-400 dark:bg-gray-500',
          'transition-colors duration-150',
          isDragging && 'bg-blue-600 dark:bg-blue-400',
          direction === 'horizontal'
            ? 'w-1 h-8'
            : 'h-1 w-8'
        )}>
          {direction === 'horizontal' ? (
            <GripVertical className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
          ) : (
            <GripHorizontal className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Simple Resizable (Two panels)
// ============================================================================

interface SimpleResizableProps {
  left: React.ReactNode;
  right: React.ReactNode;
  direction?: Direction;
  defaultLeftSize?: number;
  minLeftSize?: number;
  maxLeftSize?: number;
  className?: string;
  leftClassName?: string;
  rightClassName?: string;
}

export function SimpleResizable({
  left,
  right,
  direction = 'horizontal',
  defaultLeftSize = 50,
  minLeftSize = 20,
  maxLeftSize = 80,
  className,
  leftClassName,
  rightClassName,
}: SimpleResizableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftSize, setLeftSize] = useState(defaultLeftSize);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const startPos = direction === 'horizontal' ? e.clientX : e.clientY;
    const startSize = leftSize;
    const container = containerRef.current;
    if (!container) return;

    const containerSize = direction === 'horizontal' ? container.offsetWidth : container.offsetHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentPos = direction === 'horizontal' ? moveEvent.clientX : moveEvent.clientY;
      const delta = ((currentPos - startPos) / containerSize) * 100;
      const newSize = Math.max(minLeftSize, Math.min(maxLeftSize, startSize + delta));
      setLeftSize(newSize);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const isHorizontal = direction === 'horizontal';

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex h-full w-full',
        isHorizontal ? 'flex-row' : 'flex-col',
        className
      )}
    >
      <div
        style={isHorizontal ? { width: `${leftSize}%` } : { height: `${leftSize}%` }}
        className={cn('overflow-hidden', leftClassName)}
      >
        {left}
      </div>
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          'flex items-center justify-center',
          'bg-gray-200 dark:bg-gray-700',
          'hover:bg-gray-300 dark:hover:bg-gray-600',
          'transition-colors duration-150',
          isHorizontal ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize',
          isDragging && 'bg-blue-500'
        )}
      >
        <div className={cn(
          'rounded bg-gray-400 dark:bg-gray-500',
          isHorizontal ? 'w-1 h-8' : 'h-1 w-8'
        )} />
      </div>
      <div
        style={isHorizontal ? { width: `${100 - leftSize}%` } : { height: `${100 - leftSize}%` }}
        className={cn('overflow-hidden', rightClassName)}
      >
        {right}
      </div>
    </div>
  );
}

// ============================================================================
// Resizable Box
// ============================================================================

interface ResizableBoxProps {
  children: React.ReactNode;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  handles?: Array<'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'>;
  className?: string;
  onResize?: (width: number, height: number) => void;
}

export function ResizableBox({
  children,
  defaultWidth = 200,
  defaultHeight = 200,
  minWidth = 100,
  minHeight = 100,
  maxWidth = 800,
  maxHeight = 600,
  handles = ['se'],
  className,
  onResize,
}: ResizableBoxProps) {
  const [size, setSize] = useState({ width: defaultWidth, height: defaultHeight });
  const boxRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (handle: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = size.width;
    const startHeight = size.height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      let newWidth = startWidth;
      let newHeight = startHeight;

      if (handle.includes('e')) {
        newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + moveEvent.clientX - startX));
      }
      if (handle.includes('w')) {
        newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth - moveEvent.clientX + startX));
      }
      if (handle.includes('s')) {
        newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight + moveEvent.clientY - startY));
      }
      if (handle.includes('n')) {
        newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight - moveEvent.clientY + startY));
      }

      setSize({ width: newWidth, height: newHeight });
      onResize?.(newWidth, newHeight);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handlePositions: Record<string, string> = {
    n: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-n-resize',
    s: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-s-resize',
    e: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-e-resize',
    w: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-w-resize',
    ne: 'top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-ne-resize',
    nw: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nw-resize',
    se: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-se-resize',
    sw: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-sw-resize',
  };

  return (
    <motion.div
      ref={boxRef}
      style={{ width: size.width, height: size.height }}
      className={cn(
        'relative border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden',
        className
      )}
    >
      {children}
      {handles.map(handle => (
        <div
          key={handle}
          onMouseDown={handleMouseDown(handle)}
          className={cn(
            'absolute w-3 h-3 bg-blue-500 rounded-full z-10',
            'hover:bg-blue-600 transition-colors',
            handlePositions[handle]
          )}
        />
      ))}
    </motion.div>
  );
}

export default ResizablePanelGroup;
