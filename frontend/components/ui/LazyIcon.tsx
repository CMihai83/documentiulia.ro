'use client';

import { lazy, Suspense, type ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';

// Lazy-loaded icons for performance optimization
const iconComponents = {
  Calculator: lazy(() => import('lucide-react').then(mod => ({ default: mod.Calculator }))),
  FileText: lazy(() => import('lucide-react').then(mod => ({ default: mod.FileText }))),
  Shield: lazy(() => import('lucide-react').then(mod => ({ default: mod.Shield }))),
  Brain: lazy(() => import('lucide-react').then(mod => ({ default: mod.Brain }))),
  Users: lazy(() => import('lucide-react').then(mod => ({ default: mod.Users }))),
  Coins: lazy(() => import('lucide-react').then(mod => ({ default: mod.Coins }))),
  ArrowRight: lazy(() => import('lucide-react').then(mod => ({ default: mod.ArrowRight }))),
  Upload: lazy(() => import('lucide-react').then(mod => ({ default: mod.Upload }))),
  TrendingUp: lazy(() => import('lucide-react').then(mod => ({ default: mod.TrendingUp }))),
  AlertTriangle: lazy(() => import('lucide-react').then(mod => ({ default: mod.AlertTriangle }))),
  CheckCircle: lazy(() => import('lucide-react').then(mod => ({ default: mod.CheckCircle }))),
} as const;

export type IconName = keyof typeof iconComponents;

interface LazyIconProps extends LucideProps {
  name: IconName;
  fallback?: React.ReactNode;
}

// Simple skeleton placeholder for loading state
function IconSkeleton({ className }: { className?: string }) {
  return (
    <span
      className={`inline-block bg-gray-200 rounded animate-pulse ${className || 'w-6 h-6'}`}
      aria-hidden="true"
    />
  );
}

export function LazyIcon({ name, fallback, className, ...props }: LazyIconProps) {
  const IconComponent = iconComponents[name] as ComponentType<LucideProps>;

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in lazy-loaded icons`);
    return null;
  }

  return (
    <Suspense fallback={fallback || <IconSkeleton className={className} />}>
      <IconComponent className={className} {...props} />
    </Suspense>
  );
}

// For cases where we need the icon component reference (like mapping)
export function getLazyIcon(name: IconName) {
  return iconComponents[name];
}
