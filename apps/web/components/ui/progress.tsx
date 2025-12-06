'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

// Progress Bar
interface ProgressBarProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'gradient';
  showValue?: boolean;
  label?: string;
  animated?: boolean;
  className?: string;
}

const sizeStyles = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

const variantStyles = {
  default: 'bg-primary',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  danger: 'bg-red-500',
  gradient: 'bg-gradient-to-r from-primary via-purple-500 to-pink-500',
};

// Shadcn-compatible Progress alias
interface ProgressProps {
  value?: number;
  max?: number;
  className?: string;
}

export function Progress({ value = 0, max = 100, className = '' }: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  return (
    <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden h-2 ${className}`}>
      <div
        className="h-full rounded-full bg-primary transition-all duration-300"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export function ProgressBar({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  showValue = false,
  label,
  animated = true,
  className = '',
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={`w-full ${className}`}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>}
          {showValue && (
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${sizeStyles[size]}`}>
        <motion.div
          initial={animated ? { width: 0 } : false}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full rounded-full ${variantStyles[variant]}`}
        />
      </div>
    </div>
  );
}

// Circular Progress
interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  showValue?: boolean;
  label?: string;
  className?: string;
}

const circularVariantColors = {
  default: 'text-primary',
  success: 'text-green-500',
  warning: 'text-yellow-500',
  danger: 'text-red-500',
};

export function CircularProgress({
  value,
  max = 100,
  size = 80,
  strokeWidth = 8,
  variant = 'default',
  showValue = true,
  label,
  className = '',
}: CircularProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background circle */}
        <svg className="absolute" width={size} height={size}>
          <circle
            className="text-gray-200 dark:text-gray-700"
            strokeWidth={strokeWidth}
            stroke="currentColor"
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
          />
        </svg>
        {/* Progress circle */}
        <svg className={`absolute transform -rotate-90 ${circularVariantColors[variant]}`} width={size} height={size}>
          <motion.circle
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeLinecap="round"
            stroke="currentColor"
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
          />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-semibold text-gray-900 dark:text-white">{Math.round(percentage)}%</span>
          </div>
        )}
      </div>
      {label && <span className="mt-2 text-sm text-gray-600 dark:text-gray-400">{label}</span>}
    </div>
  );
}

// Spinner
interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'primary' | 'white';
  className?: string;
}

const spinnerSizes = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

const spinnerColors = {
  default: 'text-gray-600 dark:text-gray-400',
  primary: 'text-primary',
  white: 'text-white',
};

export function Spinner({ size = 'md', variant = 'default', className = '' }: SpinnerProps) {
  return <Loader2 className={`animate-spin ${spinnerSizes[size]} ${spinnerColors[variant]} ${className}`} />;
}

// Dots Loader
interface DotsLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary';
  className?: string;
}

const dotSizes = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-3 h-3',
};

const dotColors = {
  default: 'bg-gray-600 dark:bg-gray-400',
  primary: 'bg-primary',
};

export function DotsLoader({ size = 'md', variant = 'default', className = '' }: DotsLoaderProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={`rounded-full ${dotSizes[size]} ${dotColors[variant]}`}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  );
}

// Pulse Loader
interface PulseLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const pulseSizes = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

export function PulseLoader({ size = 'md', className = '' }: PulseLoaderProps) {
  return (
    <div className={`relative ${pulseSizes[size]} ${className}`}>
      <motion.div
        className="absolute inset-0 rounded-full bg-primary/30"
        animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
      <motion.div
        className="absolute inset-0 rounded-full bg-primary/50"
        animate={{ scale: [1, 1.3], opacity: [0.7, 0] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
      />
      <div className="absolute inset-2 rounded-full bg-primary" />
    </div>
  );
}

// Loading Overlay
interface LoadingOverlayProps {
  loading: boolean;
  children: ReactNode;
  text?: string;
  blur?: boolean;
  className?: string;
}

export function LoadingOverlay({ loading, children, text, blur = true, className = '' }: LoadingOverlayProps) {
  return (
    <div className={`relative ${className}`}>
      {children}
      {loading && (
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/80 z-10 ${
            blur ? 'backdrop-blur-sm' : ''
          }`}
        >
          <Spinner size="lg" variant="primary" />
          {text && <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">{text}</p>}
        </div>
      )}
    </div>
  );
}

// Step Progress
interface StepProgressProps {
  steps: Array<{
    label: string;
    description?: string;
  }>;
  currentStep: number;
  variant?: 'horizontal' | 'vertical';
  className?: string;
}

export function StepProgress({ steps, currentStep, variant = 'horizontal', className = '' }: StepProgressProps) {
  if (variant === 'vertical') {
    return (
      <div className={`space-y-0 ${className}`}>
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <div key={index} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm
                    ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isCurrent
                          ? 'bg-primary text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }
                  `}
                >
                  {isCompleted ? <CheckCircle className="w-5 h-5" /> : index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-0.5 h-12 ${isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                  />
                )}
              </div>
              <div className="pb-12">
                <p
                  className={`font-medium ${isCurrent ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{step.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <div key={index} className="flex-1 flex items-center">
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-medium
                    ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isCurrent
                          ? 'bg-primary text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }
                  `}
                >
                  {isCompleted ? <CheckCircle className="w-5 h-5" /> : index + 1}
                </div>
                <p
                  className={`mt-2 text-sm text-center ${isCurrent ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  {step.label}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-4 ${isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Upload Progress
interface UploadProgressProps {
  fileName: string;
  progress: number;
  status?: 'uploading' | 'success' | 'error';
  onCancel?: () => void;
  onRetry?: () => void;
  className?: string;
}

export function UploadProgress({
  fileName,
  progress,
  status = 'uploading',
  onCancel,
  onRetry,
  className = '',
}: UploadProgressProps) {
  return (
    <div className={`p-3 bg-gray-50 dark:bg-gray-800 rounded-lg ${className}`}>
      <div className="flex items-center gap-3">
        {status === 'uploading' && <Spinner size="sm" variant="primary" />}
        {status === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
        {status === 'error' && <XCircle className="w-5 h-5 text-red-500" />}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{fileName}</p>
          {status === 'uploading' && (
            <div className="mt-1.5">
              <ProgressBar value={progress} size="sm" animated={false} />
            </div>
          )}
          {status === 'error' && <p className="text-xs text-red-500 mt-0.5">Încărcare eșuată</p>}
        </div>

        {status === 'uploading' && onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XCircle className="w-5 h-5" />
          </button>
        )}
        {status === 'error' && onRetry && (
          <button onClick={onRetry} className="text-sm text-primary hover:text-primary/80 font-medium">
            Reîncearcă
          </button>
        )}
      </div>
    </div>
  );
}
