'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface UseCacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
  staleWhileRevalidate?: boolean; // Return stale data while fetching fresh
  onError?: (error: Error) => void;
}

// In-memory cache store
const cacheStore = new Map<string, CacheEntry<unknown>>();

/**
 * Custom hook for caching API responses
 */
export function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseCacheOptions = {}
) {
  const { ttl = 5 * 60 * 1000, staleWhileRevalidate = true, onError } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const isStale = useCallback(() => {
    const entry = cacheStore.get(key) as CacheEntry<T> | undefined;
    if (!entry) return true;
    return Date.now() > entry.expiresAt;
  }, [key]);

  const getCachedData = useCallback(() => {
    const entry = cacheStore.get(key) as CacheEntry<T> | undefined;
    return entry?.data ?? null;
  }, [key]);

  const setCachedData = useCallback(
    (newData: T) => {
      const entry: CacheEntry<T> = {
        data: newData,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
      };
      cacheStore.set(key, entry);
    },
    [key, ttl]
  );

  const fetchData = useCallback(async (forceRefresh = false) => {
    const cached = getCachedData();
    const stale = isStale();

    // Return cached data if fresh
    if (cached && !stale && !forceRefresh) {
      setData(cached);
      setIsLoading(false);
      return cached;
    }

    // If staleWhileRevalidate, show stale data while fetching
    if (cached && staleWhileRevalidate) {
      setData(cached);
      setIsLoading(false);
      setIsValidating(true);
    } else {
      setIsLoading(true);
    }

    try {
      const freshData = await fetcherRef.current();
      setCachedData(freshData);
      setData(freshData);
      setError(null);
      return freshData;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);

      // Return cached data on error if available
      if (cached) {
        return cached;
      }
      throw error;
    } finally {
      setIsLoading(false);
      setIsValidating(false);
    }
  }, [getCachedData, isStale, setCachedData, staleWhileRevalidate, onError]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [key]); // Re-fetch when key changes

  // Mutate function to update cache manually
  const mutate = useCallback(
    async (newData?: T | ((current: T | null) => T)) => {
      if (newData !== undefined) {
        const resolvedData =
          typeof newData === 'function'
            ? (newData as (current: T | null) => T)(data)
            : newData;
        setCachedData(resolvedData);
        setData(resolvedData);
      } else {
        // Revalidate
        await fetchData(true);
      }
    },
    [data, setCachedData, fetchData]
  );

  // Invalidate cache entry
  const invalidate = useCallback(() => {
    cacheStore.delete(key);
    setData(null);
  }, [key]);

  return {
    data,
    isLoading,
    isValidating,
    error,
    mutate,
    invalidate,
    refresh: () => fetchData(true),
  };
}

/**
 * Clear all cache entries
 */
export function clearCache() {
  cacheStore.clear();
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache() {
  const now = Date.now();
  for (const [key, entry] of cacheStore.entries()) {
    if ((entry as CacheEntry<unknown>).expiresAt < now) {
      cacheStore.delete(key);
    }
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  let totalEntries = 0;
  let expiredEntries = 0;
  let validEntries = 0;
  const now = Date.now();

  for (const [, entry] of cacheStore.entries()) {
    totalEntries++;
    if ((entry as CacheEntry<unknown>).expiresAt < now) {
      expiredEntries++;
    } else {
      validEntries++;
    }
  }

  return {
    totalEntries,
    expiredEntries,
    validEntries,
  };
}

/**
 * Prefetch data into cache
 */
export async function prefetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 5 * 60 * 1000
) {
  try {
    const data = await fetcher();
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    };
    cacheStore.set(key, entry);
    return data;
  } catch (error) {
    console.error(`Failed to prefetch ${key}:`, error);
    throw error;
  }
}

export default useCache;
