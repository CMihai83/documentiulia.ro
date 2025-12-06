'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

// Basic Popover
type PopoverPosition = 'top' | 'bottom' | 'left' | 'right';
type PopoverAlign = 'start' | 'center' | 'end';

interface PopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  position?: PopoverPosition;
  align?: PopoverAlign;
  offset?: number;
  showArrow?: boolean;
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;
  className?: string;
}

const positionStyles: Record<PopoverPosition, string> = {
  top: 'bottom-full mb-2',
  bottom: 'top-full mt-2',
  left: 'right-full mr-2',
  right: 'left-full ml-2',
};

const alignStyles: Record<PopoverPosition, Record<PopoverAlign, string>> = {
  top: { start: 'left-0', center: 'left-1/2 -translate-x-1/2', end: 'right-0' },
  bottom: { start: 'left-0', center: 'left-1/2 -translate-x-1/2', end: 'right-0' },
  left: { start: 'top-0', center: 'top-1/2 -translate-y-1/2', end: 'bottom-0' },
  right: { start: 'top-0', center: 'top-1/2 -translate-y-1/2', end: 'bottom-0' },
};

const arrowStyles: Record<PopoverPosition, string> = {
  top: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45',
  bottom: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45',
  left: 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2 rotate-45',
  right: 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 rotate-45',
};

const motionVariants: Record<PopoverPosition, { initial: { opacity: number; y?: number; x?: number }; animate: { opacity: number; y?: number; x?: number }; exit: { opacity: number; y?: number; x?: number } }> = {
  top: { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 10 } },
  bottom: { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 } },
  left: { initial: { opacity: 0, x: 10 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 10 } },
  right: { initial: { opacity: 0, x: -10 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -10 } },
};

export function Popover({
  trigger,
  children,
  position = 'bottom',
  align = 'center',
  showArrow = true,
  closeOnClickOutside = true,
  closeOnEscape = true,
  className = '',
}: PopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!closeOnClickOutside) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closeOnClickOutside]);

  useEffect(() => {
    if (!closeOnEscape) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, closeOnEscape]);

  return (
    <div ref={popoverRef} className="relative inline-block">
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={motionVariants[position].initial}
            animate={motionVariants[position].animate}
            exit={motionVariants[position].exit}
            transition={{ duration: 0.15 }}
            className={`
              absolute z-50
              ${positionStyles[position]}
              ${alignStyles[position][align]}
              ${className}
            `}
          >
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              {showArrow && (
                <div
                  className={`
                    absolute w-3 h-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700
                    ${arrowStyles[position]}
                    ${position === 'top' || position === 'left' ? 'border-r border-b' : 'border-l border-t'}
                  `}
                />
              )}
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Popover Content
interface PopoverContentProps {
  children: ReactNode;
  className?: string;
}

export function PopoverContent({ children, className = '' }: PopoverContentProps) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

// Popover Header
interface PopoverHeaderProps {
  children: ReactNode;
  onClose?: () => void;
  className?: string;
}

export function PopoverHeader({ children, onClose, className = '' }: PopoverHeaderProps) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 ${className}`}>
      <h3 className="font-semibold text-gray-900 dark:text-white">{children}</h3>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// Popover Footer
interface PopoverFooterProps {
  children: ReactNode;
  className?: string;
}

export function PopoverFooter({ children, className = '' }: PopoverFooterProps) {
  return (
    <div className={`px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl ${className}`}>
      {children}
    </div>
  );
}

// Hover Card
interface HoverCardProps {
  trigger: ReactNode;
  children: ReactNode;
  position?: PopoverPosition;
  align?: PopoverAlign;
  openDelay?: number;
  closeDelay?: number;
  className?: string;
}

export function HoverCard({
  trigger,
  children,
  position = 'bottom',
  align = 'center',
  openDelay = 200,
  closeDelay = 150,
  className = '',
}: HoverCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const openTimeoutRef = useRef<NodeJS.Timeout>();
  const closeTimeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = () => {
    clearTimeout(closeTimeoutRef.current);
    openTimeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, openDelay);
  };

  const handleMouseLeave = () => {
    clearTimeout(openTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, closeDelay);
  };

  useEffect(() => {
    return () => {
      clearTimeout(openTimeoutRef.current);
      clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {trigger}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={motionVariants[position].initial}
            animate={motionVariants[position].animate}
            exit={motionVariants[position].exit}
            transition={{ duration: 0.15 }}
            className={`
              absolute z-50
              ${positionStyles[position]}
              ${alignStyles[position][align]}
              ${className}
            `}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 min-w-[200px]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// User Hover Card (pre-built for user profiles)
interface UserHoverCardProps {
  trigger: ReactNode;
  user: {
    name: string;
    email?: string;
    avatar?: string;
    role?: string;
    bio?: string;
    stats?: { label: string; value: string | number }[];
  };
  position?: PopoverPosition;
  className?: string;
}

export function UserHoverCard({ trigger, user, position = 'bottom', className = '' }: UserHoverCardProps) {
  return (
    <HoverCard trigger={trigger} position={position} className={className}>
      <div className="w-72">
        <div className="flex items-start gap-3 mb-3">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-semibold text-primary">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 dark:text-white truncate">{user.name}</h4>
            {user.email && (
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
            )}
            {user.role && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
                {user.role}
              </span>
            )}
          </div>
        </div>

        {user.bio && (
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{user.bio}</p>
        )}

        {user.stats && user.stats.length > 0 && (
          <div className="flex gap-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            {user.stats.map((stat, index) => (
              <div key={index} className="text-center">
                <p className="font-semibold text-gray-900 dark:text-white">{stat.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </HoverCard>
  );
}

// Link Preview Hover Card
interface LinkPreviewHoverCardProps {
  trigger: ReactNode;
  preview: {
    title: string;
    description?: string;
    image?: string;
    url: string;
    favicon?: string;
  };
  position?: PopoverPosition;
  className?: string;
}

export function LinkPreviewHoverCard({
  trigger,
  preview,
  position = 'bottom',
  className = '',
}: LinkPreviewHoverCardProps) {
  return (
    <HoverCard trigger={trigger} position={position} className={className}>
      <div className="w-80">
        {preview.image && (
          <img
            src={preview.image}
            alt={preview.title}
            className="w-full h-40 object-cover rounded-lg mb-3"
          />
        )}
        <div className="flex items-start gap-2">
          {preview.favicon && (
            <img src={preview.favicon} alt="" className="w-4 h-4 mt-1" />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 dark:text-white line-clamp-2">
              {preview.title}
            </h4>
            {preview.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                {preview.description}
              </p>
            )}
            <p className="text-xs text-primary mt-2 truncate">{preview.url}</p>
          </div>
        </div>
      </div>
    </HoverCard>
  );
}

// Confirmation Popover
interface ConfirmPopoverProps {
  trigger: ReactNode;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: 'default' | 'danger';
  position?: PopoverPosition;
  className?: string;
}

export function ConfirmPopover({
  trigger,
  title,
  description,
  confirmLabel = 'Confirmă',
  cancelLabel = 'Anulează',
  onConfirm,
  onCancel,
  variant = 'default',
  position = 'bottom',
  className = '',
}: ConfirmPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleConfirm = () => {
    onConfirm();
    setIsOpen(false);
  };

  const handleCancel = () => {
    onCancel?.();
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block">
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={motionVariants[position].initial}
              animate={motionVariants[position].animate}
              exit={motionVariants[position].exit}
              transition={{ duration: 0.15 }}
              className={`
                absolute z-50
                ${positionStyles[position]}
                ${alignStyles[position].center}
                ${className}
              `}
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 w-72">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{title}</h4>
                {description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{description}</p>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    {cancelLabel}
                  </button>
                  <button
                    onClick={handleConfirm}
                    className={`
                      px-3 py-1.5 text-sm font-medium rounded-lg
                      ${variant === 'danger'
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-primary hover:bg-primary/90 text-white'
                      }
                    `}
                  >
                    {confirmLabel}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Info Popover (for help/info icons)
interface InfoPopoverProps {
  content: ReactNode;
  title?: string;
  position?: PopoverPosition;
  iconClassName?: string;
  className?: string;
}

export function InfoPopover({
  content,
  title,
  position = 'top',
  iconClassName = '',
  className = '',
}: InfoPopoverProps) {
  return (
    <Popover
      trigger={
        <button className={`p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ${iconClassName}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      }
      position={position}
      className={className}
    >
      <div className="p-3 max-w-xs">
        {title && (
          <h4 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm">{title}</h4>
        )}
        <div className="text-sm text-gray-600 dark:text-gray-300">{content}</div>
      </div>
    </Popover>
  );
}

// Menu Popover
interface MenuPopoverItem {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  variant?: 'default' | 'danger';
  divider?: boolean;
}

interface MenuPopoverProps {
  trigger: ReactNode;
  items: MenuPopoverItem[];
  position?: PopoverPosition;
  align?: PopoverAlign;
  className?: string;
}

export function MenuPopover({
  trigger,
  items,
  position = 'bottom',
  align = 'end',
  className = '',
}: MenuPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={motionVariants[position].initial}
              animate={motionVariants[position].animate}
              exit={motionVariants[position].exit}
              transition={{ duration: 0.15 }}
              className={`
                absolute z-50 min-w-[180px]
                ${positionStyles[position]}
                ${alignStyles[position][align]}
                ${className}
              `}
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 overflow-hidden">
                {items.map((item, index) =>
                  item.divider ? (
                    <div key={index} className="my-1 border-t border-gray-200 dark:border-gray-700" />
                  ) : item.href ? (
                    <a
                      key={index}
                      href={item.href}
                      className={`
                        flex items-center gap-2 px-4 py-2 text-sm
                        ${item.disabled
                          ? 'opacity-50 cursor-not-allowed'
                          : item.variant === 'danger'
                            ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }
                      `}
                      onClick={(e) => {
                        if (item.disabled) {
                          e.preventDefault();
                        } else {
                          setIsOpen(false);
                        }
                      }}
                    >
                      {item.icon}
                      {item.label}
                    </a>
                  ) : (
                    <button
                      key={index}
                      onClick={() => {
                        if (!item.disabled) {
                          item.onClick?.();
                          setIsOpen(false);
                        }
                      }}
                      disabled={item.disabled}
                      className={`
                        w-full flex items-center gap-2 px-4 py-2 text-sm text-left
                        ${item.disabled
                          ? 'opacity-50 cursor-not-allowed'
                          : item.variant === 'danger'
                            ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }
                      `}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  )
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Color Picker Popover
interface ColorPickerPopoverProps {
  value: string;
  onChange: (color: string) => void;
  colors?: string[];
  position?: PopoverPosition;
  className?: string;
}

const defaultColors = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#78716c',
];

export function ColorPickerPopover({
  value,
  onChange,
  colors = defaultColors,
  position = 'bottom',
  className = '',
}: ColorPickerPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded-lg border-2 border-gray-200 dark:border-gray-600"
        style={{ backgroundColor: value }}
      />

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={motionVariants[position].initial}
              animate={motionVariants[position].animate}
              exit={motionVariants[position].exit}
              transition={{ duration: 0.15 }}
              className={`
                absolute z-50
                ${positionStyles[position]}
                ${alignStyles[position].start}
                ${className}
              `}
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3">
                <div className="grid grid-cols-6 gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        onChange(color);
                        setIsOpen(false);
                      }}
                      className={`
                        w-6 h-6 rounded-md transition-transform hover:scale-110
                        ${value === color ? 'ring-2 ring-offset-2 ring-primary' : ''}
                      `}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <label className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Personalizat:</span>
                    <input
                      type="color"
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
