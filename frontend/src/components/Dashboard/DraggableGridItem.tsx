import React, { useState, useRef, useCallback, useEffect } from 'react';

export interface GridPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface DraggableGridItemProps {
  id: string;
  position: GridPosition;
  isEditMode: boolean;
  isResizable?: boolean;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  gridCols?: number;
  cellHeight?: number;
  onPositionChange?: (id: string, newPosition: GridPosition) => void;
  onDragStart?: (id: string) => void;
  onDragEnd?: (id: string) => void;
  children: React.ReactNode;
}

/**
 * Draggable and resizable grid item component
 * Implements drag-and-drop and resize functionality for dashboard widgets
 */
const DraggableGridItem: React.FC<DraggableGridItemProps> = ({
  id,
  position,
  isEditMode,
  isResizable = true,
  minW = 3,
  minH = 2,
  maxW = 12,
  maxH = 8,
  gridCols = 12,
  cellHeight = 80,
  onPositionChange,
  onDragStart,
  onDragEnd,
  children
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const itemRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Get container width for calculations
  const getContainerWidth = useCallback(() => {
    if (!containerRef.current) {
      containerRef.current = itemRef.current?.parentElement?.parentElement as HTMLDivElement;
    }
    return containerRef.current?.clientWidth || 0;
  }, []);

  // Calculate cell width
  const getCellWidth = useCallback(() => {
    const containerWidth = getContainerWidth();
    const gap = 16; // gap-4
    return (containerWidth - (gridCols - 1) * gap) / gridCols;
  }, [getContainerWidth, gridCols]);

  // Handle drag start
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (!isEditMode) return;

    e.preventDefault();
    setIsDragging(true);

    const rect = itemRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }

    onDragStart?.(id);
  }, [isEditMode, id, onDragStart]);

  // Handle drag move
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !itemRef.current) return;

    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const cellWidth = getCellWidth();
    const gap = 16;

    // Calculate new grid position
    const relativeX = e.clientX - containerRect.left - dragOffset.x;
    const relativeY = e.clientY - containerRect.top - dragOffset.y;

    const newX = Math.max(0, Math.min(gridCols - position.w, Math.round(relativeX / (cellWidth + gap))));
    const newY = Math.max(0, Math.round(relativeY / (cellHeight + gap)));

    if (newX !== position.x || newY !== position.y) {
      onPositionChange?.(id, { ...position, x: newX, y: newY });
    }
  }, [isDragging, dragOffset, position, gridCols, cellHeight, getCellWidth, id, onPositionChange]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    onDragEnd?.(id);
  }, [id, onDragEnd]);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent, direction: string) => {
    if (!isEditMode || !isResizable) return;

    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startW = position.w;
    const startH = position.h;

    const handleResizeMove = (e: MouseEvent) => {
      const cellWidth = getCellWidth();
      const gap = 16;

      let newW = startW;
      let newH = startH;

      if (direction.includes('e')) {
        const deltaX = e.clientX - startX;
        newW = Math.max(minW, Math.min(maxW, Math.round(startW + deltaX / (cellWidth + gap))));
      }

      if (direction.includes('s')) {
        const deltaY = e.clientY - startY;
        newH = Math.max(minH, Math.min(maxH, Math.round(startH + deltaY / (cellHeight + gap))));
      }

      // Ensure widget doesn't exceed grid bounds
      if (position.x + newW > gridCols) {
        newW = gridCols - position.x;
      }

      if (newW !== position.w || newH !== position.h) {
        onPositionChange?.(id, { ...position, w: newW, h: newH });
      }
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  }, [isEditMode, isResizable, position, minW, minH, maxW, maxH, gridCols, cellHeight, getCellWidth, id, onPositionChange]);

  // Add/remove document listeners for drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);

      return () => {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  return (
    <div
      ref={itemRef}
      className={`relative ${isDragging ? 'z-50 opacity-90' : ''} ${isResizing ? 'z-40' : ''}`}
      style={{
        gridColumn: `span ${position.w}`,
        gridRow: `span ${position.h}`,
        transition: isDragging || isResizing ? 'none' : 'all 0.2s ease'
      }}
    >
      {/* Drag handle overlay */}
      {isEditMode && (
        <div
          className="absolute top-0 left-0 right-0 h-10 cursor-move z-10"
          onMouseDown={handleDragStart}
        />
      )}

      {/* Content */}
      <div className="h-full">
        {children}
      </div>

      {/* Resize handles */}
      {isEditMode && isResizable && (
        <>
          {/* Right edge */}
          <div
            className="absolute top-2 right-0 bottom-2 w-2 cursor-ew-resize hover:bg-blue-400/30 rounded"
            onMouseDown={(e) => handleResizeStart(e, 'e')}
          />

          {/* Bottom edge */}
          <div
            className="absolute left-2 right-2 bottom-0 h-2 cursor-ns-resize hover:bg-blue-400/30 rounded"
            onMouseDown={(e) => handleResizeStart(e, 's')}
          />

          {/* Bottom-right corner */}
          <div
            className="absolute right-0 bottom-0 w-4 h-4 cursor-nwse-resize"
            onMouseDown={(e) => handleResizeStart(e, 'se')}
          >
            <svg
              className="w-4 h-4 text-gray-400 hover:text-blue-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z" />
            </svg>
          </div>
        </>
      )}

      {/* Drop placeholder highlight */}
      {isDragging && (
        <div className="absolute inset-0 border-2 border-dashed border-blue-400 bg-blue-50/50 rounded-xl pointer-events-none" />
      )}
    </div>
  );
};

export default DraggableGridItem;
