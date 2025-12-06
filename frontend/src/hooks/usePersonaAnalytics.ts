import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export interface PersonaDistribution {
  persona_id: string;
  persona_name: string;
  icon: string;
  company_count: number;
}

export interface FeatureUsage {
  feature_key: string;
  usage_count: number;
  unique_users: number;
}

export interface RecentSelection {
  persona_id: string;
  selection_count: number;
  unique_companies: number;
}

export interface AnalyticsDashboard {
  persona_distribution: PersonaDistribution[];
  recent_selections: RecentSelection[];
  top_features: FeatureUsage[];
  active_users_7d: number;
  generated_at: string;
}

export interface FeatureUsageDetail {
  persona_id: string;
  feature_key: string;
  total_usage: number;
  unique_users: number;
  unique_companies: number;
  last_used: string;
}

interface UsePersonaAnalyticsResult {
  dashboard: AnalyticsDashboard | null;
  featureUsage: FeatureUsageDetail[];
  loading: boolean;
  error: string | null;
  refreshDashboard: () => Promise<void>;
  getFeatureUsage: (personaId?: string) => Promise<void>;
  recordUsage: (featureKey: string, action?: string, metadata?: Record<string, any>) => Promise<void>;
  exportData: (type: string, format?: 'json' | 'csv', filters?: Record<string, string>) => Promise<void>;
}

/**
 * Hook for persona analytics (admin dashboard)
 */
export function usePersonaAnalytics(): UsePersonaAnalyticsResult {
  const { token, companyId } = useAuth();
  const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);
  const [featureUsage, setFeatureUsage] = useState<FeatureUsageDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshDashboard = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/analytics/persona-dashboard.php', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Company-ID': companyId || ''
        }
      });

      const data = await response.json();

      if (data.success) {
        setDashboard(data.data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to load analytics dashboard');
      console.error('Analytics fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [token, companyId]);

  const getFeatureUsage = useCallback(async (personaId?: string) => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      let url = '/api/v1/analytics/feature-usage.php';
      if (personaId) {
        url += `?persona_id=${encodeURIComponent(personaId)}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Company-ID': companyId || ''
        }
      });

      const data = await response.json();

      if (data.success) {
        setFeatureUsage(data.data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to load feature usage');
      console.error('Feature usage fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [token, companyId]);

  const recordUsage = useCallback(async (
    featureKey: string,
    action: string = 'view',
    metadata: Record<string, any> = {}
  ) => {
    if (!token || !companyId) return;

    try {
      await fetch('/api/v1/analytics/feature-usage.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Company-ID': companyId
        },
        body: JSON.stringify({ feature_key: featureKey, action, metadata })
      });
    } catch (err) {
      // Silent fail for tracking
      console.error('Failed to record usage:', err);
    }
  }, [token, companyId]);

  const exportData = useCallback(async (
    type: string,
    format: 'json' | 'csv' = 'json',
    filters: Record<string, string> = {}
  ) => {
    if (!token) return;

    const params = new URLSearchParams({ type, format, ...filters });
    const url = `/api/v1/analytics/export.php?${params.toString()}`;

    if (format === 'csv') {
      // Trigger download
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Company-ID': companyId || ''
        }
      });

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${type}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } else {
      // Just fetch JSON
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Company-ID': companyId || ''
        }
      });
      return response.json();
    }
  }, [token, companyId]);

  // Auto-load dashboard on mount
  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  return {
    dashboard,
    featureUsage,
    loading,
    error,
    refreshDashboard,
    getFeatureUsage,
    recordUsage,
    exportData
  };
}

export default usePersonaAnalytics;
