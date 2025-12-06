'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

interface DatePickerProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
  className?: string;
}

const DAYS_RO = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du'];
const MONTHS_RO = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
];

export function DatePicker({
  value,
  onChange,
  placeholder = 'Selectează data',
  minDate,
  maxDate,
  disabled = false,
  error,
  label,
  required,
  className = '',
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value || new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update view date when value changes
  useEffect(() => {
    if (value) {
      setViewDate(value);
    }
  }, [value]);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return day === 0 ? 6 : day - 1; // Convert Sunday (0) to 6, Monday (1) to 0
  };

  const isDateDisabled = (date: Date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getDate() === d2.getDate() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getFullYear() === d2.getFullYear();
  };

  const isToday = (date: Date) => {
    return isSameDay(date, new Date());
  };

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleSelectDate = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    if (!isDateDisabled(newDate)) {
      onChange(newDate);
      setIsOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const formatDisplayDate = (date: Date) => {
    return new Intl.DateTimeFormat('ro-RO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  // Generate calendar days
  const daysInMonth = getDaysInMonth(viewDate);
  const firstDay = getFirstDayOfMonth(viewDate);
  const days: (number | null)[] = [];

  // Add empty cells for days before the first day
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Add days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center gap-2 px-3 py-2.5 text-left border rounded-lg transition-colors ${
          disabled
            ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
            : 'bg-white dark:bg-gray-900 hover:border-gray-400 dark:hover:border-gray-600'
        } ${
          error
            ? 'border-red-300 dark:border-red-700'
            : isOpen
            ? 'border-primary ring-2 ring-primary/20'
            : 'border-gray-200 dark:border-gray-700'
        }`}
      >
        <Calendar className="w-4 h-4 text-gray-400" />
        <span className={`flex-1 text-sm ${value ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
          {value ? formatDisplayDate(value) : placeholder}
        </span>
        {value && !disabled && (
          <button
            onClick={handleClear}
            className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </button>

      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Calendar dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 p-4 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 w-72"
          >
            {/* Month/Year header */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-semibold text-gray-900 dark:text-white">
                {MONTHS_RO[viewDate.getMonth()]} {viewDate.getFullYear()}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Day names */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS_RO.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="p-2" />;
                }

                const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                const isDisabled = isDateDisabled(date);
                const isSelected = value && isSameDay(date, value);
                const isTodayDate = isToday(date);

                return (
                  <button
                    key={day}
                    onClick={() => handleSelectDate(day)}
                    disabled={isDisabled}
                    className={`p-2 text-sm rounded-lg transition-colors ${
                      isDisabled
                        ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                        : isSelected
                        ? 'bg-primary text-white'
                        : isTodayDate
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Quick actions */}
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
              <button
                onClick={() => {
                  onChange(new Date());
                  setIsOpen(false);
                }}
                className="flex-1 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
              >
                Astăzi
              </button>
              <button
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                }}
                className="flex-1 px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Șterge
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Date range picker
interface DateRangePickerProps {
  startDate?: Date | null;
  endDate?: Date | null;
  onStartChange: (date: Date | null) => void;
  onEndChange: (date: Date | null) => void;
  startLabel?: string;
  endLabel?: string;
  className?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  startLabel = 'De la',
  endLabel = 'Până la',
  className = '',
}: DateRangePickerProps) {
  return (
    <div className={`flex flex-col sm:flex-row gap-3 ${className}`}>
      <DatePicker
        value={startDate}
        onChange={onStartChange}
        label={startLabel}
        maxDate={endDate || undefined}
        placeholder="Data început"
      />
      <DatePicker
        value={endDate}
        onChange={onEndChange}
        label={endLabel}
        minDate={startDate || undefined}
        placeholder="Data sfârșit"
      />
    </div>
  );
}
