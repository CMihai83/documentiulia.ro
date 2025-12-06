'use client';

import React, { createContext, useContext, forwardRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Toggle Group Context
// ============================================================================

type ToggleGroupType = 'single' | 'multiple';

interface ToggleGroupContextValue {
  type: ToggleGroupType;
  value: string | string[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
}

const ToggleGroupContext = createContext<ToggleGroupContextValue | undefined>(undefined);

function useToggleGroup() {
  const context = useContext(ToggleGroupContext);
  if (!context) {
    throw new Error('Toggle Group components must be used within a ToggleGroup');
  }
  return context;
}

// ============================================================================
// Toggle Group
// ============================================================================

interface ToggleGroupProps {
  type: ToggleGroupType;
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  children: React.ReactNode;
}

export const ToggleGroup = forwardRef<HTMLDivElement, ToggleGroupProps>(
  ({
    type,
    value: controlledValue,
    defaultValue,
    onValueChange,
    disabled = false,
    size = 'md',
    variant = 'default',
    orientation = 'horizontal',
    className,
    children,
  }, ref) => {
    const [internalValue, setInternalValue] = useState<string | string[]>(
      defaultValue ?? (type === 'single' ? '' : [])
    );

    const value = controlledValue ?? internalValue;

    const handleValueChange = useCallback((itemValue: string) => {
      let newValue: string | string[];

      if (type === 'single') {
        newValue = value === itemValue ? '' : itemValue;
      } else {
        const currentArray = Array.isArray(value) ? value : [];
        if (currentArray.includes(itemValue)) {
          newValue = currentArray.filter(v => v !== itemValue);
        } else {
          newValue = [...currentArray, itemValue];
        }
      }

      if (controlledValue === undefined) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    }, [type, value, controlledValue, onValueChange]);

    return (
      <ToggleGroupContext.Provider value={{ type, value, onValueChange: handleValueChange, disabled, size, variant }}>
        <div
          ref={ref}
          role="group"
          className={cn(
            'inline-flex',
            orientation === 'horizontal' ? 'flex-row' : 'flex-col',
            variant === 'default' && 'bg-gray-100 dark:bg-gray-800 rounded-lg p-1',
            variant === 'outline' && 'border border-gray-200 dark:border-gray-700 rounded-lg p-1',
            className
          )}
        >
          {children}
        </div>
      </ToggleGroupContext.Provider>
    );
  }
);

ToggleGroup.displayName = 'ToggleGroup';

// ============================================================================
// Toggle Group Item
// ============================================================================

interface ToggleGroupItemProps {
  value: string;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const ToggleGroupItem = forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  ({ value, disabled: itemDisabled, className, children }, ref) => {
    const { type, value: groupValue, onValueChange, disabled: groupDisabled, size, variant } = useToggleGroup();

    const isSelected = type === 'single'
      ? groupValue === value
      : Array.isArray(groupValue) && groupValue.includes(value);
    const isDisabled = groupDisabled || itemDisabled;

    const sizeStyles = {
      sm: 'px-2.5 py-1.5 text-xs',
      md: 'px-3 py-2 text-sm',
      lg: 'px-4 py-2.5 text-base',
    };

    const variantStyles = {
      default: cn(
        'rounded-md transition-all duration-200',
        isSelected
          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
      ),
      outline: cn(
        'rounded-md border-2 transition-all duration-200',
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
          : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
      ),
      ghost: cn(
        'rounded-md transition-all duration-200',
        isSelected
          ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
      ),
    };

    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={isSelected}
        data-state={isSelected ? 'on' : 'off'}
        disabled={isDisabled}
        onClick={() => onValueChange(value)}
        className={cn(
          'relative inline-flex items-center justify-center font-medium',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          sizeStyles[size!],
          variantStyles[variant!],
          isDisabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        {children}
      </button>
    );
  }
);

ToggleGroupItem.displayName = 'ToggleGroupItem';

// ============================================================================
// Simple Toggle Group (No context needed)
// ============================================================================

interface SimpleToggleGroupProps {
  options: Array<{ value: string; label: string; icon?: React.ReactNode; disabled?: boolean }>;
  value?: string;
  onChange?: (value: string) => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'pills';
  className?: string;
}

export function SimpleToggleGroup({
  options,
  value,
  onChange,
  size = 'md',
  variant = 'default',
  className,
}: SimpleToggleGroupProps) {
  const [internalValue, setInternalValue] = useState(options[0]?.value || '');
  const selectedValue = value ?? internalValue;

  const handleChange = (newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };

  const sizeStyles = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <div
      className={cn(
        'inline-flex',
        variant === 'default' && 'bg-gray-100 dark:bg-gray-800 rounded-lg p-1',
        variant === 'outline' && 'border border-gray-200 dark:border-gray-700 rounded-lg',
        variant === 'pills' && 'gap-2',
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={option.disabled}
          onClick={() => handleChange(option.value)}
          className={cn(
            'relative inline-flex items-center justify-center gap-1.5 font-medium transition-all duration-200',
            sizeStyles[size],
            variant === 'default' && cn(
              'rounded-md',
              selectedValue === option.value
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            ),
            variant === 'outline' && cn(
              selectedValue === option.value
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            ),
            variant === 'pills' && cn(
              'rounded-full',
              selectedValue === option.value
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            ),
            option.disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Icon Toggle Group
// ============================================================================

interface IconToggleGroupProps {
  options: Array<{ value: string; icon: React.ReactNode; label?: string; disabled?: boolean }>;
  value?: string;
  onChange?: (value: string) => void;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  className?: string;
}

export function IconToggleGroup({
  options,
  value,
  onChange,
  size = 'md',
  showLabels = false,
  className,
}: IconToggleGroupProps) {
  const [internalValue, setInternalValue] = useState(options[0]?.value || '');
  const selectedValue = value ?? internalValue;

  const handleChange = (newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };

  const sizeStyles = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div
      className={cn(
        'inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-1',
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={option.disabled}
          onClick={() => handleChange(option.value)}
          title={option.label}
          className={cn(
            'relative flex items-center justify-center rounded-md transition-all duration-200',
            sizeStyles[size],
            selectedValue === option.value
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
            option.disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span className={iconSizes[size]}>{option.icon}</span>
          {showLabels && option.label && (
            <span className="sr-only">{option.label}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Animated Toggle Group
// ============================================================================

interface AnimatedToggleGroupProps {
  options: Array<{ value: string; label: string }>;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function AnimatedToggleGroup({
  options,
  value,
  onChange,
  className,
}: AnimatedToggleGroupProps) {
  const [internalValue, setInternalValue] = useState(options[0]?.value || '');
  const selectedValue = value ?? internalValue;
  const selectedIndex = options.findIndex(o => o.value === selectedValue);

  const handleChange = (newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };

  return (
    <div
      className={cn(
        'relative inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1',
        className
      )}
    >
      {/* Animated background */}
      <motion.div
        className="absolute top-1 bottom-1 bg-white dark:bg-gray-700 rounded-md shadow-sm"
        initial={false}
        animate={{
          left: `calc(${selectedIndex * (100 / options.length)}% + 4px)`,
          width: `calc(${100 / options.length}% - 8px)`,
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />

      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => handleChange(option.value)}
          className={cn(
            'relative z-10 flex-1 px-4 py-2 text-sm font-medium transition-colors duration-200',
            selectedValue === option.value
              ? 'text-gray-900 dark:text-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// View Mode Toggle
// ============================================================================

interface ViewModeToggleProps {
  value?: 'grid' | 'list' | 'table';
  onChange?: (value: 'grid' | 'list' | 'table') => void;
  options?: Array<'grid' | 'list' | 'table'>;
  className?: string;
}

export function ViewModeToggle({
  value,
  onChange,
  options = ['grid', 'list'],
  className,
}: ViewModeToggleProps) {
  const [internalValue, setInternalValue] = useState<'grid' | 'list' | 'table'>(options[0]);
  const selectedValue = value ?? internalValue;

  const handleChange = (newValue: 'grid' | 'list' | 'table') => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };

  const icons = {
    grid: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
    list: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
    table: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  };

  const labels = {
    grid: 'Grila',
    list: 'Lista',
    table: 'Tabel',
  };

  return (
    <div
      className={cn(
        'inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-1',
        className
      )}
    >
      {options.map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => handleChange(mode)}
          title={labels[mode]}
          className={cn(
            'w-9 h-9 flex items-center justify-center rounded-md transition-all duration-200',
            selectedValue === mode
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          )}
        >
          {icons[mode]}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Sort Toggle
// ============================================================================

interface SortToggleProps {
  value?: 'asc' | 'desc';
  onChange?: (value: 'asc' | 'desc') => void;
  label?: string;
  className?: string;
}

export function SortToggle({
  value,
  onChange,
  label,
  className,
}: SortToggleProps) {
  const [internalValue, setInternalValue] = useState<'asc' | 'desc'>('asc');
  const selectedValue = value ?? internalValue;

  const handleToggle = () => {
    const newValue = selectedValue === 'asc' ? 'desc' : 'asc';
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium',
        'bg-gray-100 dark:bg-gray-800 rounded-lg',
        'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
        'transition-colors duration-200',
        className
      )}
    >
      {label && <span>{label}</span>}
      <motion.svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        animate={{ rotateX: selectedValue === 'desc' ? 180 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
      </motion.svg>
    </button>
  );
}

// ============================================================================
// Multi-Select Toggle Group
// ============================================================================

interface MultiToggleGroupProps {
  options: Array<{ value: string; label: string; icon?: React.ReactNode }>;
  value?: string[];
  onChange?: (value: string[]) => void;
  max?: number;
  className?: string;
}

export function MultiToggleGroup({
  options,
  value,
  onChange,
  max,
  className,
}: MultiToggleGroupProps) {
  const [internalValue, setInternalValue] = useState<string[]>([]);
  const selectedValues = value ?? internalValue;

  const handleToggle = (toggleValue: string) => {
    let newValues: string[];

    if (selectedValues.includes(toggleValue)) {
      newValues = selectedValues.filter(v => v !== toggleValue);
    } else {
      if (max && selectedValues.length >= max) {
        return;
      }
      newValues = [...selectedValues, toggleValue];
    }

    if (value === undefined) {
      setInternalValue(newValues);
    }
    onChange?.(newValues);
  };

  return (
    <div
      className={cn(
        'flex flex-wrap gap-2',
        className
      )}
    >
      {options.map((option) => {
        const isSelected = selectedValues.includes(option.value);
        const isDisabled = !isSelected && max !== undefined && selectedValues.length >= max;

        return (
          <button
            key={option.value}
            type="button"
            disabled={isDisabled}
            onClick={() => handleToggle(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200',
              isSelected
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
              isDisabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {option.icon}
            {option.label}
            {isSelected && (
              <motion.svg
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </motion.svg>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Tab Toggle Group
// ============================================================================

interface TabToggleGroupProps {
  tabs: Array<{ value: string; label: string; count?: number; icon?: React.ReactNode }>;
  value?: string;
  onChange?: (value: string) => void;
  variant?: 'underline' | 'pills' | 'enclosed';
  className?: string;
}

export function TabToggleGroup({
  tabs,
  value,
  onChange,
  variant = 'underline',
  className,
}: TabToggleGroupProps) {
  const [internalValue, setInternalValue] = useState(tabs[0]?.value || '');
  const selectedValue = value ?? internalValue;

  const handleChange = (newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };

  return (
    <div
      className={cn(
        'inline-flex',
        variant === 'underline' && 'border-b border-gray-200 dark:border-gray-700',
        variant === 'pills' && 'gap-2',
        variant === 'enclosed' && 'bg-gray-100 dark:bg-gray-800 rounded-lg p-1',
        className
      )}
    >
      {tabs.map((tab) => {
        const isSelected = selectedValue === tab.value;

        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => handleChange(tab.value)}
            className={cn(
              'relative inline-flex items-center gap-2 font-medium transition-all duration-200',
              variant === 'underline' && cn(
                'px-4 py-2 -mb-px text-sm',
                isSelected
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 border-b-2 border-transparent'
              ),
              variant === 'pills' && cn(
                'px-4 py-2 rounded-full text-sm',
                isSelected
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              ),
              variant === 'enclosed' && cn(
                'px-4 py-2 rounded-md text-sm',
                isSelected
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              )
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  'ml-1 px-2 py-0.5 text-xs rounded-full',
                  isSelected
                    ? variant === 'pills'
                      ? 'bg-white/20 text-white'
                      : 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Theme Toggle
// ============================================================================

interface ThemeToggleProps {
  value?: 'light' | 'dark' | 'system';
  onChange?: (value: 'light' | 'dark' | 'system') => void;
  showLabels?: boolean;
  className?: string;
}

export function ThemeToggle({
  value,
  onChange,
  showLabels = false,
  className,
}: ThemeToggleProps) {
  const [internalValue, setInternalValue] = useState<'light' | 'dark' | 'system'>('system');
  const selectedValue = value ?? internalValue;

  const handleChange = (newValue: 'light' | 'dark' | 'system') => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };

  const options = [
    {
      value: 'light' as const,
      label: 'Luminos',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      value: 'dark' as const,
      label: 'Intunecat',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ),
    },
    {
      value: 'system' as const,
      label: 'Sistem',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  return (
    <div
      className={cn(
        'inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-1',
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => handleChange(option.value)}
          title={option.label}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-md transition-all duration-200',
            showLabels ? 'px-3 py-2' : 'w-9 h-9',
            selectedValue === option.value
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          )}
        >
          {option.icon}
          {showLabels && <span className="text-sm font-medium">{option.label}</span>}
        </button>
      ))}
    </div>
  );
}

export default ToggleGroup;
