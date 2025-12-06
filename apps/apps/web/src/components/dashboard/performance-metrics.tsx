"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Users,
  FileText,
  ShoppingCart,
  Percent,
  Clock,
  ChevronRight,
  BarChart3,
  LineChart,
} from "lucide-react";

// Metric categories
const METRIC_CATEGORIES = {
  FINANCIAL: { label: "Financiar", icon: DollarSign, color: "text-emerald-600" },
  SALES: { label: "Vânzări", icon: ShoppingCart, color: "text-blue-600" },
  CLIENTS: { label: "Clienți", icon: Users, color: "text-purple-600" },
  OPERATIONS: { label: "Operațional", icon: Clock, color: "text-orange-600" },
  GROWTH: { label: "Creștere", icon: TrendingUp, color: "text-pink-600" },
};

interface Metric {
  id: string;
  name: string;
  value: number;
  unit: string;
  previousValue: number;
  target?: number;
  category: keyof typeof METRIC_CATEGORIES;
  sparklineData: number[];
  format: "currency" | "number" | "percent" | "days";
}

// Demo metrics data
const demoMetrics: Metric[] = [
  {
    id: "1",
    name: "Venituri lunare",
    value: 125400,
    unit: "RON",
    previousValue: 98500,
    target: 150000,
    category: "FINANCIAL",
    sparklineData: [85000, 92000, 88000, 95000, 105000, 98500, 125400],
    format: "currency",
  },
  {
    id: "2",
    name: "Cheltuieli lunare",
    value: 78200,
    unit: "RON",
    previousValue: 82100,
    target: 70000,
    category: "FINANCIAL",
    sparklineData: [75000, 79000, 81000, 78000, 80000, 82100, 78200],
    format: "currency",
  },
  {
    id: "3",
    name: "Profit net",
    value: 47200,
    unit: "RON",
    previousValue: 16400,
    category: "FINANCIAL",
    sparklineData: [10000, 13000, 7000, 17000, 25000, 16400, 47200],
    format: "currency",
  },
  {
    id: "4",
    name: "Facturi emise",
    value: 48,
    unit: "facturi",
    previousValue: 42,
    target: 50,
    category: "SALES",
    sparklineData: [35, 38, 40, 45, 39, 42, 48],
    format: "number",
  },
  {
    id: "5",
    name: "Valoare medie factură",
    value: 2612,
    unit: "RON",
    previousValue: 2345,
    category: "SALES",
    sparklineData: [2100, 2250, 2180, 2400, 2300, 2345, 2612],
    format: "currency",
  },
  {
    id: "6",
    name: "Clienți noi",
    value: 8,
    unit: "clienți",
    previousValue: 5,
    target: 10,
    category: "CLIENTS",
    sparklineData: [3, 4, 6, 4, 7, 5, 8],
    format: "number",
  },
  {
    id: "7",
    name: "Rata de retenție",
    value: 94.5,
    unit: "%",
    previousValue: 92.1,
    target: 95,
    category: "CLIENTS",
    sparklineData: [88, 90, 91, 89, 93, 92.1, 94.5],
    format: "percent",
  },
  {
    id: "8",
    name: "Timp mediu plată",
    value: 18,
    unit: "zile",
    previousValue: 24,
    target: 15,
    category: "OPERATIONS",
    sparklineData: [28, 26, 25, 22, 21, 24, 18],
    format: "days",
  },
  {
    id: "9",
    name: "Rata de conversie",
    value: 32.5,
    unit: "%",
    previousValue: 28.3,
    target: 35,
    category: "GROWTH",
    sparklineData: [25, 27, 26, 29, 30, 28.3, 32.5],
    format: "percent",
  },
  {
    id: "10",
    name: "Creștere YoY",
    value: 27.3,
    unit: "%",
    previousValue: 18.5,
    category: "GROWTH",
    sparklineData: [12, 14, 15, 16, 19, 18.5, 27.3],
    format: "percent",
  },
];

function formatValue(value: number, format: string): string {
  switch (format) {
    case "currency":
      return new Intl.NumberFormat("ro-RO", {
        style: "currency",
        currency: "RON",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case "percent":
      return `${value.toFixed(1)}%`;
    case "days":
      return `${value} zile`;
    default:
      return value.toLocaleString("ro-RO");
  }
}

function calculateChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

function calculateGoalProgress(current: number, target: number, isLowerBetter: boolean = false): number {
  if (isLowerBetter) {
    // For metrics like "days to pay" where lower is better
    if (current <= target) return 100;
    return Math.max(0, (target / current) * 100);
  }
  return Math.min(100, (current / target) * 100);
}

// Simple sparkline component
function Sparkline({ data, isPositive }: { data: number[]; isPositive: boolean }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 24;
  const padding = 2;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * (width - padding * 2) + padding;
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        fill="none"
        stroke={isPositive ? "#10B981" : "#EF4444"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

interface PerformanceMetricsProps {
  metrics?: Metric[];
  period?: string;
}

export function PerformanceMetrics({
  metrics = demoMetrics,
  period = "Noiembrie 2025",
}: PerformanceMetricsProps) {
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof METRIC_CATEGORIES | "ALL">("ALL");
  const [comparisonPeriod, setComparisonPeriod] = useState<"previous" | "year">("previous");

  // Filter metrics by category
  const filteredMetrics = selectedCategory === "ALL"
    ? metrics
    : metrics.filter((m) => m.category === selectedCategory);

  // Group metrics by category for summary
  const categorySummary = Object.entries(METRIC_CATEGORIES).map(([key, config]) => {
    const categoryMetrics = metrics.filter((m) => m.category === key);
    const avgChange = categoryMetrics.length > 0
      ? categoryMetrics.reduce((sum, m) => sum + calculateChange(m.value, m.previousValue), 0) / categoryMetrics.length
      : 0;
    return {
      key,
      ...config,
      metricCount: categoryMetrics.length,
      avgChange,
    };
  });

  return (
    <div className="bg-white rounded-xl shadow-sm">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Indicatori de Performanță</h2>
              <p className="text-sm text-slate-500">{period}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setComparisonPeriod("previous")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                comparisonPeriod === "previous"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              vs. Luna anterioară
            </button>
            <button
              onClick={() => setComparisonPeriod("year")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                comparisonPeriod === "year"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              vs. An anterior
            </button>
          </div>
        </div>

        {/* Category filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition ${
              selectedCategory === "ALL"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Toate ({metrics.length})
          </button>
          {categorySummary.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key as keyof typeof METRIC_CATEGORIES)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition ${
                  selectedCategory === cat.key
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label} ({cat.metricCount})
              </button>
            );
          })}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="p-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMetrics.map((metric) => {
            const change = calculateChange(metric.value, metric.previousValue);
            const isPositive = metric.name.includes("Cheltuieli") || metric.name.includes("Timp")
              ? change < 0
              : change > 0;
            const categoryConfig = METRIC_CATEGORIES[metric.category];
            const CategoryIcon = categoryConfig.icon;
            const hasTarget = metric.target !== undefined;
            const isLowerBetter = metric.name.includes("Cheltuieli") || metric.name.includes("Timp");
            const goalProgress = hasTarget
              ? calculateGoalProgress(metric.value, metric.target!, isLowerBetter)
              : 0;

            return (
              <div
                key={metric.id}
                className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 bg-white rounded-lg ${categoryConfig.color}`}>
                      <CategoryIcon className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-slate-600">{metric.name}</span>
                  </div>
                  <Sparkline data={metric.sparklineData} isPositive={isPositive} />
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatValue(metric.value, metric.format)}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      {isPositive ? (
                        <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-red-600" />
                      )}
                      <span className={`text-sm font-medium ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
                        {change > 0 ? "+" : ""}{change.toFixed(1)}%
                      </span>
                      <span className="text-xs text-slate-400">vs. anterior</span>
                    </div>
                  </div>

                  {hasTarget && (
                    <div className="text-right">
                      <div className="flex items-center gap-1 mb-1">
                        <Target className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs text-slate-500">
                          {formatValue(metric.target!, metric.format)}
                        </span>
                      </div>
                      <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            goalProgress >= 100
                              ? "bg-emerald-500"
                              : goalProgress >= 75
                              ? "bg-blue-500"
                              : goalProgress >= 50
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${Math.min(100, goalProgress)}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400">{goalProgress.toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Summary */}
      <div className="p-4 border-t bg-slate-50 rounded-b-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 overflow-x-auto">
            {categorySummary.map((cat) => {
              const Icon = cat.icon;
              const isPositive = cat.avgChange > 0;
              return (
                <div key={cat.key} className="flex items-center gap-2 text-sm whitespace-nowrap">
                  <Icon className={`w-4 h-4 ${cat.color}`} />
                  <span className="text-slate-600">{cat.label}:</span>
                  <span className={`font-medium ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
                    {isPositive ? "+" : ""}{cat.avgChange.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
          <button className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition whitespace-nowrap">
            Raport detaliat
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
