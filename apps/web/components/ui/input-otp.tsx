'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type InputOTPSize = 'sm' | 'md' | 'lg';
export type InputOTPVariant = 'default' | 'outline' | 'filled';

interface InputOTPContextValue {
  value: string;
  length: number;
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
  handleChange: (index: number, char: string) => void;
  handleKeyDown: (index: number, e: React.KeyboardEvent) => void;
  handlePaste: (e: React.ClipboardEvent) => void;
  disabled?: boolean;
  size: InputOTPSize;
  variant: InputOTPVariant;
  inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
}

const InputOTPContext = React.createContext<InputOTPContextValue | null>(null);

function useInputOTP() {
  const context = React.useContext(InputOTPContext);
  if (!context) {
    throw new Error('useInputOTP must be used within an InputOTP');
  }
  return context;
}

// ============================================================================
// Size Classes
// ============================================================================

const sizeClasses: Record<InputOTPSize, { slot: string; text: string }> = {
  sm: { slot: 'h-9 w-9', text: 'text-lg' },
  md: { slot: 'h-11 w-11', text: 'text-xl' },
  lg: { slot: 'h-14 w-14', text: 'text-2xl' },
};

const variantClasses: Record<InputOTPVariant, { base: string; focus: string }> = {
  default: {
    base: 'border border-input bg-background',
    focus: 'ring-2 ring-ring ring-offset-2 ring-offset-background',
  },
  outline: {
    base: 'border-2 border-input bg-transparent',
    focus: 'border-primary',
  },
  filled: {
    base: 'border border-transparent bg-muted',
    focus: 'bg-background border-primary ring-2 ring-ring',
  },
};

// ============================================================================
// InputOTP
// ============================================================================

interface InputOTPProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  size?: InputOTPSize;
  variant?: InputOTPVariant;
  autoFocus?: boolean;
  type?: 'text' | 'number';
  mask?: boolean;
  error?: boolean;
}

export const InputOTP = React.forwardRef<HTMLDivElement, InputOTPProps>(
  (
    {
      className,
      value: controlledValue,
      defaultValue = '',
      onChange,
      onComplete,
      length = 6,
      disabled = false,
      size = 'md',
      variant = 'default',
      autoFocus = false,
      type = 'text',
      mask = false,
      error = false,
      children,
      ...props
    },
    ref
  ) => {
    const [uncontrolledValue, setUncontrolledValue] = React.useState(
      defaultValue.slice(0, length).padEnd(length, '')
    );
    const [focusedIndex, setFocusedIndex] = React.useState(-1);
    const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue.padEnd(length, '') : uncontrolledValue;

    React.useEffect(() => {
      if (autoFocus) {
        inputRefs.current[0]?.focus();
      }
    }, [autoFocus]);

    const handleChange = React.useCallback(
      (index: number, char: string) => {
        const newValue = value.split('');

        if (type === 'number' && char && !/^\d$/.test(char)) {
          return;
        }

        newValue[index] = char;
        const newValueStr = newValue.join('');

        if (!isControlled) {
          setUncontrolledValue(newValueStr);
        }
        onChange?.(newValueStr.replace(/\s/g, ''));

        if (char && index < length - 1) {
          inputRefs.current[index + 1]?.focus();
        }

        const filledValue = newValueStr.replace(/\s/g, '');
        if (filledValue.length === length) {
          onComplete?.(filledValue);
        }
      },
      [value, isControlled, onChange, onComplete, length, type]
    );

    const handleKeyDown = React.useCallback(
      (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace') {
          e.preventDefault();
          if (value[index] !== ' ') {
            handleChange(index, ' ');
          } else if (index > 0) {
            inputRefs.current[index - 1]?.focus();
            handleChange(index - 1, ' ');
          }
        } else if (e.key === 'ArrowLeft' && index > 0) {
          e.preventDefault();
          inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowRight' && index < length - 1) {
          e.preventDefault();
          inputRefs.current[index + 1]?.focus();
        }
      },
      [value, handleChange, length]
    );

    const handlePaste = React.useCallback(
      (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, length);

        if (type === 'number' && !/^\d*$/.test(pastedData)) {
          return;
        }

        const newValue = pastedData.padEnd(length, ' ');

        if (!isControlled) {
          setUncontrolledValue(newValue);
        }
        onChange?.(pastedData);

        if (pastedData.length === length) {
          onComplete?.(pastedData);
        }

        const focusIndex = Math.min(pastedData.length, length - 1);
        inputRefs.current[focusIndex]?.focus();
      },
      [isControlled, onChange, onComplete, length, type]
    );

    return (
      <InputOTPContext.Provider
        value={{
          value,
          length,
          focusedIndex,
          setFocusedIndex,
          handleChange,
          handleKeyDown,
          handlePaste,
          disabled,
          size,
          variant,
          inputRefs,
        }}
      >
        <div
          ref={ref}
          className={cn(
            'flex items-center gap-2',
            error && 'animate-shake',
            className
          )}
          {...props}
        >
          {children ||
            Array.from({ length }).map((_, i) => (
              <InputOTPSlot key={i} index={i} mask={mask} error={error} />
            ))}
        </div>
      </InputOTPContext.Provider>
    );
  }
);
InputOTP.displayName = 'InputOTP';

// ============================================================================
// InputOTPGroup
// ============================================================================

interface InputOTPGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

export const InputOTPGroup = React.forwardRef<HTMLDivElement, InputOTPGroupProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('flex items-center gap-1', className)} {...props}>
        {children}
      </div>
    );
  }
);
InputOTPGroup.displayName = 'InputOTPGroup';

// ============================================================================
// InputOTPSlot
// ============================================================================

interface InputOTPSlotProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  index: number;
  mask?: boolean;
  error?: boolean;
}

export const InputOTPSlot = React.forwardRef<HTMLInputElement, InputOTPSlotProps>(
  ({ className, index, mask = false, error = false, ...props }, ref) => {
    const {
      value,
      focusedIndex,
      setFocusedIndex,
      handleChange,
      handleKeyDown,
      handlePaste,
      disabled,
      size,
      variant,
      inputRefs,
    } = useInputOTP();

    const char = value[index] || '';
    const isFocused = focusedIndex === index;
    const isFilled = char !== ' ' && char !== '';

    const setRef = React.useCallback(
      (el: HTMLInputElement | null) => {
        inputRefs.current[index] = el;
        if (typeof ref === 'function') {
          ref(el);
        } else if (ref) {
          ref.current = el;
        }
      },
      [ref, inputRefs, index]
    );

    return (
      <div className="relative">
        <input
          ref={setRef}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={char === ' ' ? '' : char}
          onChange={(e) => handleChange(index, e.target.value.slice(-1) || ' ')}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => setFocusedIndex(index)}
          onBlur={() => setFocusedIndex(-1)}
          disabled={disabled}
          className={cn(
            'flex items-center justify-center rounded-md text-center font-mono transition-all',
            sizeClasses[size].slot,
            sizeClasses[size].text,
            variantClasses[variant].base,
            isFocused && variantClasses[variant].focus,
            error && 'border-destructive',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
          {...props}
        />
        {mask && isFilled && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="h-3 w-3 rounded-full bg-foreground"
            />
          </div>
        )}
        {isFocused && !isFilled && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="h-6 w-0.5 bg-primary" />
          </motion.div>
        )}
      </div>
    );
  }
);
InputOTPSlot.displayName = 'InputOTPSlot';

// ============================================================================
// InputOTPSeparator
// ============================================================================

interface InputOTPSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

export const InputOTPSeparator = React.forwardRef<HTMLDivElement, InputOTPSeparatorProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-center w-4', className)}
        {...props}
      >
        <div className="h-1 w-1 rounded-full bg-muted-foreground" />
      </div>
    );
  }
);
InputOTPSeparator.displayName = 'InputOTPSeparator';

// ============================================================================
// Pre-configured OTP Inputs
// ============================================================================

// 4-digit OTP
interface FourDigitOTPProps extends Omit<InputOTPProps, 'length' | 'children'> {}

export function FourDigitOTP(props: FourDigitOTPProps) {
  return (
    <InputOTP {...props} length={4} type="number">
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={2} />
        <InputOTPSlot index={3} />
      </InputOTPGroup>
    </InputOTP>
  );
}

// 6-digit OTP
interface SixDigitOTPProps extends Omit<InputOTPProps, 'length' | 'children'> {}

export function SixDigitOTP(props: SixDigitOTPProps) {
  return (
    <InputOTP {...props} length={6} type="number">
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  );
}

// PIN Input (masked)
interface PINInputProps extends Omit<InputOTPProps, 'mask' | 'type'> {}

export function PINInput(props: PINInputProps) {
  return <InputOTP {...props} mask type="number" />;
}

// ============================================================================
// Verification Code Input
// ============================================================================

interface VerificationCodeInputProps extends Omit<InputOTPProps, 'children'> {
  label?: string;
  description?: string;
  errorMessage?: string;
  resendButton?: React.ReactNode;
}

export function VerificationCodeInput({
  label = 'Cod de verificare',
  description = 'Introduceti codul primit prin SMS',
  errorMessage,
  resendButton,
  error,
  ...props
}: VerificationCodeInputProps) {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h3 className="text-lg font-semibold">{label}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex justify-center">
        <InputOTP error={error || !!errorMessage} {...props} />
      </div>
      <AnimatePresence>
        {errorMessage && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center text-sm text-destructive"
          >
            {errorMessage}
          </motion.p>
        )}
      </AnimatePresence>
      {resendButton && (
        <div className="text-center">{resendButton}</div>
      )}
    </div>
  );
}

// ============================================================================
// CUI Input (Romanian Tax ID - exactly 8 digits)
// ============================================================================

interface CUIInputProps extends Omit<InputOTPProps, 'length' | 'type'> {
  label?: string;
}

export function CUIInput({ label = 'CUI (Cod Unic de Identificare)', ...props }: CUIInputProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <InputOTP {...props} length={8} type="number" />
    </div>
  );
}

// ============================================================================
// CNP Input (Romanian Personal ID - 13 digits)
// ============================================================================

interface CNPInputProps extends Omit<InputOTPProps, 'length' | 'type' | 'children'> {
  label?: string;
}

export function CNPInput({ label = 'CNP (Cod Numeric Personal)', ...props }: CNPInputProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <InputOTP {...props} length={13} type="number" size="sm">
        <InputOTPSlot index={0} />
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={5} />
          <InputOTPSlot index={6} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={7} />
          <InputOTPSlot index={8} />
          <InputOTPSlot index={9} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={10} />
          <InputOTPSlot index={11} />
          <InputOTPSlot index={12} />
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
}

// ============================================================================
// Export hook
// ============================================================================

export { useInputOTP };
