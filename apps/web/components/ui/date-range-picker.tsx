'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

export type DateRangePickerSize = 'sm' | 'md' | 'lg';

interface DateRangePreset {
  label: string;
  getValue: () => DateRange;
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatDate(date: Date | null, locale: string = 'ro-RO'): string {
  if (!date) return '';
  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateRange(range: DateRange, locale: string = 'ro-RO'): string {
  if (!range.from && !range.to) return '';
  if (range.from && !range.to) return formatDate(range.from, locale);
  if (!range.from && range.to) return formatDate(range.to, locale);
  return `${formatDate(range.from, locale)} - ${formatDate(range.to, locale)}`;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isInRange(date: Date, range: DateRange): boolean {
  if (!range.from || !range.to) return false;
  return date >= range.from && date <= range.to;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Convert to Monday-first week
}

// ============================================================================
// Default Presets
// ============================================================================

const defaultPresets: DateRangePreset[] = [
  {
    label: 'Astazi',
    getValue: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return { from: today, to: today };
    },
  },
  {
    label: 'Ieri',
    getValue: () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      return { from: yesterday, to: yesterday };
    },
  },
  {
    label: 'Ultimele 7 zile',
    getValue: () => {
      const to = new Date();
      to.setHours(0, 0, 0, 0);
      const from = new Date();
      from.setDate(from.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    },
  },
  {
    label: 'Ultimele 30 zile',
    getValue: () => {
      const to = new Date();
      to.setHours(0, 0, 0, 0);
      const from = new Date();
      from.setDate(from.getDate() - 29);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    },
  },
  {
    label: 'Luna aceasta',
    getValue: () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date();
      to.setHours(0, 0, 0, 0);
      return { from, to };
    },
  },
  {
    label: 'Luna trecuta',
    getValue: () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from, to };
    },
  },
  {
    label: 'Acest trimestru',
    getValue: () => {
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3);
      const from = new Date(now.getFullYear(), quarter * 3, 1);
      const to = new Date();
      to.setHours(0, 0, 0, 0);
      return { from, to };
    },
  },
  {
    label: 'Acest an',
    getValue: () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), 0, 1);
      const to = new Date();
      to.setHours(0, 0, 0, 0);
      return { from, to };
    },
  },
];

// ============================================================================
// Size Classes
// ============================================================================

const sizeClasses: Record<DateRangePickerSize, { trigger: string; calendar: string }> = {
  sm: { trigger: 'h-8 text-sm px-3', calendar: 'text-sm' },
  md: { trigger: 'h-10 px-3', calendar: '' },
  lg: { trigger: 'h-12 text-lg px-4', calendar: 'text-lg' },
};

// ============================================================================
// Month Names
// ============================================================================

const monthNames = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
];

const dayNames = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

// ============================================================================
// Calendar Component
// ============================================================================

interface CalendarProps {
  month: number;
  year: number;
  selectedRange: DateRange;
  hoverDate: Date | null;
  onDateClick: (date: Date) => void;
  onDateHover: (date: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

function Calendar({
  month,
  year,
  selectedRange,
  hoverDate,
  onDateClick,
  onDateHover,
  minDate,
  maxDate,
  className,
}: CalendarProps) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const days: (Date | null)[] = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }

  const effectiveRange: DateRange = {
    from: selectedRange.from,
    to: selectedRange.to || (selectedRange.from && hoverDate && hoverDate > selectedRange.from ? hoverDate : null),
  };

  return (
    <div className={cn('', className)}>
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {dayNames.map((day, i) => (
          <div key={i} className="text-center text-xs font-medium text-muted-foreground py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((date, i) => {
          if (!date) {
            return <div key={`empty-${i}`} className="h-8" />;
          }

          const isDisabled =
            (minDate && date < minDate) || (maxDate && date > maxDate);
          const isStart = selectedRange.from && isSameDay(date, selectedRange.from);
          const isEnd = selectedRange.to && isSameDay(date, selectedRange.to);
          const isInRangeDate = effectiveRange.from && effectiveRange.to && isInRange(date, effectiveRange);
          const isToday = isSameDay(date, new Date());

          return (
            <button
              key={date.toISOString()}
              type="button"
              disabled={isDisabled}
              onClick={() => onDateClick(date)}
              onMouseEnter={() => onDateHover(date)}
              onMouseLeave={() => onDateHover(null)}
              className={cn(
                'h-8 w-8 rounded-md text-sm transition-colors',
                'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring',
                isToday && !isStart && !isEnd && 'border border-primary',
                isDisabled && 'opacity-30 cursor-not-allowed hover:bg-transparent',
                isInRangeDate && !isStart && !isEnd && 'bg-primary/10',
                (isStart || isEnd) && 'bg-primary text-primary-foreground hover:bg-primary/90',
                isStart && effectiveRange.to && 'rounded-r-none',
                isEnd && effectiveRange.from && 'rounded-l-none'
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// DateRangePicker Component
// ============================================================================

interface DateRangePickerProps {
  value?: DateRange;
  defaultValue?: DateRange;
  onChange?: (range: DateRange) => void;
  placeholder?: string;
  size?: DateRangePickerSize;
  className?: string;
  disabled?: boolean;
  error?: boolean;
  minDate?: Date;
  maxDate?: Date;
  showPresets?: boolean;
  presets?: DateRangePreset[];
  locale?: string;
  align?: 'start' | 'center' | 'end';
}

export function DateRangePicker({
  value: controlledValue,
  defaultValue = { from: null, to: null },
  onChange,
  placeholder = 'Selecteaza perioada',
  size = 'md',
  className,
  disabled = false,
  error = false,
  minDate,
  maxDate,
  showPresets = true,
  presets = defaultPresets,
  locale = 'ro-RO',
  align = 'start',
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [uncontrolledValue, setUncontrolledValue] = React.useState<DateRange>(defaultValue);
  const [hoverDate, setHoverDate] = React.useState<Date | null>(null);
  const [viewMonth, setViewMonth] = React.useState(new Date().getMonth());
  const [viewYear, setViewYear] = React.useState(new Date().getFullYear());
  const containerRef = React.useRef<HTMLDivElement>(null);

  const isControlled = controlledValue !== undefined;
  const selectedRange = isControlled ? controlledValue : uncontrolledValue;

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleDateClick = (date: Date) => {
    let newRange: DateRange;

    if (!selectedRange.from || (selectedRange.from && selectedRange.to)) {
      // Start new selection
      newRange = { from: date, to: null };
    } else {
      // Complete the selection
      if (date < selectedRange.from) {
        newRange = { from: date, to: selectedRange.from };
      } else {
        newRange = { from: selectedRange.from, to: date };
      }
    }

    if (!isControlled) {
      setUncontrolledValue(newRange);
    }
    onChange?.(newRange);

    if (newRange.from && newRange.to) {
      setOpen(false);
    }
  };

  const handlePresetClick = (preset: DateRangePreset) => {
    const range = preset.getValue();
    if (!isControlled) {
      setUncontrolledValue(range);
    }
    onChange?.(range);
    setOpen(false);
  };

  const goToPreviousMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
  const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;

  const alignClasses = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  };

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          'flex w-full items-center justify-between rounded-md border border-input bg-background transition-colors',
          'hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          sizeClasses[size].trigger,
          error && 'border-destructive',
          className
        )}
      >
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
          </svg>
          <span className={cn(!selectedRange.from && 'text-muted-foreground')}>
            {formatDateRange(selectedRange, locale) || placeholder}
          </span>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={cn('transition-transform', open && 'rotate-180')}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute z-50 mt-1 rounded-md border border-border bg-background shadow-lg',
              alignClasses[align]
            )}
          >
            <div className="flex">
              {/* Presets */}
              {showPresets && (
                <div className="border-r border-border p-2 w-40">
                  <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">
                    Presetari
                  </div>
                  {presets.map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handlePresetClick(preset)}
                      className="w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-muted transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Calendars */}
              <div className="p-4">
                <div className="flex gap-4">
                  {/* First Month */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <button
                        type="button"
                        onClick={goToPreviousMonth}
                        className="p-1 rounded hover:bg-muted"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="m15 18-6-6 6-6" />
                        </svg>
                      </button>
                      <span className="font-medium">
                        {monthNames[viewMonth]} {viewYear}
                      </span>
                      <div className="w-6" /> {/* Spacer */}
                    </div>
                    <Calendar
                      month={viewMonth}
                      year={viewYear}
                      selectedRange={selectedRange}
                      hoverDate={hoverDate}
                      onDateClick={handleDateClick}
                      onDateHover={setHoverDate}
                      minDate={minDate}
                      maxDate={maxDate}
                      className={sizeClasses[size].calendar}
                    />
                  </div>

                  {/* Second Month */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-6" /> {/* Spacer */}
                      <span className="font-medium">
                        {monthNames[nextMonth]} {nextYear}
                      </span>
                      <button
                        type="button"
                        onClick={goToNextMonth}
                        className="p-1 rounded hover:bg-muted"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </button>
                    </div>
                    <Calendar
                      month={nextMonth}
                      year={nextYear}
                      selectedRange={selectedRange}
                      hoverDate={hoverDate}
                      onDateClick={handleDateClick}
                      onDateHover={setHoverDate}
                      minDate={minDate}
                      maxDate={maxDate}
                      className={sizeClasses[size].calendar}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => {
                      const cleared = { from: null, to: null };
                      if (!isControlled) {
                        setUncontrolledValue(cleared);
                      }
                      onChange?.(cleared);
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Sterge
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  >
                    Aplica
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Fiscal Period Picker (Accounting-specific)
// ============================================================================

const fiscalPresets: DateRangePreset[] = [
  {
    label: 'T1 (Ian-Mar)',
    getValue: () => {
      const year = new Date().getFullYear();
      return { from: new Date(year, 0, 1), to: new Date(year, 2, 31) };
    },
  },
  {
    label: 'T2 (Apr-Iun)',
    getValue: () => {
      const year = new Date().getFullYear();
      return { from: new Date(year, 3, 1), to: new Date(year, 5, 30) };
    },
  },
  {
    label: 'T3 (Iul-Sep)',
    getValue: () => {
      const year = new Date().getFullYear();
      return { from: new Date(year, 6, 1), to: new Date(year, 8, 30) };
    },
  },
  {
    label: 'T4 (Oct-Dec)',
    getValue: () => {
      const year = new Date().getFullYear();
      return { from: new Date(year, 9, 1), to: new Date(year, 11, 31) };
    },
  },
  {
    label: 'An fiscal curent',
    getValue: () => {
      const year = new Date().getFullYear();
      return { from: new Date(year, 0, 1), to: new Date(year, 11, 31) };
    },
  },
  {
    label: 'An fiscal anterior',
    getValue: () => {
      const year = new Date().getFullYear() - 1;
      return { from: new Date(year, 0, 1), to: new Date(year, 11, 31) };
    },
  },
];

interface FiscalPeriodPickerProps extends Omit<DateRangePickerProps, 'presets'> {}

export function FiscalPeriodPicker(props: FiscalPeriodPickerProps) {
  return (
    <DateRangePicker
      {...props}
      presets={fiscalPresets}
      placeholder="Selecteaza perioada fiscala"
    />
  );
}

// ============================================================================
// Exports
// ============================================================================

export { formatDate, formatDateRange, defaultPresets, fiscalPresets };
export type { DateRangePreset };
