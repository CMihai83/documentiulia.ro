/**
 * Dashboard Preferences Hook
 * Manages user dashboard customization preferences
 * Sprint 26 - Dashboard Customization
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface DashboardModule {
  id: string;
  name: string;
  nameRo: string;
  path: string;
  category: string;
  tier: 'FREE' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';
  icon: string;
}

export interface DashboardPreferencesDto {
  enabledModules: string[];
  moduleOrder: string[];
  collapsedSections: string[];
  sidebarCollapsed: boolean;
  compactMode: boolean;
  darkMode: boolean;
  dashboardWidgets: string[];
}

interface UseDashboardPreferencesReturn {
  preferences: DashboardPreferencesDto | null;
  availableModules: DashboardModule[];
  userTier: string | null;
  isLoading: boolean;
  error: string | null;
  toggleModule: (moduleId: string) => Promise<void>;
  updatePreferences: (updates: Partial<DashboardPreferencesDto>) => Promise<void>;
  resetPreferences: () => Promise<void>;
  isModuleEnabled: (moduleId: string) => boolean;
  refetch: () => Promise<void>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export function useDashboardPreferences(): UseDashboardPreferencesReturn {
  const { token } = useAuth();
  const [preferences, setPreferences] = useState<DashboardPreferencesDto | null>(null);
  const [availableModules, setAvailableModules] = useState<DashboardModule[]>([]);
  const [userTier, setUserTier] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch preferences
      const prefsResponse = await fetch(`${API_BASE}/users/dashboard-preferences`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!prefsResponse.ok) {
        throw new Error('Failed to fetch preferences');
      }

      const prefsData = await prefsResponse.json();
      setPreferences(prefsData);

      // Fetch available modules
      const modulesResponse = await fetch(`${API_BASE}/users/dashboard-preferences/modules`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (modulesResponse.ok) {
        const modulesData = await modulesResponse.json();
        setAvailableModules(modulesData.modules || []);
        setUserTier(modulesData.tier || 'FREE');
      }
    } catch (err) {
      console.error('Error fetching dashboard preferences:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');

      // Fallback to default preferences
      setPreferences({
        enabledModules: ['dashboard', 'analytics', 'invoices', 'finance', 'crm', 'hr'],
        moduleOrder: [],
        collapsedSections: [],
        sidebarCollapsed: false,
        compactMode: false,
        darkMode: false,
        dashboardWidgets: ['overview', 'cashFlow', 'vatChart', 'recentInvoices', 'alerts'],
      });
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreferences = useCallback(async (updates: Partial<DashboardPreferencesDto>) => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/users/dashboard-preferences`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      const updatedPrefs = await response.json();
      setPreferences(updatedPrefs);
    } catch (err) {
      console.error('Error updating preferences:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [token]);

  const toggleModule = useCallback(async (moduleId: string) => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/users/dashboard-preferences/toggle/${moduleId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to toggle module');
      }

      const updatedPrefs = await response.json();
      setPreferences(updatedPrefs);
    } catch (err) {
      console.error('Error toggling module:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [token]);

  const resetPreferences = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/users/dashboard-preferences`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to reset preferences');
      }

      const defaultPrefs = await response.json();
      setPreferences(defaultPrefs);
    } catch (err) {
      console.error('Error resetting preferences:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [token]);

  const isModuleEnabled = useCallback((moduleId: string): boolean => {
    return preferences?.enabledModules.includes(moduleId) ?? true;
  }, [preferences]);

  return {
    preferences,
    availableModules,
    userTier,
    isLoading,
    error,
    toggleModule,
    updatePreferences,
    resetPreferences,
    isModuleEnabled,
    refetch: fetchPreferences,
  };
}
