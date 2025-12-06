'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Toggle Variants
// ============================================================================

const toggleVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        outline:
          'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        solid:
          'bg-muted data-[state=on]:bg-primary data-[state=on]:text-primary-foreground',
      },
      size: {
        sm: 'h-8 px-2.5 text-xs',
        md: 'h-9 px-3',
        lg: 'h-10 px-4',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

// ============================================================================
// Toggle Component
// ============================================================================

export interface ToggleProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'>,
    VariantProps<typeof toggleVariants> {
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
}

export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  (
    {
      className,
      variant,
      size,
      pressed: controlledPressed,
      defaultPressed = false,
      onPressedChange,
      children,
      ...props
    },
    ref
  ) => {
    const [uncontrolledPressed, setUncontrolledPressed] = React.useState(defaultPressed);
    const isControlled = controlledPressed !== undefined;
    const pressed = isControlled ? controlledPressed : uncontrolledPressed;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!isControlled) {
        setUncontrolledPressed(!pressed);
      }
      onPressedChange?.(!pressed);
      props.onClick?.(e);
    };

    return (
      <button
        ref={ref}
        type="button"
        aria-pressed={pressed}
        data-state={pressed ? 'on' : 'off'}
        className={cn(toggleVariants({ variant, size }), className)}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Toggle.displayName = 'Toggle';

// ============================================================================
// Animated Toggle
// ============================================================================

export interface AnimatedToggleProps extends ToggleProps {
  activeIcon?: React.ReactNode;
  inactiveIcon?: React.ReactNode;
}

export const AnimatedToggle = React.forwardRef<HTMLButtonElement, AnimatedToggleProps>(
  ({ activeIcon, inactiveIcon, children, ...props }, ref) => {
    const pressed = props.pressed ?? props.defaultPressed ?? false;

    return (
      <Toggle ref={ref} {...props}>
        <motion.span
          initial={false}
          animate={{ scale: pressed ? 1 : 0.9, opacity: pressed ? 1 : 0.7 }}
          transition={{ duration: 0.15 }}
        >
          {pressed ? activeIcon || children : inactiveIcon || children}
        </motion.span>
      </Toggle>
    );
  }
);
AnimatedToggle.displayName = 'AnimatedToggle';

// ============================================================================
// Icon Toggle
// ============================================================================

export interface IconToggleProps extends Omit<ToggleProps, 'children'> {
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  label?: string;
}

export const IconToggle = React.forwardRef<HTMLButtonElement, IconToggleProps>(
  ({ icon, activeIcon, label, size = 'icon', ...props }, ref) => {
    const pressed = props.pressed ?? props.defaultPressed ?? false;

    return (
      <Toggle ref={ref} size={size} aria-label={label} {...props}>
        {pressed && activeIcon ? activeIcon : icon}
      </Toggle>
    );
  }
);
IconToggle.displayName = 'IconToggle';

// ============================================================================
// Toggle with Label
// ============================================================================

export interface LabeledToggleProps extends ToggleProps {
  label: string;
  description?: string;
  labelPosition?: 'left' | 'right';
}

export const LabeledToggle = React.forwardRef<HTMLButtonElement, LabeledToggleProps>(
  ({ label, description, labelPosition = 'right', className, ...props }, ref) => {
    const pressed = props.pressed ?? props.defaultPressed ?? false;

    return (
      <div
        className={cn(
          'flex items-center gap-3',
          labelPosition === 'left' && 'flex-row-reverse',
          className
        )}
      >
        <Toggle ref={ref} {...props} />
        <div className={cn('flex flex-col', labelPosition === 'left' && 'text-right')}>
          <span className="text-sm font-medium">{label}</span>
          {description && (
            <span className="text-xs text-muted-foreground">{description}</span>
          )}
        </div>
      </div>
    );
  }
);
LabeledToggle.displayName = 'LabeledToggle';

// ============================================================================
// Common Toggle Icons
// ============================================================================

// Bold Toggle
export function BoldToggle(props: Omit<ToggleProps, 'children' | 'aria-label'>) {
  return (
    <Toggle aria-label="Toggle bold" size="icon" {...props}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
        <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
      </svg>
    </Toggle>
  );
}

// Italic Toggle
export function ItalicToggle(props: Omit<ToggleProps, 'children' | 'aria-label'>) {
  return (
    <Toggle aria-label="Toggle italic" size="icon" {...props}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="19" y1="4" x2="10" y2="4" />
        <line x1="14" y1="20" x2="5" y2="20" />
        <line x1="15" y1="4" x2="9" y2="20" />
      </svg>
    </Toggle>
  );
}

// Underline Toggle
export function UnderlineToggle(props: Omit<ToggleProps, 'children' | 'aria-label'>) {
  return (
    <Toggle aria-label="Toggle underline" size="icon" {...props}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 4v6a6 6 0 0 0 12 0V4" />
        <line x1="4" y1="20" x2="20" y2="20" />
      </svg>
    </Toggle>
  );
}

// Strikethrough Toggle
export function StrikethroughToggle(props: Omit<ToggleProps, 'children' | 'aria-label'>) {
  return (
    <Toggle aria-label="Toggle strikethrough" size="icon" {...props}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17.3 4.9c-2.3-.6-4.4-1-6.2-.9-2.7 0-5.3.7-5.3 3.6 0 1.5 1.8 3.3 5.2 3.3" />
        <path d="M3 12h18" />
        <path d="M14.8 14.2c3.5 0 5.2 1.8 5.2 3.6 0 2.9-2.7 3.6-5.3 3.6-1.8.1-3.9-.3-6.2-.9" />
      </svg>
    </Toggle>
  );
}

// Bookmark Toggle
export function BookmarkToggle(props: Omit<ToggleProps, 'children' | 'aria-label'>) {
  const pressed = props.pressed ?? props.defaultPressed ?? false;

  return (
    <Toggle aria-label="Toggle bookmark" size="icon" {...props}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={pressed ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
      </svg>
    </Toggle>
  );
}

// Star/Favorite Toggle
export function StarToggle(props: Omit<ToggleProps, 'children' | 'aria-label'>) {
  const pressed = props.pressed ?? props.defaultPressed ?? false;

  return (
    <Toggle aria-label="Toggle favorite" size="icon" {...props}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={pressed ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={pressed ? 'text-yellow-500' : ''}
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </Toggle>
  );
}

// Heart/Like Toggle
export function HeartToggle(props: Omit<ToggleProps, 'children' | 'aria-label'>) {
  const pressed = props.pressed ?? props.defaultPressed ?? false;

  return (
    <Toggle aria-label="Toggle like" size="icon" {...props}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={pressed ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={pressed ? 'text-red-500' : ''}
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    </Toggle>
  );
}

// Pin Toggle
export function PinToggle(props: Omit<ToggleProps, 'children' | 'aria-label'>) {
  const pressed = props.pressed ?? props.defaultPressed ?? false;

  return (
    <Toggle aria-label="Toggle pin" size="icon" {...props}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={pressed ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="12" y1="17" x2="12" y2="22" />
        <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
      </svg>
    </Toggle>
  );
}

// Lock Toggle
export function LockToggle(props: Omit<ToggleProps, 'children' | 'aria-label'>) {
  const pressed = props.pressed ?? props.defaultPressed ?? false;

  return (
    <Toggle aria-label="Toggle lock" size="icon" {...props}>
      {pressed ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 9.9-1" />
        </svg>
      )}
    </Toggle>
  );
}

// ============================================================================
// Accounting-specific Toggles
// ============================================================================

// TVA Toggle (Romanian VAT)
export function TVAToggle(props: Omit<ToggleProps, 'children'>) {
  const pressed = props.pressed ?? props.defaultPressed ?? false;

  return (
    <Toggle variant="outline" {...props}>
      <span className={cn('font-medium', pressed && 'text-primary')}>
        {pressed ? 'Cu TVA' : 'Fara TVA'}
      </span>
    </Toggle>
  );
}

// Paid/Unpaid Toggle
export function PaidToggle(props: Omit<ToggleProps, 'children'>) {
  const pressed = props.pressed ?? props.defaultPressed ?? false;

  return (
    <Toggle variant="solid" {...props}>
      <span className="flex items-center gap-1.5">
        {pressed ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Platit
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Neplatit
          </>
        )}
      </span>
    </Toggle>
  );
}

// Active/Inactive Toggle
export function ActiveToggle(props: Omit<ToggleProps, 'children'>) {
  const pressed = props.pressed ?? props.defaultPressed ?? false;

  return (
    <Toggle variant="solid" {...props}>
      <span className={cn('flex items-center gap-1.5', pressed ? 'text-green-600' : 'text-gray-500')}>
        <span className={cn('h-2 w-2 rounded-full', pressed ? 'bg-green-500' : 'bg-gray-400')} />
        {pressed ? 'Activ' : 'Inactiv'}
      </span>
    </Toggle>
  );
}

// ============================================================================
// Text Formatting Toolbar
// ============================================================================

export interface TextFormattingToolbarProps {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  onBoldChange?: (pressed: boolean) => void;
  onItalicChange?: (pressed: boolean) => void;
  onUnderlineChange?: (pressed: boolean) => void;
  onStrikethroughChange?: (pressed: boolean) => void;
  className?: string;
}

export function TextFormattingToolbar({
  bold,
  italic,
  underline,
  strikethrough,
  onBoldChange,
  onItalicChange,
  onUnderlineChange,
  onStrikethroughChange,
  className,
}: TextFormattingToolbarProps) {
  return (
    <div className={cn('flex items-center gap-1 rounded-md border border-input p-1', className)}>
      <BoldToggle pressed={bold} onPressedChange={onBoldChange} />
      <ItalicToggle pressed={italic} onPressedChange={onItalicChange} />
      <UnderlineToggle pressed={underline} onPressedChange={onUnderlineChange} />
      <StrikethroughToggle pressed={strikethrough} onPressedChange={onStrikethroughChange} />
    </div>
  );
}

// ============================================================================
// Export variants
// ============================================================================

export { toggleVariants };
