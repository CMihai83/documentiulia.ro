'use client';

import { useState, useRef, useCallback, useEffect, ReactNode } from 'react';
import { motion } from 'framer-motion';

// Basic Slider
interface SliderProps {
  value?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  valueFormat?: (value: number) => string;
  label?: string;
  className?: string;
}

const sliderSizes = {
  sm: { track: 'h-1', thumb: 'w-3 h-3' },
  md: { track: 'h-2', thumb: 'w-4 h-4' },
  lg: { track: 'h-3', thumb: 'w-5 h-5' },
};

export function Slider({
  value = 0,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  size = 'md',
  showValue = false,
  valueFormat = (v) => String(v),
  label,
  className = '',
}: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const sizes = sliderSizes[size];

  const percentage = ((value - min) / (max - min)) * 100;

  const updateValue = useCallback(
    (clientX: number) => {
      if (!trackRef.current || disabled) return;
      const rect = trackRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const rawValue = min + percent * (max - min);
      const steppedValue = Math.round(rawValue / step) * step;
      const clampedValue = Math.max(min, Math.min(max, steppedValue));
      onChange?.(clampedValue);
    },
    [min, max, step, onChange, disabled]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    setIsDragging(true);
    updateValue(e.clientX);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        updateValue(e.clientX);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, updateValue]);

  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>}
          {showValue && (
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {valueFormat(value)}
            </span>
          )}
        </div>
      )}
      <div
        ref={trackRef}
        onMouseDown={handleMouseDown}
        className={`
          relative w-full bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer
          ${sizes.track}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {/* Filled track */}
        <div
          className={`absolute left-0 top-0 bg-primary rounded-full ${sizes.track}`}
          style={{ width: `${percentage}%` }}
        />
        {/* Thumb */}
        <motion.div
          animate={{ scale: isDragging ? 1.2 : 1 }}
          className={`
            absolute top-1/2 -translate-y-1/2 -translate-x-1/2
            bg-white border-2 border-primary rounded-full shadow-md
            ${sizes.thumb}
            ${disabled ? '' : 'hover:scale-110'}
            transition-transform
          `}
          style={{ left: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Range Slider (dual handles)
interface RangeSliderProps {
  value?: [number, number];
  onChange?: (value: [number, number]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showValues?: boolean;
  valueFormat?: (value: number) => string;
  label?: string;
  className?: string;
}

export function RangeSlider({
  value = [25, 75],
  onChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  size = 'md',
  showValues = false,
  valueFormat = (v) => String(v),
  label,
  className = '',
}: RangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeThumb, setActiveThumb] = useState<'min' | 'max' | null>(null);
  const sizes = sliderSizes[size];

  const minPercentage = ((value[0] - min) / (max - min)) * 100;
  const maxPercentage = ((value[1] - min) / (max - min)) * 100;

  const updateValue = useCallback(
    (clientX: number) => {
      if (!trackRef.current || disabled || !activeThumb) return;
      const rect = trackRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const rawValue = min + percent * (max - min);
      const steppedValue = Math.round(rawValue / step) * step;

      if (activeThumb === 'min') {
        const newMin = Math.max(min, Math.min(value[1] - step, steppedValue));
        onChange?.([newMin, value[1]]);
      } else {
        const newMax = Math.min(max, Math.max(value[0] + step, steppedValue));
        onChange?.([value[0], newMax]);
      }
    },
    [min, max, step, value, onChange, disabled, activeThumb]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (activeThumb) {
        updateValue(e.clientX);
      }
    };

    const handleMouseUp = () => {
      setActiveThumb(null);
    };

    if (activeThumb) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeThumb, updateValue]);

  return (
    <div className={className}>
      {(label || showValues) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>}
          {showValues && (
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {valueFormat(value[0])} - {valueFormat(value[1])}
            </span>
          )}
        </div>
      )}
      <div
        ref={trackRef}
        className={`
          relative w-full bg-gray-200 dark:bg-gray-700 rounded-full
          ${sizes.track}
          ${disabled ? 'opacity-50' : ''}
        `}
      >
        {/* Filled track */}
        <div
          className={`absolute top-0 bg-primary rounded-full ${sizes.track}`}
          style={{
            left: `${minPercentage}%`,
            width: `${maxPercentage - minPercentage}%`,
          }}
        />
        {/* Min thumb */}
        <motion.div
          onMouseDown={() => !disabled && setActiveThumb('min')}
          animate={{ scale: activeThumb === 'min' ? 1.2 : 1 }}
          className={`
            absolute top-1/2 -translate-y-1/2 -translate-x-1/2
            bg-white border-2 border-primary rounded-full shadow-md cursor-pointer
            ${sizes.thumb}
            ${disabled ? 'cursor-not-allowed' : 'hover:scale-110'}
            transition-transform z-10
          `}
          style={{ left: `${minPercentage}%` }}
        />
        {/* Max thumb */}
        <motion.div
          onMouseDown={() => !disabled && setActiveThumb('max')}
          animate={{ scale: activeThumb === 'max' ? 1.2 : 1 }}
          className={`
            absolute top-1/2 -translate-y-1/2 -translate-x-1/2
            bg-white border-2 border-primary rounded-full shadow-md cursor-pointer
            ${sizes.thumb}
            ${disabled ? 'cursor-not-allowed' : 'hover:scale-110'}
            transition-transform z-10
          `}
          style={{ left: `${maxPercentage}%` }}
        />
      </div>
    </div>
  );
}

// Slider with marks
interface SliderMark {
  value: number;
  label?: string;
}

interface MarkedSliderProps extends Omit<SliderProps, 'showValue'> {
  marks?: SliderMark[];
  showMarks?: boolean;
}

export function MarkedSlider({
  marks = [],
  showMarks = true,
  ...sliderProps
}: MarkedSliderProps) {
  const { min = 0, max = 100 } = sliderProps;

  return (
    <div>
      <Slider {...sliderProps} />
      {showMarks && marks.length > 0 && (
        <div className="relative w-full mt-2">
          {marks.map((mark) => {
            const percentage = ((mark.value - min) / (max - min)) * 100;
            return (
              <div
                key={mark.value}
                className="absolute -translate-x-1/2"
                style={{ left: `${percentage}%` }}
              >
                <div className="w-1 h-1 bg-gray-400 dark:bg-gray-500 rounded-full mx-auto mb-1" />
                {mark.label && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {mark.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Color Picker Slider
interface ColorSliderProps {
  hue?: number;
  onChange?: (hue: number) => void;
  className?: string;
}

export function ColorSlider({ hue = 0, onChange, className = '' }: ColorSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const percentage = (hue / 360) * 100;

  const updateHue = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      onChange?.(Math.round(percent * 360));
    },
    [onChange]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) updateHue(e.clientX);
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, updateHue]);

  return (
    <div
      ref={trackRef}
      onMouseDown={(e) => {
        setIsDragging(true);
        updateHue(e.clientX);
      }}
      className={`
        relative w-full h-4 rounded-lg cursor-pointer
        ${className}
      `}
      style={{
        background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
      }}
    >
      <motion.div
        animate={{ scale: isDragging ? 1.2 : 1 }}
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white border-2 border-gray-300 rounded-full shadow-md"
        style={{ left: `${percentage}%` }}
      />
    </div>
  );
}

// Volume Slider (vertical)
interface VolumeSliderProps {
  value?: number;
  onChange?: (value: number) => void;
  muted?: boolean;
  onMuteToggle?: () => void;
  className?: string;
}

export function VolumeSlider({
  value = 50,
  onChange,
  muted = false,
  onMuteToggle,
  className = '',
}: VolumeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const percentage = muted ? 0 : value;

  const updateValue = useCallback(
    (clientY: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const percent = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      onChange?.(Math.round(percent * 100));
    },
    [onChange]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) updateValue(e.clientY);
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, updateValue]);

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div
        ref={trackRef}
        onMouseDown={(e) => {
          setIsDragging(true);
          updateValue(e.clientY);
        }}
        className="relative w-2 h-24 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer"
      >
        <div
          className="absolute bottom-0 left-0 right-0 bg-primary rounded-full"
          style={{ height: `${percentage}%` }}
        />
        <motion.div
          animate={{ scale: isDragging ? 1.2 : 1 }}
          className="absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-primary rounded-full shadow-md"
          style={{ bottom: `calc(${percentage}% - 8px)` }}
        />
      </div>
      {onMuteToggle && (
        <button
          type="button"
          onClick={onMuteToggle}
          className={`p-1.5 rounded-lg transition-colors ${muted ? 'text-red-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          {muted ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}

// Price Range Input
interface PriceRangeProps {
  value?: [number, number];
  onChange?: (value: [number, number]) => void;
  min?: number;
  max?: number;
  currency?: string;
  className?: string;
}

export function PriceRange({
  value = [0, 1000],
  onChange,
  min = 0,
  max = 10000,
  currency = 'RON',
  className = '',
}: PriceRangeProps) {
  const [localMin, setLocalMin] = useState(String(value[0]));
  const [localMax, setLocalMax] = useState(String(value[1]));

  useEffect(() => {
    setLocalMin(String(value[0]));
    setLocalMax(String(value[1]));
  }, [value]);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalMin(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= min && num < value[1]) {
      onChange?.([num, value[1]]);
    }
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalMax(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num <= max && num > value[0]) {
      onChange?.([value[0], num]);
    }
  };

  return (
    <div className={className}>
      <RangeSlider
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        className="mb-4"
      />
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Min</label>
          <div className="relative">
            <input
              type="number"
              value={localMin}
              onChange={handleMinChange}
              min={min}
              max={value[1] - 1}
              className="w-full px-3 py-2 pr-12 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
              {currency}
            </span>
          </div>
        </div>
        <span className="text-gray-400 mt-5">-</span>
        <div className="flex-1">
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Max</label>
          <div className="relative">
            <input
              type="number"
              value={localMax}
              onChange={handleMaxChange}
              min={value[0] + 1}
              max={max}
              className="w-full px-3 py-2 pr-12 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
              {currency}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
