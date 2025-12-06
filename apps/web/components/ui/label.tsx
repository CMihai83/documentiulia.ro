'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ============================================================================
// Label Variants
// ============================================================================

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
  {
    variants: {
      variant: {
        default: 'text-foreground',
        muted: 'text-muted-foreground',
        error: 'text-destructive',
        success: 'text-green-600 dark:text-green-400',
        warning: 'text-yellow-600 dark:text-yellow-400',
      },
      size: {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

// ============================================================================
// Label Component
// ============================================================================

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement>,
    VariantProps<typeof labelVariants> {
  required?: boolean;
  optional?: boolean;
  tooltip?: string;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, variant, size, required, optional, tooltip, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(labelVariants({ variant, size }), className)}
        {...props}
      >
        {children}
        {required && (
          <span className="ml-1 text-destructive" aria-hidden="true">
            *
          </span>
        )}
        {optional && (
          <span className="ml-1 text-muted-foreground text-xs">(optional)</span>
        )}
        {tooltip && (
          <span
            className="ml-1 inline-flex cursor-help items-center text-muted-foreground"
            title={tooltip}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <path d="M12 17h.01" />
            </svg>
          </span>
        )}
      </label>
    );
  }
);
Label.displayName = 'Label';

// ============================================================================
// Form Label (with description)
// ============================================================================

interface FormLabelProps extends LabelProps {
  description?: string;
  error?: string;
}

export const FormLabel = React.forwardRef<HTMLLabelElement, FormLabelProps>(
  ({ className, description, error, children, ...props }, ref) => {
    return (
      <div className="space-y-1">
        <Label
          ref={ref}
          className={className}
          variant={error ? 'error' : 'default'}
          {...props}
        >
          {children}
        </Label>
        {description && !error && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }
);
FormLabel.displayName = 'FormLabel';

// ============================================================================
// Inline Label (Label + Input side by side)
// ============================================================================

interface InlineLabelProps extends LabelProps {
  labelWidth?: string;
}

export const InlineLabel = React.forwardRef<HTMLLabelElement, InlineLabelProps>(
  ({ className, labelWidth = '120px', children, ...props }, ref) => {
    return (
      <Label
        ref={ref}
        className={cn('inline-flex items-center shrink-0', className)}
        style={{ width: labelWidth }}
        {...props}
      >
        {children}
      </Label>
    );
  }
);
InlineLabel.displayName = 'InlineLabel';

// ============================================================================
// Field Label (Complete field wrapper)
// ============================================================================

interface FieldLabelProps extends Omit<LabelProps, 'children'> {
  label: string;
  description?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  layout?: 'vertical' | 'horizontal';
  labelWidth?: string;
}

export function FieldLabel({
  label,
  description,
  error,
  hint,
  children,
  layout = 'vertical',
  labelWidth = '140px',
  required,
  optional,
  tooltip,
  ...props
}: FieldLabelProps) {
  const id = React.useId();

  if (layout === 'horizontal') {
    return (
      <div className="flex items-start gap-4">
        <Label
          htmlFor={id}
          className="shrink-0 pt-2"
          style={{ width: labelWidth }}
          required={required}
          optional={optional}
          tooltip={tooltip}
          {...props}
        >
          {label}
        </Label>
        <div className="flex-1 space-y-1">
          {React.isValidElement(children)
            ? React.cloneElement(children as React.ReactElement<{ id?: string }>, { id })
            : children}
          {description && !error && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
          {hint && !error && (
            <p className="text-xs text-muted-foreground italic">{hint}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label
        htmlFor={id}
        variant={error ? 'error' : 'default'}
        required={required}
        optional={optional}
        tooltip={tooltip}
        {...props}
      >
        {label}
      </Label>
      {description && !error && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<{ id?: string }>, { id })
        : children}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {hint && !error && (
        <p className="text-xs text-muted-foreground italic">{hint}</p>
      )}
    </div>
  );
}

// ============================================================================
// Section Label (For form sections)
// ============================================================================

interface SectionLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export function SectionLabel({
  className,
  title,
  description,
  icon,
  actions,
  ...props
}: SectionLabelProps) {
  return (
    <div
      className={cn(
        'flex items-start justify-between border-b border-border pb-4 mb-4',
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ============================================================================
// Badge Label (Label with badge)
// ============================================================================

interface BadgeLabelProps extends LabelProps {
  badge?: string | number;
  badgeVariant?: 'default' | 'primary' | 'secondary' | 'destructive' | 'success';
}

export const BadgeLabel = React.forwardRef<HTMLLabelElement, BadgeLabelProps>(
  ({ className, badge, badgeVariant = 'default', children, ...props }, ref) => {
    const badgeColors = {
      default: 'bg-muted text-muted-foreground',
      primary: 'bg-primary text-primary-foreground',
      secondary: 'bg-secondary text-secondary-foreground',
      destructive: 'bg-destructive text-destructive-foreground',
      success: 'bg-green-500 text-white',
    };

    return (
      <Label ref={ref} className={cn('inline-flex items-center gap-2', className)} {...props}>
        {children}
        {badge !== undefined && (
          <span
            className={cn(
              'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium',
              badgeColors[badgeVariant]
            )}
          >
            {badge}
          </span>
        )}
      </Label>
    );
  }
);
BadgeLabel.displayName = 'BadgeLabel';

// ============================================================================
// Icon Label (Label with icon)
// ============================================================================

interface IconLabelProps extends LabelProps {
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const IconLabel = React.forwardRef<HTMLLabelElement, IconLabelProps>(
  ({ className, icon, iconPosition = 'left', children, ...props }, ref) => {
    return (
      <Label
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5',
          iconPosition === 'right' && 'flex-row-reverse',
          className
        )}
        {...props}
      >
        {icon && <span className="text-muted-foreground">{icon}</span>}
        {children}
      </Label>
    );
  }
);
IconLabel.displayName = 'IconLabel';

// ============================================================================
// Accounting-specific Labels
// ============================================================================

// CUI Label (Romanian tax ID)
export function CUILabel(props: Omit<LabelProps, 'children'>) {
  return (
    <Label {...props} tooltip="Codul Unic de Identificare">
      CUI
    </Label>
  );
}

// CIF Label (Romanian fiscal code)
export function CIFLabel(props: Omit<LabelProps, 'children'>) {
  return (
    <Label {...props} tooltip="Codul de Identificare Fiscala">
      CIF
    </Label>
  );
}

// IBAN Label
export function IBANLabel(props: Omit<LabelProps, 'children'>) {
  return (
    <Label {...props} tooltip="International Bank Account Number">
      IBAN
    </Label>
  );
}

// TVA Label
export function TVALabel(props: Omit<LabelProps, 'children'>) {
  return (
    <Label {...props} tooltip="Taxa pe Valoare Adaugata">
      TVA
    </Label>
  );
}

// Amount Label with currency
interface AmountLabelProps extends LabelProps {
  currency?: string;
}

export function AmountLabel({ currency = 'RON', children, ...props }: AmountLabelProps) {
  return (
    <Label {...props}>
      {children} <span className="text-muted-foreground">({currency})</span>
    </Label>
  );
}

// ============================================================================
// Status Label (For displaying status)
// ============================================================================

interface StatusLabelProps extends Omit<LabelProps, 'variant'> {
  status: 'active' | 'inactive' | 'pending' | 'error' | 'success';
}

export function StatusLabel({ status, children, className, ...props }: StatusLabelProps) {
  const statusConfig = {
    active: { dot: 'bg-green-500', text: 'text-green-600 dark:text-green-400' },
    inactive: { dot: 'bg-gray-400', text: 'text-gray-500' },
    pending: { dot: 'bg-yellow-500', text: 'text-yellow-600 dark:text-yellow-400' },
    error: { dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
    success: { dot: 'bg-green-500', text: 'text-green-600 dark:text-green-400' },
  };

  const config = statusConfig[status];

  return (
    <Label className={cn('inline-flex items-center gap-2', config.text, className)} {...props}>
      <span className={cn('h-2 w-2 rounded-full', config.dot)} />
      {children}
    </Label>
  );
}

// ============================================================================
// Export variants
// ============================================================================

export { labelVariants };
