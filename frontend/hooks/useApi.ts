'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { api, validateSession } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface UseApiState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
}

interface UseApiOptions {
  validateOnMount?: boolean;
  onUnauthorized?: () => void;
}

export function useApi<T = unknown>(options: UseApiOptions = {}) {
  const { validateOnMount = false, onUnauthorized } = options;
  const { logout } = useAuth();
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    error: null,
    isLoading: false,
  });
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (validateOnMount) {
      validateSession().then((isValid) => {
        if (!isValid && isMounted.current) {
          onUnauthorized?.();
        }
      });
    }
  }, [validateOnMount, onUnauthorized]);

  const handleUnauthorized = useCallback(() => {
    if (onUnauthorized) {
      onUnauthorized();
    } else {
      logout();
    }
  }, [onUnauthorized, logout]);

  const request = useCallback(
    async (
      method: 'get' | 'post' | 'put' | 'patch' | 'delete',
      endpoint: string,
      body?: unknown
    ) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response =
          method === 'get' || method === 'delete'
            ? await api[method]<T>(endpoint)
            : await api[method]<T>(endpoint, body);

        if (!isMounted.current) return null;

        if (response.status === 401) {
          handleUnauthorized();
          setState({ data: null, error: 'Session expired', isLoading: false });
          return null;
        }

        if (response.error) {
          setState({ data: null, error: response.error, isLoading: false });
          return null;
        }

        setState({ data: response.data || null, error: null, isLoading: false });
        return response.data;
      } catch (err) {
        if (!isMounted.current) return null;
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setState({ data: null, error: errorMessage, isLoading: false });
        return null;
      }
    },
    [handleUnauthorized]
  );

  const get = useCallback((endpoint: string) => request('get', endpoint), [request]);
  const post = useCallback((endpoint: string, body?: unknown) => request('post', endpoint, body), [request]);
  const put = useCallback((endpoint: string, body?: unknown) => request('put', endpoint, body), [request]);
  const patch = useCallback((endpoint: string, body?: unknown) => request('patch', endpoint, body), [request]);
  const del = useCallback((endpoint: string) => request('delete', endpoint), [request]);

  const reset = useCallback(() => {
    setState({ data: null, error: null, isLoading: false });
  }, []);

  return {
    ...state,
    get,
    post,
    put,
    patch,
    delete: del,
    reset,
  };
}

// Simplified hook for fetching data on mount
export function useFetch<T = unknown>(endpoint: string, options: { skip?: boolean } = {}) {
  const { skip = false } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!skip);

  useEffect(() => {
    if (skip) return;

    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);
      const response = await api.get<T>(endpoint);

      if (cancelled) return;

      if (response.error) {
        setError(response.error);
        setData(null);
      } else {
        setData(response.data || null);
        setError(null);
      }
      setIsLoading(false);
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [endpoint, skip]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    const response = await api.get<T>(endpoint);
    if (response.error) {
      setError(response.error);
      setData(null);
    } else {
      setData(response.data || null);
      setError(null);
    }
    setIsLoading(false);
  }, [endpoint]);

  return { data, error, isLoading, refetch };
}
