import React, { useState, useMemo } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { useCalendarMonth, useFiscalDeadlines, type CalendarDay, type FiscalDeadline } from '../../hooks/useRomanianCalendar';

interface RomanianCalendarProps {
  onDateSelect?: (date: string) => void;
  selectedDate?: string;
  showDeadlines?: boolean;
  compact?: boolean;
}

/**
 * Romanian Calendar Component
 * Displays a monthly calendar with Romanian holidays and tax deadlines
 */
const RomanianCalendar: React.FC<RomanianCalendarProps> = ({
  onDateSelect,
  selectedDate,
  showDeadlines = true,
  compact = false
}) => {
  const { language } = useI18n();
  const isRo = language === 'ro';

  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  const { data: calendarData, loading, error, refresh } = useCalendarMonth(currentYear, currentMonth);
  const { urgentDeadlines } = useFiscalDeadlines(30);

  // Navigate months
  const goToPreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const goToToday = () => {
    setCurrentYear(new Date().getFullYear());
    setCurrentMonth(new Date().getMonth() + 1);
  };

  // Build calendar grid with padding for first week
  const calendarGrid = useMemo(() => {
    if (!calendarData) return [];

    const grid: (CalendarDay | null)[] = [];
    const firstDayOffset = calendarData.first_day_of_week - 1; // Convert to 0-indexed

    // Add empty cells for days before the first of the month
    for (let i = 0; i < firstDayOffset; i++) {
      grid.push(null);
    }

    // Add actual days
    grid.push(...calendarData.days);

    return grid;
  }, [calendarData]);

  // Check if a date is today
  const isToday = (date: string): boolean => {
    return date === new Date().toISOString().split('T')[0];
  };

  // Handle day click
  const handleDayClick = (day: CalendarDay) => {
    setSelectedDay(day);
    onDateSelect?.(day.date);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button
            onClick={refresh}
            className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-sm"
          >
            {isRo ? 'Reincarca' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  if (!calendarData) return null;

  return (
    <div className="space-y-4">
      {/* Calendar Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label={isRo ? 'Luna anterioara' : 'Previous month'}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="text-center">
              <h2 className="text-lg font-semibold">
                {calendarData.month_name} {calendarData.year}
              </h2>
              <p className="text-xs text-blue-100">
                {calendarData.business_days} {isRo ? 'zile lucratoare' : 'business days'}
              </p>
            </div>

            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label={isRo ? 'Luna urmatoare' : 'Next month'}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Day names header */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {calendarData.day_names_short.map((name, i) => (
            <div
              key={name}
              className={`py-2 text-center text-xs font-medium ${
                i >= 5 ? 'text-red-500' : 'text-gray-500'
              }`}
            >
              {name}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {calendarGrid.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="p-2 min-h-[60px] bg-gray-50" />;
            }

            const today = isToday(day.date);
            const selected = selectedDate === day.date;
            const hasDeadlines = day.deadlines && day.deadlines.length > 0;

            return (
              <button
                key={day.date}
                onClick={() => handleDayClick(day)}
                className={`
                  p-2 min-h-[60px] text-left border-b border-r border-gray-100 transition-colors
                  ${day.is_weekend ? 'bg-red-50/50' : 'bg-white'}
                  ${day.is_holiday ? 'bg-orange-50' : ''}
                  ${today ? 'ring-2 ring-blue-500 ring-inset' : ''}
                  ${selected ? 'bg-blue-100' : 'hover:bg-gray-50'}
                  ${!day.is_business_day ? 'opacity-75' : ''}
                `}
              >
                <div className="flex flex-col h-full">
                  {/* Day number */}
                  <span className={`
                    text-sm font-medium
                    ${day.is_weekend || day.is_holiday ? 'text-red-600' : 'text-gray-900'}
                    ${today ? 'text-blue-600' : ''}
                  `}>
                    {day.day}
                  </span>

                  {/* Holiday indicator */}
                  {day.is_holiday && day.holiday && !compact && (
                    <span className="mt-1 text-[10px] text-orange-600 truncate" title={day.holiday.name}>
                      {day.holiday.name.length > 12 ? day.holiday.name.slice(0, 12) + '...' : day.holiday.name}
                    </span>
                  )}

                  {/* Deadline indicators */}
                  {hasDeadlines && !compact && (
                    <div className="mt-auto flex gap-1">
                      {day.deadlines.slice(0, 3).map((d, i) => (
                        <div
                          key={i}
                          className="w-2 h-2 rounded-full bg-purple-500"
                          title={d.name}
                        />
                      ))}
                      {day.deadlines.length > 3 && (
                        <span className="text-[10px] text-gray-400">+{day.deadlines.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs">
          <button
            onClick={goToToday}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {isRo ? 'Astazi' : 'Today'}
          </button>
          <div className="flex items-center gap-4 text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-red-50 border border-red-200 rounded"></span>
              {isRo ? 'Weekend' : 'Weekend'}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-orange-50 border border-orange-200 rounded"></span>
              {isRo ? 'Sarbatoare' : 'Holiday'}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              {isRo ? 'Termen fiscal' : 'Tax deadline'}
            </span>
          </div>
        </div>
      </div>

      {/* Selected day details */}
      {selectedDay && (
        <DayDetails day={selectedDay} isRo={isRo} onClose={() => setSelectedDay(null)} />
      )}

      {/* Urgent deadlines sidebar */}
      {showDeadlines && urgentDeadlines.length > 0 && (
        <UrgentDeadlinesCard deadlines={urgentDeadlines} isRo={isRo} />
      )}
    </div>
  );
};

// Day details component
interface DayDetailsProps {
  day: CalendarDay;
  isRo: boolean;
  onClose: () => void;
}

const DayDetails: React.FC<DayDetailsProps> = ({ day, isRo, onClose }) => {
  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString(isRo ? 'ro-RO' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{formatDate(day.date)}</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Day status */}
      <div className="flex items-center gap-2 mb-4">
        {day.is_business_day ? (
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
            {isRo ? 'Zi lucratoare' : 'Business day'}
          </span>
        ) : (
          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
            {isRo ? 'Zi nelucratoare' : 'Non-working day'}
          </span>
        )}
        {day.is_weekend && (
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
            {isRo ? 'Weekend' : 'Weekend'}
          </span>
        )}
      </div>

      {/* Holiday info */}
      {day.is_holiday && day.holiday && (
        <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-medium text-orange-800">{day.holiday.name}</p>
              <p className="text-xs text-orange-600">
                {day.holiday.is_national ? (isRo ? 'Sarbatoare nationala' : 'National holiday') : ''}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Deadlines */}
      {day.deadlines && day.deadlines.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            {isRo ? 'Termene fiscale' : 'Tax deadlines'}
          </h4>
          <div className="space-y-2">
            {day.deadlines.map((deadline, i) => (
              <div
                key={i}
                className="p-3 bg-purple-50 rounded-lg border border-purple-200"
              >
                <p className="font-medium text-purple-800">{deadline.name}</p>
                <p className="text-xs text-purple-600 mt-1">{deadline.description}</p>
                {deadline.adjusted && (
                  <p className="text-xs text-purple-500 mt-1 italic">
                    {isRo ? 'Mutat de pe zi nelucratoare' : 'Moved from non-working day'}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!day.is_holiday && (!day.deadlines || day.deadlines.length === 0) && (
        <p className="text-gray-500 text-sm">
          {isRo ? 'Nu sunt evenimente pentru aceasta zi.' : 'No events for this day.'}
        </p>
      )}
    </div>
  );
};

// Urgent deadlines card
interface UrgentDeadlinesCardProps {
  deadlines: FiscalDeadline[];
  isRo: boolean;
}

const UrgentDeadlinesCard: React.FC<UrgentDeadlinesCardProps> = ({ deadlines, isRo }) => {
  return (
    <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3 className="font-semibold">
          {isRo ? 'Termene urgente' : 'Urgent deadlines'}
        </h3>
      </div>
      <div className="space-y-2">
        {deadlines.map((deadline, i) => (
          <div key={i} className="bg-white/10 rounded-lg p-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{deadline.name}</span>
              <span className="text-xs bg-white/20 px-2 py-1 rounded">
                {deadline.days_until === 0
                  ? (isRo ? 'ASTAZI' : 'TODAY')
                  : `${deadline.days_until} ${isRo ? 'zile' : 'days'}`}
              </span>
            </div>
            <p className="text-xs text-white/80 mt-1">{deadline.date}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RomanianCalendar;
