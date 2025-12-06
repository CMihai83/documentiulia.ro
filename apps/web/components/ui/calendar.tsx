'use client';

import { useState, useMemo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';

// Romanian month and day names
const MONTHS_RO = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
];

const DAYS_RO = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du'];

const DAYS_FULL_RO = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];

// Helper functions
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Adjust for Monday start
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isDateInRange(date: Date, start: Date | null, end: Date | null): boolean {
  if (!start || !end) return false;
  return date >= start && date <= end;
}

function formatDate(date: Date, format: string = 'dd/MM/yyyy'): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  return format
    .replace('dd', day)
    .replace('MM', month)
    .replace('yyyy', year.toString())
    .replace('yy', year.toString().slice(-2));
}

// Basic Calendar
interface CalendarProps {
  selected?: Date | null;
  onSelect?: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[];
  highlightedDates?: Date[];
  showWeekNumbers?: boolean;
  className?: string;
}

export function Calendar({
  selected,
  onSelect,
  minDate,
  maxDate,
  disabledDates = [],
  highlightedDates = [],
  showWeekNumbers = false,
  className = '',
}: CalendarProps) {
  const [viewDate, setViewDate] = useState(selected || new Date());
  const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days');

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const prevMonthDays = getDaysInMonth(year, month - 1);

  const isDateDisabled = (date: Date): boolean => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return disabledDates.some(d => isSameDay(d, date));
  };

  const isDateHighlighted = (date: Date): boolean => {
    return highlightedDates.some(d => isSameDay(d, date));
  };

  const goToPrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const selectDate = (day: number) => {
    const date = new Date(year, month, day);
    if (!isDateDisabled(date)) {
      onSelect?.(date);
    }
  };

  const getWeekNumber = (date: Date): number => {
    const firstJan = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - firstJan.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + firstJan.getDay() + 1) / 7);
  };

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const days: { day: number; isCurrentMonth: boolean; date: Date }[] = [];

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      days.push({
        day,
        isCurrentMonth: false,
        date: new Date(year, month - 1, day),
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        day,
        isCurrentMonth: true,
        date: new Date(year, month, day),
      });
    }

    // Next month days
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        day,
        isCurrentMonth: false,
        date: new Date(year, month + 1, day),
      });
    }

    return days;
  }, [year, month, firstDay, daysInMonth, prevMonthDays]);

  // Years for year picker
  const years = useMemo(() => {
    const startYear = Math.floor(year / 12) * 12;
    return Array.from({ length: 12 }, (_, i) => startYear + i);
  }, [year]);

  if (viewMode === 'months') {
    return (
      <div className={`bg-white dark:bg-gray-900 rounded-xl shadow-lg p-4 w-80 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setViewDate(new Date(year - 1, month, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('years')}
            className="text-lg font-semibold hover:text-primary"
          >
            {year}
          </button>
          <button
            onClick={() => setViewDate(new Date(year + 1, month, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MONTHS_RO.map((monthName, idx) => (
            <button
              key={monthName}
              onClick={() => {
                setViewDate(new Date(year, idx, 1));
                setViewMode('days');
              }}
              className={`
                py-2 px-3 rounded-lg text-sm font-medium transition-colors
                ${idx === month
                  ? 'bg-primary text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
            >
              {monthName.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (viewMode === 'years') {
    return (
      <div className={`bg-white dark:bg-gray-900 rounded-xl shadow-lg p-4 w-80 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setViewDate(new Date(year - 12, month, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-semibold">
            {years[0]} - {years[years.length - 1]}
          </span>
          <button
            onClick={() => setViewDate(new Date(year + 12, month, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => {
                setViewDate(new Date(y, month, 1));
                setViewMode('months');
              }}
              className={`
                py-2 px-3 rounded-lg text-sm font-medium transition-colors
                ${y === year
                  ? 'bg-primary text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
            >
              {y}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl shadow-lg p-4 w-80 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPrevMonth}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => setViewMode('months')}
          className="text-lg font-semibold hover:text-primary"
        >
          {MONTHS_RO[month]} {year}
        </button>
        <button
          onClick={goToNextMonth}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day names */}
      <div className={`grid ${showWeekNumbers ? 'grid-cols-8' : 'grid-cols-7'} gap-1 mb-2`}>
        {showWeekNumbers && <div className="text-xs text-gray-400 text-center py-2">S</div>}
        {DAYS_RO.map((day) => (
          <div key={day} className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className={`grid ${showWeekNumbers ? 'grid-cols-8' : 'grid-cols-7'} gap-1`}>
        {calendarDays.map(({ day, isCurrentMonth, date }, index) => {
          const isSelected = selected && isSameDay(date, selected);
          const isToday = isSameDay(date, new Date());
          const disabled = isDateDisabled(date);
          const highlighted = isDateHighlighted(date);

          // Add week number at the start of each row
          const showWeekNum = showWeekNumbers && index % 7 === 0;

          return (
            <>
              {showWeekNum && (
                <div
                  key={`week-${index}`}
                  className="text-xs text-gray-400 text-center py-2"
                >
                  {getWeekNumber(date)}
                </div>
              )}
              <button
                key={index}
                onClick={() => isCurrentMonth && selectDate(day)}
                disabled={disabled}
                className={`
                  relative w-10 h-10 rounded-lg text-sm font-medium transition-all
                  ${!isCurrentMonth ? 'text-gray-300 dark:text-gray-600' : ''}
                  ${isSelected
                    ? 'bg-primary text-white'
                    : isToday
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                  ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                  ${highlighted && !isSelected ? 'ring-2 ring-primary/50' : ''}
                `}
              >
                {day}
                {highlighted && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                )}
              </button>
            </>
          );
        })}
      </div>
    </div>
  );
}

// Date Range Picker
interface DateRangePickerProps {
  startDate?: Date | null;
  endDate?: Date | null;
  onRangeSelect?: (start: Date | null, end: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
  presets?: { label: string; start: Date; end: Date }[];
  className?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onRangeSelect,
  minDate,
  maxDate,
  presets,
  className = '',
}: DateRangePickerProps) {
  const [viewDate, setViewDate] = useState(startDate || new Date());
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [selecting, setSelecting] = useState<'start' | 'end'>('start');

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const nextMonth = month === 11 ? 0 : month + 1;
  const nextMonthYear = month === 11 ? year + 1 : year;

  const handleDateClick = (date: Date) => {
    if (selecting === 'start') {
      onRangeSelect?.(date, null);
      setSelecting('end');
    } else {
      if (startDate && date < startDate) {
        onRangeSelect?.(date, startDate);
      } else {
        onRangeSelect?.(startDate || null, date);
      }
      setSelecting('start');
    }
  };

  const isInRange = (date: Date): boolean => {
    if (startDate && endDate) {
      return isDateInRange(date, startDate, endDate);
    }
    if (startDate && hoverDate && selecting === 'end') {
      const rangeStart = startDate < hoverDate ? startDate : hoverDate;
      const rangeEnd = startDate < hoverDate ? hoverDate : startDate;
      return isDateInRange(date, rangeStart, rangeEnd);
    }
    return false;
  };

  const renderMonth = (monthOffset: number) => {
    const displayMonth = monthOffset === 0 ? month : nextMonth;
    const displayYear = monthOffset === 0 ? year : nextMonthYear;
    const daysInMonth = getDaysInMonth(displayYear, displayMonth);
    const firstDay = getFirstDayOfMonth(displayYear, displayMonth);
    const prevDays = getDaysInMonth(displayYear, displayMonth - 1);

    const days: { day: number; isCurrentMonth: boolean; date: Date }[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      const day = prevDays - i;
      days.push({
        day,
        isCurrentMonth: false,
        date: new Date(displayYear, displayMonth - 1, day),
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        day,
        isCurrentMonth: true,
        date: new Date(displayYear, displayMonth, day),
      });
    }

    const remaining = 42 - days.length;
    for (let day = 1; day <= remaining; day++) {
      days.push({
        day,
        isCurrentMonth: false,
        date: new Date(displayYear, displayMonth + 1, day),
      });
    }

    return (
      <div>
        <div className="text-center font-semibold mb-4">
          {MONTHS_RO[displayMonth]} {displayYear}
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS_RO.map((day) => (
            <div key={day} className="text-xs font-medium text-gray-500 text-center py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map(({ day, isCurrentMonth, date }, index) => {
            const isStart = startDate && isSameDay(date, startDate);
            const isEnd = endDate && isSameDay(date, endDate);
            const inRange = isInRange(date);
            const disabled =
              !isCurrentMonth ||
              (minDate && date < minDate) ||
              (maxDate && date > maxDate);

            return (
              <button
                key={index}
                onClick={() => !disabled && handleDateClick(date)}
                onMouseEnter={() => setHoverDate(date)}
                onMouseLeave={() => setHoverDate(null)}
                disabled={disabled}
                className={`
                  w-10 h-10 text-sm font-medium transition-all
                  ${!isCurrentMonth ? 'text-gray-300 dark:text-gray-600' : ''}
                  ${isStart || isEnd
                    ? 'bg-primary text-white rounded-lg'
                    : inRange
                      ? 'bg-primary/20 text-primary'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg'
                  }
                  ${isStart && endDate ? 'rounded-r-none' : ''}
                  ${isEnd && startDate ? 'rounded-l-none' : ''}
                  ${inRange && !isStart && !isEnd ? 'rounded-none' : ''}
                  ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Default presets
  const defaultPresets = presets || [
    {
      label: 'Astăzi',
      start: new Date(),
      end: new Date(),
    },
    {
      label: 'Ultimele 7 zile',
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date(),
    },
    {
      label: 'Ultimele 30 zile',
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
    },
    {
      label: 'Luna aceasta',
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      end: new Date(),
    },
    {
      label: 'Luna trecută',
      start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
      end: new Date(new Date().getFullYear(), new Date().getMonth(), 0),
    },
  ];

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl shadow-lg p-4 ${className}`}>
      <div className="flex gap-6">
        {/* Presets */}
        <div className="space-y-1 border-r border-gray-200 dark:border-gray-700 pr-4">
          {defaultPresets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => onRangeSelect?.(preset.start, preset.end)}
              className="block w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 whitespace-nowrap"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Calendars */}
        <div className="flex gap-4">
          <div className="relative">
            <button
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className="absolute left-0 top-0 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {renderMonth(0)}
          </div>
          <div className="relative">
            <button
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              className="absolute right-0 top-0 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            {renderMonth(1)}
          </div>
        </div>
      </div>

      {/* Selection summary */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {startDate ? formatDate(startDate) : 'Selectează data de început'}
          {' — '}
          {endDate ? formatDate(endDate) : 'Selectează data de sfârșit'}
        </div>
        <button
          onClick={() => onRangeSelect?.(null, null)}
          className="text-sm text-red-500 hover:text-red-600"
        >
          Resetează
        </button>
      </div>
    </div>
  );
}

// Date Input with Picker
interface DateInputProps {
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  format?: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

export function DateInput({
  value,
  onChange,
  placeholder = 'Selectează data',
  format = 'dd/MM/yyyy',
  minDate,
  maxDate,
  disabled,
  error,
  className = '',
}: DateInputProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center gap-3 px-4 py-2.5 text-left
          bg-white dark:bg-gray-900 border rounded-lg
          transition-all duration-200
          ${error
            ? 'border-red-300 dark:border-red-600'
            : 'border-gray-200 dark:border-gray-700'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-300 dark:hover:border-gray-600'}
          focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
        `}
      >
        <CalendarIcon className="w-5 h-5 text-gray-400" />
        <span className={value ? 'text-gray-900 dark:text-white' : 'text-gray-400'}>
          {value ? formatDate(value, format) : placeholder}
        </span>
        {value && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChange?.(null);
            }}
            className="ml-auto text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-50 mt-2"
            >
              <Calendar
                selected={value}
                onSelect={(date) => {
                  onChange?.(date);
                  setIsOpen(false);
                }}
                minDate={minDate}
                maxDate={maxDate}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Date Range Input
interface DateRangeInputProps {
  startDate?: Date | null;
  endDate?: Date | null;
  onRangeChange?: (start: Date | null, end: Date | null) => void;
  placeholder?: string;
  format?: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

export function DateRangeInput({
  startDate,
  endDate,
  onRangeChange,
  placeholder = 'Selectează perioada',
  format = 'dd/MM/yyyy',
  minDate,
  maxDate,
  disabled,
  error,
  className = '',
}: DateRangeInputProps) {
  const [isOpen, setIsOpen] = useState(false);

  const displayValue = startDate && endDate
    ? `${formatDate(startDate, format)} - ${formatDate(endDate, format)}`
    : startDate
      ? `${formatDate(startDate, format)} - ...`
      : null;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center gap-3 px-4 py-2.5 text-left
          bg-white dark:bg-gray-900 border rounded-lg
          transition-all duration-200
          ${error
            ? 'border-red-300 dark:border-red-600'
            : 'border-gray-200 dark:border-gray-700'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-300 dark:hover:border-gray-600'}
          focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
        `}
      >
        <CalendarIcon className="w-5 h-5 text-gray-400" />
        <span className={displayValue ? 'text-gray-900 dark:text-white' : 'text-gray-400'}>
          {displayValue || placeholder}
        </span>
        {(startDate || endDate) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRangeChange?.(null, null);
            }}
            className="ml-auto text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-50 mt-2 right-0"
            >
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onRangeSelect={(start, end) => {
                  onRangeChange?.(start, end);
                  if (start && end) {
                    setIsOpen(false);
                  }
                }}
                minDate={minDate}
                maxDate={maxDate}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Month Picker
interface MonthPickerProps {
  value?: Date | null;
  onChange?: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

export function MonthPicker({
  value,
  onChange,
  minDate,
  maxDate,
  className = '',
}: MonthPickerProps) {
  const [viewYear, setViewYear] = useState(value?.getFullYear() || new Date().getFullYear());

  const isMonthDisabled = (year: number, month: number): boolean => {
    const date = new Date(year, month, 1);
    if (minDate && date < new Date(minDate.getFullYear(), minDate.getMonth(), 1)) return true;
    if (maxDate && date > new Date(maxDate.getFullYear(), maxDate.getMonth(), 1)) return true;
    return false;
  };

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl shadow-lg p-4 w-80 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setViewYear(viewYear - 1)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-lg font-semibold">{viewYear}</span>
        <button
          onClick={() => setViewYear(viewYear + 1)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {MONTHS_RO.map((monthName, idx) => {
          const isSelected = value &&
            value.getFullYear() === viewYear &&
            value.getMonth() === idx;
          const disabled = isMonthDisabled(viewYear, idx);

          return (
            <button
              key={monthName}
              onClick={() => !disabled && onChange?.(new Date(viewYear, idx, 1))}
              disabled={disabled}
              className={`
                py-3 px-2 rounded-lg text-sm font-medium transition-colors
                ${isSelected
                  ? 'bg-primary text-white'
                  : disabled
                    ? 'opacity-30 cursor-not-allowed'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
            >
              {monthName}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Year Picker
interface YearPickerProps {
  value?: number | null;
  onChange?: (year: number) => void;
  minYear?: number;
  maxYear?: number;
  className?: string;
}

export function YearPicker({
  value,
  onChange,
  minYear = 1900,
  maxYear = 2100,
  className = '',
}: YearPickerProps) {
  const currentYear = new Date().getFullYear();
  const [startYear, setStartYear] = useState(
    Math.floor((value || currentYear) / 12) * 12
  );

  const years = Array.from({ length: 12 }, (_, i) => startYear + i);

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl shadow-lg p-4 w-80 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setStartYear(startYear - 12)}
          disabled={startYear <= minYear}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-lg font-semibold">
          {years[0]} - {years[years.length - 1]}
        </span>
        <button
          onClick={() => setStartYear(startYear + 12)}
          disabled={startYear + 12 > maxYear}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {years.map((year) => {
          const isSelected = value === year;
          const disabled = year < minYear || year > maxYear;

          return (
            <button
              key={year}
              onClick={() => !disabled && onChange?.(year)}
              disabled={disabled}
              className={`
                py-3 px-2 rounded-lg text-sm font-medium transition-colors
                ${isSelected
                  ? 'bg-primary text-white'
                  : year === currentYear
                    ? 'bg-primary/10 text-primary'
                    : disabled
                      ? 'opacity-30 cursor-not-allowed'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
            >
              {year}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Time Picker
interface TimePickerProps {
  value?: string | null;
  onChange?: (time: string) => void;
  minuteStep?: number;
  use24Hour?: boolean;
  minTime?: string;
  maxTime?: string;
  className?: string;
}

export function TimePicker({
  value,
  onChange,
  minuteStep = 15,
  use24Hour = true,
  minTime,
  maxTime,
  className = '',
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hours = use24Hour
    ? Array.from({ length: 24 }, (_, i) => i)
    : Array.from({ length: 12 }, (_, i) => i + 1);

  const minutes = Array.from({ length: 60 / minuteStep }, (_, i) => i * minuteStep);

  const parseTime = (time: string): { hour: number; minute: number } => {
    const [h, m] = time.split(':').map(Number);
    return { hour: h, minute: m };
  };

  const formatTimeValue = (hour: number, minute: number): string => {
    const h = hour.toString().padStart(2, '0');
    const m = minute.toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const isTimeDisabled = (hour: number, minute: number): boolean => {
    const time = formatTimeValue(hour, minute);
    if (minTime && time < minTime) return true;
    if (maxTime && time > maxTime) return true;
    return false;
  };

  const currentHour = value ? parseTime(value).hour : null;
  const currentMinute = value ? parseTime(value).minute : null;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center gap-3 px-4 py-2.5 text-left
          bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg
          hover:border-gray-300 dark:hover:border-gray-600
          focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
        `}
      >
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className={value ? 'text-gray-900 dark:text-white' : 'text-gray-400'}>
          {value || 'Selectează ora'}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-50 mt-2 bg-white dark:bg-gray-900 rounded-xl shadow-lg p-4"
            >
              <div className="flex gap-4">
                {/* Hours */}
                <div className="h-48 overflow-y-auto">
                  <div className="text-xs font-medium text-gray-500 mb-2 text-center">Ora</div>
                  {hours.map((hour) => (
                    <button
                      key={hour}
                      onClick={() => {
                        const minute = currentMinute ?? 0;
                        onChange?.(formatTimeValue(hour, minute));
                      }}
                      className={`
                        block w-12 py-2 text-center text-sm rounded-lg
                        ${currentHour === hour
                          ? 'bg-primary text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      {hour.toString().padStart(2, '0')}
                    </button>
                  ))}
                </div>

                {/* Minutes */}
                <div className="h-48 overflow-y-auto">
                  <div className="text-xs font-medium text-gray-500 mb-2 text-center">Min</div>
                  {minutes.map((minute) => (
                    <button
                      key={minute}
                      onClick={() => {
                        const hour = currentHour ?? 0;
                        if (!isTimeDisabled(hour, minute)) {
                          onChange?.(formatTimeValue(hour, minute));
                          setIsOpen(false);
                        }
                      }}
                      disabled={currentHour !== null && isTimeDisabled(currentHour, minute)}
                      className={`
                        block w-12 py-2 text-center text-sm rounded-lg
                        ${currentMinute === minute
                          ? 'bg-primary text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                        }
                        disabled:opacity-30 disabled:cursor-not-allowed
                      `}
                    >
                      {minute.toString().padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// DateTime Input
interface DateTimeInputProps {
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  className?: string;
}

export function DateTimeInput({
  value,
  onChange,
  placeholder = 'Selectează data și ora',
  minDate,
  maxDate,
  disabled,
  className = '',
}: DateTimeInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(value || null);
  const [selectedTime, setSelectedTime] = useState<string>(
    value ? `${value.getHours().toString().padStart(2, '0')}:${value.getMinutes().toString().padStart(2, '0')}` : ''
  );

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    if (selectedTime) {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const newDate = new Date(date);
      newDate.setHours(hours, minutes);
      onChange?.(newDate);
    }
  };

  const handleTimeChange = (time: string) => {
    setSelectedTime(time);
    if (selectedDate) {
      const [hours, minutes] = time.split(':').map(Number);
      const newDate = new Date(selectedDate);
      newDate.setHours(hours, minutes);
      onChange?.(newDate);
    }
  };

  const displayValue = value
    ? `${formatDate(value)} ${value.getHours().toString().padStart(2, '0')}:${value.getMinutes().toString().padStart(2, '0')}`
    : null;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center gap-3 px-4 py-2.5 text-left
          bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-300'}
          focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
        `}
      >
        <CalendarIcon className="w-5 h-5 text-gray-400" />
        <span className={displayValue ? 'text-gray-900 dark:text-white' : 'text-gray-400'}>
          {displayValue || placeholder}
        </span>
        {value && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChange?.(null);
              setSelectedDate(null);
              setSelectedTime('');
            }}
            className="ml-auto text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-50 mt-2 bg-white dark:bg-gray-900 rounded-xl shadow-lg p-4"
            >
              <div className="flex gap-4">
                <Calendar
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  minDate={minDate}
                  maxDate={maxDate}
                  className="shadow-none p-0"
                />
                <div className="border-l border-gray-200 dark:border-gray-700 pl-4">
                  <TimePicker
                    value={selectedTime}
                    onChange={handleTimeChange}
                  />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                >
                  Anulează
                </button>
                <button
                  onClick={() => {
                    if (selectedDate && selectedTime) {
                      setIsOpen(false);
                    }
                  }}
                  disabled={!selectedDate || !selectedTime}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  Confirmă
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
