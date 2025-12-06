'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface ColorValue {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  alpha?: number;
}

export interface ColorPreset {
  name: string;
  value: string;
}

// ============================================================================
// Color Utilities
// ============================================================================

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360;
  s /= 100;
  l /= 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

function parseColor(color: string): ColorValue | null {
  // Try hex
  const rgb = hexToRgb(color);
  if (rgb) {
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return { hex: color.startsWith('#') ? color : `#${color}`, rgb, hsl };
  }

  // Try rgb/rgba
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);
    const alpha = rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1;
    const hsl = rgbToHsl(r, g, b);
    return { hex: rgbToHex(r, g, b), rgb: { r, g, b }, hsl, alpha };
  }

  return null;
}

// ============================================================================
// Color Picker Context
// ============================================================================

interface ColorPickerContextValue {
  value: ColorValue;
  onChange: (value: ColorValue) => void;
  format: 'hex' | 'rgb' | 'hsl';
  setFormat: (format: 'hex' | 'rgb' | 'hsl') => void;
}

const ColorPickerContext = React.createContext<ColorPickerContextValue | undefined>(undefined);

function useColorPicker() {
  const context = React.useContext(ColorPickerContext);
  if (!context) {
    throw new Error('useColorPicker must be used within a ColorPickerProvider');
  }
  return context;
}

// ============================================================================
// Color Picker Root
// ============================================================================

interface ColorPickerProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onColorChange?: (color: ColorValue) => void;
  format?: 'hex' | 'rgb' | 'hsl';
  children: React.ReactNode;
  className?: string;
}

export function ColorPicker({
  value,
  defaultValue = '#3b82f6',
  onChange,
  onColorChange,
  format: initialFormat = 'hex',
  children,
  className,
}: ColorPickerProps) {
  const [format, setFormat] = React.useState<'hex' | 'rgb' | 'hsl'>(initialFormat);
  const [internalValue, setInternalValue] = React.useState<ColorValue>(() => {
    const parsed = parseColor(value || defaultValue);
    return parsed || { hex: '#3b82f6', rgb: { r: 59, g: 130, b: 246 }, hsl: { h: 217, s: 91, l: 60 } };
  });

  React.useEffect(() => {
    if (value) {
      const parsed = parseColor(value);
      if (parsed) {
        setInternalValue(parsed);
      }
    }
  }, [value]);

  const handleChange = React.useCallback(
    (newValue: ColorValue) => {
      setInternalValue(newValue);
      onColorChange?.(newValue);

      if (onChange) {
        switch (format) {
          case 'hex':
            onChange(newValue.hex);
            break;
          case 'rgb':
            onChange(`rgb(${newValue.rgb.r}, ${newValue.rgb.g}, ${newValue.rgb.b})`);
            break;
          case 'hsl':
            onChange(`hsl(${newValue.hsl.h}, ${newValue.hsl.s}%, ${newValue.hsl.l}%)`);
            break;
        }
      }
    },
    [format, onChange, onColorChange]
  );

  return (
    <ColorPickerContext.Provider
      value={{ value: internalValue, onChange: handleChange, format, setFormat }}
    >
      <div className={cn('inline-flex flex-col gap-3', className)}>{children}</div>
    </ColorPickerContext.Provider>
  );
}

// ============================================================================
// Color Swatch (Trigger)
// ============================================================================

interface ColorSwatchProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
  showAlpha?: boolean;
}

export const ColorSwatch = React.forwardRef<HTMLButtonElement, ColorSwatchProps>(
  ({ className, size = 'md', showAlpha, ...props }, ref) => {
    const { value } = useColorPicker();

    const sizeClasses = {
      sm: 'w-6 h-6',
      md: 'w-8 h-8',
      lg: 'w-10 h-10',
    };

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'rounded-md border border-border shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          sizeClasses[size],
          className
        )}
        style={{
          backgroundColor: value.hex,
          opacity: value.alpha ?? 1,
        }}
        {...props}
      />
    );
  }
);
ColorSwatch.displayName = 'ColorSwatch';

// ============================================================================
// Color Area (2D Picker)
// ============================================================================

interface ColorAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: number;
  height?: number;
}

export const ColorArea = React.forwardRef<HTMLDivElement, ColorAreaProps>(
  ({ className, width = 200, height = 150, ...props }, ref) => {
    const { value, onChange } = useColorPicker();
    const areaRef = React.useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = React.useState(false);

    const handleMove = React.useCallback(
      (clientX: number, clientY: number) => {
        const area = areaRef.current;
        if (!area) return;

        const rect = area.getBoundingClientRect();
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const y = Math.max(0, Math.min(clientY - rect.top, rect.height));

        const s = Math.round((x / rect.width) * 100);
        const l = Math.round(100 - (y / rect.height) * 100);

        const rgb = hslToRgb(value.hsl.h, s, l);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);

        onChange({
          hex,
          rgb,
          hsl: { h: value.hsl.h, s, l },
          alpha: value.alpha,
        });
      },
      [value.hsl.h, value.alpha, onChange]
    );

    const handleMouseDown = (e: React.MouseEvent) => {
      setIsDragging(true);
      handleMove(e.clientX, e.clientY);
    };

    React.useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (isDragging) {
          handleMove(e.clientX, e.clientY);
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
    }, [isDragging, handleMove]);

    const thumbX = (value.hsl.s / 100) * width;
    const thumbY = ((100 - value.hsl.l) / 100) * height;

    return (
      <div
        ref={areaRef}
        className={cn(
          'relative rounded-md cursor-crosshair overflow-hidden',
          className
        )}
        style={{
          width,
          height,
          background: `
            linear-gradient(to top, #000, transparent),
            linear-gradient(to right, #fff, hsl(${value.hsl.h}, 100%, 50%))
          `,
        }}
        onMouseDown={handleMouseDown}
        {...props}
      >
        <motion.div
          className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 border-2 border-white rounded-full shadow-md pointer-events-none"
          style={{
            left: thumbX,
            top: thumbY,
            backgroundColor: value.hex,
          }}
          animate={{ scale: isDragging ? 1.2 : 1 }}
        />
      </div>
    );
  }
);
ColorArea.displayName = 'ColorArea';

// ============================================================================
// Hue Slider
// ============================================================================

interface HueSliderProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
}

export const HueSlider = React.forwardRef<HTMLDivElement, HueSliderProps>(
  ({ className, orientation = 'horizontal', ...props }, ref) => {
    const { value, onChange } = useColorPicker();
    const sliderRef = React.useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = React.useState(false);

    const isHorizontal = orientation === 'horizontal';

    const handleMove = React.useCallback(
      (clientX: number, clientY: number) => {
        const slider = sliderRef.current;
        if (!slider) return;

        const rect = slider.getBoundingClientRect();
        const position = isHorizontal
          ? Math.max(0, Math.min(clientX - rect.left, rect.width))
          : Math.max(0, Math.min(clientY - rect.top, rect.height));

        const maxDimension = isHorizontal ? rect.width : rect.height;
        const h = Math.round((position / maxDimension) * 360);

        const rgb = hslToRgb(h, value.hsl.s, value.hsl.l);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);

        onChange({
          hex,
          rgb,
          hsl: { h, s: value.hsl.s, l: value.hsl.l },
          alpha: value.alpha,
        });
      },
      [isHorizontal, value.hsl.s, value.hsl.l, value.alpha, onChange]
    );

    const handleMouseDown = (e: React.MouseEvent) => {
      setIsDragging(true);
      handleMove(e.clientX, e.clientY);
    };

    React.useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (isDragging) {
          handleMove(e.clientX, e.clientY);
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
    }, [isDragging, handleMove]);

    const thumbPosition = `${(value.hsl.h / 360) * 100}%`;

    return (
      <div
        ref={sliderRef}
        className={cn(
          'relative rounded-md cursor-pointer',
          isHorizontal ? 'w-full h-3' : 'w-3 h-full',
          className
        )}
        style={{
          background: isHorizontal
            ? 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)'
            : 'linear-gradient(to bottom, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
        }}
        onMouseDown={handleMouseDown}
        {...props}
      >
        <motion.div
          className={cn(
            'absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 border-2 border-white rounded-full shadow-md pointer-events-none',
            isHorizontal ? 'top-1/2' : 'left-1/2'
          )}
          style={{
            [isHorizontal ? 'left' : 'top']: thumbPosition,
            backgroundColor: `hsl(${value.hsl.h}, 100%, 50%)`,
          }}
          animate={{ scale: isDragging ? 1.2 : 1 }}
        />
      </div>
    );
  }
);
HueSlider.displayName = 'HueSlider';

// ============================================================================
// Alpha Slider
// ============================================================================

interface AlphaSliderProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
}

export const AlphaSlider = React.forwardRef<HTMLDivElement, AlphaSliderProps>(
  ({ className, orientation = 'horizontal', ...props }, ref) => {
    const { value, onChange } = useColorPicker();
    const sliderRef = React.useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = React.useState(false);

    const isHorizontal = orientation === 'horizontal';
    const alpha = value.alpha ?? 1;

    const handleMove = React.useCallback(
      (clientX: number, clientY: number) => {
        const slider = sliderRef.current;
        if (!slider) return;

        const rect = slider.getBoundingClientRect();
        const position = isHorizontal
          ? Math.max(0, Math.min(clientX - rect.left, rect.width))
          : Math.max(0, Math.min(clientY - rect.top, rect.height));

        const maxDimension = isHorizontal ? rect.width : rect.height;
        const newAlpha = Math.round((position / maxDimension) * 100) / 100;

        onChange({
          ...value,
          alpha: newAlpha,
        });
      },
      [isHorizontal, value, onChange]
    );

    const handleMouseDown = (e: React.MouseEvent) => {
      setIsDragging(true);
      handleMove(e.clientX, e.clientY);
    };

    React.useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (isDragging) {
          handleMove(e.clientX, e.clientY);
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
    }, [isDragging, handleMove]);

    const thumbPosition = `${alpha * 100}%`;

    return (
      <div
        ref={sliderRef}
        className={cn(
          'relative rounded-md cursor-pointer',
          isHorizontal ? 'w-full h-3' : 'w-3 h-full',
          className
        )}
        style={{
          backgroundImage: `
            linear-gradient(${isHorizontal ? 'to right' : 'to bottom'}, transparent, ${value.hex}),
            repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 50% / 8px 8px
          `,
        }}
        onMouseDown={handleMouseDown}
        {...props}
      >
        <motion.div
          className={cn(
            'absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 border-2 border-white rounded-full shadow-md pointer-events-none',
            isHorizontal ? 'top-1/2' : 'left-1/2'
          )}
          style={{
            [isHorizontal ? 'left' : 'top']: thumbPosition,
            backgroundColor: value.hex,
            opacity: alpha,
          }}
          animate={{ scale: isDragging ? 1.2 : 1 }}
        />
      </div>
    );
  }
);
AlphaSlider.displayName = 'AlphaSlider';

// ============================================================================
// Color Input
// ============================================================================

interface ColorInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  showFormat?: boolean;
  onValueChange?: (value: string) => void;
}

export const ColorInput = React.forwardRef<HTMLInputElement, ColorInputProps>(
  ({ className, showFormat = true, onValueChange, ...props }, ref) => {
    const { value, onChange, format, setFormat } = useColorPicker();
    const [inputValue, setInputValue] = React.useState('');

    React.useEffect(() => {
      switch (format) {
        case 'hex':
          setInputValue(value.hex);
          break;
        case 'rgb':
          setInputValue(`${value.rgb.r}, ${value.rgb.g}, ${value.rgb.b}`);
          break;
        case 'hsl':
          setInputValue(`${value.hsl.h}, ${value.hsl.s}%, ${value.hsl.l}%`);
          break;
      }
    }, [value, format]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      onValueChange?.(newValue);

      // Try to parse the input
      let parsed: ColorValue | null = null;

      if (format === 'hex') {
        parsed = parseColor(newValue);
      } else if (format === 'rgb') {
        const match = newValue.match(/(\d+),?\s*(\d+),?\s*(\d+)/);
        if (match) {
          const r = parseInt(match[1]);
          const g = parseInt(match[2]);
          const b = parseInt(match[3]);
          if (r <= 255 && g <= 255 && b <= 255) {
            const hsl = rgbToHsl(r, g, b);
            parsed = { hex: rgbToHex(r, g, b), rgb: { r, g, b }, hsl };
          }
        }
      } else if (format === 'hsl') {
        const match = newValue.match(/(\d+),?\s*(\d+)%?,?\s*(\d+)%?/);
        if (match) {
          const h = parseInt(match[1]);
          const s = parseInt(match[2]);
          const l = parseInt(match[3]);
          if (h <= 360 && s <= 100 && l <= 100) {
            const rgb = hslToRgb(h, s, l);
            parsed = { hex: rgbToHex(rgb.r, rgb.g, rgb.b), rgb, hsl: { h, s, l } };
          }
        }
      }

      if (parsed) {
        onChange(parsed);
      }
    };

    const cycleFormat = () => {
      const formats: ('hex' | 'rgb' | 'hsl')[] = ['hex', 'rgb', 'hsl'];
      const currentIndex = formats.indexOf(format);
      const nextIndex = (currentIndex + 1) % formats.length;
      setFormat(formats[nextIndex]);
    };

    return (
      <div className="flex items-center gap-2">
        {showFormat && (
          <button
            type="button"
            onClick={cycleFormat}
            className="px-2 py-1 text-xs font-medium uppercase bg-muted rounded hover:bg-muted/80 transition-colors"
          >
            {format}
          </button>
        )}
        <input
          ref={ref}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          className={cn(
            'flex-1 px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
ColorInput.displayName = 'ColorInput';

// ============================================================================
// Color Presets
// ============================================================================

interface ColorPresetsProps extends React.HTMLAttributes<HTMLDivElement> {
  presets: ColorPreset[] | string[];
  columns?: number;
}

export const ColorPresets = React.forwardRef<HTMLDivElement, ColorPresetsProps>(
  ({ className, presets, columns = 8, ...props }, ref) => {
    const { onChange } = useColorPicker();

    const normalizedPresets: ColorPreset[] = presets.map((p) =>
      typeof p === 'string' ? { name: p, value: p } : p
    );

    const handleSelect = (color: string) => {
      const parsed = parseColor(color);
      if (parsed) {
        onChange(parsed);
      }
    };

    return (
      <div
        ref={ref}
        className={cn('grid gap-1', className)}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        {...props}
      >
        {normalizedPresets.map((preset, index) => (
          <button
            key={index}
            type="button"
            title={preset.name}
            onClick={() => handleSelect(preset.value)}
            className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-ring"
            style={{ backgroundColor: preset.value }}
          />
        ))}
      </div>
    );
  }
);
ColorPresets.displayName = 'ColorPresets';

// ============================================================================
// Eyedropper Button
// ============================================================================

interface EyedropperButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onPick?: (color: string) => void;
}

export const EyedropperButton = React.forwardRef<HTMLButtonElement, EyedropperButtonProps>(
  ({ className, onPick, children, ...props }, ref) => {
    const { onChange } = useColorPicker();

    const handlePick = async () => {
      if (!('EyeDropper' in window)) {
        console.warn('EyeDropper API not supported');
        return;
      }

      try {
        // @ts-expect-error - EyeDropper is not in TypeScript types yet
        const eyeDropper = new window.EyeDropper();
        const result = await eyeDropper.open();
        const color = result.sRGBHex;

        const parsed = parseColor(color);
        if (parsed) {
          onChange(parsed);
          onPick?.(color);
        }
      } catch {
        // User cancelled or error
      }
    };

    return (
      <button
        ref={ref}
        type="button"
        onClick={handlePick}
        className={cn(
          'inline-flex items-center justify-center p-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors',
          className
        )}
        {...props}
      >
        {children || (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m2 22 1-1h3l9-9" />
            <path d="M3 21v-3l9-9" />
            <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z" />
          </svg>
        )}
      </button>
    );
  }
);
EyedropperButton.displayName = 'EyedropperButton';

// ============================================================================
// Simple Color Picker (Pre-built variant)
// ============================================================================

interface SimpleColorPickerProps {
  value?: string;
  onChange?: (value: string) => void;
  showAlpha?: boolean;
  showInput?: boolean;
  showPresets?: boolean;
  showEyedropper?: boolean;
  presets?: string[];
  className?: string;
}

const defaultPresets = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#78716c', '#737373', '#525252', '#404040', '#262626', '#171717', '#000000',
];

export function SimpleColorPicker({
  value,
  onChange,
  showAlpha = false,
  showInput = true,
  showPresets = true,
  showEyedropper = true,
  presets = defaultPresets,
  className,
}: SimpleColorPickerProps) {
  return (
    <ColorPicker value={value} onChange={onChange} className={className}>
      <ColorArea />
      <HueSlider />
      {showAlpha && <AlphaSlider />}
      <div className="flex items-center gap-2">
        <ColorSwatch size="lg" />
        {showInput && <ColorInput className="flex-1" />}
        {showEyedropper && <EyedropperButton />}
      </div>
      {showPresets && <ColorPresets presets={presets} />}
    </ColorPicker>
  );
}

// ============================================================================
// Compact Color Picker
// ============================================================================

interface CompactColorPickerProps {
  value?: string;
  onChange?: (value: string) => void;
  presets?: string[];
  className?: string;
}

export function CompactColorPicker({
  value,
  onChange,
  presets = defaultPresets.slice(0, 16),
  className,
}: CompactColorPickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className={cn('relative inline-block', className)}>
      <ColorPicker value={value} onChange={onChange}>
        <ColorSwatch size="md" onClick={() => setIsOpen(!isOpen)} />
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              className="absolute top-full left-0 mt-2 p-3 bg-popover border border-border rounded-lg shadow-lg z-50"
            >
              <ColorPresets presets={presets} columns={8} />
              <div className="mt-2 pt-2 border-t border-border">
                <ColorInput showFormat={false} placeholder="Culoare..." />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </ColorPicker>
    </div>
  );
}

// ============================================================================
// Inline Color Picker
// ============================================================================

interface InlineColorPickerProps {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  className?: string;
}

export function InlineColorPicker({
  value,
  onChange,
  label,
  className,
}: InlineColorPickerProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
      <ColorPicker value={value} onChange={onChange}>
        <div className="flex items-center gap-2">
          <ColorSwatch size="sm" />
          <ColorInput showFormat={false} className="w-24" />
        </div>
      </ColorPicker>
    </div>
  );
}

// ============================================================================
// Gradient Picker
// ============================================================================

interface GradientStop {
  color: string;
  position: number;
}

interface GradientPickerProps {
  value?: GradientStop[];
  onChange?: (stops: GradientStop[]) => void;
  direction?: 'to right' | 'to left' | 'to top' | 'to bottom' | string;
  className?: string;
}

export function GradientPicker({
  value = [
    { color: '#3b82f6', position: 0 },
    { color: '#8b5cf6', position: 100 },
  ],
  onChange,
  direction = 'to right',
  className,
}: GradientPickerProps) {
  const [stops, setStops] = React.useState(value);
  const [selectedStop, setSelectedStop] = React.useState(0);

  const gradientString = `linear-gradient(${direction}, ${stops
    .map((s) => `${s.color} ${s.position}%`)
    .join(', ')})`;

  const handleStopChange = (index: number, color: string) => {
    const newStops = [...stops];
    newStops[index] = { ...newStops[index], color };
    setStops(newStops);
    onChange?.(newStops);
  };

  const addStop = (position: number) => {
    if (stops.length >= 5) return;
    const newStops = [...stops, { color: '#888888', position }].sort(
      (a, b) => a.position - b.position
    );
    setStops(newStops);
    onChange?.(newStops);
  };

  const removeStop = (index: number) => {
    if (stops.length <= 2) return;
    const newStops = stops.filter((_, i) => i !== index);
    setStops(newStops);
    setSelectedStop(Math.min(selectedStop, newStops.length - 1));
    onChange?.(newStops);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Gradient Preview */}
      <div
        className="h-12 rounded-md border border-border cursor-pointer"
        style={{ background: gradientString }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const position = Math.round(((e.clientX - rect.left) / rect.width) * 100);
          addStop(position);
        }}
      />

      {/* Stop markers */}
      <div className="relative h-6">
        {stops.map((stop, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setSelectedStop(index)}
            onDoubleClick={() => removeStop(index)}
            className={cn(
              'absolute w-4 h-4 -translate-x-1/2 rounded-full border-2 transition-transform',
              selectedStop === index
                ? 'border-primary scale-125 z-10'
                : 'border-white'
            )}
            style={{
              left: `${stop.position}%`,
              backgroundColor: stop.color,
            }}
            title="Dublu-click pentru stergere"
          />
        ))}
      </div>

      {/* Selected stop color picker */}
      <SimpleColorPicker
        value={stops[selectedStop]?.color}
        onChange={(color) => handleStopChange(selectedStop, color)}
        showPresets={false}
        showAlpha={false}
      />

      <p className="text-xs text-muted-foreground">
        Click pe gradient pentru a adauga culori. Dublu-click pe marker pentru stergere.
      </p>
    </div>
  );
}

export { useColorPicker, parseColor, hexToRgb, rgbToHex, rgbToHsl, hslToRgb };
