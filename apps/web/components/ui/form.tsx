'use client';

import { ReactNode, forwardRef, createContext, useContext, useId } from 'react';
import { AlertCircle, CheckCircle, Info, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

// Form Context
interface FormFieldContextType {
  id: string;
  error?: string;
  required?: boolean;
}

const FormFieldContext = createContext<FormFieldContextType | null>(null);

function useFormField() {
  return useContext(FormFieldContext);
}

// Form Field Wrapper
interface FormFieldProps {
  children: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
}

export function FormField({ children, error, required, className = '' }: FormFieldProps) {
  const id = useId();

  return (
    <FormFieldContext.Provider value={{ id, error, required }}>
      <div className={`space-y-1.5 ${className}`}>{children}</div>
    </FormFieldContext.Provider>
  );
}

// Form Label
interface FormLabelProps {
  children: ReactNode;
  htmlFor?: string;
  optional?: boolean;
  tooltip?: string;
  className?: string;
}

export function FormLabel({ children, htmlFor, optional, tooltip, className = '' }: FormLabelProps) {
  const context = useFormField();
  const labelFor = htmlFor || context?.id;

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor={labelFor}
        className={`block text-sm font-medium text-gray-700 dark:text-gray-300 ${className}`}
      >
        {children}
        {context?.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {optional && (
        <span className="text-xs text-gray-400 dark:text-gray-500">(opțional)</span>
      )}
      {tooltip && (
        <div className="group relative">
          <Info className="w-4 h-4 text-gray-400 cursor-help" />
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
            {tooltip}
          </div>
        </div>
      )}
    </div>
  );
}

// Form Description
interface FormDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function FormDescription({ children, className = '' }: FormDescriptionProps) {
  return (
    <p className={`text-sm text-gray-500 dark:text-gray-400 ${className}`}>{children}</p>
  );
}

// Form Error Message
interface FormErrorProps {
  children?: ReactNode;
  className?: string;
}

export function FormError({ children, className = '' }: FormErrorProps) {
  const context = useFormField();
  const message = children || context?.error;

  if (!message) return null;

  return (
    <p className={`flex items-center gap-1.5 text-sm text-red-500 ${className}`}>
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      {message}
    </p>
  );
}

// Form Success Message
interface FormSuccessProps {
  children: ReactNode;
  className?: string;
}

export function FormSuccess({ children, className = '' }: FormSuccessProps) {
  return (
    <p className={`flex items-center gap-1.5 text-sm text-green-500 ${className}`}>
      <CheckCircle className="w-4 h-4 flex-shrink-0" />
      {children}
    </p>
  );
}

// Enhanced Input with validation
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  success?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  leftAddon?: ReactNode;
  rightAddon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      error,
      success,
      leftIcon,
      rightIcon,
      leftAddon,
      rightAddon,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const context = useFormField();
    const hasError = error || !!context?.error;
    const inputId = props.id || context?.id;

    const baseStyles = `
      w-full px-4 py-2.5 text-sm
      bg-white dark:bg-gray-900
      border rounded-lg
      transition-all duration-200
      placeholder:text-gray-400 dark:placeholder:text-gray-500
      focus:outline-none focus:ring-2 focus:ring-offset-0
      disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-800
    `;

    const stateStyles = hasError
      ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500/20'
      : success
        ? 'border-green-300 dark:border-green-600 focus:border-green-500 focus:ring-green-500/20'
        : 'border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-primary/20';

    const inputElement = (
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3 text-gray-400">{leftIcon}</span>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={`
            ${baseStyles}
            ${stateStyles}
            ${leftIcon ? 'pl-10' : ''}
            ${rightIcon ? 'pr-10' : ''}
            ${className}
          `}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 text-gray-400">{rightIcon}</span>
        )}
        {hasError && !rightIcon && (
          <AlertCircle className="absolute right-3 w-5 h-5 text-red-500" />
        )}
        {success && !rightIcon && !hasError && (
          <CheckCircle className="absolute right-3 w-5 h-5 text-green-500" />
        )}
      </div>
    );

    if (leftAddon || rightAddon) {
      return (
        <div className="flex">
          {leftAddon && (
            <span className="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-50 dark:bg-gray-800 border border-r-0 border-gray-200 dark:border-gray-700 rounded-l-lg">
              {leftAddon}
            </span>
          )}
          <div className={`flex-1 ${leftAddon ? '[&_input]:rounded-l-none' : ''} ${rightAddon ? '[&_input]:rounded-r-none' : ''}`}>
            {inputElement}
          </div>
          {rightAddon && (
            <span className="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-50 dark:bg-gray-800 border border-l-0 border-gray-200 dark:border-gray-700 rounded-r-lg">
              {rightAddon}
            </span>
          )}
        </div>
      );
    }

    return inputElement;
  }
);

Input.displayName = 'Input';

// Password Input with toggle
interface PasswordInputProps extends Omit<InputProps, 'type' | 'rightIcon'> {
  showStrength?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showStrength, value, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    const getStrength = (password: string): { label: string; color: string; width: string } => {
      if (!password) return { label: '', color: '', width: '0%' };

      let strength = 0;
      if (password.length >= 8) strength++;
      if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
      if (/\d/.test(password)) strength++;
      if (/[^a-zA-Z0-9]/.test(password)) strength++;

      const strengths = [
        { label: 'Foarte slab', color: 'bg-red-500', width: '25%' },
        { label: 'Slab', color: 'bg-orange-500', width: '50%' },
        { label: 'Mediu', color: 'bg-yellow-500', width: '75%' },
        { label: 'Puternic', color: 'bg-green-500', width: '100%' },
      ];

      return strengths[Math.min(strength, 3)];
    };

    const strength = showStrength && typeof value === 'string' ? getStrength(value) : null;

    return (
      <div className="space-y-2">
        <div className="relative">
          <Input
            ref={ref}
            type={showPassword ? 'text' : 'password'}
            value={value}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {strength && strength.label && (
          <div className="space-y-1">
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${strength.color} transition-all duration-300`}
                style={{ width: strength.width }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{strength.label}</p>
          </div>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

// Search Input
interface SearchInputProps extends Omit<InputProps, 'type' | 'leftIcon'> {
  onClear?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onClear, value, ...props }, ref) => {
    return (
      <div className="relative">
        <Input
          ref={ref}
          type="search"
          value={value}
          leftIcon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
          {...props}
        />
        {value && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';

// Number Input with increment/decrement
interface NumberInputProps extends Omit<InputProps, 'type' | 'value' | 'onChange'> {
  value?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value = 0, onChange, min, max, step = 1, disabled, ...props }, ref) => {
    const handleChange = (newValue: number) => {
      if (min !== undefined && newValue < min) return;
      if (max !== undefined && newValue > max) return;
      onChange?.(newValue);
    };

    return (
      <div className="flex">
        <button
          type="button"
          onClick={() => handleChange(value - step)}
          disabled={disabled || (min !== undefined && value <= min)}
          className="px-3 py-2 border border-r-0 border-gray-200 dark:border-gray-700 rounded-l-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <Input
          ref={ref}
          type="number"
          value={value}
          onChange={(e) => handleChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className="rounded-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          {...props}
        />
        <button
          type="button"
          onClick={() => handleChange(value + step)}
          disabled={disabled || (max !== undefined && value >= max)}
          className="px-3 py-2 border border-l-0 border-gray-200 dark:border-gray-700 rounded-r-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    );
  }
);

NumberInput.displayName = 'NumberInput';

// Form Group (horizontal layout)
interface FormGroupProps {
  children: ReactNode;
  className?: string;
}

export function FormGroup({ children, className = '' }: FormGroupProps) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${className}`}>{children}</div>
  );
}

// Form Section (with title)
interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function FormSection({ title, description, children, className = '' }: FormSectionProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

// Form Actions (buttons container)
interface FormActionsProps {
  children: ReactNode;
  align?: 'left' | 'center' | 'right' | 'between';
  className?: string;
}

export function FormActions({ children, align = 'right', className = '' }: FormActionsProps) {
  const alignStyles = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div className={`flex items-center gap-3 pt-4 ${alignStyles[align]} ${className}`}>
      {children}
    </div>
  );
}

// Inline Form
interface InlineFormProps {
  children: ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
}

export function InlineForm({ children, onSubmit, className = '' }: InlineFormProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(e);
      }}
      className={`flex items-end gap-3 ${className}`}
    >
      {children}
    </form>
  );
}

// Character Counter
interface CharacterCounterProps {
  current: number;
  max: number;
  showWarning?: boolean;
  className?: string;
}

export function CharacterCounter({
  current,
  max,
  showWarning = true,
  className = '',
}: CharacterCounterProps) {
  const percentage = (current / max) * 100;
  const isWarning = showWarning && percentage >= 80;
  const isError = percentage > 100;

  return (
    <span
      className={`text-xs ${
        isError
          ? 'text-red-500'
          : isWarning
            ? 'text-yellow-500'
            : 'text-gray-400 dark:text-gray-500'
      } ${className}`}
    >
      {current}/{max}
    </span>
  );
}
