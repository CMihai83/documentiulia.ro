import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../i18n/I18nContext';

// Types
export interface Holiday {
  date: string;
  name: string;
  type: 'fixed' | 'orthodox_easter';
  is_national: boolean;
}

export interface FiscalDeadline {
  key: string;
  date: string;
  original_day: number;
  name: string;
  description: string;
  adjusted: boolean;
  days_until?: number;
  is_urgent?: boolean;
}

export interface CalendarDay {
  date: string;
  day: number;
  day_of_week: number;
  is_weekend: boolean;
  is_holiday: boolean;
  is_business_day: boolean;
  holiday: Holiday | null;
  deadlines: FiscalDeadline[];
}

export interface MonthCalendarData {
  year: number;
  month: number;
  month_name: string;
  first_day_of_week: number;
  days_in_month: number;
  business_days: number;
  day_names: string[];
  day_names_short: string[];
  language: string;
  days: CalendarDay[];
}

export interface HolidaysData {
  year: number;
  orthodox_easter: string;
  total_holidays: number;
  holidays: Holiday[];
}

// Calendar month hook
export function useCalendarMonth(year?: number, month?: number) {
  const { language } = useI18n();
  const [data, setData] = useState<MonthCalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentYear = year || new Date().getFullYear();
  const currentMonth = month || (new Date().getMonth() + 1);

  const fetchMonth = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/v1/calendar/month.php?year=${currentYear}&month=${currentMonth}&lang=${language}`
      );
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.message || 'Failed to load calendar');
      }
    } catch (err) {
      setError('Network error loading calendar');
      console.error('Calendar fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth, language]);

  useEffect(() => {
    fetchMonth();
  }, [fetchMonth]);

  return {
    data,
    loading,
    error,
    refresh: fetchMonth
  };
}

// Holidays for year hook
export function useHolidays(year?: number) {
  const { language } = useI18n();
  const [data, setData] = useState<HolidaysData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentYear = year || new Date().getFullYear();

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/v1/calendar/holidays.php?year=${currentYear}&lang=${language}`
      );
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.message || 'Failed to load holidays');
      }
    } catch (err) {
      setError('Network error loading holidays');
      console.error('Holidays fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentYear, language]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  return {
    holidays: data?.holidays || [],
    orthodoxEaster: data?.orthodox_easter,
    totalHolidays: data?.total_holidays || 0,
    loading,
    error,
    refresh: fetchHolidays
  };
}

// Upcoming fiscal deadlines hook
export function useFiscalDeadlines(days: number = 30) {
  const { language } = useI18n();
  const [deadlines, setDeadlines] = useState<FiscalDeadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeadlines = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/v1/calendar/fiscal-deadlines.php?days=${days}&lang=${language}`
      );
      const result = await response.json();

      if (result.success) {
        setDeadlines(result.data);
      } else {
        setError(result.message || 'Failed to load deadlines');
      }
    } catch (err) {
      setError('Network error loading deadlines');
      console.error('Deadlines fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [days, language]);

  useEffect(() => {
    fetchDeadlines();
  }, [fetchDeadlines]);

  const urgentDeadlines = deadlines.filter(d => d.is_urgent);
  const upcomingDeadlines = deadlines.filter(d => !d.is_urgent);

  return {
    deadlines,
    urgentDeadlines,
    upcomingDeadlines,
    loading,
    error,
    refresh: fetchDeadlines
  };
}

// Business days calculator hook
export function useBusinessDays() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkIsBusinessDay = useCallback(async (date: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/v1/calendar/business-days.php?date=${date}`);
      const result = await response.json();
      return result.success && result.data?.is_business_day;
    } catch {
      return false;
    }
  }, []);

  const countBusinessDays = useCallback(async (startDate: string, endDate: string): Promise<number> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/v1/calendar/business-days.php?start=${startDate}&end=${endDate}`
      );
      const result = await response.json();

      if (result.success) {
        return result.data?.business_days || 0;
      } else {
        setError(result.message);
        return 0;
      }
    } catch (err) {
      setError('Network error');
      return 0;
    } finally {
      setLoading(false);
    }
  }, []);

  const addBusinessDays = useCallback(async (date: string, days: number): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/v1/calendar/business-days.php?date=${date}&add=${days}`
      );
      const result = await response.json();

      if (result.success) {
        return result.data?.result_date || null;
      } else {
        setError(result.message);
        return null;
      }
    } catch (err) {
      setError('Network error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    checkIsBusinessDay,
    countBusinessDays,
    addBusinessDays,
    loading,
    error
  };
}

export default useCalendarMonth;
