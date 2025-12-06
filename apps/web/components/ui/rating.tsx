'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type RatingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type RatingIcon = 'star' | 'heart' | 'circle' | 'thumb' | 'emoji';

// ============================================================================
// Icons
// ============================================================================

const StarIcon = ({ filled, half }: { filled?: boolean; half?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={half ? 0 : filled ? 0 : 2}
    className="w-full h-full"
  >
    {half ? (
      <>
        <defs>
          <clipPath id="half-star">
            <rect x="0" y="0" width="12" height="24" />
          </clipPath>
        </defs>
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          fill="currentColor"
          clipPath="url(#half-star)"
        />
      </>
    ) : (
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    )}
  </svg>
);

const HeartIcon = ({ filled, half }: { filled?: boolean; half?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={half ? 0 : filled ? 0 : 2}
    className="w-full h-full"
  >
    {half ? (
      <>
        <defs>
          <clipPath id="half-heart">
            <rect x="0" y="0" width="12" height="24" />
          </clipPath>
        </defs>
        <path
          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
          fill="currentColor"
          clipPath="url(#half-heart)"
        />
      </>
    ) : (
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    )}
  </svg>
);

const CircleIcon = ({ filled }: { filled?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={filled ? 0 : 2}
    className="w-full h-full"
  >
    <circle cx="12" cy="12" r="10" />
  </svg>
);

const ThumbIcon = ({ filled }: { filled?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={filled ? 0 : 2}
    className="w-full h-full"
  >
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
  </svg>
);

const emojiSet = ['😡', '😕', '😐', '🙂', '😍'];

// ============================================================================
// Size Classes
// ============================================================================

const sizeClasses: Record<RatingSize, string> = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
};

const gapClasses: Record<RatingSize, string> = {
  xs: 'gap-0.5',
  sm: 'gap-1',
  md: 'gap-1',
  lg: 'gap-1.5',
  xl: 'gap-2',
};

// ============================================================================
// Rating Context
// ============================================================================

interface RatingContextValue {
  value: number;
  hoveredValue: number | null;
  max: number;
  readonly: boolean;
  allowHalf: boolean;
  icon: RatingIcon;
  size: RatingSize;
  activeColor: string;
  inactiveColor: string;
  hoverColor: string;
  onChange: (value: number) => void;
  setHoveredValue: (value: number | null) => void;
}

const RatingContext = React.createContext<RatingContextValue | undefined>(undefined);

function useRating() {
  const context = React.useContext(RatingContext);
  if (!context) {
    throw new Error('useRating must be used within a Rating component');
  }
  return context;
}

// ============================================================================
// Rating Root
// ============================================================================

interface RatingProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value?: number;
  defaultValue?: number;
  max?: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  disabled?: boolean;
  allowHalf?: boolean;
  allowClear?: boolean;
  icon?: RatingIcon;
  size?: RatingSize;
  activeColor?: string;
  inactiveColor?: string;
  hoverColor?: string;
  showValue?: boolean;
  showLabel?: boolean;
  labels?: string[];
}

export const Rating = React.forwardRef<HTMLDivElement, RatingProps>(
  (
    {
      className,
      value: controlledValue,
      defaultValue = 0,
      max = 5,
      onChange,
      readonly = false,
      disabled = false,
      allowHalf = false,
      allowClear = true,
      icon = 'star',
      size = 'md',
      activeColor = '#fbbf24',
      inactiveColor = '#d1d5db',
      hoverColor = '#fcd34d',
      showValue = false,
      showLabel = false,
      labels,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue);
    const [hoveredValue, setHoveredValue] = React.useState<number | null>(null);

    const value = controlledValue ?? internalValue;

    const handleChange = (newValue: number) => {
      if (readonly || disabled) return;

      // Allow clearing by clicking the same value
      if (allowClear && newValue === value) {
        newValue = 0;
      }

      setInternalValue(newValue);
      onChange?.(newValue);
    };

    const displayValue = hoveredValue ?? value;
    const defaultLabels = ['Foarte slab', 'Slab', 'Acceptabil', 'Bun', 'Excelent'];
    const currentLabels = labels || defaultLabels;
    const labelIndex = Math.ceil(displayValue) - 1;
    const currentLabel = currentLabels[labelIndex] || '';

    return (
      <RatingContext.Provider
        value={{
          value,
          hoveredValue,
          max,
          readonly: readonly || disabled,
          allowHalf,
          icon,
          size,
          activeColor,
          inactiveColor,
          hoverColor,
          onChange: handleChange,
          setHoveredValue,
        }}
      >
        <div
          ref={ref}
          className={cn(
            'inline-flex items-center',
            gapClasses[size],
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
          onMouseLeave={() => setHoveredValue(null)}
          {...props}
        >
          <RatingItems />
          {showValue && (
            <span className="ml-2 text-sm text-muted-foreground">
              {value.toFixed(allowHalf ? 1 : 0)}/{max}
            </span>
          )}
          {showLabel && currentLabel && (
            <span className="ml-2 text-sm font-medium">{currentLabel}</span>
          )}
        </div>
      </RatingContext.Provider>
    );
  }
);
Rating.displayName = 'Rating';

// ============================================================================
// Rating Items
// ============================================================================

function RatingItems() {
  const { max } = useRating();

  return (
    <>
      {Array.from({ length: max }, (_, i) => (
        <RatingItem key={i} index={i + 1} />
      ))}
    </>
  );
}

// ============================================================================
// Rating Item
// ============================================================================

interface RatingItemProps {
  index: number;
}

function RatingItem({ index }: RatingItemProps) {
  const {
    value,
    hoveredValue,
    readonly,
    allowHalf,
    icon,
    size,
    activeColor,
    inactiveColor,
    hoverColor,
    onChange,
    setHoveredValue,
  } = useRating();

  const displayValue = hoveredValue ?? value;
  const isFilled = index <= Math.floor(displayValue);
  const isHalf = allowHalf && !isFilled && index === Math.ceil(displayValue) && displayValue % 1 !== 0;
  const isHovered = hoveredValue !== null;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (readonly) return;

    if (allowHalf) {
      const rect = e.currentTarget.getBoundingClientRect();
      const isLeftHalf = e.clientX - rect.left < rect.width / 2;
      onChange(isLeftHalf ? index - 0.5 : index);
    } else {
      onChange(index);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (readonly) return;

    if (allowHalf) {
      const rect = e.currentTarget.getBoundingClientRect();
      const isLeftHalf = e.clientX - rect.left < rect.width / 2;
      setHoveredValue(isLeftHalf ? index - 0.5 : index);
    } else {
      setHoveredValue(index);
    }
  };

  const getColor = () => {
    if (isFilled || isHalf) {
      return isHovered ? hoverColor : activeColor;
    }
    return inactiveColor;
  };

  const renderIcon = () => {
    if (icon === 'emoji') {
      return (
        <span className={cn(sizeClasses[size], 'flex items-center justify-center text-base')}>
          {emojiSet[index - 1] || emojiSet[4]}
        </span>
      );
    }

    const IconComponent = {
      star: StarIcon,
      heart: HeartIcon,
      circle: CircleIcon,
      thumb: ThumbIcon,
    }[icon];

    return (
      <span className={sizeClasses[size]} style={{ color: getColor() }}>
        <IconComponent filled={isFilled} half={isHalf} />
      </span>
    );
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      disabled={readonly}
      className={cn(
        'focus:outline-none transition-transform',
        !readonly && 'cursor-pointer hover:scale-110'
      )}
      whileTap={!readonly ? { scale: 0.9 } : undefined}
    >
      {renderIcon()}
    </motion.button>
  );
}

// ============================================================================
// Interactive Rating (with feedback)
// ============================================================================

interface InteractiveRatingProps extends Omit<RatingProps, 'showLabel' | 'onSubmit'> {
  onRatingSubmit?: (value: number, feedback?: string) => void;
  showFeedback?: boolean;
  feedbackPlaceholder?: string;
}

export function InteractiveRating({
  onRatingSubmit,
  showFeedback = false,
  feedbackPlaceholder = 'Lasa un comentariu (optional)...',
  ...props
}: InteractiveRatingProps) {
  const [value, setValue] = React.useState(0);
  const [feedback, setFeedback] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = () => {
    if (value === 0) return;
    onRatingSubmit?.(value, feedback);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center p-4"
      >
        <div className="text-2xl mb-2">🎉</div>
        <p className="text-sm font-medium">Multumim pentru feedback!</p>
        <p className="text-xs text-muted-foreground">Apreciem opinia ta.</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <Rating
        {...props}
        value={value}
        onChange={setValue}
        showLabel
      />
      <AnimatePresence>
        {showFeedback && value > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={feedbackPlaceholder}
              className="w-full px-3 py-2 text-sm border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
            />
          </motion.div>
        )}
      </AnimatePresence>
      {value > 0 && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          type="button"
          onClick={handleSubmit}
          className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Trimite rating
        </motion.button>
      )}
    </div>
  );
}

// ============================================================================
// Rating Display (Read-only with stats)
// ============================================================================

interface RatingDisplayProps {
  value: number;
  total?: number;
  distribution?: number[];
  showDistribution?: boolean;
  size?: RatingSize;
  className?: string;
}

export function RatingDisplay({
  value,
  total,
  distribution = [],
  showDistribution = false,
  size = 'md',
  className,
}: RatingDisplayProps) {
  const maxDistribution = Math.max(...distribution, 1);

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-3">
        <span className="text-3xl font-bold">{value.toFixed(1)}</span>
        <div>
          <Rating value={value} readonly size={size} />
          {total !== undefined && (
            <p className="text-xs text-muted-foreground mt-1">
              {total.toLocaleString('ro-RO')} recenzii
            </p>
          )}
        </div>
      </div>

      {showDistribution && distribution.length > 0 && (
        <div className="space-y-1">
          {distribution.map((count, index) => {
            const stars = distribution.length - index;
            const percentage = (count / maxDistribution) * 100;

            return (
              <div key={stars} className="flex items-center gap-2 text-sm">
                <span className="w-3 text-muted-foreground">{stars}</span>
                <StarIcon filled />
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="h-full bg-yellow-400 rounded-full"
                  />
                </div>
                <span className="w-12 text-right text-muted-foreground">
                  {count.toLocaleString('ro-RO')}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Simple Star Rating
// ============================================================================

interface SimpleStarRatingProps {
  value?: number;
  onChange?: (value: number) => void;
  max?: number;
  readonly?: boolean;
  size?: RatingSize;
  className?: string;
}

export function SimpleStarRating({
  value = 0,
  onChange,
  max = 5,
  readonly = false,
  size = 'md',
  className,
}: SimpleStarRatingProps) {
  return (
    <Rating
      value={value}
      onChange={onChange}
      max={max}
      readonly={readonly}
      size={size}
      icon="star"
      className={className}
    />
  );
}

// ============================================================================
// Heart Rating
// ============================================================================

interface HeartRatingProps {
  value?: number;
  onChange?: (value: number) => void;
  max?: number;
  readonly?: boolean;
  size?: RatingSize;
  className?: string;
}

export function HeartRating({
  value = 0,
  onChange,
  max = 5,
  readonly = false,
  size = 'md',
  className,
}: HeartRatingProps) {
  return (
    <Rating
      value={value}
      onChange={onChange}
      max={max}
      readonly={readonly}
      size={size}
      icon="heart"
      activeColor="#ef4444"
      hoverColor="#f87171"
      className={className}
    />
  );
}

// ============================================================================
// Emoji Rating
// ============================================================================

interface EmojiRatingProps {
  value?: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: RatingSize;
  showLabel?: boolean;
  className?: string;
}

export function EmojiRating({
  value = 0,
  onChange,
  readonly = false,
  size = 'lg',
  showLabel = true,
  className,
}: EmojiRatingProps) {
  const labels = ['Foarte nemultumit', 'Nemultumit', 'Neutru', 'Multumit', 'Foarte multumit'];

  return (
    <Rating
      value={value}
      onChange={onChange}
      max={5}
      readonly={readonly}
      size={size}
      icon="emoji"
      showLabel={showLabel}
      labels={labels}
      allowClear={false}
      className={className}
    />
  );
}

// ============================================================================
// Thumbs Rating (Like/Dislike)
// ============================================================================

interface ThumbsRatingProps {
  value?: 'up' | 'down' | null;
  onChange?: (value: 'up' | 'down' | null) => void;
  counts?: { up: number; down: number };
  showCounts?: boolean;
  size?: RatingSize;
  className?: string;
}

export function ThumbsRating({
  value = null,
  onChange,
  counts = { up: 0, down: 0 },
  showCounts = true,
  size = 'md',
  className,
}: ThumbsRatingProps) {
  const handleClick = (type: 'up' | 'down') => {
    onChange?.(value === type ? null : type);
  };

  return (
    <div className={cn('inline-flex items-center gap-4', className)}>
      <button
        type="button"
        onClick={() => handleClick('up')}
        className={cn(
          'inline-flex items-center gap-1 transition-colors',
          value === 'up' ? 'text-green-500' : 'text-muted-foreground hover:text-green-500'
        )}
      >
        <motion.span
          className={sizeClasses[size]}
          whileTap={{ scale: 0.9 }}
          animate={value === 'up' ? { scale: [1, 1.2, 1] } : {}}
        >
          <ThumbIcon filled={value === 'up'} />
        </motion.span>
        {showCounts && <span className="text-sm">{counts.up}</span>}
      </button>

      <button
        type="button"
        onClick={() => handleClick('down')}
        className={cn(
          'inline-flex items-center gap-1 transition-colors rotate-180',
          value === 'down' ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'
        )}
      >
        <motion.span
          className={sizeClasses[size]}
          whileTap={{ scale: 0.9 }}
          animate={value === 'down' ? { scale: [1, 1.2, 1] } : {}}
        >
          <ThumbIcon filled={value === 'down'} />
        </motion.span>
        {showCounts && <span className="text-sm rotate-180">{counts.down}</span>}
      </button>
    </div>
  );
}

// ============================================================================
// Rating Card
// ============================================================================

interface RatingCardProps {
  title: string;
  value: number;
  total?: number;
  distribution?: number[];
  onRate?: (value: number) => void;
  className?: string;
}

export function RatingCard({
  title,
  value,
  total,
  distribution,
  onRate,
  className,
}: RatingCardProps) {
  const [userRating, setUserRating] = React.useState(0);
  const [hasRated, setHasRated] = React.useState(false);

  const handleRate = (newValue: number) => {
    setUserRating(newValue);
    setHasRated(true);
    onRate?.(newValue);
  };

  return (
    <div className={cn('bg-card border border-border rounded-lg p-4', className)}>
      <h3 className="font-medium mb-3">{title}</h3>

      <RatingDisplay
        value={value}
        total={total}
        distribution={distribution}
        showDistribution={!!distribution}
      />

      {!hasRated && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground mb-2">Evalueaza:</p>
          <Rating value={userRating} onChange={handleRate} size="lg" />
        </div>
      )}

      {hasRated && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 pt-4 border-t border-border text-center"
        >
          <p className="text-sm text-green-600">Multumim pentru evaluare!</p>
        </motion.div>
      )}
    </div>
  );
}

export { useRating };
