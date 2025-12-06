'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type ActivityType =
  | 'invoice_created'
  | 'invoice_sent'
  | 'invoice_paid'
  | 'expense_added'
  | 'contact_added'
  | 'payment_received'
  | 'document_uploaded'
  | 'report_generated'
  | 'user_login'
  | 'settings_changed'
  | 'comment_added'
  | 'status_changed'
  | 'reminder_set'
  | 'other';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  user?: {
    name: string;
    avatar?: string;
  };
  metadata?: Record<string, unknown>;
  timestamp: Date;
  read?: boolean;
}

export interface ActivityFeedProps {
  activities: ActivityItem[];
  loading?: boolean;
  emptyMessage?: string;
  showLoadMore?: boolean;
  onLoadMore?: () => void;
  onActivityClick?: (activity: ActivityItem) => void;
  maxItems?: number;
  className?: string;
}

// ============================================================================
// Activity Type Configuration
// ============================================================================

const activityTypeConfig: Record<ActivityType, { icon: React.ReactNode; color: string }> = {
  invoice_created: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  },
  invoice_sent: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  },
  invoice_paid: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  },
  expense_added: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
      </svg>
    ),
    color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  },
  contact_added: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
    color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  },
  payment_received: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  },
  document_uploaded: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
    color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  report_generated: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
  },
  user_login: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
      </svg>
    ),
    color: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
  },
  settings_changed: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
  },
  comment_added: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    ),
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  },
  status_changed: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  },
  reminder_set: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  other: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
  },
};

// ============================================================================
// Utility Functions
// ============================================================================

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Acum';
  if (diffMin < 60) return `Acum ${diffMin} min`;
  if (diffHour < 24) return `Acum ${diffHour} ore`;
  if (diffDay < 7) return `Acum ${diffDay} zile`;

  return date.toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'short',
  });
}

// ============================================================================
// Activity Feed Component
// ============================================================================

export function ActivityFeed({
  activities,
  loading = false,
  emptyMessage = 'Nu există activitate recentă',
  showLoadMore = false,
  onLoadMore,
  onActivityClick,
  maxItems,
  className,
}: ActivityFeedProps) {
  const displayActivities = maxItems ? activities.slice(0, maxItems) : activities;

  return (
    <div className={cn('space-y-1', className)}>
      {loading && activities.length === 0 ? (
        <ActivityFeedSkeleton />
      ) : displayActivities.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground text-sm">
          {emptyMessage}
        </div>
      ) : (
        <AnimatePresence initial={false}>
          {displayActivities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <ActivityFeedItem
                activity={activity}
                onClick={onActivityClick ? () => onActivityClick(activity) : undefined}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      {showLoadMore && onLoadMore && (
        <button
          onClick={onLoadMore}
          disabled={loading}
          className="w-full py-2 text-sm text-primary hover:underline disabled:opacity-50"
        >
          {loading ? 'Se încarcă...' : 'Încarcă mai multe'}
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Activity Feed Item Component
// ============================================================================

interface ActivityFeedItemProps {
  activity: ActivityItem;
  onClick?: () => void;
}

function ActivityFeedItem({ activity, onClick }: ActivityFeedItemProps) {
  const config = activityTypeConfig[activity.type];

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors',
        'hover:bg-muted/50',
        !activity.read && 'bg-primary/5',
        !onClick && 'cursor-default'
      )}
    >
      {/* Icon */}
      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', config.color)}>
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-tight">
            {activity.title}
          </p>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatRelativeTime(activity.timestamp)}
          </span>
        </div>
        {activity.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {activity.description}
          </p>
        )}
        {activity.user && (
          <div className="flex items-center gap-1.5 mt-1">
            {activity.user.avatar ? (
              <img
                src={activity.user.avatar}
                alt={activity.user.name}
                className="w-4 h-4 rounded-full"
              />
            ) : (
              <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center">
                <span className="text-[10px] font-medium">
                  {activity.user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <span className="text-xs text-muted-foreground">{activity.user.name}</span>
          </div>
        )}
      </div>

      {/* Unread indicator */}
      {!activity.read && (
        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
      )}
    </button>
  );
}

// ============================================================================
// Activity Feed Skeleton Component
// ============================================================================

function ActivityFeedSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-muted" />
          <div className="flex-1">
            <div className="h-4 bg-muted rounded w-3/4 mb-2" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Activity Feed Card Component
// ============================================================================

export interface ActivityFeedCardProps extends ActivityFeedProps {
  title?: string;
  showViewAll?: boolean;
  onViewAll?: () => void;
}

export function ActivityFeedCard({
  title = 'Activitate recentă',
  showViewAll = true,
  onViewAll,
  ...feedProps
}: ActivityFeedCardProps) {
  return (
    <div className="bg-card border rounded-lg">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold">{title}</h3>
        {showViewAll && onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-primary hover:underline"
          >
            Vezi tot
          </button>
        )}
      </div>
      <div className="p-2">
        <ActivityFeed {...feedProps} />
      </div>
    </div>
  );
}

// ============================================================================
// Compact Activity List Component
// ============================================================================

export interface CompactActivityListProps {
  activities: ActivityItem[];
  maxItems?: number;
  className?: string;
}

export function CompactActivityList({
  activities,
  maxItems = 5,
  className,
}: CompactActivityListProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {activities.slice(0, maxItems).map((activity) => {
        const config = activityTypeConfig[activity.type];
        return (
          <div key={activity.id} className="flex items-center gap-2 text-sm">
            <span className={cn('w-5 h-5 rounded flex items-center justify-center flex-shrink-0', config.color)}>
              {config.icon}
            </span>
            <span className="flex-1 truncate">{activity.title}</span>
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(activity.timestamp)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  activityTypeConfig,
  formatRelativeTime,
  type ActivityItem as Activity,
  type ActivityFeedProps as FeedProps,
  type ActivityFeedCardProps as FeedCardProps,
  type CompactActivityListProps as CompactFeedProps,
};
