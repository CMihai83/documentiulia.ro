'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types & Constants
// ============================================================================

export type CopyButtonSize = 'xs' | 'sm' | 'md' | 'lg';
export type CopyButtonVariant = 'default' | 'ghost' | 'outline';

const sizeClasses: Record<CopyButtonSize, { button: string; icon: string }> = {
  xs: { button: 'h-6 w-6', icon: 'w-3 h-3' },
  sm: { button: 'h-8 w-8', icon: 'w-4 h-4' },
  md: { button: 'h-10 w-10', icon: 'w-5 h-5' },
  lg: { button: 'h-12 w-12', icon: 'w-6 h-6' },
};

const variantClasses: Record<CopyButtonVariant, string> = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  ghost: 'hover:bg-muted text-muted-foreground hover:text-foreground',
  outline: 'border border-input bg-background hover:bg-muted',
};

// ============================================================================
// Copy Button Component
// ============================================================================

interface CopyButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'onError' | 'onCopy'> {
  value: string;
  size?: CopyButtonSize;
  variant?: CopyButtonVariant;
  timeout?: number;
  onCopy?: (value: string) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  showTooltip?: boolean;
}

export function CopyButton({
  value,
  size = 'sm',
  variant = 'ghost',
  timeout = 2000,
  onCopy,
  onError,
  successMessage = 'Copiat!',
  showTooltip = true,
  className,
  disabled,
}: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);
  const [showMessage, setShowMessage] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  const handleCopy = async () => {
    if (disabled || !value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setShowMessage(true);
      onCopy?.(value);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setCopied(false);
        setShowMessage(false);
      }, timeout);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to copy');
      onError?.(error);
    }
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative inline-flex">
      <motion.button
        type="button"
        onClick={handleCopy}
        disabled={disabled}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          'inline-flex items-center justify-center rounded-md transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          sizeClasses[size].button,
          variantClasses[variant],
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.svg
              key="check"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className={cn(sizeClasses[size].icon, 'text-green-500')}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </motion.svg>
          ) : (
            <motion.svg
              key="copy"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className={sizeClasses[size].icon}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && showMessage && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs bg-foreground text-background rounded whitespace-nowrap z-50"
          >
            {successMessage}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-foreground rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Copy Text Button (with label)
// ============================================================================

interface CopyTextButtonProps extends Omit<CopyButtonProps, 'size'> {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function CopyTextButton({
  label = 'Copiaza',
  value,
  size = 'sm',
  variant = 'outline',
  className,
  ...props
}: CopyTextButtonProps) {
  const [copied, setCopied] = React.useState(false);

  const sizeStyles = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      props.onCopy?.(value);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to copy');
      props.onError?.(error);
    }
  };

  return (
    <motion.button
      type="button"
      onClick={handleCopy}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        variantClasses[variant],
        sizeStyles[size],
        className
      )}
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.svg
            key="check"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={cn(iconSizes[size], 'text-green-500')}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </motion.svg>
        ) : (
          <motion.svg
            key="copy"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={iconSizes[size]}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </motion.svg>
        )}
      </AnimatePresence>
      {copied ? 'Copiat!' : label}
    </motion.button>
  );
}

// ============================================================================
// Copyable Text Component
// ============================================================================

interface CopyableTextProps {
  value: string;
  displayValue?: string;
  truncate?: boolean;
  maxLength?: number;
  className?: string;
  buttonSize?: CopyButtonSize;
  showButton?: 'always' | 'hover' | 'never';
}

export function CopyableText({
  value,
  displayValue,
  truncate = false,
  maxLength = 30,
  className,
  buttonSize = 'xs',
  showButton = 'hover',
}: CopyableTextProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const display = displayValue || value;
  const truncatedDisplay = truncate && display.length > maxLength
    ? `${display.slice(0, maxLength)}...`
    : display;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shouldShowButton = showButton === 'always' || (showButton === 'hover' && isHovered);

  return (
    <span
      className={cn('inline-flex items-center gap-1 group', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className={cn(truncate && 'truncate')} title={truncate ? value : undefined}>
        {truncatedDisplay}
      </span>

      {showButton !== 'never' && (
        <AnimatePresence>
          {shouldShowButton && (
            <motion.button
              type="button"
              onClick={handleCopy}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={cn(
                'inline-flex items-center justify-center rounded transition-colors',
                'hover:bg-muted text-muted-foreground hover:text-foreground',
                sizeClasses[buttonSize].button
              )}
            >
              {copied ? (
                <svg className={cn(sizeClasses[buttonSize].icon, 'text-green-500')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className={sizeClasses[buttonSize].icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </motion.button>
          )}
        </AnimatePresence>
      )}
    </span>
  );
}

// ============================================================================
// Copy Input Field
// ============================================================================

interface CopyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value'> {
  value: string;
  label?: string;
  buttonPosition?: 'inside' | 'outside';
}

export function CopyInput({
  value,
  label,
  buttonPosition = 'inside',
  className,
  ...props
}: CopyInputProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className={cn('space-y-1', className)}>
      {label && <label className="text-sm font-medium">{label}</label>}
      <div className={cn('flex', buttonPosition === 'outside' && 'gap-2')}>
        <div className={cn('relative flex-1', buttonPosition === 'inside' && 'flex')}>
          <input
            type="text"
            value={value}
            readOnly
            className={cn(
              'w-full h-10 px-3 rounded-md border border-input bg-muted/50 text-sm',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              buttonPosition === 'inside' && 'pr-10'
            )}
            {...props}
          />
          {buttonPosition === 'inside' && (
            <button
              type="button"
              onClick={handleCopy}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-2 hover:bg-muted rounded transition-colors"
            >
              {copied ? (
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          )}
        </div>
        {buttonPosition === 'outside' && (
          <CopyTextButton value={value} label={copied ? 'Copiat!' : 'Copiaza'} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Copy Code Block
// ============================================================================

interface CopyCodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  className?: string;
}

export function CopyCodeBlock({
  code,
  language,
  showLineNumbers = false,
  className,
}: CopyCodeBlockProps) {
  const [copied, setCopied] = React.useState(false);
  const lines = code.split('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className={cn('relative rounded-lg bg-muted overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/80 border-b border-border">
        {language && (
          <span className="text-xs text-muted-foreground uppercase font-mono">
            {language}
          </span>
        )}
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copiat!
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copiaza
            </>
          )}
        </button>
      </div>

      {/* Code */}
      <pre className="p-4 overflow-x-auto text-sm">
        <code className="font-mono">
          {lines.map((line, i) => (
            <div key={i} className="flex">
              {showLineNumbers && (
                <span className="select-none w-8 text-right pr-4 text-muted-foreground">
                  {i + 1}
                </span>
              )}
              <span>{line}</span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}

// ============================================================================
// Accounting-Specific Copy Components
// ============================================================================

// Copy IBAN
interface CopyIBANProps {
  iban: string;
  bank?: string;
  showFormatted?: boolean;
}

export function CopyIBAN({ iban, bank, showFormatted = true }: CopyIBANProps) {
  const cleanIBAN = iban.replace(/\s/g, '');
  const formattedIBAN = showFormatted
    ? cleanIBAN.replace(/(.{4})/g, '$1 ').trim()
    : cleanIBAN;

  return (
    <div className="flex items-center gap-2">
      <div>
        <div className="font-mono text-sm">{formattedIBAN}</div>
        {bank && <div className="text-xs text-muted-foreground">{bank}</div>}
      </div>
      <CopyButton value={cleanIBAN} size="sm" />
    </div>
  );
}

// Copy CUI (Romanian VAT number)
interface CopyCUIProps {
  cui: string;
  companyName?: string;
}

export function CopyCUI({ cui, companyName }: CopyCUIProps) {
  const cleanCUI = cui.replace(/\D/g, '');

  return (
    <div className="flex items-center gap-2">
      <div>
        <div className="font-mono text-sm">RO{cleanCUI}</div>
        {companyName && <div className="text-xs text-muted-foreground">{companyName}</div>}
      </div>
      <CopyButton value={`RO${cleanCUI}`} size="sm" />
    </div>
  );
}

// Copy Invoice Number
interface CopyInvoiceNumberProps {
  series: string;
  number: string | number;
  date?: string;
}

export function CopyInvoiceNumber({ series, number, date }: CopyInvoiceNumberProps) {
  const invoiceNumber = `${series}${number}`;

  return (
    <div className="flex items-center gap-2">
      <div>
        <div className="font-medium">{invoiceNumber}</div>
        {date && <div className="text-xs text-muted-foreground">{date}</div>}
      </div>
      <CopyButton value={invoiceNumber} size="sm" />
    </div>
  );
}

// Copy Link with Share
interface CopyLinkProps {
  url: string;
  label?: string;
  showShareButton?: boolean;
}

export function CopyLink({ url, label, showShareButton = false }: CopyLinkProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ url, title: label });
      } catch (err) {
        // User cancelled or share failed
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        {label && <div className="text-sm font-medium truncate">{label}</div>}
        <div className="text-xs text-muted-foreground truncate">{url}</div>
      </div>
      <div className="flex gap-1">
        <motion.button
          type="button"
          onClick={handleCopy}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2 rounded-md hover:bg-muted transition-colors"
        >
          {copied ? (
            <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </motion.button>
        {showShareButton && typeof navigator !== 'undefined' && 'share' in navigator && (
          <motion.button
            type="button"
            onClick={handleShare}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-md hover:bg-muted transition-colors"
          >
            <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </motion.button>
        )}
      </div>
    </div>
  );
}
