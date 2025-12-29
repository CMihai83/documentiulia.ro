'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseLazyLoadOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

/**
 * useLazyLoad - Intersection Observer based lazy loading hook
 *
 * Usage:
 * ```tsx
 * const { ref, isIntersecting, hasIntersected } = useLazyLoad({
 *   threshold: 0.1,
 *   rootMargin: '100px',
 *   triggerOnce: true,
 * });
 *
 * return (
 *   <div ref={ref}>
 *     {hasIntersected && <HeavyComponent />}
 *   </div>
 * );
 * ```
 */
export function useLazyLoad<T extends HTMLElement = HTMLDivElement>(
  options: UseLazyLoadOptions = {}
) {
  const { threshold = 0, rootMargin = '100px', triggerOnce = true } = options;

  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const elementRef = useRef<T | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Skip if already intersected and triggerOnce is true
    if (triggerOnce && hasIntersected) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const intersecting = entry.isIntersecting;
        setIsIntersecting(intersecting);

        if (intersecting && !hasIntersected) {
          setHasIntersected(true);

          // Disconnect if triggerOnce
          if (triggerOnce) {
            observer.disconnect();
          }
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce, hasIntersected]);

  const setRef = useCallback((node: T | null) => {
    elementRef.current = node;
  }, []);

  return {
    ref: setRef,
    isIntersecting,
    hasIntersected,
  };
}

/**
 * usePrefetch - Prefetch data when element comes into view
 */
export function usePrefetch<T>(
  fetchFn: () => Promise<T>,
  options: UseLazyLoadOptions = {}
) {
  const { ref, hasIntersected } = useLazyLoad(options);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (hasIntersected && !fetchedRef.current) {
      fetchedRef.current = true;
      setLoading(true);

      fetchFn()
        .then((result) => {
          setData(result);
          setError(null);
        })
        .catch((err) => {
          setError(err instanceof Error ? err : new Error('Fetch failed'));
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [hasIntersected, fetchFn]);

  return {
    ref,
    data,
    loading,
    error,
    hasIntersected,
  };
}

export default useLazyLoad;
