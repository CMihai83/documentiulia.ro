'use client';

import { useEffect, useState, useRef, ReactNode } from 'react';

// Hook for detecting when element enters viewport
export function useInView(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        observer.disconnect();
      }
    }, { threshold: 0.1, ...options });

    observer.observe(element);
    return () => observer.disconnect();
  }, [options]);

  return { ref, isInView };
}

// Fade in animation wrapper
interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  className?: string;
  once?: boolean;
}

export function FadeIn({
  children,
  delay = 0,
  duration = 600,
  direction = 'up',
  className = '',
  once = true,
}: FadeInProps) {
  const { ref, isInView } = useInView();

  const directionClasses = {
    up: 'translate-y-8',
    down: '-translate-y-8',
    left: 'translate-x-8',
    right: '-translate-x-8',
    none: '',
  };

  return (
    <div
      ref={ref}
      className={`transform transition-all ${className}`}
      style={{
        transitionDelay: `${delay}ms`,
        transitionDuration: `${duration}ms`,
        opacity: isInView ? 1 : 0,
        transform: isInView ? 'translate(0, 0)' : undefined,
      }}
    >
      <div
        className={`${!isInView ? directionClasses[direction] : ''}`}
        style={{
          transition: `transform ${duration}ms ease-out ${delay}ms`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Staggered children animation
interface StaggerProps {
  children: ReactNode[];
  staggerDelay?: number;
  baseDelay?: number;
  className?: string;
}

export function Stagger({
  children,
  staggerDelay = 100,
  baseDelay = 0,
  className = '',
}: StaggerProps) {
  const { ref, isInView } = useInView();

  return (
    <div ref={ref} className={className}>
      {children.map((child, index) => (
        <div
          key={index}
          className="transform transition-all duration-500 ease-out"
          style={{
            transitionDelay: `${baseDelay + index * staggerDelay}ms`,
            opacity: isInView ? 1 : 0,
            transform: isInView ? 'translateY(0)' : 'translateY(20px)',
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

// Animated counter for numbers
interface CountUpProps {
  end: number;
  start?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export function CountUp({
  end,
  start = 0,
  duration = 2000,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
}: CountUpProps) {
  const [count, setCount] = useState(start);
  const { ref, isInView } = useInView();

  useEffect(() => {
    if (!isInView) return;

    const startTime = Date.now();
    const endTime = startTime + duration;

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      const currentCount = start + (end - start) * easeProgress;

      setCount(currentCount);

      if (now < endTime) {
        requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, start, end, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {decimals > 0 ? count.toFixed(decimals) : Math.round(count)}
      {suffix}
    </span>
  );
}

// Shimmer loading placeholder
interface ShimmerProps {
  width?: string;
  height?: string;
  className?: string;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

export function Shimmer({
  width = '100%',
  height = '20px',
  className = '',
  rounded = 'md',
}: ShimmerProps) {
  const roundedClasses = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };

  return (
    <div
      className={`bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer bg-[length:200%_100%] ${roundedClasses[rounded]} ${className}`}
      style={{ width, height }}
    />
  );
}

// Pulse animation for loading states
interface PulseProps {
  children: ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function Pulse({ children, isLoading = false, className = '' }: PulseProps) {
  return (
    <div className={`${isLoading ? 'animate-pulse-slow opacity-75' : ''} ${className}`}>
      {children}
    </div>
  );
}

// Scale on hover wrapper
interface ScaleOnHoverProps {
  children: ReactNode;
  scale?: number;
  className?: string;
}

export function ScaleOnHover({ children, scale = 1.05, className = '' }: ScaleOnHoverProps) {
  return (
    <div
      className={`transform transition-transform duration-200 hover:scale-[${scale}] ${className}`}
      style={{ '--hover-scale': scale } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

// Animated progress bar
interface ProgressBarProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  showLabel = false,
  color = 'blue',
  size = 'md',
  animate = true,
  className = '',
}: ProgressBarProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const { ref, isInView } = useInView();

  useEffect(() => {
    if (!isInView || !animate) {
      setDisplayValue(value);
      return;
    }

    const duration = 1000;
    const startTime = Date.now();

    const animateProgress = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(value * easeProgress);

      if (progress < 1) {
        requestAnimationFrame(animateProgress);
      }
    };

    requestAnimationFrame(animateProgress);
  }, [isInView, value, animate]);

  const percentage = (displayValue / max) * 100;

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
  };

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div ref={ref} className={className}>
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`${colorClasses[color]} ${sizeClasses[size]} rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-sm text-gray-600 mt-1">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}

// Animated badge/chip with bounce effect
interface AnimatedBadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  pulse?: boolean;
  className?: string;
}

export function AnimatedBadge({
  children,
  variant = 'default',
  pulse = false,
  className = '',
}: AnimatedBadgeProps) {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  };

  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${variantClasses[variant]}
        ${pulse ? 'animate-pulse-slow' : ''}
        animate-scale-in
        ${className}
      `}
    >
      {children}
    </span>
  );
}

// Skeleton loader with animation
interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
  className?: string;
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  lines = 1,
  className = '',
}: SkeletonProps) {
  const baseClasses = 'bg-gray-200 animate-pulse';

  if (variant === 'circular') {
    return (
      <div
        className={`${baseClasses} rounded-full ${className}`}
        style={{
          width: width || '40px',
          height: height || width || '40px',
        }}
      />
    );
  }

  if (variant === 'rectangular') {
    return (
      <div
        className={`${baseClasses} rounded ${className}`}
        style={{
          width: width || '100%',
          height: height || '100px',
        }}
      />
    );
  }

  // Text variant
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`${baseClasses} rounded h-4`}
          style={{
            width: i === lines - 1 && lines > 1 ? '75%' : (width || '100%'),
          }}
        />
      ))}
    </div>
  );
}

// Notification toast with enter/exit animations
interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  isVisible: boolean;
  onClose?: () => void;
}

export function Toast({ message, type = 'info', isVisible, onClose }: ToastProps) {
  const typeClasses = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
  };

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-white shadow-lg
        ${typeClasses[type]}
        ${isVisible ? 'animate-notification-enter' : 'animate-notification-exit'}
      `}
    >
      <div className="flex items-center gap-2">
        <span>{message}</span>
        {onClose && (
          <button onClick={onClose} className="ml-2 hover:opacity-80">
            x
          </button>
        )}
      </div>
    </div>
  );
}

export default {
  FadeIn,
  Stagger,
  CountUp,
  Shimmer,
  Pulse,
  ScaleOnHover,
  ProgressBar,
  AnimatedBadge,
  Skeleton,
  Toast,
  useInView,
};
