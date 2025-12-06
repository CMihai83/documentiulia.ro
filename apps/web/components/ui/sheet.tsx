'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Sheet Context
// ============================================================================

interface SheetContextValue {
  isOpen: boolean;
  onClose: () => void;
}

const SheetContext = createContext<SheetContextValue | null>(null);

function useSheet() {
  const context = useContext(SheetContext);
  if (!context) {
    throw new Error('Sheet components must be used within a Sheet');
  }
  return context;
}

// ============================================================================
// Sheet Root
// ============================================================================

type SheetSide = 'left' | 'right' | 'top' | 'bottom';

interface SheetProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: SheetSide;
  className?: string;
  overlayClassName?: string;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

export function Sheet({
  children,
  open = false,
  onOpenChange,
  side = 'right',
  className,
  overlayClassName,
  closeOnOverlayClick = true,
  closeOnEscape = true,
}: SheetProps) {
  const [isOpen, setIsOpen] = useState(open);

  useEffect(() => {
    setIsOpen(open);
  }, [open]);

  useEffect(() => {
    if (!closeOnEscape) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    onOpenChange?.(false);
  }, [onOpenChange]);

  const sideVariants: Record<SheetSide, { initial: { x?: string; y?: string }; animate: { x?: number; y?: number }; exit: { x?: string; y?: string } }> = {
    left: { initial: { x: '-100%' }, animate: { x: 0 }, exit: { x: '-100%' } },
    right: { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' } },
    top: { initial: { y: '-100%' }, animate: { y: 0 }, exit: { y: '-100%' } },
    bottom: { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } },
  };

  const sideClasses: Record<SheetSide, string> = {
    left: 'left-0 top-0 bottom-0 h-full w-[85vw] max-w-md',
    right: 'right-0 top-0 bottom-0 h-full w-[85vw] max-w-md',
    top: 'top-0 left-0 right-0 w-full h-auto max-h-[85vh]',
    bottom: 'bottom-0 left-0 right-0 w-full h-auto max-h-[85vh]',
  };

  return (
    <SheetContext.Provider value={{ isOpen, onClose: handleClose }}>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
                overlayClassName
              )}
              onClick={closeOnOverlayClick ? handleClose : undefined}
            />
            <motion.div
              initial={sideVariants[side].initial}
              animate={sideVariants[side].animate}
              exit={sideVariants[side].exit}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className={cn(
                'fixed z-50 bg-white dark:bg-gray-900',
                'shadow-2xl overflow-hidden',
                sideClasses[side],
                className
              )}
            >
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </SheetContext.Provider>
  );
}

// ============================================================================
// Sheet Header
// ============================================================================

interface SheetHeaderProps {
  children?: React.ReactNode;
  className?: string;
  showClose?: boolean;
}

export function SheetHeader({
  children,
  className,
  showClose = true,
}: SheetHeaderProps) {
  const { onClose } = useSheet();

  return (
    <div className={cn(
      'flex items-center justify-between px-4 py-3',
      'border-b border-gray-200 dark:border-gray-800',
      className
    )}>
      <div className="flex-1">{children}</div>
      {showClose && (
        <button
          type="button"
          onClick={onClose}
          className={cn(
            'ml-4 p-2 rounded-lg',
            'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'transition-colors duration-200'
          )}
          aria-label="Inchide"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Sheet Title
// ============================================================================

interface SheetTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function SheetTitle({ children, className }: SheetTitleProps) {
  return (
    <h2 className={cn(
      'text-lg font-semibold text-gray-900 dark:text-gray-100',
      className
    )}>
      {children}
    </h2>
  );
}

// ============================================================================
// Sheet Description
// ============================================================================

interface SheetDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function SheetDescription({ children, className }: SheetDescriptionProps) {
  return (
    <p className={cn(
      'text-sm text-gray-500 dark:text-gray-400 mt-1',
      className
    )}>
      {children}
    </p>
  );
}

// ============================================================================
// Sheet Content
// ============================================================================

interface SheetContentProps {
  children: React.ReactNode;
  className?: string;
}

export function SheetContent({ children, className }: SheetContentProps) {
  return (
    <div className={cn('flex-1 overflow-y-auto p-4', className)}>
      {children}
    </div>
  );
}

// ============================================================================
// Sheet Footer
// ============================================================================

interface SheetFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function SheetFooter({ children, className }: SheetFooterProps) {
  return (
    <div className={cn(
      'flex items-center justify-end gap-3 px-4 py-3',
      'border-t border-gray-200 dark:border-gray-800',
      className
    )}>
      {children}
    </div>
  );
}

// ============================================================================
// Drawer (Bottom Sheet with Drag)
// ============================================================================

interface DrawerProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  snapPoints?: number[];
  defaultSnapPoint?: number;
}

export function Drawer({
  children,
  open = false,
  onOpenChange,
  className,
  snapPoints = [0.5, 0.9],
  defaultSnapPoint = 0,
}: DrawerProps) {
  const [isOpen, setIsOpen] = useState(open);
  const [currentSnap, setCurrentSnap] = useState(defaultSnapPoint);

  useEffect(() => {
    setIsOpen(open);
    if (open) {
      setCurrentSnap(defaultSnapPoint);
    }
  }, [open, defaultSnapPoint]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    onOpenChange?.(false);
  }, [onOpenChange]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    if (velocity > 500 || offset > 100) {
      const nextSnap = currentSnap - 1;
      if (nextSnap < 0) {
        handleClose();
      } else {
        setCurrentSnap(nextSnap);
      }
    } else if (velocity < -500 || offset < -100) {
      const nextSnap = currentSnap + 1;
      if (nextSnap < snapPoints.length) {
        setCurrentSnap(nextSnap);
      }
    }
  };

  const currentHeight = snapPoints[currentSnap];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={handleClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: `${(1 - currentHeight) * 100}%` }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-50',
              'bg-white dark:bg-gray-900',
              'rounded-t-2xl shadow-2xl',
              'h-[95vh]',
              className
            )}
          >
            <div className="flex justify-center py-3">
              <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700" />
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Resizable Sheet
// ============================================================================

interface ResizableSheetProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: 'left' | 'right';
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  className?: string;
}

export function ResizableSheet({
  children,
  open = false,
  onOpenChange,
  side = 'right',
  defaultWidth = 400,
  minWidth = 280,
  maxWidth = 600,
  className,
}: ResizableSheetProps) {
  const [isOpen, setIsOpen] = useState(open);
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    setIsOpen(open);
  }, [open]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    onOpenChange?.(false);
  }, [onOpenChange]);

  const handleMouseDown = () => {
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = side === 'right'
        ? window.innerWidth - e.clientX
        : e.clientX;
      setWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, side, minWidth, maxWidth]);

  const sideStyles = side === 'right'
    ? { right: 0 }
    : { left: 0 };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={handleClose}
          />
          <motion.div
            initial={{ x: side === 'right' ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: side === 'right' ? '100%' : '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={{ width, ...sideStyles }}
            className={cn(
              'fixed top-0 bottom-0 z-50',
              'bg-white dark:bg-gray-900 shadow-2xl',
              'flex',
              className
            )}
          >
            <div
              className={cn(
                'absolute top-0 bottom-0 w-1 cursor-col-resize',
                'hover:bg-blue-500/50 transition-colors',
                side === 'right' ? 'left-0' : 'right-0'
              )}
              onMouseDown={handleMouseDown}
            >
              <div className={cn(
                'absolute top-1/2 -translate-y-1/2 p-1',
                side === 'right' ? '-left-3' : '-right-3'
              )}>
                <GripVertical className="h-5 w-5 text-gray-400" />
              </div>
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Simple Sheet (All-in-one)
// ============================================================================

interface SimpleSheetProps {
  trigger: React.ReactNode;
  title?: string;
  description?: string;
  children: React.ReactNode;
  side?: SheetSide;
  footer?: React.ReactNode;
  className?: string;
}

export function SimpleSheet({
  trigger,
  title,
  description,
  children,
  side = 'right',
  footer,
  className,
}: SimpleSheetProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div onClick={() => setIsOpen(true)}>{trigger}</div>
      <Sheet open={isOpen} onOpenChange={setIsOpen} side={side} className={className}>
        <SheetHeader>
          {title && <SheetTitle>{title}</SheetTitle>}
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <SheetContent>{children}</SheetContent>
        {footer && <SheetFooter>{footer}</SheetFooter>}
      </Sheet>
    </>
  );
}

export default Sheet;
