'use client';

import { Suspense, memo, type ReactNode, type ComponentType } from 'react';
import { useLazyLoad } from '@/hooks/useLazyLoad';
import { LoadingState } from '@/components/ui/LoadingState';

interface LazyWidgetProps {
  children: ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
  threshold?: number;
  minHeight?: number | string;
  className?: string;
}

/**
 * LazyWidget - Wrapper that only renders children when scrolled into view
 * Perfect for below-the-fold widgets to reduce initial render time
 *
 * Usage:
 * ```tsx
 * <LazyWidget minHeight={300} fallback={<WidgetSkeleton />}>
 *   <HeavyWidget />
 * </LazyWidget>
 * ```
 */
export function LazyWidget({
  children,
  fallback,
  rootMargin = '200px',
  threshold = 0,
  minHeight = 200,
  className = '',
}: LazyWidgetProps) {
  const { ref, hasIntersected } = useLazyLoad<HTMLDivElement>({
    rootMargin,
    threshold,
    triggerOnce: true,
  });

  const defaultFallback = (
    <div className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg" style={{ minHeight }} />
  );

  return (
    <div
      ref={ref}
      className={className}
      style={{ minHeight: hasIntersected ? undefined : minHeight }}
    >
      {hasIntersected ? (
        <Suspense fallback={fallback || defaultFallback}>{children}</Suspense>
      ) : (
        fallback || defaultFallback
      )}
    </div>
  );
}

/**
 * createLazyComponent - HOC to create lazy-loaded components
 * Combines dynamic import with intersection observer
 */
export function createLazyComponent<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options?: {
    fallback?: ReactNode;
    rootMargin?: string;
    threshold?: number;
    minHeight?: number | string;
  }
) {
  const LazyComponent = memo(function LazyComponent(props: P) {
    const { ref, hasIntersected } = useLazyLoad<HTMLDivElement>({
      rootMargin: options?.rootMargin || '200px',
      threshold: options?.threshold || 0,
      triggerOnce: true,
    });

    const defaultFallback = (
      <div
        className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg"
        style={{ minHeight: options?.minHeight || 200 }}
      />
    );

    if (!hasIntersected) {
      return (
        <div ref={ref} style={{ minHeight: options?.minHeight || 200 }}>
          {options?.fallback || defaultFallback}
        </div>
      );
    }

    // Dynamically import and render
    const DynamicComponent = memo(function DynamicComponent() {
      const [Component, setComponent] = useState<ComponentType<P> | null>(null);
      const [error, setError] = useState<Error | null>(null);

      useEffect(() => {
        importFn()
          .then((module) => setComponent(() => module.default))
          .catch((err) => setError(err));
      }, []);

      if (error) {
        return (
          <div className="text-red-500 p-4">
            Error loading component: {error.message}
          </div>
        );
      }

      if (!Component) {
        return <>{options?.fallback || defaultFallback}</>;
      }

      return <Component {...props} />;
    });

    return (
      <div ref={ref}>
        <DynamicComponent />
      </div>
    );
  });

  return LazyComponent;
}

// Import useState and useEffect for createLazyComponent
import { useState, useEffect } from 'react';

/**
 * Priority-based widget loader
 * Loads widgets in order of priority as they come into view
 */
interface PriorityWidgetProps {
  priority: 'high' | 'medium' | 'low';
  children: ReactNode;
  fallback?: ReactNode;
}

export function PriorityWidget({ priority, children, fallback }: PriorityWidgetProps) {
  // High priority: Load immediately (above fold)
  // Medium priority: Load when 200px from viewport
  // Low priority: Load when 400px from viewport

  const rootMargin = {
    high: '0px',
    medium: '200px',
    low: '400px',
  }[priority];

  if (priority === 'high') {
    // High priority widgets render immediately
    return <Suspense fallback={fallback}>{children}</Suspense>;
  }

  return (
    <LazyWidget rootMargin={rootMargin} fallback={fallback}>
      {children}
    </LazyWidget>
  );
}

export default LazyWidget;
