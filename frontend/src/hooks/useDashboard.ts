import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n/I18nContext';

export interface WidgetPosition {
  widget_id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardWidget extends WidgetPosition {
  name: string;
  description: string;
  category: string;
  component_name: string;
  data_source: string | null;
  refresh_interval: number;
  min_width: number;
  min_height: number;
  max_width: number;
  max_height: number;
  is_resizable: boolean;
  is_removable: boolean;
}

export interface AvailableWidget {
  id: string;
  name: string;
  description: string;
  category: string;
  component_name: string;
  default_width: number;
  default_height: number;
  data_source: string | null;
}

interface UseDashboardResult {
  widgets: DashboardWidget[];
  loading: boolean;
  error: string | null;
  hasCustomLayout: boolean;
  saveLayout: (widgets: WidgetPosition[]) => Promise<boolean>;
  resetToDefault: () => Promise<boolean>;
  refreshLayout: () => Promise<void>;
}

interface UseAvailableWidgetsResult {
  widgets: AvailableWidget[];
  loading: boolean;
  error: string | null;
  byCategory: Record<string, AvailableWidget[]>;
}

/**
 * Hook to manage dashboard layout
 */
export function useDashboard(): UseDashboardResult {
  const { token, companyId } = useAuth();
  const { language } = useI18n();
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasCustomLayout, setHasCustomLayout] = useState(false);

  const fetchLayout = useCallback(async () => {
    if (!token || !companyId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/dashboard/layout.php', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Company-ID': companyId,
          'Accept-Language': language
        }
      });

      const data = await response.json();

      if (data.success) {
        setWidgets(data.data.widgets);
        setHasCustomLayout(data.data.has_custom_layout);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to load dashboard layout');
      console.error('Dashboard fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [token, companyId, language]);

  useEffect(() => {
    fetchLayout();
  }, [fetchLayout]);

  const saveLayout = useCallback(async (newWidgets: WidgetPosition[]): Promise<boolean> => {
    if (!token || !companyId) return false;

    try {
      const response = await fetch('/api/v1/dashboard/layout.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Company-ID': companyId
        },
        body: JSON.stringify({ widgets: newWidgets })
      });

      const data = await response.json();

      if (data.success) {
        setHasCustomLayout(true);
        await fetchLayout();
      }

      return data.success;
    } catch (err) {
      console.error('Failed to save layout:', err);
      return false;
    }
  }, [token, companyId, fetchLayout]);

  const resetToDefault = useCallback(async (): Promise<boolean> => {
    if (!token || !companyId) return false;

    try {
      const response = await fetch('/api/v1/dashboard/layout.php', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Company-ID': companyId
        }
      });

      const data = await response.json();

      if (data.success) {
        setHasCustomLayout(false);
        await fetchLayout();
      }

      return data.success;
    } catch (err) {
      console.error('Failed to reset layout:', err);
      return false;
    }
  }, [token, companyId, fetchLayout]);

  return {
    widgets,
    loading,
    error,
    hasCustomLayout,
    saveLayout,
    resetToDefault,
    refreshLayout: fetchLayout
  };
}

/**
 * Hook to get available widgets for adding to dashboard
 */
export function useAvailableWidgets(): UseAvailableWidgetsResult {
  const { token, companyId } = useAuth();
  const { language } = useI18n();
  const [widgets, setWidgets] = useState<AvailableWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWidgets = async () => {
      if (!token || !companyId) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/v1/dashboard/widgets.php', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Company-ID': companyId,
            'Accept-Language': language
          }
        });

        const data = await response.json();

        if (data.success) {
          setWidgets(data.data);
        } else {
          setError(data.message);
        }
      } catch (err) {
        setError('Failed to load available widgets');
        console.error('Widgets fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWidgets();
  }, [token, companyId, language]);

  // Group by category
  const byCategory = widgets.reduce((acc, widget) => {
    const cat = widget.category;
    if (!acc[cat]) {
      acc[cat] = [];
    }
    acc[cat].push(widget);
    return acc;
  }, {} as Record<string, AvailableWidget[]>);

  return {
    widgets,
    loading,
    error,
    byCategory
  };
}

export default useDashboard;
