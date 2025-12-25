'use client';

import { memo, useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * Dashboard Charts - DocumentIulia.ro
 * Recharts data visualization with Romanian labels
 */

// Romanian month names
const MONTHS_RO = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Color palette
const COLORS = {
  primary: '#2563eb',
  secondary: '#7c3aed',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
};

const PIE_COLORS = [COLORS.primary, COLORS.secondary, COLORS.success, COLORS.warning, COLORS.danger];

// Format currency in RON
const formatCurrency = (value: number, currency = 'RON') => {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border dark:border-gray-700">
        <p className="font-medium text-gray-900 dark:text-white mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' && entry.name?.includes('Venituri')
              ? formatCurrency(entry.value)
              : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Revenue Chart Component
interface RevenueChartProps {
  data: Array<{
    month: string;
    revenue: number;
    expenses?: number;
    profit?: number;
  }>;
  showExpenses?: boolean;
  height?: number;
}

export const RevenueChart = memo(function RevenueChart({
  data,
  showExpenses = false,
  height = 300,
}: RevenueChartProps) {
  const chartData = useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      name: MONTHS_RO[index] || item.month,
    }));
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
              <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.danger} stopOpacity={0.3} />
              <stop offset="95%" stopColor={COLORS.danger} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis
            dataKey="name"
            tick={{ fill: 'currentColor', fontSize: 12 }}
            className="text-gray-600 dark:text-gray-400"
          />
          <YAxis
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            tick={{ fill: 'currentColor', fontSize: 12 }}
            className="text-gray-600 dark:text-gray-400"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Area
            type="monotone"
            dataKey="revenue"
            name="Venituri"
            stroke={COLORS.primary}
            fillOpacity={1}
            fill="url(#revenueGradient)"
            strokeWidth={2}
          />
          {showExpenses && (
            <Area
              type="monotone"
              dataKey="expenses"
              name="Cheltuieli"
              stroke={COLORS.danger}
              fillOpacity={1}
              fill="url(#expensesGradient)"
              strokeWidth={2}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
});

// Invoice Status Chart
interface InvoiceStatusChartProps {
  data: Array<{
    status: string;
    count: number;
    amount: number;
  }>;
  height?: number;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Ciorne',
  sent: 'Trimise',
  paid: 'Platite',
  overdue: 'Restante',
  cancelled: 'Anulate',
};

export const InvoiceStatusChart = memo(function InvoiceStatusChart({
  data,
  height = 250,
}: InvoiceStatusChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      name: STATUS_LABELS[item.status] || item.status,
    }));
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="count"
            nameKey="name"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  );
});

// Monthly Invoices Bar Chart
interface MonthlyInvoicesChartProps {
  data: Array<{
    month: string;
    invoices: number;
    efactura: number;
  }>;
  height?: number;
}

export const MonthlyInvoicesChart = memo(function MonthlyInvoicesChart({
  data,
  height = 300,
}: MonthlyInvoicesChartProps) {
  const chartData = useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      name: MONTHS_RO[index] || item.month,
    }));
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="w-full"
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis
            dataKey="name"
            tick={{ fill: 'currentColor', fontSize: 12 }}
            className="text-gray-600 dark:text-gray-400"
          />
          <YAxis
            tick={{ fill: 'currentColor', fontSize: 12 }}
            className="text-gray-600 dark:text-gray-400"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="invoices" name="Facturi emise" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
          <Bar dataKey="efactura" name="e-Factura ANAF" fill={COLORS.success} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
});

// Cash Flow Line Chart
interface CashFlowChartProps {
  data: Array<{
    date: string;
    inflow: number;
    outflow: number;
    balance: number;
  }>;
  height?: number;
}

export const CashFlowChart = memo(function CashFlowChart({
  data,
  height = 300,
}: CashFlowChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="w-full"
    >
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis
            dataKey="date"
            tick={{ fill: 'currentColor', fontSize: 12 }}
            className="text-gray-600 dark:text-gray-400"
          />
          <YAxis
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            tick={{ fill: 'currentColor', fontSize: 12 }}
            className="text-gray-600 dark:text-gray-400"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="inflow"
            name="Incasari"
            stroke={COLORS.success}
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="outflow"
            name="Plati"
            stroke={COLORS.danger}
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="balance"
            name="Sold"
            stroke={COLORS.primary}
            strokeWidth={3}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
});

// Stat Card with Trend
interface StatCardProps {
  title: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  icon?: React.ReactNode;
  color?: keyof typeof COLORS;
}

export const StatCard = memo(function StatCard({
  title,
  value,
  trend,
  trendLabel = 'fata de luna trecuta',
  icon,
  color = 'primary',
}: StatCardProps) {
  const TrendIcon = trend === undefined ? Minus : trend >= 0 ? TrendingUp : TrendingDown;
  const trendColor = trend === undefined ? 'text-gray-500' : trend >= 0 ? 'text-green-500' : 'text-red-500';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</span>
        {icon && (
          <div className="p-2 rounded-lg" style={{ backgroundColor: `${COLORS[color]}20` }}>
            {icon}
          </div>
        )}
      </div>

      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        {typeof value === 'number' ? formatCurrency(value) : value}
      </div>

      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
          <TrendIcon className="w-4 h-4" />
          <span>{trend >= 0 ? '+' : ''}{trend.toFixed(1)}%</span>
          <span className="text-gray-500 dark:text-gray-400">{trendLabel}</span>
        </div>
      )}
    </motion.div>
  );
});

// Top Clients Chart
interface TopClientsChartProps {
  data: Array<{
    name: string;
    revenue: number;
    invoices: number;
  }>;
  height?: number;
}

export const TopClientsChart = memo(function TopClientsChart({
  data,
  height = 300,
}: TopClientsChartProps) {
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="w-full"
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={sortedData} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis
            type="number"
            tickFormatter={(value) => formatCurrency(value)}
            tick={{ fill: 'currentColor', fontSize: 12 }}
            className="text-gray-600 dark:text-gray-400"
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: 'currentColor', fontSize: 12 }}
            className="text-gray-600 dark:text-gray-400"
            width={90}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="revenue" name="Venituri" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
});

// VAT Summary Chart
interface VatSummaryChartProps {
  data: {
    collected: number;
    paid: number;
    balance: number;
  };
  height?: number;
}

export const VatSummaryChart = memo(function VatSummaryChart({
  data,
  height = 200,
}: VatSummaryChartProps) {
  const chartData = [
    { name: 'TVA Colectat', value: data.collected, fill: COLORS.success },
    { name: 'TVA Deductibil', value: data.paid, fill: COLORS.danger },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="w-full"
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 0 }}>
          <XAxis
            type="number"
            tickFormatter={(value) => formatCurrency(value)}
            tick={{ fill: 'currentColor', fontSize: 12 }}
          />
          <YAxis type="category" dataKey="name" tick={{ fill: 'currentColor', fontSize: 12 }} width={100} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 text-center">
        <span className="text-sm text-gray-600 dark:text-gray-400">TVA de plata: </span>
        <span className={`font-bold ${data.balance >= 0 ? 'text-red-500' : 'text-green-500'}`}>
          {formatCurrency(Math.abs(data.balance))}
          {data.balance < 0 && ' (de recuperat)'}
        </span>
      </div>
    </motion.div>
  );
});

export {
  COLORS,
  MONTHS_RO,
  formatCurrency,
};
