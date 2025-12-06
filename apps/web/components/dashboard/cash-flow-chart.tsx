'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { useRevenueReport } from '@/lib/api/hooks';
import { useCompanyStore } from '@/lib/store/company-store';

// Default sample data for when no company is selected
const defaultMonthlyData = [
  { month: 'Ian', income: 42000, expenses: 18000, forecast: null },
  { month: 'Feb', income: 38000, expenses: 22000, forecast: null },
  { month: 'Mar', income: 51000, expenses: 19000, forecast: null },
  { month: 'Apr', income: 47000, expenses: 24000, forecast: null },
  { month: 'Mai', income: 53000, expenses: 21000, forecast: null },
  { month: 'Iun', income: 49000, expenses: 23000, forecast: null },
  { month: 'Iul', income: 55000, expenses: 25000, forecast: null },
  { month: 'Aug', income: 48000, expenses: 22000, forecast: null },
  { month: 'Sep', income: 52000, expenses: 24000, forecast: null },
  { month: 'Oct', income: 58000, expenses: 26000, forecast: null },
  { month: 'Nov', income: 45230, expenses: 18450, forecast: null },
  { month: 'Dec', income: null, expenses: null, forecast: 52000 },
];

const defaultWeeklyData = [
  { week: 'Săpt 1', income: 12000, expenses: 4500, forecast: null },
  { week: 'Săpt 2', income: 10500, expenses: 5200, forecast: null },
  { week: 'Săpt 3', income: 14200, expenses: 4800, forecast: null },
  { week: 'Săpt 4', income: 8530, expenses: 3950, forecast: null },
  { week: 'Săpt 5', income: null, expenses: null, forecast: 11000 },
];

type Period = 'week' | 'month' | 'year';

// Romanian month abbreviations
const monthNames = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    color: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload) return null;

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
      <p className="font-medium mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600 dark:text-gray-400">
            {entry.dataKey === 'income'
              ? 'Venituri'
              : entry.dataKey === 'expenses'
              ? 'Cheltuieli'
              : 'Prognoză'}
            :
          </span>
          <span className="font-semibold">
            {entry.value?.toLocaleString('ro-RO')} RON
          </span>
        </div>
      ))}
    </div>
  );
}

// Format large numbers in Romanian format
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ro-RO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' RON';
}

export default function CashFlowChart() {
  const t = useTranslations('dashboard.charts');
  const [period, setPeriod] = useState<Period>('month');
  const { selectedCompanyId } = useCompanyStore();

  // Get current year for the API call
  const currentYear = new Date().getFullYear();

  // Fetch revenue report from API
  const { data: revenueData, isLoading } = useRevenueReport(
    selectedCompanyId || '',
    period === 'year'
      ? { year: currentYear.toString() }
      : period === 'month'
      ? { year: currentYear.toString(), groupBy: 'month' }
      : { year: currentYear.toString(), groupBy: 'week' }
  );

  // Process API data into chart format
  const chartData = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apiData = revenueData?.data as any;
    if (!apiData?.periods) {
      return period === 'week' ? defaultWeeklyData : defaultMonthlyData;
    }

    const periods = apiData.periods;

    if (period === 'month') {
      return periods.map((p: { month: number; income: number; expenses: number }) => ({
        month: monthNames[p.month - 1] || `${p.month}`,
        income: p.income || 0,
        expenses: p.expenses || 0,
        forecast: null,
      }));
    }

    if (period === 'week') {
      return periods.map((p: { week: number; income: number; expenses: number }, idx: number) => ({
        week: `Săpt ${p.week || idx + 1}`,
        income: p.income || 0,
        expenses: p.expenses || 0,
        forecast: null,
      }));
    }

    return defaultMonthlyData;
  }, [revenueData, period]);

  // Calculate totals
  const totals = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apiData = revenueData?.data as any;
    if (apiData?.totals) {
      return {
        totalIncome: apiData.totals.income || 0,
        totalExpenses: apiData.totals.expenses || 0,
        profit: apiData.totals.profit || 0,
      };
    }

    // Calculate from chart data
    const totalIncome = chartData.reduce((sum: number, d: { income: number | null }) => sum + (d.income || 0), 0);
    const totalExpenses = chartData.reduce((sum: number, d: { expenses: number | null }) => sum + (d.expenses || 0), 0);

    return {
      totalIncome,
      totalExpenses,
      profit: totalIncome - totalExpenses,
    };
  }, [revenueData, chartData]);

  const xKey = period === 'week' ? 'week' : 'month';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-semibold text-lg">{t('cashFlow')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('revenueVsExpenses')}
          </p>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
          {(['week', 'month', 'year'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                period === p
                  ? 'bg-white dark:bg-gray-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {p === 'week' ? 'Săptămânal' : p === 'month' ? 'Lunar' : 'Anual'}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-80 relative">
        {isLoading && selectedCompanyId && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-800/50 z-10">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              className="dark:stroke-gray-700"
              vertical={false}
            />

            <XAxis
              dataKey={xKey}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              dy={10}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              dx={-10}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              iconSize={8}
              formatter={(value) =>
                value === 'income'
                  ? 'Venituri'
                  : value === 'expenses'
                  ? 'Cheltuieli'
                  : 'Prognoză AI'
              }
            />

            <Area
              type="monotone"
              dataKey="income"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#incomeGradient)"
              dot={false}
              activeDot={{ r: 6, strokeWidth: 2, fill: '#fff' }}
            />

            <Area
              type="monotone"
              dataKey="expenses"
              stroke="#f97316"
              strokeWidth={2}
              fill="url(#expensesGradient)"
              dot={false}
              activeDot={{ r: 6, strokeWidth: 2, fill: '#fff' }}
            />

            <Area
              type="monotone"
              dataKey="forecast"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="url(#forecastGradient)"
              dot={false}
              activeDot={{ r: 6, strokeWidth: 2, fill: '#fff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Venituri</p>
          <p className="text-xl font-bold text-green-600">
            {formatCurrency(totals.totalIncome)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Cheltuieli</p>
          <p className="text-xl font-bold text-orange-600">
            {formatCurrency(totals.totalExpenses)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Profit Net</p>
          <p className="text-xl font-bold text-blue-600">
            {formatCurrency(totals.profit)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
