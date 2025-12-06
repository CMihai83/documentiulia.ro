'use client';

import * as React from 'react';
import { motion, AnimatePresence, PanInfo, useDragControls } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type DrawerSide = 'left' | 'right' | 'top' | 'bottom';
export type DrawerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface DrawerContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side: DrawerSide;
  size: DrawerSize;
}

const DrawerContext = React.createContext<DrawerContextValue | null>(null);

function useDrawer() {
  const context = React.useContext(DrawerContext);
  if (!context) {
    throw new Error('useDrawer must be used within a Drawer');
  }
  return context;
}

// ============================================================================
// Size Classes
// ============================================================================

const sizeClasses: Record<DrawerSide, Record<DrawerSize, string>> = {
  left: {
    sm: 'w-64',
    md: 'w-80',
    lg: 'w-96',
    xl: 'w-[480px]',
    full: 'w-screen',
  },
  right: {
    sm: 'w-64',
    md: 'w-80',
    lg: 'w-96',
    xl: 'w-[480px]',
    full: 'w-screen',
  },
  top: {
    sm: 'h-32',
    md: 'h-48',
    lg: 'h-64',
    xl: 'h-96',
    full: 'h-screen',
  },
  bottom: {
    sm: 'h-32',
    md: 'h-48',
    lg: 'h-64',
    xl: 'h-96',
    full: 'h-screen',
  },
};

const positionClasses: Record<DrawerSide, string> = {
  left: 'left-0 top-0 h-full',
  right: 'right-0 top-0 h-full',
  top: 'top-0 left-0 w-full',
  bottom: 'bottom-0 left-0 w-full',
};

const animationVariants = {
  left: {
    hidden: { x: '-100%' },
    visible: { x: 0 },
  },
  right: {
    hidden: { x: '100%' },
    visible: { x: 0 },
  },
  top: {
    hidden: { y: '-100%' },
    visible: { y: 0 },
  },
  bottom: {
    hidden: { y: '100%' },
    visible: { y: 0 },
  },
} as const;

// ============================================================================
// Drawer
// ============================================================================

interface DrawerProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: DrawerSide;
  size?: DrawerSize;
  children: React.ReactNode;
}

export function Drawer({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  side = 'right',
  size = 'md',
  children,
}: DrawerProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(newOpen);
      }
      onOpenChange?.(newOpen);
    },
    [isControlled, onOpenChange]
  );

  return (
    <DrawerContext.Provider value={{ open, onOpenChange: handleOpenChange, side, size }}>
      {children}
    </DrawerContext.Provider>
  );
}

// ============================================================================
// DrawerTrigger
// ============================================================================

interface DrawerTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const DrawerTrigger = React.forwardRef<HTMLButtonElement, DrawerTriggerProps>(
  ({ asChild, onClick, children, ...props }, ref) => {
    const { onOpenChange } = useDrawer();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      onOpenChange(true);
    };

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
        onClick: () => onOpenChange(true),
      });
    }

    return (
      <button ref={ref} type="button" onClick={handleClick} {...props}>
        {children}
      </button>
    );
  }
);
DrawerTrigger.displayName = 'DrawerTrigger';

// ============================================================================
// DrawerClose
// ============================================================================

interface DrawerCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const DrawerClose = React.forwardRef<HTMLButtonElement, DrawerCloseProps>(
  ({ asChild, onClick, children, ...props }, ref) => {
    const { onOpenChange } = useDrawer();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      onOpenChange(false);
    };

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
        onClick: () => onOpenChange(false),
      });
    }

    return (
      <button ref={ref} type="button" onClick={handleClick} {...props}>
        {children}
      </button>
    );
  }
);
DrawerClose.displayName = 'DrawerClose';

// ============================================================================
// DrawerPortal
// ============================================================================

interface DrawerPortalProps {
  children: React.ReactNode;
}

export function DrawerPortal({ children }: DrawerPortalProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <>{children}</>;
}

// ============================================================================
// DrawerOverlay
// ============================================================================

interface DrawerOverlayProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DrawerOverlay = React.forwardRef<HTMLDivElement, DrawerOverlayProps>(
  ({ className }, ref) => {
    const { open, onOpenChange } = useDrawer();

    return (
      <AnimatePresence>
        {open && (
          <motion.div
            ref={ref}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
              className
            )}
            onClick={() => onOpenChange(false)}
          />
        )}
      </AnimatePresence>
    );
  }
);
DrawerOverlay.displayName = 'DrawerOverlay';

// ============================================================================
// DrawerContent
// ============================================================================

interface DrawerContentProps extends React.HTMLAttributes<HTMLDivElement> {
  showHandle?: boolean;
}

export const DrawerContent = React.forwardRef<HTMLDivElement, DrawerContentProps>(
  ({ className, showHandle = false, children }, ref) => {
    const { open, onOpenChange, side, size } = useDrawer();
    const dragControls = useDragControls();

    const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const threshold = 100;
      const velocity = 500;

      const shouldClose =
        (side === 'right' && (info.offset.x > threshold || info.velocity.x > velocity)) ||
        (side === 'left' && (info.offset.x < -threshold || info.velocity.x < -velocity)) ||
        (side === 'bottom' && (info.offset.y > threshold || info.velocity.y > velocity)) ||
        (side === 'top' && (info.offset.y < -threshold || info.velocity.y < -velocity));

      if (shouldClose) {
        onOpenChange(false);
      }
    };

    const dragConstraints = {
      left: side === 'right' ? 0 : undefined,
      right: side === 'left' ? 0 : undefined,
      top: side === 'bottom' ? 0 : undefined,
      bottom: side === 'top' ? 0 : undefined,
    };

    const dragDirection = side === 'left' || side === 'right' ? 'x' : 'y';

    return (
      <AnimatePresence>
        {open && (
          <motion.div
            ref={ref}
            initial={animationVariants[side].hidden}
            animate={animationVariants[side].visible}
            exit={animationVariants[side].hidden}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag={dragDirection}
            dragControls={dragControls}
            dragConstraints={dragConstraints}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            className={cn(
              'fixed z-50 flex flex-col bg-background shadow-xl',
              positionClasses[side],
              sizeClasses[side][size],
              className
            )}
          >
            {showHandle && (side === 'bottom' || side === 'top') && (
              <div
                className={cn(
                  'mx-auto w-12 h-1.5 rounded-full bg-muted-foreground/30 cursor-grab active:cursor-grabbing',
                  side === 'bottom' ? 'mt-4' : 'mb-4 mt-auto'
                )}
                onPointerDown={(e) => dragControls.start(e)}
              />
            )}
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);
DrawerContent.displayName = 'DrawerContent';

// ============================================================================
// DrawerHeader
// ============================================================================

interface DrawerHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DrawerHeader = React.forwardRef<HTMLDivElement, DrawerHeaderProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col gap-1.5 p-6 border-b border-border', className)}
        {...props}
      />
    );
  }
);
DrawerHeader.displayName = 'DrawerHeader';

// ============================================================================
// DrawerFooter
// ============================================================================

interface DrawerFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DrawerFooter = React.forwardRef<HTMLDivElement, DrawerFooterProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center gap-2 p-6 border-t border-border mt-auto',
          className
        )}
        {...props}
      />
    );
  }
);
DrawerFooter.displayName = 'DrawerFooter';

// ============================================================================
// DrawerTitle
// ============================================================================

interface DrawerTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export const DrawerTitle = React.forwardRef<HTMLHeadingElement, DrawerTitleProps>(
  ({ className, ...props }, ref) => {
    return (
      <h2
        ref={ref}
        className={cn('text-lg font-semibold leading-none tracking-tight', className)}
        {...props}
      />
    );
  }
);
DrawerTitle.displayName = 'DrawerTitle';

// ============================================================================
// DrawerDescription
// ============================================================================

interface DrawerDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const DrawerDescription = React.forwardRef<HTMLParagraphElement, DrawerDescriptionProps>(
  ({ className, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn('text-sm text-muted-foreground', className)}
        {...props}
      />
    );
  }
);
DrawerDescription.displayName = 'DrawerDescription';

// ============================================================================
// DrawerBody (Scrollable content area)
// ============================================================================

interface DrawerBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DrawerBody = React.forwardRef<HTMLDivElement, DrawerBodyProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex-1 overflow-y-auto p-6', className)}
        {...props}
      />
    );
  }
);
DrawerBody.displayName = 'DrawerBody';

// ============================================================================
// Pre-configured Drawers
// ============================================================================

// Simple Drawer
interface SimpleDrawerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  side?: DrawerSide;
  size?: DrawerSize;
  footer?: React.ReactNode;
}

export function SimpleDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  side = 'right',
  size = 'md',
  footer,
}: SimpleDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} side={side} size={size}>
      <DrawerPortal>
        <DrawerOverlay />
        <DrawerContent>
          {(title || description) && (
            <DrawerHeader>
              <div className="flex items-center justify-between">
                {title && <DrawerTitle>{title}</DrawerTitle>}
                <DrawerClose className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  <span className="sr-only">Inchide</span>
                </DrawerClose>
              </div>
              {description && <DrawerDescription>{description}</DrawerDescription>}
            </DrawerHeader>
          )}
          <DrawerBody>{children}</DrawerBody>
          {footer && <DrawerFooter>{footer}</DrawerFooter>}
        </DrawerContent>
      </DrawerPortal>
    </Drawer>
  );
}

// Bottom Sheet Drawer (Mobile-friendly)
interface BottomSheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({ open, onOpenChange, title, children }: BottomSheetProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} side="bottom" size="lg">
      <DrawerPortal>
        <DrawerOverlay />
        <DrawerContent showHandle className="rounded-t-xl">
          {title && (
            <DrawerHeader className="text-center">
              <DrawerTitle>{title}</DrawerTitle>
            </DrawerHeader>
          )}
          <DrawerBody>{children}</DrawerBody>
        </DrawerContent>
      </DrawerPortal>
    </Drawer>
  );
}

// Filter Drawer (Accounting-specific)
interface FilterDrawerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  onApply?: () => void;
  onReset?: () => void;
}

export function FilterDrawer({
  open,
  onOpenChange,
  children,
  onApply,
  onReset,
}: FilterDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} side="right" size="md">
      <DrawerPortal>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerHeader>
            <div className="flex items-center justify-between">
              <DrawerTitle>Filtre</DrawerTitle>
              <DrawerClose className="rounded-sm opacity-70 hover:opacity-100">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </DrawerClose>
            </div>
            <DrawerDescription>Selectati criteriile de filtrare</DrawerDescription>
          </DrawerHeader>
          <DrawerBody>{children}</DrawerBody>
          <DrawerFooter className="justify-between">
            <button
              type="button"
              onClick={onReset}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Reseteaza
            </button>
            <button
              type="button"
              onClick={() => {
                onApply?.();
                onOpenChange?.(false);
              }}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Aplica filtre
            </button>
          </DrawerFooter>
        </DrawerContent>
      </DrawerPortal>
    </Drawer>
  );
}

// Navigation Drawer (Mobile menu)
interface NavigationDrawerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  logo?: React.ReactNode;
}

export function NavigationDrawer({
  open,
  onOpenChange,
  children,
  logo,
}: NavigationDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} side="left" size="sm">
      <DrawerPortal>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerHeader className="border-b-0">
            {logo || (
              <DrawerTitle className="text-xl">Menu</DrawerTitle>
            )}
          </DrawerHeader>
          <DrawerBody className="p-0">{children}</DrawerBody>
        </DrawerContent>
      </DrawerPortal>
    </Drawer>
  );
}

// ============================================================================
// Export hook
// ============================================================================

export { useDrawer };
