'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Basic Separator
// ============================================================================

interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  decorative?: boolean;
  className?: string;
}

export const Separator = forwardRef<HTMLDivElement, SeparatorProps>(
  ({ orientation = 'horizontal', decorative = true, className }, ref) => {
    return (
      <div
        ref={ref}
        role={decorative ? 'none' : 'separator'}
        aria-orientation={decorative ? undefined : orientation}
        className={cn(
          'shrink-0 bg-gray-200 dark:bg-gray-700',
          orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
          className
        )}
      />
    );
  }
);

Separator.displayName = 'Separator';

// ============================================================================
// Labeled Separator
// ============================================================================

interface LabeledSeparatorProps {
  children?: React.ReactNode;
  position?: 'left' | 'center' | 'right';
  className?: string;
  lineClassName?: string;
}

export function LabeledSeparator({
  children,
  position = 'center',
  className,
  lineClassName,
}: LabeledSeparatorProps) {
  if (!children) {
    return <Separator className={className} />;
  }

  const positionStyles = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  const lineStyles = {
    left: ['w-8', 'flex-1'],
    center: ['flex-1', 'flex-1'],
    right: ['flex-1', 'w-8'],
  };

  return (
    <div className={cn('flex items-center gap-4', positionStyles[position], className)}>
      <div className={cn('h-px bg-gray-200 dark:bg-gray-700', lineStyles[position][0], lineClassName)} />
      <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
        {children}
      </span>
      <div className={cn('h-px bg-gray-200 dark:bg-gray-700', lineStyles[position][1], lineClassName)} />
    </div>
  );
}

// ============================================================================
// Dashed Separator
// ============================================================================

interface DashedSeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function DashedSeparator({
  orientation = 'horizontal',
  className,
}: DashedSeparatorProps) {
  return (
    <div
      className={cn(
        'border-dashed border-gray-300 dark:border-gray-600',
        orientation === 'horizontal'
          ? 'w-full border-t'
          : 'h-full border-l',
        className
      )}
    />
  );
}

// ============================================================================
// Dotted Separator
// ============================================================================

interface DottedSeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  dotSize?: 'sm' | 'md' | 'lg';
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function DottedSeparator({
  orientation = 'horizontal',
  dotSize = 'sm',
  gap = 'md',
  className,
}: DottedSeparatorProps) {
  const dotSizes = {
    sm: 'w-1 h-1',
    md: 'w-1.5 h-1.5',
    lg: 'w-2 h-2',
  };

  const gapSizes = {
    sm: 'gap-1',
    md: 'gap-2',
    lg: 'gap-3',
  };

  return (
    <div
      className={cn(
        'flex items-center',
        orientation === 'horizontal' ? 'flex-row w-full' : 'flex-col h-full',
        gapSizes[gap],
        className
      )}
    >
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className={cn(
            'rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0',
            dotSizes[dotSize]
          )}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Gradient Separator
// ============================================================================

interface GradientSeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  variant?: 'fade' | 'center-fade' | 'rainbow';
  className?: string;
}

export function GradientSeparator({
  orientation = 'horizontal',
  variant = 'fade',
  className,
}: GradientSeparatorProps) {
  const gradients = {
    fade: orientation === 'horizontal'
      ? 'bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent'
      : 'bg-gradient-to-b from-transparent via-gray-300 dark:via-gray-600 to-transparent',
    'center-fade': orientation === 'horizontal'
      ? 'bg-gradient-to-r from-gray-200 dark:from-gray-700 via-gray-400 dark:via-gray-500 to-gray-200 dark:to-gray-700'
      : 'bg-gradient-to-b from-gray-200 dark:from-gray-700 via-gray-400 dark:via-gray-500 to-gray-200 dark:to-gray-700',
    rainbow: orientation === 'horizontal'
      ? 'bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500'
      : 'bg-gradient-to-b from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500',
  };

  return (
    <div
      className={cn(
        gradients[variant],
        orientation === 'horizontal' ? 'h-px w-full' : 'w-px h-full',
        className
      )}
    />
  );
}

// ============================================================================
// Icon Separator
// ============================================================================

interface IconSeparatorProps {
  icon: React.ReactNode;
  className?: string;
  lineClassName?: string;
}

export function IconSeparator({
  icon,
  className,
  lineClassName,
}: IconSeparatorProps) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div className={cn('flex-1 h-px bg-gray-200 dark:bg-gray-700', lineClassName)} />
      <div className="text-gray-400 dark:text-gray-500">
        {icon}
      </div>
      <div className={cn('flex-1 h-px bg-gray-200 dark:bg-gray-700', lineClassName)} />
    </div>
  );
}

// ============================================================================
// Section Separator
// ============================================================================

interface SectionSeparatorProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionSeparator({
  title,
  subtitle,
  action,
  className,
}: SectionSeparatorProps) {
  return (
    <div className={cn('py-4', className)}>
      <div className="flex items-center justify-between mb-2">
        <div>
          {title && (
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
      <Separator />
    </div>
  );
}

// ============================================================================
// Timestamp Separator
// ============================================================================

interface TimestampSeparatorProps {
  date: Date | string;
  format?: 'date' | 'time' | 'datetime' | 'relative';
  className?: string;
}

export function TimestampSeparator({
  date,
  format = 'date',
  className,
}: TimestampSeparatorProps) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const formatDate = () => {
    switch (format) {
      case 'time':
        return dateObj.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
      case 'datetime':
        return dateObj.toLocaleString('ro-RO', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
      case 'relative': {
        const now = new Date();
        const diff = now.getTime() - dateObj.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days === 0) return 'Astazi';
        if (days === 1) return 'Ieri';
        if (days < 7) return `Acum ${days} zile`;
        return dateObj.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
      }
      default:
        return dateObj.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  };

  return (
    <LabeledSeparator className={className}>
      {formatDate()}
    </LabeledSeparator>
  );
}

// ============================================================================
// Spacing Separator
// ============================================================================

interface SpacingSeparatorProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showLine?: boolean;
  className?: string;
}

export function SpacingSeparator({
  size = 'md',
  showLine = false,
  className,
}: SpacingSeparatorProps) {
  const sizes = {
    xs: 'py-1',
    sm: 'py-2',
    md: 'py-4',
    lg: 'py-6',
    xl: 'py-8',
  };

  return (
    <div className={cn(sizes[size], className)}>
      {showLine && <Separator />}
    </div>
  );
}

// ============================================================================
// Decorative Separator
// ============================================================================

interface DecorativeSeparatorProps {
  variant?: 'wave' | 'zigzag' | 'ornament';
  className?: string;
}

export function DecorativeSeparator({
  variant = 'wave',
  className,
}: DecorativeSeparatorProps) {
  const patterns = {
    wave: (
      <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="w-full h-3">
        <path
          d="M0,5 Q25,0 50,5 T100,5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="text-gray-300 dark:text-gray-600"
        />
      </svg>
    ),
    zigzag: (
      <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="w-full h-3">
        <path
          d="M0,5 L10,0 L20,10 L30,0 L40,10 L50,0 L60,10 L70,0 L80,10 L90,0 L100,5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="text-gray-300 dark:text-gray-600"
        />
      </svg>
    ),
    ornament: (
      <div className="flex items-center justify-center gap-2">
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
          <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500" />
          <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>
    ),
  };

  return (
    <div className={cn('py-2', className)}>
      {patterns[variant]}
    </div>
  );
}

export default Separator;
