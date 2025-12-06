'use client';

import { ReactNode, useState, useRef, DragEvent } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { GripVertical, Upload, X, File, Image, FileText, Film, Music } from 'lucide-react';

// Drag Handle
interface DragHandleProps {
  className?: string;
}

export function DragHandle({ className = '' }: DragHandleProps) {
  return (
    <div
      className={`
        cursor-grab active:cursor-grabbing p-1 rounded
        text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
        hover:bg-gray-100 dark:hover:bg-gray-700
        ${className}
      `}
    >
      <GripVertical className="w-5 h-5" />
    </div>
  );
}

// Sortable List
interface SortableItem {
  id: string;
  [key: string]: unknown;
}

interface SortableListProps<T extends SortableItem> {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor?: (item: T) => string;
  className?: string;
  itemClassName?: string;
}

export function SortableList<T extends SortableItem>({
  items,
  onReorder,
  renderItem,
  keyExtractor = (item) => item.id,
  className = '',
  itemClassName = '',
}: SortableListProps<T>) {
  return (
    <Reorder.Group
      axis="y"
      values={items}
      onReorder={onReorder}
      className={`space-y-2 ${className}`}
    >
      {items.map((item, index) => (
        <Reorder.Item
          key={keyExtractor(item)}
          value={item}
          className={`
            bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700
            cursor-grab active:cursor-grabbing
            transition-shadow hover:shadow-md
            ${itemClassName}
          `}
        >
          {renderItem(item, index)}
        </Reorder.Item>
      ))}
    </Reorder.Group>
  );
}

// Draggable Card
interface DraggableCardProps {
  children: ReactNode;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  dragData?: Record<string, unknown>;
  className?: string;
}

export function DraggableCard({
  children,
  onDragStart,
  onDragEnd,
  dragData,
  className = '',
}: DraggableCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: DragEvent) => {
    setIsDragging(true);
    if (dragData) {
      e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    }
    onDragStart?.();
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    onDragEnd?.();
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`
        cursor-grab active:cursor-grabbing
        transition-all
        ${isDragging ? 'opacity-50 scale-95' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// Drop Zone
interface DropZoneProps {
  children?: ReactNode;
  onDrop: (data: unknown) => void;
  accept?: string[];
  className?: string;
  activeClassName?: string;
  emptyContent?: ReactNode;
}

export function DropZone({
  children,
  onDrop,
  accept,
  className = '',
  activeClassName = '',
  emptyContent,
}: DropZoneProps) {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsOver(false);

    try {
      const jsonData = e.dataTransfer.getData('application/json');
      if (jsonData) {
        const data = JSON.parse(jsonData);
        onDrop(data);
      }
    } catch {
      // Not JSON data, try files
      if (e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        if (accept) {
          const filtered = files.filter((file) =>
            accept.some((type) => file.type.startsWith(type.replace('*', '')))
          );
          onDrop(filtered);
        } else {
          onDrop(files);
        }
      }
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        transition-all
        ${isOver ? activeClassName || 'ring-2 ring-primary ring-offset-2' : ''}
        ${className}
      `}
    >
      {children || emptyContent || (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <Upload className="w-12 h-12 mb-3" />
          <p className="text-sm">Trage și plasează aici</p>
        </div>
      )}
    </div>
  );
}

// File Drop Zone
interface FileDropZoneProps {
  onFilesSelect: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
}

export function FileDropZone({
  onFilesSelect,
  accept,
  multiple = true,
  maxSize,
  maxFiles,
  disabled,
  className = '',
}: FileDropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFiles = (files: File[]): File[] => {
    let validFiles = files;

    if (maxFiles && files.length > maxFiles) {
      setError(`Poți încărca maximum ${maxFiles} fișiere`);
      validFiles = files.slice(0, maxFiles);
    }

    if (maxSize) {
      validFiles = validFiles.filter((file) => {
        if (file.size > maxSize) {
          setError(`Fișierul ${file.name} depășește limita de ${formatBytes(maxSize)}`);
          return false;
        }
        return true;
      });
    }

    return validFiles;
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);

    const fileArray = Array.from(files);
    const validFiles = validateFiles(fileArray);

    if (validFiles.length > 0) {
      onFilesSelect(validFiles);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragActive(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (!disabled) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`
        relative border-2 border-dashed rounded-xl p-8
        transition-all cursor-pointer
        ${isDragActive
          ? 'border-primary bg-primary/5'
          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled}
        className="hidden"
      />

      <div className="flex flex-col items-center text-center">
        <div
          className={`
            p-3 rounded-full mb-4
            ${isDragActive ? 'bg-primary/10 text-primary' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}
          `}
        >
          <Upload className="w-8 h-8" />
        </div>

        <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
          {isDragActive ? 'Plasează fișierele aici' : 'Trage și plasează fișiere aici'}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          sau <span className="text-primary font-medium">alege din calculator</span>
        </p>

        {accept && (
          <p className="text-xs text-gray-400 mt-2">
            Formate acceptate: {accept}
          </p>
        )}

        {maxSize && (
          <p className="text-xs text-gray-400">
            Dimensiune maximă: {formatBytes(maxSize)}
          </p>
        )}

        {error && (
          <p className="text-sm text-red-500 mt-2">{error}</p>
        )}
      </div>
    </div>
  );
}

// File Preview Item
interface FilePreviewProps {
  file: File;
  onRemove?: () => void;
  showSize?: boolean;
  className?: string;
}

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return Image;
  if (type.startsWith('video/')) return Film;
  if (type.startsWith('audio/')) return Music;
  if (type.includes('pdf') || type.includes('document') || type.includes('text')) return FileText;
  return File;
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function FilePreview({
  file,
  onRemove,
  showSize = true,
  className = '',
}: FilePreviewProps) {
  const FileIcon = getFileIcon(file.type);
  const isImage = file.type.startsWith('image/');
  const [preview, setPreview] = useState<string | null>(null);

  // Generate preview for images
  if (isImage && !preview) {
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`
        flex items-center gap-3 p-3 bg-white dark:bg-gray-900
        border border-gray-200 dark:border-gray-700 rounded-lg
        ${className}
      `}
    >
      {isImage && preview ? (
        <img src={preview} alt={file.name} className="w-10 h-10 object-cover rounded" />
      ) : (
        <div className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded">
          <FileIcon className="w-5 h-5 text-gray-500" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {file.name}
        </p>
        {showSize && (
          <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
        )}
      </div>

      {onRemove && (
        <button
          onClick={onRemove}
          className="p-1 text-gray-400 hover:text-red-500 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}

// Kanban Board Column
interface KanbanColumnProps {
  id: string;
  title: string;
  count?: number;
  children: ReactNode;
  onDrop?: (itemId: string, fromColumn: string) => void;
  className?: string;
}

export function KanbanColumn({
  id,
  title,
  count,
  children,
  onDrop,
  className = '',
}: KanbanColumnProps) {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsOver(false);

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.itemId && data.fromColumn && onDrop) {
        onDrop(data.itemId, data.fromColumn);
      }
    } catch {
      // Ignore invalid data
    }
  };

  return (
    <div
      className={`
        flex flex-col bg-gray-100 dark:bg-gray-800 rounded-xl
        ${isOver ? 'ring-2 ring-primary' : ''}
        ${className}
      `}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
        {count !== undefined && (
          <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
            {count}
          </span>
        )}
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="flex-1 p-2 space-y-2 min-h-[200px]"
      >
        {children}
      </div>
    </div>
  );
}

// Kanban Card
interface KanbanCardProps {
  id: string;
  columnId: string;
  children: ReactNode;
  className?: string;
}

export function KanbanCard({
  id,
  columnId,
  children,
  className = '',
}: KanbanCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ itemId: id, fromColumn: columnId })
    );
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`
        bg-white dark:bg-gray-900 rounded-lg p-3 shadow-sm
        border border-gray-200 dark:border-gray-700
        cursor-grab active:cursor-grabbing
        transition-all
        ${isDragging ? 'opacity-50 scale-95' : 'hover:shadow-md'}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// Reorderable Grid
interface ReorderableGridProps<T extends SortableItem> {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => ReactNode;
  columns?: number;
  className?: string;
}

export function ReorderableGrid<T extends SortableItem>({
  items,
  onReorder,
  renderItem,
  columns = 3,
  className = '',
}: ReorderableGridProps<T>) {
  const colClasses: Record<number, string> = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
  };

  return (
    <Reorder.Group
      axis="y"
      values={items}
      onReorder={onReorder}
      className={`grid gap-4 ${colClasses[columns] || 'grid-cols-3'} ${className}`}
    >
      {items.map((item, index) => (
        <Reorder.Item
          key={item.id}
          value={item}
          className="cursor-grab active:cursor-grabbing"
        >
          {renderItem(item, index)}
        </Reorder.Item>
      ))}
    </Reorder.Group>
  );
}

// Drag Overlay (shows while dragging)
interface DragOverlayProps {
  children: ReactNode;
  isActive: boolean;
  className?: string;
}

export function DragOverlay({
  children,
  isActive,
  className = '',
}: DragOverlayProps) {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`
            fixed pointer-events-none z-50
            ${className}
          `}
          style={{
            left: 'var(--mouse-x, 0)',
            top: 'var(--mouse-y, 0)',
            transform: 'translate(-50%, -50%)',
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
