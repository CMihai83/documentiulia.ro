'use client';

import { FileText, CreditCard, FolderOpen, Shield } from 'lucide-react';

interface ActivityItem {
  type: 'invoice' | 'document' | 'audit' | 'payment';
  title: string;
  description: string;
  timestamp: string;
  entityId?: string;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

interface RecentActivityProps {
  activities: ActivityItem[];
  locale?: string;
}

const iconMap = {
  invoice: FileText,
  document: FolderOpen,
  audit: Shield,
  payment: CreditCard,
};

const colorMap = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  yellow: 'bg-yellow-100 text-yellow-600',
  red: 'bg-red-100 text-red-600',
  purple: 'bg-purple-100 text-purple-600',
};

function formatRelativeTime(timestamp: string, locale: string = 'ro'): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) {
    return locale === 'ro' ? 'Acum' : 'Just now';
  }
  if (diffInMinutes < 60) {
    return locale === 'ro' ? `Acum ${diffInMinutes} min` : `${diffInMinutes}m ago`;
  }
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return locale === 'ro' ? `Acum ${diffInHours} ore` : `${diffInHours}h ago`;
  }
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return locale === 'ro' ? `Acum ${diffInDays} zile` : `${diffInDays}d ago`;
  }
  return date.toLocaleDateString(locale === 'ro' ? 'ro-RO' : 'en-US', {
    day: 'numeric',
    month: 'short',
  });
}

export default function RecentActivity({ activities, locale = 'ro' }: RecentActivityProps) {
  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {locale === 'ro' ? 'Activitate Recentă' : 'Recent Activity'}
        </h3>
        <p className="text-gray-500 text-center py-8">
          {locale === 'ro' ? 'Nicio activitate recentă' : 'No recent activity'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {locale === 'ro' ? 'Activitate Recentă' : 'Recent Activity'}
      </h3>
      <div className="space-y-4">
        {activities.map((activity, index) => {
          const Icon = iconMap[activity.type] || FileText;
          const colorClasses = colorMap[activity.color] || colorMap.blue;

          return (
            <div key={index} className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${colorClasses}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {activity.title}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {activity.description}
                </p>
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {formatRelativeTime(activity.timestamp, locale)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
