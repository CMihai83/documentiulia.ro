import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n/I18nContext';

export interface NavItem {
  id: string;
  name: string;
  icon: string;
  href: string;
  parent_id: string | null;
  sort_order: number;
  is_section: boolean;
  badge_source: string | null;
  children: NavItem[];
}

export interface NavigationData {
  main: NavItem[];
  favorites: NavItem[];
  recent: NavItem[];
  persona_id: string;
}

interface UseNavigationResult {
  navigation: NavigationData | null;
  loading: boolean;
  error: string | null;
  addFavorite: (itemId: string) => Promise<boolean>;
  removeFavorite: (itemId: string) => Promise<boolean>;
  recordVisit: (itemId: string) => Promise<void>;
  search: (query: string) => Promise<NavItem[]>;
  refreshNavigation: () => Promise<void>;
}

/**
 * Hook to manage navigation state
 */
export function useNavigation(): UseNavigationResult {
  const { token, companyId } = useAuth();
  const { language } = useI18n();
  const [navigation, setNavigation] = useState<NavigationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNavigation = useCallback(async () => {
    if (!token || !companyId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/navigation/menu.php', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Company-ID': companyId,
          'Accept-Language': language
        }
      });

      const data = await response.json();

      if (data.success) {
        setNavigation(data.data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to load navigation');
      console.error('Navigation fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [token, companyId, language]);

  useEffect(() => {
    fetchNavigation();
  }, [fetchNavigation]);

  const addFavorite = useCallback(async (itemId: string): Promise<boolean> => {
    if (!token || !companyId) return false;

    try {
      const response = await fetch('/api/v1/navigation/menu.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Company-ID': companyId
        },
        body: JSON.stringify({ action: 'add_favorite', item_id: itemId })
      });

      const data = await response.json();
      if (data.success) {
        await fetchNavigation();
      }
      return data.success;
    } catch (err) {
      console.error('Failed to add favorite:', err);
      return false;
    }
  }, [token, companyId, fetchNavigation]);

  const removeFavorite = useCallback(async (itemId: string): Promise<boolean> => {
    if (!token || !companyId) return false;

    try {
      const response = await fetch('/api/v1/navigation/menu.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Company-ID': companyId
        },
        body: JSON.stringify({ action: 'remove_favorite', item_id: itemId })
      });

      const data = await response.json();
      if (data.success) {
        await fetchNavigation();
      }
      return data.success;
    } catch (err) {
      console.error('Failed to remove favorite:', err);
      return false;
    }
  }, [token, companyId, fetchNavigation]);

  const recordVisit = useCallback(async (itemId: string): Promise<void> => {
    if (!token || !companyId) return;

    try {
      await fetch('/api/v1/navigation/menu.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Company-ID': companyId
        },
        body: JSON.stringify({ action: 'visit', item_id: itemId })
      });
    } catch (err) {
      // Silent fail for visit tracking
    }
  }, [token, companyId]);

  const search = useCallback(async (query: string): Promise<NavItem[]> => {
    if (!token || !companyId || query.length < 2) return [];

    try {
      const response = await fetch(`/api/v1/navigation/search.php?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Company-ID': companyId,
          'Accept-Language': language
        }
      });

      const data = await response.json();
      return data.success ? data.data : [];
    } catch (err) {
      console.error('Search failed:', err);
      return [];
    }
  }, [token, companyId, language]);

  return {
    navigation,
    loading,
    error,
    addFavorite,
    removeFavorite,
    recordVisit,
    search,
    refreshNavigation: fetchNavigation
  };
}

export default useNavigation;
