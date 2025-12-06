'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  FileText,
  AlertTriangle,
  Receipt,
  Loader2,
} from 'lucide-react';
import { useDashboard } from '@/lib/api/hooks';
import { useCompanyStore } from '@/lib/store/company-store';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  delay: number;
  isLoading?: boolean;
}

function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  color,
  delay,
  isLoading,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          {isLoading ? (
            <div className="h-8 mt-1 flex items-center">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              <p className="text-2xl font-bold mt-1">{value}</p>
              {change && (
                <div className="flex items-center gap-1 mt-2">
                  {changeType === 'positive' ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : changeType === 'negative' ? (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  ) : null}
                  <span
                    className={`text-sm font-medium ${
                      changeType === 'positive'
                        ? 'text-green-600 dark:text-green-400'
                        : changeType === 'negative'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-500'
                    }`}
                  >
                    {change}
                  </span>
                  <span className="text-sm text-gray-400">vs luna trecută</span>
                </div>
              )}
            </>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );
}

// Format currency in Romanian format
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ro-RO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' RON';
}

// Format percentage change
function formatChange(current: number, previous: number): { change: string; type: 'positive' | 'negative' | 'neutral' } {
  if (previous === 0) return { change: 'N/A', type: 'neutral' };

  const percentChange = ((current - previous) / previous) * 100;
  const sign = percentChange >= 0 ? '+' : '';

  return {
    change: `${sign}${percentChange.toFixed(1)}%`,
    type: percentChange > 0 ? 'positive' : percentChange < 0 ? 'negative' : 'neutral',
  };
}

export default function StatsCards() {
  const t = useTranslations('dashboard.stats');
  const { selectedCompanyId } = useCompanyStore();

  // Fetch dashboard data from API
  const { data: dashboardData, isLoading, error } = useDashboard(selectedCompanyId || '');

  // Default/mock data for when there's no company selected or loading
  const defaultStats: StatCardProps[] = [
    {
      title: t('revenue'),
      value: '0 RON',
      change: undefined,
      changeType: 'neutral',
      icon: TrendingUp,
      color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
      delay: 0,
    },
    {
      title: t('expenses'),
      value: '0 RON',
      change: undefined,
      changeType: 'neutral',
      icon: Receipt,
      color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
      delay: 0.05,
    },
    {
      title: t('profit'),
      value: '0 RON',
      change: undefined,
      changeType: 'neutral',
      icon: Wallet,
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      delay: 0.1,
    },
    {
      title: t('outstanding'),
      value: '0 RON',
      change: '0 facturi',
      changeType: 'neutral',
      icon: FileText,
      color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
      delay: 0.15,
    },
    {
      title: t('overdue'),
      value: '0 RON',
      change: '0 facturi',
      changeType: 'neutral',
      icon: AlertTriangle,
      color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
      delay: 0.2,
    },
    {
      title: t('vatDue'),
      value: '0 RON',
      change: undefined,
      changeType: 'neutral',
      icon: Receipt,
      color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
      delay: 0.25,
    },
  ];

  // Build stats from API data when available
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiData = dashboardData?.data as any;
  const stats: StatCardProps[] = apiData
    ? [
        {
          title: t('revenue'),
          value: formatCurrency(apiData.revenue?.current || 0),
          ...formatChange(
            apiData.revenue?.current || 0,
            apiData.revenue?.previous || 0
          ),
          icon: TrendingUp,
          color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
          delay: 0,
        },
        {
          title: t('expenses'),
          value: formatCurrency(apiData.expenses?.current || 0),
          ...formatChange(
            apiData.expenses?.current || 0,
            apiData.expenses?.previous || 0
          ),
          icon: Receipt,
          color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
          delay: 0.05,
        },
        {
          title: t('profit'),
          value: formatCurrency(apiData.profit?.current || 0),
          ...formatChange(
            apiData.profit?.current || 0,
            apiData.profit?.previous || 0
          ),
          icon: Wallet,
          color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
          delay: 0.1,
        },
        {
          title: t('outstanding'),
          value: formatCurrency(apiData.outstanding?.amount || 0),
          change: `${apiData.outstanding?.count || 0} facturi`,
          changeType: 'neutral',
          icon: FileText,
          color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
          delay: 0.15,
        },
        {
          title: t('overdue'),
          value: formatCurrency(apiData.overdue?.amount || 0),
          change: `${apiData.overdue?.count || 0} facturi`,
          changeType: (apiData.overdue?.count || 0) > 0 ? 'negative' : 'neutral',
          icon: AlertTriangle,
          color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
          delay: 0.2,
        },
        {
          title: t('vatDue'),
          value: formatCurrency(apiData.vatDue?.amount || 0),
          change: apiData.vatDue?.dueDate
            ? `Scadență: ${new Date(apiData.vatDue.dueDate).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}`
            : undefined,
          changeType: 'neutral',
          icon: Receipt,
          color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
          delay: 0.25,
        },
      ]
    : defaultStats;

  // Show error message if fetch failed
  if (error && selectedCompanyId) {
    return (
      <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <p className="text-red-600 dark:text-red-400">
          Eroare la încărcarea datelor. Încercați din nou.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {stats.map((stat) => (
        <StatCard
          key={stat.title}
          {...stat}
          isLoading={isLoading && !!selectedCompanyId}
        />
      ))}
    </div>
  );
}
