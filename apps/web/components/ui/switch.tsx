'use client';

import { ReactNode, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

// Basic Switch
interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'danger';
  label?: string;
  description?: string;
  className?: string;
}

const switchSizes = {
  sm: {
    track: 'w-8 h-4',
    thumb: 'w-3 h-3',
    translate: 'translate-x-4',
  },
  md: {
    track: 'w-11 h-6',
    thumb: 'w-5 h-5',
    translate: 'translate-x-5',
  },
  lg: {
    track: 'w-14 h-7',
    thumb: 'w-6 h-6',
    translate: 'translate-x-7',
  },
};

const switchVariants = {
  default: 'bg-primary',
  success: 'bg-green-500',
  danger: 'bg-red-500',
};

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      checked = false,
      onChange,
      disabled = false,
      size = 'md',
      variant = 'default',
      label,
      description,
      className = '',
    },
    ref
  ) => {
    const sizes = switchSizes[size];

    const handleClick = () => {
      if (!disabled) {
        onChange?.(!checked);
      }
    };

    const switchElement = (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleClick}
        className={`
          relative inline-flex flex-shrink-0 cursor-pointer rounded-full
          transition-colors duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2
          ${sizes.track}
          ${checked ? switchVariants[variant] : 'bg-gray-200 dark:bg-gray-700'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
      >
        <motion.span
          initial={false}
          animate={{ x: checked ? parseInt(sizes.translate.replace('translate-x-', '')) * 4 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={`
            pointer-events-none inline-block rounded-full bg-white shadow-lg
            transform ring-0 ${sizes.thumb}
            absolute top-0.5 left-0.5
          `}
        />
      </button>
    );

    if (label) {
      return (
        <label className={`flex items-start gap-3 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
          {switchElement}
          <div className="flex-1">
            <span className="text-sm font-medium text-gray-900 dark:text-white">{label}</span>
            {description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
            )}
          </div>
        </label>
      );
    }

    return switchElement;
  }
);

Switch.displayName = 'Switch';

// Switch with Icons
interface IconSwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'md' | 'lg';
  className?: string;
}

export function IconSwitch({
  checked = false,
  onChange,
  disabled = false,
  size = 'md',
  className = '',
}: IconSwitchProps) {
  const sizes = {
    md: { track: 'w-14 h-7', thumb: 'w-6 h-6', icon: 'w-3 h-3', translate: 28 },
    lg: { track: 'w-16 h-8', thumb: 'w-7 h-7', icon: 'w-4 h-4', translate: 32 },
  };

  const s = sizes[size];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!checked)}
      className={`
        relative inline-flex flex-shrink-0 cursor-pointer rounded-full
        transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2
        ${s.track}
        ${checked ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      <motion.span
        initial={false}
        animate={{ x: checked ? s.translate : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`
          pointer-events-none inline-flex items-center justify-center
          rounded-full bg-white shadow-lg transform
          ${s.thumb}
          absolute top-0.5 left-0.5
        `}
      >
        {checked ? (
          <Check className={`${s.icon} text-green-500`} />
        ) : (
          <X className={`${s.icon} text-gray-400`} />
        )}
      </motion.span>
    </button>
  );
}

// Toggle Group (radio-style buttons)
interface ToggleGroupOption {
  value: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

interface ToggleGroupProps {
  options: ToggleGroupOption[];
  value?: string;
  onChange?: (value: string) => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'pills' | 'bordered';
  fullWidth?: boolean;
  className?: string;
}

const toggleGroupSizes = {
  sm: 'px-2.5 py-1 text-xs gap-1',
  md: 'px-3 py-1.5 text-sm gap-1.5',
  lg: 'px-4 py-2 text-base gap-2',
};

export function ToggleGroup({
  options,
  value,
  onChange,
  size = 'md',
  variant = 'default',
  fullWidth = false,
  className = '',
}: ToggleGroupProps) {
  const containerStyles = {
    default: 'bg-gray-100 dark:bg-gray-800 p-1 rounded-lg',
    pills: 'gap-2',
    bordered: 'border border-gray-200 dark:border-gray-700 rounded-lg p-1',
  };

  const buttonStyles = {
    default: {
      base: 'rounded-md',
      active: 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white',
      inactive: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
    },
    pills: {
      base: 'rounded-full border',
      active: 'bg-primary text-white border-primary',
      inactive: 'bg-transparent text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300',
    },
    bordered: {
      base: 'rounded-md',
      active: 'bg-primary/10 text-primary',
      inactive: 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
    },
  };

  const styles = buttonStyles[variant];

  return (
    <div
      className={`
        inline-flex
        ${containerStyles[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={option.disabled}
            onClick={() => !option.disabled && onChange?.(option.value)}
            className={`
              inline-flex items-center justify-center font-medium transition-all
              ${toggleGroupSizes[size]}
              ${styles.base}
              ${isActive ? styles.active : styles.inactive}
              ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}
              ${fullWidth ? 'flex-1' : ''}
            `}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// Toggle Button (single toggle)
interface ToggleButtonProps {
  pressed?: boolean;
  onChange?: (pressed: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline';
  children: ReactNode;
  className?: string;
}

export function ToggleButton({
  pressed = false,
  onChange,
  disabled = false,
  size = 'md',
  variant = 'default',
  children,
  className = '',
}: ToggleButtonProps) {
  const sizeStyles = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const variantStyles = {
    default: {
      active: 'bg-primary text-white',
      inactive: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700',
    },
    outline: {
      active: 'bg-primary/10 text-primary border-primary',
      inactive: 'bg-transparent text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300',
    },
  };

  const styles = variantStyles[variant];

  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!pressed)}
      className={`
        inline-flex items-center justify-center font-medium rounded-lg transition-all
        ${variant === 'outline' ? 'border' : ''}
        ${sizeStyles[size]}
        ${pressed ? styles.active : styles.inactive}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {children}
    </button>
  );
}

// Segmented Control (iOS-style)
interface SegmentedControlOption {
  value: string;
  label: string;
}

interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value?: string;
  onChange?: (value: string) => void;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  size = 'md',
  fullWidth = false,
  className = '',
}: SegmentedControlProps) {
  const sizeStyles = {
    sm: 'h-8 text-xs',
    md: 'h-10 text-sm',
    lg: 'h-12 text-base',
  };

  const activeIndex = options.findIndex((opt) => opt.value === value);

  return (
    <div
      className={`
        relative bg-gray-100 dark:bg-gray-800 rounded-lg p-1
        ${fullWidth ? 'w-full' : 'inline-flex'}
        ${className}
      `}
    >
      {/* Active indicator */}
      {activeIndex >= 0 && (
        <motion.div
          layoutId="segmented-indicator"
          initial={false}
          animate={{
            x: `${activeIndex * 100}%`,
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute inset-y-1 bg-white dark:bg-gray-700 rounded-md shadow-sm"
          style={{ width: `${100 / options.length}%` }}
        />
      )}

      {/* Options */}
      <div className={`relative flex ${fullWidth ? 'w-full' : ''}`}>
        {options.map((option) => {
          const isActive = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange?.(option.value)}
              className={`
                flex-1 flex items-center justify-center font-medium rounded-md
                transition-colors z-10
                ${sizeStyles[size]}
                ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}
              `}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Theme Toggle (Dark/Light mode)
interface ThemeToggleProps {
  theme?: 'light' | 'dark' | 'system';
  onChange?: (theme: 'light' | 'dark' | 'system') => void;
  showSystem?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function ThemeToggle({
  theme = 'light',
  onChange,
  showSystem = true,
  size = 'md',
  className = '',
}: ThemeToggleProps) {
  const options = [
    { value: 'light', label: 'Luminos' },
    { value: 'dark', label: 'Întunecat' },
    ...(showSystem ? [{ value: 'system', label: 'Sistem' }] : []),
  ];

  return (
    <SegmentedControl
      options={options}
      value={theme}
      onChange={(val) => onChange?.(val as 'light' | 'dark' | 'system')}
      size={size}
      className={className}
    />
  );
}

// Switch Group (multiple switches)
interface SwitchGroupItem {
  id: string;
  label: string;
  description?: string;
  checked?: boolean;
  disabled?: boolean;
}

interface SwitchGroupProps {
  items: SwitchGroupItem[];
  onChange?: (id: string, checked: boolean) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function SwitchGroup({ items, onChange, size = 'md', className = '' }: SwitchGroupProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {items.map((item) => (
        <Switch
          key={item.id}
          checked={item.checked}
          onChange={(checked) => onChange?.(item.id, checked)}
          disabled={item.disabled}
          size={size}
          label={item.label}
          description={item.description}
        />
      ))}
    </div>
  );
}

// Radio Toggle (styled radio buttons)
interface RadioToggleOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface RadioToggleProps {
  options: RadioToggleOption[];
  value?: string;
  onChange?: (value: string) => void;
  name: string;
  className?: string;
}

export function RadioToggle({
  options,
  value,
  onChange,
  name,
  className = '',
}: RadioToggleProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <label
            key={option.value}
            className={`
              flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all
              ${isSelected
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }
              ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={isSelected}
              onChange={() => !option.disabled && onChange?.(option.value)}
              disabled={option.disabled}
              className="sr-only"
            />
            <div
              className={`
                w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5
                ${isSelected ? 'border-primary' : 'border-gray-300 dark:border-gray-600'}
              `}
            >
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-2.5 h-2.5 rounded-full bg-primary"
                />
              )}
            </div>
            <div>
              <span className="font-medium text-gray-900 dark:text-white">{option.label}</span>
              {option.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{option.description}</p>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}
