'use client';

import { forwardRef, memo } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';

/**
 * Animated Button Component - DocumentIulia.ro
 * Micro-interactions for better user feedback
 */

export interface AnimatedButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const VARIANT_STYLES = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white border-transparent',
  secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900 border-transparent dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white',
  danger: 'bg-red-600 hover:bg-red-700 text-white border-transparent',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 border-transparent dark:hover:bg-gray-800 dark:text-gray-300',
  outline: 'bg-transparent hover:bg-gray-50 text-gray-700 border-gray-300 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-800',
};

const SIZE_STYLES = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5',
};

export const AnimatedButton = memo(
  forwardRef<HTMLButtonElement, AnimatedButtonProps>(function AnimatedButton(
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      className = '',
      ...props
    },
    ref
  ) {
    const isDisabled = disabled || loading;

    return (
      <motion.button
        ref={ref}
        whileHover={isDisabled ? {} : { scale: 1.02 }}
        whileTap={isDisabled ? {} : { scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center font-medium rounded-lg border
          transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${VARIANT_STYLES[variant]}
          ${SIZE_STYLES[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
            </motion.div>
            {loadingText || children}
          </>
        ) : (
          <>
            {leftIcon}
            {children}
            {rightIcon}
          </>
        )}
      </motion.button>
    );
  })
);

// Animated icon button
export const AnimatedIconButton = memo(
  forwardRef<HTMLButtonElement, Omit<AnimatedButtonProps, 'leftIcon' | 'rightIcon'>>(
    function AnimatedIconButton({ size = 'md', className = '', children, ...props }, ref) {
      const sizeStyles = {
        sm: 'p-1.5',
        md: 'p-2',
        lg: 'p-3',
      };

      return (
        <AnimatedButton
          ref={ref}
          size={size}
          className={`${sizeStyles[size]} ${className}`}
          {...props}
        >
          {children}
        </AnimatedButton>
      );
    }
  )
);

// Pulse animation for notifications/badges
export const PulseBadge = memo(function PulseBadge({
  children,
  pulse = true,
  color = 'blue',
  className = '',
}: {
  children: React.ReactNode;
  pulse?: boolean;
  color?: 'blue' | 'red' | 'green' | 'yellow';
  className?: string;
}) {
  const colorStyles = {
    blue: 'bg-blue-500',
    red: 'bg-red-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
  };

  return (
    <span className={`relative inline-flex ${className}`}>
      {pulse && (
        <motion.span
          animate={{ scale: [1, 1.5], opacity: [0.75, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
          className={`absolute inline-flex h-full w-full rounded-full ${colorStyles[color]} opacity-75`}
        />
      )}
      <span
        className={`relative inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full text-white ${colorStyles[color]}`}
      >
        {children}
      </span>
    </span>
  );
});

// Fade in animation wrapper
export const FadeIn = memo(function FadeIn({
  children,
  delay = 0,
  duration = 0.3,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration }}
      className={className}
    >
      {children}
    </motion.div>
  );
});

// Slide in animation wrapper
export const SlideIn = memo(function SlideIn({
  children,
  direction = 'left',
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
  delay?: number;
  className?: string;
}) {
  const variants = {
    left: { x: -20, opacity: 0 },
    right: { x: 20, opacity: 0 },
    up: { y: -20, opacity: 0 },
    down: { y: 20, opacity: 0 },
  };

  return (
    <motion.div
      initial={variants[direction]}
      animate={{ x: 0, y: 0, opacity: 1 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 24 }}
      className={className}
    >
      {children}
    </motion.div>
  );
});

// Stagger children animation
export const StaggerContainer = memo(function StaggerContainer({
  children,
  staggerDelay = 0.1,
  className = '',
}: {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
});

export const StaggerItem = memo(function StaggerItem({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
});

// Success/Error animation
export const StatusAnimation = memo(function StatusAnimation({
  status,
  size = 'md',
}: {
  status: 'success' | 'error' | 'warning';
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeMap = { sm: 24, md: 40, lg: 56 };
  const iconSize = sizeMap[size];

  const colors = {
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
  };

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 10 }}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke={colors[status]}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {status === 'success' && (
          <motion.path
            d="M20 6L9 17l-5-5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          />
        )}
        {status === 'error' && (
          <>
            <motion.line
              x1="18"
              y1="6"
              x2="6"
              y2="18"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            />
            <motion.line
              x1="6"
              y1="6"
              x2="18"
              y2="18"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            />
          </>
        )}
        {status === 'warning' && (
          <>
            <motion.path
              d="M12 9v4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            />
            <motion.circle
              cx="12"
              cy="17"
              r="0.5"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 }}
            />
          </>
        )}
      </svg>
    </motion.div>
  );
});

export default AnimatedButton;
