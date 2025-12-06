import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export interface FeatureAccess {
  enabled: boolean;
  reason: string;
  feature_id: string;
  feature_name?: string;
  required_tier?: string;
  current_tier?: string;
  upgrade_url?: string;
  is_beta?: boolean;
  requires_setup?: boolean;
}

interface Feature {
  id: string;
  name: string;
  description: string;
  category: string;
  is_active: boolean;
  required_tier: string;
  is_beta: boolean;
  access: FeatureAccess;
}

interface UseFeatureResult {
  enabled: boolean;
  loading: boolean;
  access: FeatureAccess | null;
  checkFeature: (featureId: string) => Promise<FeatureAccess>;
}

interface UseAllFeaturesResult {
  features: Feature[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isEnabled: (featureId: string) => boolean;
}

// Cache for feature checks
const featureCache: Map<string, { access: FeatureAccess; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to check if a specific feature is enabled
 *
 * Usage:
 *   const { enabled, loading, access } = useFeature('advanced_reporting');
 *   if (!enabled) return <UpgradePrompt feature={access} />;
 */
export function useFeature(featureId: string): UseFeatureResult {
  const { token, companyId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<FeatureAccess | null>(null);

  const checkFeature = useCallback(async (id: string): Promise<FeatureAccess> => {
    // Check cache first
    const cacheKey = `${companyId}:${id}`;
    const cached = featureCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.access;
    }

    const response = await fetch(`/api/v1/features/check.php?feature_id=${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Company-ID': companyId || ''
      }
    });

    const data = await response.json();
    const featureAccess = data.data as FeatureAccess;

    // Cache the result
    featureCache.set(cacheKey, {
      access: featureAccess,
      timestamp: Date.now()
    });

    return featureAccess;
  }, [token, companyId]);

  useEffect(() => {
    if (!token || !companyId || !featureId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    checkFeature(featureId)
      .then(setAccess)
      .catch(err => {
        console.error('Feature check failed:', err);
        setAccess({
          enabled: false,
          reason: 'error',
          feature_id: featureId
        });
      })
      .finally(() => setLoading(false));
  }, [featureId, token, companyId, checkFeature]);

  return {
    enabled: access?.enabled ?? false,
    loading,
    access,
    checkFeature
  };
}

/**
 * Hook to get all features with access status
 *
 * Usage:
 *   const { features, isEnabled } = useAllFeatures();
 *   features.map(f => <FeatureCard feature={f} enabled={isEnabled(f.id)} />)
 */
export function useAllFeatures(): UseAllFeaturesResult {
  const { token, companyId } = useAuth();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeatures = useCallback(async () => {
    if (!token || !companyId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/features/check.php', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Company-ID': companyId
        }
      });

      const data = await response.json();
      if (data.success) {
        setFeatures(data.data);

        // Update cache with all features
        data.data.forEach((f: Feature) => {
          featureCache.set(`${companyId}:${f.id}`, {
            access: f.access,
            timestamp: Date.now()
          });
        });
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to load features');
      console.error('Features fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [token, companyId]);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  const isEnabled = useCallback((featureId: string): boolean => {
    const feature = features.find(f => f.id === featureId);
    return feature?.access?.enabled ?? false;
  }, [features]);

  return {
    features,
    loading,
    error,
    refresh: fetchFeatures,
    isEnabled
  };
}

/**
 * Clear the feature cache (useful after subscription changes)
 */
export function clearFeatureCache(): void {
  featureCache.clear();
}

/**
 * Invalidate cache for a specific company
 */
export function invalidateCompanyFeatures(companyId: string): void {
  for (const key of featureCache.keys()) {
    if (key.startsWith(`${companyId}:`)) {
      featureCache.delete(key);
    }
  }
}

export default useFeature;
