'use client';

import { forwardRef, ReactNode, InputHTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { Check, Minus } from 'lucide-react';

// Basic Checkbox
interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: ReactNode;
  description?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  indeterminate?: boolean;
}

const checkboxSizes = {
  sm: { box: 'w-4 h-4', icon: 'w-3 h-3', text: 'text-sm' },
  md: { box: 'w-5 h-5', icon: 'w-3.5 h-3.5', text: 'text-sm' },
  lg: { box: 'w-6 h-6', icon: 'w-4 h-4', text: 'text-base' },
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      description,
      error,
      size = 'md',
      indeterminate = false,
      disabled,
      checked,
      className = '',
      ...props
    },
    ref
  ) => {
    const sizes = checkboxSizes[size];
    const isChecked = checked || indeterminate;

    return (
      <label
        className={`
          inline-flex items-start gap-3
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
          ${className}
        `}
      >
        <div className="relative flex-shrink-0">
          <input
            ref={ref}
            type="checkbox"
            disabled={disabled}
            checked={checked}
            className="sr-only peer"
            {...props}
          />
          <div
            className={`
              ${sizes.box}
              rounded border-2 transition-all duration-200
              flex items-center justify-center
              ${isChecked
                ? 'bg-primary border-primary'
                : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600'
              }
              ${error ? 'border-red-500' : ''}
              peer-focus:ring-2 peer-focus:ring-primary/20 peer-focus:ring-offset-2
            `}
          >
            {isChecked && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.15 }}
              >
                {indeterminate ? (
                  <Minus className={`${sizes.icon} text-white`} />
                ) : (
                  <Check className={`${sizes.icon} text-white`} />
                )}
              </motion.div>
            )}
          </div>
        </div>
        {(label || description) && (
          <div className="flex-1 min-w-0">
            {label && (
              <span className={`${sizes.text} font-medium text-gray-900 dark:text-white`}>
                {label}
              </span>
            )}
            {description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
            )}
            {error && <p className="text-sm text-red-500 mt-0.5">{error}</p>}
          </div>
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

// Checkbox Group
interface CheckboxGroupOption {
  value: string;
  label: ReactNode;
  description?: string;
  disabled?: boolean;
}

interface CheckboxGroupProps {
  options: CheckboxGroupOption[];
  value?: string[];
  onChange?: (value: string[]) => void;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function CheckboxGroup({
  options,
  value = [],
  onChange,
  name,
  size = 'md',
  orientation = 'vertical',
  className = '',
}: CheckboxGroupProps) {
  const handleChange = (optionValue: string, checked: boolean) => {
    const newValue = checked
      ? [...value, optionValue]
      : value.filter((v) => v !== optionValue);
    onChange?.(newValue);
  };

  return (
    <div
      className={`
        ${orientation === 'horizontal' ? 'flex flex-wrap gap-6' : 'space-y-3'}
        ${className}
      `}
    >
      {options.map((option) => (
        <Checkbox
          key={option.value}
          name={name}
          value={option.value}
          checked={value.includes(option.value)}
          onChange={(e) => handleChange(option.value, e.target.checked)}
          label={option.label}
          description={option.description}
          disabled={option.disabled}
          size={size}
        />
      ))}
    </div>
  );
}

// Radio Button
interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: ReactNode;
  description?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
}

const radioSizes = {
  sm: { box: 'w-4 h-4', dot: 'w-1.5 h-1.5', text: 'text-sm' },
  md: { box: 'w-5 h-5', dot: 'w-2 h-2', text: 'text-sm' },
  lg: { box: 'w-6 h-6', dot: 'w-2.5 h-2.5', text: 'text-base' },
};

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      label,
      description,
      error,
      size = 'md',
      disabled,
      checked,
      className = '',
      ...props
    },
    ref
  ) => {
    const sizes = radioSizes[size];

    return (
      <label
        className={`
          inline-flex items-start gap-3
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
          ${className}
        `}
      >
        <div className="relative flex-shrink-0">
          <input
            ref={ref}
            type="radio"
            disabled={disabled}
            checked={checked}
            className="sr-only peer"
            {...props}
          />
          <div
            className={`
              ${sizes.box}
              rounded-full border-2 transition-all duration-200
              flex items-center justify-center
              ${checked
                ? 'border-primary'
                : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600'
              }
              ${error ? 'border-red-500' : ''}
              peer-focus:ring-2 peer-focus:ring-primary/20 peer-focus:ring-offset-2
            `}
          >
            {checked && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.15 }}
                className={`${sizes.dot} rounded-full bg-primary`}
              />
            )}
          </div>
        </div>
        {(label || description) && (
          <div className="flex-1 min-w-0">
            {label && (
              <span className={`${sizes.text} font-medium text-gray-900 dark:text-white`}>
                {label}
              </span>
            )}
            {description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
            )}
            {error && <p className="text-sm text-red-500 mt-0.5">{error}</p>}
          </div>
        )}
      </label>
    );
  }
);

Radio.displayName = 'Radio';

// Radio Group
interface RadioGroupOption {
  value: string;
  label: ReactNode;
  description?: string;
  disabled?: boolean;
}

interface RadioGroupProps {
  options: RadioGroupOption[];
  value?: string;
  onChange?: (value: string) => void;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function RadioGroup({
  options,
  value,
  onChange,
  name,
  size = 'md',
  orientation = 'vertical',
  className = '',
}: RadioGroupProps) {
  return (
    <div
      role="radiogroup"
      className={`
        ${orientation === 'horizontal' ? 'flex flex-wrap gap-6' : 'space-y-3'}
        ${className}
      `}
    >
      {options.map((option) => (
        <Radio
          key={option.value}
          name={name}
          value={option.value}
          checked={value === option.value}
          onChange={() => onChange?.(option.value)}
          label={option.label}
          description={option.description}
          disabled={option.disabled}
          size={size}
        />
      ))}
    </div>
  );
}

// Radio Card (styled radio as card)
interface RadioCardOption {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

interface RadioCardGroupProps {
  options: RadioCardOption[];
  value?: string;
  onChange?: (value: string) => void;
  name: string;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function RadioCardGroup({
  options,
  value,
  onChange,
  name,
  columns = 2,
  className = '',
}: RadioCardGroupProps) {
  const colClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid gap-3 ${colClasses[columns]} ${className}`}>
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <label
            key={option.value}
            className={`
              relative flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer
              transition-all duration-200
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
            {option.icon && (
              <div
                className={`
                  flex-shrink-0 p-2 rounded-lg
                  ${isSelected ? 'bg-primary/10 text-primary' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}
                `}
              >
                {option.icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <span className="font-medium text-gray-900 dark:text-white">{option.label}</span>
              {option.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {option.description}
                </p>
              )}
            </div>
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
              >
                <Check className="w-4 h-4 text-white" />
              </motion.div>
            )}
          </label>
        );
      })}
    </div>
  );
}

// Checkbox Card
interface CheckboxCardOption {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

interface CheckboxCardGroupProps {
  options: CheckboxCardOption[];
  value?: string[];
  onChange?: (value: string[]) => void;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function CheckboxCardGroup({
  options,
  value = [],
  onChange,
  columns = 2,
  className = '',
}: CheckboxCardGroupProps) {
  const handleChange = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange?.(newValue);
  };

  const colClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid gap-3 ${colClasses[columns]} ${className}`}>
      {options.map((option) => {
        const isSelected = value.includes(option.value);
        return (
          <label
            key={option.value}
            className={`
              relative flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer
              transition-all duration-200
              ${isSelected
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }
              ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input
              type="checkbox"
              value={option.value}
              checked={isSelected}
              onChange={() => !option.disabled && handleChange(option.value)}
              disabled={option.disabled}
              className="sr-only"
            />
            {option.icon && (
              <div
                className={`
                  flex-shrink-0 p-2 rounded-lg
                  ${isSelected ? 'bg-primary/10 text-primary' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}
                `}
              >
                {option.icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <span className="font-medium text-gray-900 dark:text-white">{option.label}</span>
              {option.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {option.description}
                </p>
              )}
            </div>
            <div
              className={`
                absolute top-3 right-3 w-6 h-6 rounded border-2 flex items-center justify-center
                transition-all duration-200
                ${isSelected ? 'bg-primary border-primary' : 'border-gray-300 dark:border-gray-600'}
              `}
            >
              {isSelected && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <Check className="w-4 h-4 text-white" />
                </motion.div>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}

// Inline Checkbox List (tags style)
interface InlineCheckboxOption {
  value: string;
  label: string;
}

interface InlineCheckboxGroupProps {
  options: InlineCheckboxOption[];
  value?: string[];
  onChange?: (value: string[]) => void;
  className?: string;
}

export function InlineCheckboxGroup({
  options,
  value = [],
  onChange,
  className = '',
}: InlineCheckboxGroupProps) {
  const handleChange = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange?.(newValue);
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((option) => {
        const isSelected = value.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleChange(option.value)}
            className={`
              px-3 py-1.5 rounded-full text-sm font-medium transition-all
              ${isSelected
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }
            `}
          >
            {isSelected && <Check className="w-3 h-3 inline-block mr-1" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
